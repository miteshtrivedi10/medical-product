from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import httpx

from app.config import settings

logger = logging.getLogger("app.services.ai_provider")


@dataclass
class SummaryPayload:
    patient_status_summary: str
    watch_items: list[str]
    next_encounter_focus: str


class AIProviderError(RuntimeError):
    pass


class AIProviderService:
    async def generate_summary(
        self,
        *,
        medical_history_text: str,
        latest_encounter_text: str,
        previous_summary: str,
    ) -> SummaryPayload:
        if settings.ai_provider == "openai":
            return await self._generate_with_openai(
                medical_history_text=medical_history_text,
                latest_encounter_text=latest_encounter_text,
                previous_summary=previous_summary,
            )
        if settings.ai_provider == "anthropic":
            return await self._generate_with_anthropic(
                medical_history_text=medical_history_text,
                latest_encounter_text=latest_encounter_text,
                previous_summary=previous_summary,
            )
        raise AIProviderError(f"Unsupported AI provider: {settings.ai_provider}")

    def _system_prompt(self) -> str:
        return (
            "You write ultra-concise home health clinician prep summaries. "
            "The output will be reviewed while a clinician walks from a driveway to a front door. "
            "Be brief, specific, and non-redundant. Do not invent facts. "
            "Return strict JSON with keys patient_status_summary, watch_items, next_encounter_focus. "
            "watch_items must be an array with 0 to 2 short strings."
        )

    def _user_prompt(
        self,
        *,
        medical_history_text: str,
        latest_encounter_text: str,
        previous_summary: str,
    ) -> str:
        return (
            "Generate a concise summary for the next visit.\n\n"
            f"Medical history:\n{medical_history_text.strip() or 'None'}\n\n"
            f"Previous summary:\n{previous_summary.strip() or 'None'}\n\n"
            f"Latest encounter transcript:\n{latest_encounter_text.strip() or 'None'}\n\n"
            "Return JSON only."
        )

    async def _generate_with_openai(
        self,
        *,
        medical_history_text: str,
        latest_encounter_text: str,
        previous_summary: str,
    ) -> SummaryPayload:
        if not settings.llm_api_key:
            raise AIProviderError("LLM API key is not configured.")

        request_payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": self._system_prompt()},
                {
                    "role": "user",
                    "content": self._user_prompt(
                        medical_history_text=medical_history_text,
                        latest_encounter_text=latest_encounter_text,
                        previous_summary=previous_summary,
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        logger.info(
            "Calling openai-compatible provider=%s model=%s",
            settings.ai_provider,
            settings.llm_model,
        )
        async with httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds) as client:
            response = await client.post(
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )

        if response.status_code >= 400:
            logger.error("OpenAI request failed status=%s body=%s", response.status_code, response.text)
            raise AIProviderError("OpenAI request failed.")

        payload = response.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        return self._parse_summary_payload(content)

    async def _generate_with_anthropic(
        self,
        *,
        medical_history_text: str,
        latest_encounter_text: str,
        previous_summary: str,
    ) -> SummaryPayload:
        if not settings.llm_api_key:
            raise AIProviderError("LLM API key is not configured.")

        request_payload = {
            "model": settings.llm_model,
            "max_tokens": 250,
            "system": self._system_prompt(),
            "messages": [
                {
                    "role": "user",
                    "content": self._user_prompt(
                        medical_history_text=medical_history_text,
                        latest_encounter_text=latest_encounter_text,
                        previous_summary=previous_summary,
                    ),
                }
            ],
        }

        logger.info("Calling anthropic model=%s", settings.llm_model)
        async with httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds) as client:
            response = await client.post(
                f"{settings.llm_base_url}/messages",
                headers={
                    "x-api-key": settings.llm_api_key,
                    "anthropic-version": settings.anthropic_version,
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )

        if response.status_code >= 400:
            logger.error(
                "Anthropic request failed status=%s body=%s",
                response.status_code,
                response.text,
            )
            raise AIProviderError("Anthropic request failed.")

        payload = response.json()
        content = payload.get("content", [])
        text = ""
        if content and isinstance(content, list):
            text = content[0].get("text", "")
        return self._parse_summary_payload(text)

    def _parse_summary_payload(self, raw_content: str) -> SummaryPayload:
        logger.info("Parsing AI response payload")
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError as exc:
            logger.exception("Failed to parse AI JSON payload")
            raise AIProviderError("AI payload was not valid JSON.") from exc

        patient_status_summary = str(parsed.get("patient_status_summary", "")).strip()
        next_encounter_focus = str(parsed.get("next_encounter_focus", "")).strip()
        watch_items = parsed.get("watch_items", [])
        if not isinstance(watch_items, list):
            watch_items = []

        watch_items = [str(item).strip() for item in watch_items if str(item).strip()][:2]

        if not patient_status_summary or not next_encounter_focus:
            raise AIProviderError("AI payload was missing required summary fields.")

        return SummaryPayload(
            patient_status_summary=patient_status_summary,
            watch_items=watch_items,
            next_encounter_focus=next_encounter_focus,
        )


ai_provider_service = AIProviderService()
