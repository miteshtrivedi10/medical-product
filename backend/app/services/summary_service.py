from __future__ import annotations

import asyncio
import hashlib
import logging
import threading

from app.models import SummaryRecord, UserRecord
from app.services.ai_provider import AIProviderError, ai_provider_service
from app.store import store, utc_now

logger = logging.getLogger("app.services.summary")


class SummaryService:
    def schedule_generation(self, patient_id: str, current_user: UserRecord) -> None:
        logger.info("Scheduling summary generation patient_id=%s user_id=%s", patient_id, current_user.id)
        latest_input_hash = self._build_input_hash(patient_id)
        worker_to_start: threading.Thread | None = None
        with store.lock:
            summary = store.summaries[patient_id]
            if summary.status == "completed" and summary.input_hash == latest_input_hash:
                logger.info("Skipping summary generation for patient_id=%s due to unchanged content", patient_id)
                return

            store.summary_requested_hashes[patient_id] = latest_input_hash
            summary.status = "generating"
            summary.last_error = None

            existing_task = store.summary_tasks.get(patient_id)
            if existing_task and existing_task.is_alive():
                logger.info("Summary task already active for patient_id=%s; request coalesced", patient_id)
                return

            worker_to_start = threading.Thread(
                target=self._run_generation_loop,
                args=(patient_id,),
                name=f"summary-generator-{patient_id}",
                daemon=True,
            )
            store.summary_tasks[patient_id] = worker_to_start

        if worker_to_start:
            worker_to_start.start()

    def _run_generation_loop(self, patient_id: str) -> None:
        asyncio.run(self._generation_loop(patient_id))

    async def _generation_loop(self, patient_id: str) -> None:
        logger.info("Summary generation loop started patient_id=%s", patient_id)
        while True:
            with store.lock:
                requested_hash = store.summary_requested_hashes.get(patient_id)
            if not requested_hash:
                break

            snapshot = self._build_snapshot(patient_id)
            if snapshot["input_hash"] != requested_hash:
                with store.lock:
                    store.summary_requested_hashes[patient_id] = snapshot["input_hash"]
                continue

            try:
                if not snapshot["latest_encounter_text"].strip():
                    self._write_completed_summary(
                        patient_id=patient_id,
                        input_hash=snapshot["input_hash"],
                        patient_status_summary="No encounter transcript is available yet.",
                        watch_items=[],
                        next_encounter_focus="Capture the first encounter before relying on the summary.",
                    )
                else:
                    generated = await ai_provider_service.generate_summary(
                        medical_history_text=snapshot["medical_history_text"],
                        latest_encounter_text=snapshot["latest_encounter_text"],
                        previous_summary=snapshot["previous_summary"],
                    )
                    self._write_completed_summary(
                        patient_id=patient_id,
                        input_hash=snapshot["input_hash"],
                        patient_status_summary=generated.patient_status_summary,
                        watch_items=generated.watch_items,
                        next_encounter_focus=generated.next_encounter_focus,
                    )
            except AIProviderError as exc:
                logger.exception("Summary generation failed patient_id=%s", patient_id)
                with store.lock:
                    summary = store.summaries[patient_id]
                    summary.status = "failed"
                    summary.last_error = str(exc)
            finally:
                with store.lock:
                    latest_requested_hash = store.summary_requested_hashes.get(patient_id)
                    completed_hash = store.summaries[patient_id].input_hash
                    if latest_requested_hash == completed_hash or store.summaries[patient_id].status == "failed":
                        store.summary_requested_hashes.pop(patient_id, None)
                        break

        with store.lock:
            store.summary_tasks.pop(patient_id, None)
        logger.info("Summary generation loop finished patient_id=%s", patient_id)

    def _write_completed_summary(
        self,
        *,
        patient_id: str,
        input_hash: str,
        patient_status_summary: str,
        watch_items: list[str],
        next_encounter_focus: str,
    ) -> None:
        with store.lock:
            summary = store.summaries[patient_id]
            summary.status = "completed"
            summary.patient_status_summary = patient_status_summary
            summary.watch_items = watch_items
            summary.next_encounter_focus = next_encounter_focus
            summary.generated_at = utc_now()
            summary.input_hash = input_hash
            summary.last_error = None

    def _build_snapshot(self, patient_id: str) -> dict[str, str]:
        with store.lock:
            history = store.medical_histories[patient_id]
            patient_encounters = [
                store.encounters[encounter_id]
                for encounter_id in store.patient_encounters[patient_id]
            ]
            patient_encounters.sort(key=lambda encounter: encounter.updated_at, reverse=True)
            latest_encounter_text = patient_encounters[0].text if patient_encounters else ""
            summary = store.summaries[patient_id]
            previous_summary = "\n".join(
                [
                    summary.patient_status_summary,
                    *summary.watch_items,
                    summary.next_encounter_focus,
                ]
            ).strip()
        return {
            "medical_history_text": history.text,
            "latest_encounter_text": latest_encounter_text,
            "previous_summary": previous_summary,
            "input_hash": self._build_input_hash(patient_id),
        }

    def _build_input_hash(self, patient_id: str) -> str:
        with store.lock:
            history = store.medical_histories[patient_id]
            encounter_text = ""
            encounter_ids = store.patient_encounters[patient_id]
            if encounter_ids:
                latest_encounter = max(
                    (store.encounters[encounter_id] for encounter_id in encounter_ids),
                    key=lambda encounter: encounter.updated_at,
                )
                encounter_text = latest_encounter.text
            payload = "||".join([history.text.strip(), encounter_text.strip()])
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


summary_service = SummaryService()
