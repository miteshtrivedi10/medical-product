from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

_ai_provider = os.getenv("AI_PROVIDER", "openai").strip().lower()
_default_base_url = (
    "https://api.anthropic.com/v1"
    if _ai_provider == "anthropic"
    else "https://api.openai.com/v1"
)


@dataclass(frozen=True)
class Settings:
    app_name: str = "Medical Product MVP"
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ai_provider: str = _ai_provider
    ai_request_timeout_seconds: float = float(
        os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "20")
    )
    llm_api_key: str = os.getenv("LLM_API_KEY", "").strip()
    llm_model: str = os.getenv(
        "LLM_MODEL",
        "claude-3-5-haiku-latest" if _ai_provider == "anthropic" else "gpt-4.1-mini",
    ).strip()
    llm_base_url: str = os.getenv("LLM_BASE_URL", _default_base_url).rstrip("/")
    llm_api_version: str = os.getenv("LLM_API_VERSION", "2023-06-01").strip()
    presence_ttl_seconds: int = int(os.getenv("PRESENCE_TTL_SECONDS", "15"))


settings = Settings()
