import os
from dotenv import load_dotenv  # type: ignore

load_dotenv()


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Optional trained model endpoint (no paid provider hardcoded)
    # If set, extraction will POST {"text": ...} to this endpoint and
    # expect a JSON response with a `tasks` array.
    MODEL_ENDPOINT: str = os.getenv("MODEL_ENDPOINT", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

    # Business constants
    BACKUP_USER: str = "backup_user"
    DEADLINE_EXTENSION_DAYS: int = 1


settings = Settings()
