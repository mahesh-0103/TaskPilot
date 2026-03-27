import asyncio
import os
from services.model_service import model_service
from services.extraction_service import extract_tasks
from dotenv import load_dotenv

# Load env to get Mistral Key
load_dotenv()

SAMPLE_TEXT = """
Alright team — quick sync. Priya, can you finish the database schema by Wednesday? 
It's urgent. After that, Rohan will build the API layer by Friday. 
Sam, please set up the deployment pipeline in parallel — aim for next Monday.
"""

def test():
    print("--- TESTING TASKPILOT EXTRACTION PIPELINE ---")
    try:
        # This calls Mistral -> Gemini -> Deterministic
        tasks = extract_tasks(SAMPLE_TEXT)
        
        if not tasks:
            print("❌ Extraction pipeline returned no tasks.")
        else:
            print(f"✅ Extracted {len(tasks)} tasks:")
            for t in tasks:
                 # t is a Task object (Pydantic)
                 print(f"- [{t.priority.upper()}] {t.task[:50]}... | Owner: {t.owner} | Due: {t.deadline}")
    except Exception as e:
        print(f"❌ Critical failure in extraction pipeline: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
