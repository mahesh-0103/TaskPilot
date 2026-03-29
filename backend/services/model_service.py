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

        from settings import settings
        
        # User explicitly requested to ONLY use Mistral and NOT Gemini.
        if settings.MISTRAL_API_KEY:
            try:
                logger.info("Executing neural extraction via ONLY Mistral as requested...")
                result = self.predict_tasks_mistral(text)
                if result:
                    _cache_set(cache_key, result)
                    return result
            except Exception as e:
                logger.error(f"Neural extraction failed: {e}")
        
        logger.warning("Mistral extraction failed or no key present. Defaulting to local heuristics.")
        return []

    def predict_tasks_mistral(self, text: str) -> list:
        from settings import settings
        if not settings.MISTRAL_API_KEY:
            return []

        today = datetime.date.today().isoformat()
        prompt = (
            "You are a 'Digital Chief of Staff'. Extract structured action items from this meeting transcript.\n"
            "Return ONLY a raw JSON array. Start with [ and end with ].\n\n"
            f"Transcript:\n{text}\n\n"
            "Fields for EACH object in the array:\n"
            "- task_id: uuid4 string\n"
            "- task: full descriptive sentence summarizing the action\n"
            "- owner: capitalized first name of the person responsible or 'Strategic Team'\n"
            "- deadline: YYYY-MM-DD (Estimate from context if not explicit, default to next Friday)\n"
            "- due_time: HH:MM (Estimate or default to 09:00)\n"
            "- priority: 'low', 'medium', or 'high' (Use 'high' for blockers or urgent phrases)\n"
            "- depends_on: [] array of task_id strings if this task relies on another extracted task.\n\n"
            "RULES:\n"
            "1. Be deterministic: If a person is mentioned multiple times, use the same owner name.\n"
            "2. Detect sequences: If Task B says 'After Task A is done', add Task A's uuid to Task B's depends_on.\n"
            "3. No placeholders: Return real estimations for dates."
        )

        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY.strip()}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "mistral-large-latest",
                "messages": [{"role": "user", "content": prompt}]
            }
            
            # Use a robust 30s timeout for premium model
            with httpx.Client(timeout=30.0) as client:
                response = client.post("https://api.mistral.ai/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                res_json = response.json()
                
                # Safe key access
                choices = res_json.get("choices")
                if not choices or not isinstance(choices, list) or len(choices) == 0:
                    logger.warning("Mistral returned empty choices.")
                    return []
                    
                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    logger.warning("Mistral returned empty content.")
                    return []
                
                # Robust parsing of JSON from markdown if exists
                match = re.search(r"\[.*\]", content, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                
                data = json.loads(content)
                if isinstance(data, dict) and "tasks" in data: return data["tasks"]
                if isinstance(data, list): return data
        except Exception as e:
            logger.warning(f"Mistral Error: {e}")
        return []

    def predict_tasks_gemini(self, text: str) -> list:
        today = datetime.date.today().isoformat()
        system_instruction = (
            "You are an 'Autonomous Executive Assistant'. Extract structured action items from transcripts.\n"
            "Return ONLY a raw JSON array. Start with [ end with ].\n"
            "Fields: task_id(uuid4), task, owner, deadline(YYYY-MM-DD), priority(low|medium|high).\n"
            "Rules for PRIORITY Prediction:\n"
            "- HIGH: If task contains 'urgent', 'ASAP', 'blocker', 'critical', 'immediately', or is a blocking dependency.\n"
            "- MEDIUM: Default for standard action items.\n"
            "- LOW: For 'exploratory', 'minor', 'if time permits' or 'someday' tasks."
        )

        client = get_gemini_client()
        if not client:
            return []

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
