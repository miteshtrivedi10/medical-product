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


def _provider_env_value(*, shared_name: str, provider_name: str, default: str = "") -> str:
    shared_value = os.getenv(shared_name)
    if shared_value is not None and shared_value.strip():
        return shared_value.strip()

    provider_value = os.getenv(provider_name)
    if provider_value is not None and provider_value.strip():
        return provider_value.strip()

    return default


@dataclass(frozen=True)
class Settings:
    app_name: str = "Medical Product MVP"
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ai_provider: str = _ai_provider
    ai_request_timeout_seconds: float = float(
        os.getenv("AI_REQUEST_TIMEOUT_SECONDS", "20")
    )
    llm_api_key: str = _provider_env_value(
        shared_name="LLM_API_KEY",
        provider_name="ANTHROPIC_API_KEY" if _ai_provider == "anthropic" else "OPENAI_API_KEY",
    )
    llm_model: str = _provider_env_value(
        shared_name="LLM_MODEL",
        provider_name="ANTHROPIC_MODEL" if _ai_provider == "anthropic" else "OPENAI_MODEL",
        default="claude-3-5-haiku-latest" if _ai_provider == "anthropic" else "gpt-4.1-mini",
    )
    llm_base_url: str = _provider_env_value(
        shared_name="LLM_BASE_URL",
        provider_name="ANTHROPIC_BASE_URL" if _ai_provider == "anthropic" else "OPENAI_BASE_URL",
        default=_default_base_url,
    ).rstrip("/")
    anthropic_version: str = os.getenv("ANTHROPIC_VERSION", "2023-06-01").strip()
    presence_ttl_seconds: int = int(os.getenv("PRESENCE_TTL_SECONDS", "15"))


settings = Settings()
