"""
Model Service – uses google.genai API (gemini-1.5-flash) as primary extractor,
with MD5 caching (60s), exponential backoff retry (max 3),
and rule-based fallback.
"""

import json
import re
import logging
import os
import datetime
import threading
import time
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)

# --- MD5 Cache ---
_cache: dict = {}
_cache_lock = threading.Lock()
CACHE_TTL = 60  # seconds


def _cache_get(key: str) -> Optional[list]:
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            logger.info("Cache hit for extraction.")
            return entry["data"]
    return None


def _cache_set(key: str, data: list):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time()}


def _md5(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


# --- T5 Singleton (kept for fallback) ---
_t5_pipeline = None
_t5_lock = threading.Lock()


def get_t5():
    global _t5_pipeline
    if _t5_pipeline is None:
        with _t5_lock:
            if _t5_pipeline is None:
                try:
                    from transformers import pipeline  # type: ignore
                    logger.info("Initializing T5 Pipeline (google/flan-t5-base)...")
                    _t5_pipeline = pipeline(
                        "text2text-generation",
                        model="google/flan-t5-base",
                        max_length=512,
                        do_sample=False
                    )
                    logger.info("T5 Pipeline loaded successfully.")
                except Exception as e:
                    logger.error(f"Failed to load T5 Pipeline: {e}")
                    raise e
    return _t5_pipeline


class ModelService:
    def predict_tasks(self, text: str) -> list:
        cache_key = _md5(text)
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        # Try Mistral first
        mistral_tasks = self.predict_tasks_mistral(text)
        if mistral_tasks:
            _cache_set(cache_key, mistral_tasks)
            return mistral_tasks

        # Fallback to Gemini
        gemini_tasks = self.predict_tasks_gemini(text)
        if gemini_tasks:
            _cache_set(cache_key, gemini_tasks)
            return gemini_tasks

        logger.warning("All LLM extraction attempts failed.")
        return []

    def predict_tasks_mistral(self, text: str) -> list:
        from settings import settings
        if not settings.MISTRAL_API_KEY:
            logger.info("Mistral API key not found. Skipping Mistral.")
            return []

        today = datetime.date.today().isoformat()
        prompt = (
            "You are a 'Digital Chief of Staff'. Extract action items from this meeting transcript.\n"
            "Return ONLY a raw JSON array. No markdown. No explanation.\n\n"
            f"Transcript:\n{text}\n\n"
            "Rules:\n"
            "1. Infer deadlines relative to today: " + today + "\n"
            "2. Fields: task_id (uuid), task (full sentence), owner, deadline (YYYY-MM-DD), priority (low|medium|high), status(pending), depends_on([]).\n"
            "3. If no clear owner, use 'unassigned'."
        )

        try:
            logger.info("Attempting extraction with Mistral...")
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "mistral-large-latest",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"} if "mistral-large" in "mistral-large-latest" else None
            }
            
            with httpx.Client(timeout=30.0) as client:
                response = client.post("https://api.mistral.ai/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                res_json = response.json()
                content = res_json["choices"][0]["message"]["content"]
                
                match = re.search(r"\[.*\]", content, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                # If they returned an object with a 'tasks' key
                data = json.loads(content)
                if isinstance(data, dict) and "tasks" in data:
                    return data["tasks"]
                if isinstance(data, list):
                    return data
        except Exception as e:
            logger.warning(f"Mistral extraction failed: {e}")
        return []

    def predict_tasks_gemini(self, text: str) -> list:
        today = datetime.date.today().isoformat()
        system_instruction = (
            "You extract action items from meeting transcripts.\n"
            "Return ONLY a raw JSON array. No markdown. No explanation.\n"
            "No code fences. Start with [ end with ].\n\n"
            "CRITICAL RULES:\n"
            "1. The task field must be a COMPLETE action sentence minimum\n"
            "   8 words describing exactly what needs to be done.\n"
            f"3. Infer deadlines from context relative to today: {today}\n"
            "Each object must have exactly:\n"
            "task_id (uuid4), task (full action sentence), owner (first name),\n"
            "deadline (YYYY-MM-DD), priority (low|medium|high),\n"
            "status (pending), depends_on ([]), created_at (ISO UTC now),\n"
            "updated_at (ISO UTC now)"
        )

        # Retry with exponential backoff
        max_retries = 2
        last_error = None
        for attempt in range(max_retries):
            try:
                from google import genai
                from google.genai import types
                from settings import settings

                if not settings.GOOGLE_API_KEY or len(settings.GOOGLE_API_KEY) < 10:
                    break

                logger.info(f"Gemini extraction attempt {attempt + 1}...")
                client = genai.Client(api_key=settings.GOOGLE_API_KEY)

                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=[
                        types.Content(
                            role="user",
                            parts=[types.Part.from_text(text=f"Meeting transcript:\n{text}")]
                        )
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        max_output_tokens=2048,
                    )
                )

                raw_text = response.text
                match = re.search(r"\[.*\]", raw_text, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                else:
                    raise ValueError("JSON array not found in Gemini output")

            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "quota" in err_str.lower():
                    if attempt < max_retries - 1:
                        wait = 2 ** attempt
                        logger.warning(f"Gemini 429 quota hit, waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        break
                elif "400" in err_str or "key" in err_str.lower():
                    break
                else:
                    if attempt >= max_retries - 1:
                        break
                    time.sleep(2 ** attempt)

        logger.warning(f"Gemini failed. Last error: {last_error}")
        return []

        try:
            t5_pipe = get_t5()
            prompt = (
                "Extract all action items as tasks from this meeting transcript. "
                "Group related sentences into ONE task. "
                "For each task output: NAME | ACTION | DEADLINE | PRIORITY. "
                "Separate tasks with a newline. "
                "Priorities are: high, medium, or low only. "
                f"Meeting: {text}"
            )
            result = t5_pipe(prompt)
            raw_output = result[0]['generated_text']  # type: ignore

            tasks = []
            import uuid
            for line in raw_output.split("\n"):
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 4:
                    owner, task_desc, deadline, priority = parts[:4]  # type: ignore
                    if priority.lower() not in ["high", "medium", "low"]:
                        priority = "medium"
                    tasks.append({
                        "task_id": str(uuid.uuid4()),
                        "task": task_desc,
                        "owner": owner,
                        "deadline": deadline,
                        "priority": priority.lower(),
                        "status": "pending",
                        "depends_on": [],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    })

            if tasks:
                _cache_set(cache_key, tasks)
            return tasks
        except Exception as e:
            logger.error(f"T5 fallback also failed: {e}")
            return []


model_service = ModelService()
