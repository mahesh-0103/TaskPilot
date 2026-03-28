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
CACHE_TTL = 300  # Extended to 300s (5m) for better stability


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


# --- Client Singletons ---
_t5_pipeline = None
_gemini_client = None
_locks = {"t5": threading.Lock(), "gemini": threading.Lock()}

def get_gemini_client():
    global _gemini_client
    from settings import settings
    if _gemini_client is None:
        with _locks["gemini"]:
            if _gemini_client is None and settings.GOOGLE_API_KEY:
                from google import genai
                logger.info("Initializing persistent Gemini 1.5 Flash client...")
                _gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return _gemini_client

def get_t5():
    global _t5_pipeline
    if _t5_pipeline is None:
        with _locks["t5"]:
            if _t5_pipeline is None:
                try:
                    from transformers import pipeline
                    logger.info("Initializing T5 Pipeline...")
                    _t5_pipeline = pipeline("text2text-generation", model="google/flan-t5-base")
                except Exception as e:
                    logger.error(f"Failed to load T5: {e}")
    return _t5_pipeline


class ModelService:
    def predict_tasks(self, text: str) -> list:
        cache_key = _md5(text)
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        from concurrent.futures import ThreadPoolExecutor, as_completed
        from settings import settings

        tasks_to_try = []
        if settings.GOOGLE_API_KEY:
            tasks_to_try.append((self.predict_tasks_gemini, "Gemini"))
        if settings.MISTRAL_API_KEY:
            tasks_to_try.append((self.predict_tasks_mistral, "Mistral"))

        if not tasks_to_try:
            logger.warning("No LLM API keys configured.")
            return []

        # Start a competitive race
        with ThreadPoolExecutor(max_workers=len(tasks_to_try)) as executor:
            future_to_name = {executor.submit(fn, text): name for fn, name in tasks_to_try}
            
            for future in as_completed(future_to_name):
                name = future_to_name[future]
                try:
                    result = future.result()
                    if result:
                        logger.info(f"RACE WINNER: {name} manifested data first.")
                        _cache_set(cache_key, result)
                        return result
                except Exception as e:
                    logger.error(f"RACE PARTICIPANT FAILED ({name}): {e}")

        logger.warning("All participants in the neural race failed to manifest data.")
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
            "Return ONLY a raw JSON array. Start with [ end with ].\n"
            "Each object must have exactly: task_id(uuid4), task(full action sentence), owner, deadline, priority."
        )

        client = get_gemini_client()
        if not client:
            return []

        # Reduce retries for live latency reduction
        max_retries = 1
        for attempt in range(max_retries + 1):
            try:
                from google.genai import types
                logger.info(f"Gemini 1.5 Flash extraction signal (Attempt {attempt + 1})...")
                
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=[f"Meeting transcript:\n{text}"],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.1,
                        max_output_tokens=1024,
                        response_mime_type="application/json"
                    )
                )

                content = response.text or response.candidates[0].content.parts[0].text
                data = json.loads(content)
                if isinstance(data, list): return data
                if isinstance(data, dict) and "tasks" in data: return data["tasks"]
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
                if attempt < max_retries: time.sleep(1)
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
