from __future__ import annotations

import logging
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException, status

from app.config import settings
from app.models import (
    ConflictPayload,
    EncounterListItemResponse,
    EncounterRecord,
    EncounterResponse,
    MedicalHistoryResponse,
    PatientDetailResponse,
    PatientListItemResponse,
    PresenceUser,
    SummaryResponse,
    UserRecord,
)
from app.store import store, utc_now

logger = logging.getLogger("app.services.patient")


class VersionConflictError(Exception):
    def __init__(self, payload: ConflictPayload) -> None:
        self.payload = payload
        super().__init__(payload.message)


class PatientService:
    def list_patients(self, current_user: UserRecord) -> list[PatientListItemResponse]:
        logger.info("Listing patients for user_id=%s", current_user.id)
        return [
            PatientListItemResponse(
                id=patient.id,
                full_name=patient.full_name,
                dob=patient.dob,
                summary_status=store.summaries[patient.id].status,
                active_editors=self._active_editors(patient.id, exclude_user_id=current_user.id),
            )
            for patient in store.patients.values()
        ]

    def get_patient_detail(self, patient_id: str, current_user: UserRecord) -> PatientDetailResponse:
        patient = self._get_patient(patient_id)
        logger.info("Loading patient detail patient_id=%s user_id=%s", patient_id, current_user.id)
        history = store.medical_histories[patient_id]
        encounters = [
            store.encounters[encounter_id]
            for encounter_id in store.patient_encounters[patient_id]
        ]
        encounters.sort(key=lambda encounter: encounter.updated_at, reverse=True)

        return PatientDetailResponse(
            id=patient.id,
            full_name=patient.full_name,
            dob=patient.dob,
            medical_history=MedicalHistoryResponse(
                patient_id=history.patient_id,
                text=history.text,
                version=history.version,
                updated_at=history.updated_at,
                updated_by=history.updated_by,
            ),
            encounters=[
                EncounterListItemResponse(
                    id=encounter.id,
                    title=encounter.title,
                    version=encounter.version,
                    updated_at=encounter.updated_at,
                    updated_by=encounter.updated_by,
                )
                for encounter in encounters
            ],
            latest_summary=self._summary_response(patient_id),
            active_editors=self._active_editors(patient_id, exclude_user_id=current_user.id),
        )

    def get_encounter(self, encounter_id: str, current_user: UserRecord) -> EncounterResponse:
        if encounter_id not in store.encounters:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")
        encounter = store.encounters[encounter_id]
        logger.info("Loading encounter encounter_id=%s user_id=%s", encounter_id, current_user.id)
        return EncounterResponse(
            id=encounter.id,
            patient_id=encounter.patient_id,
            title=encounter.title,
            text=encounter.text,
            version=encounter.version,
            created_at=encounter.created_at,
            updated_at=encounter.updated_at,
            updated_by=encounter.updated_by,
        )

    def save_medical_history(
        self,
        *,
        patient_id: str,
        text: str,
        expected_version: int,
        current_user: UserRecord,
    ) -> MedicalHistoryResponse:
        patient = self._get_patient(patient_id)
        logger.info("Saving medical history patient_id=%s user_id=%s", patient.id, current_user.id)
        with store.lock:
            current = store.medical_histories[patient_id]
            if current.version != expected_version:
                raise VersionConflictError(
                    ConflictPayload(
                        message="Medical history has changed since you loaded it.",
                        current_version=current.version,
                        current_text=current.text,
                        updated_by=current.updated_by,
                        updated_at=current.updated_at,
                    )
                )
            if current.text == text:
                logger.info(
                    "Medical history unchanged; skipping version bump patient_id=%s user_id=%s",
                    patient_id,
                    current_user.id,
                )
                return MedicalHistoryResponse(
                    patient_id=current.patient_id,
                    text=current.text,
                    version=current.version,
                    updated_at=current.updated_at,
                    updated_by=current.updated_by,
                )

            updated = utc_now()
            current.text = text
            current.version += 1
            current.updated_at = updated
            current.updated_by = current_user.display_name
            store.add_audit_event(
                patient_id=patient_id,
                user_id=current_user.id,
                entity_type="medical_history",
                entity_id=patient_id,
                action="updated",
                detail=f"Medical history updated to version {current.version}",
            )

        return MedicalHistoryResponse(
            patient_id=current.patient_id,
            text=current.text,
            version=current.version,
            updated_at=current.updated_at,
            updated_by=current.updated_by,
        )

    def create_encounter(
        self,
        *,
        patient_id: str,
        title: str,
        text: str,
        current_user: UserRecord,
    ) -> EncounterResponse:
        patient = self._get_patient(patient_id)
        logger.info("Creating encounter patient_id=%s user_id=%s", patient.id, current_user.id)
        with store.lock:
            now = utc_now()
            encounter = EncounterRecord(
                id=str(uuid4()),
                patient_id=patient_id,
                title=title,
                text=text,
                version=1,
                created_at=now,
                updated_at=now,
                updated_by=current_user.display_name,
            )
            store.encounters[encounter.id] = encounter
            store.patient_encounters[patient_id].append(encounter.id)
            store.add_audit_event(
                patient_id=patient_id,
                user_id=current_user.id,
                entity_type="encounter",
                entity_id=encounter.id,
                action="created",
                detail=f"Encounter created with title {title}",
            )

        return EncounterResponse(
            id=encounter.id,
            patient_id=encounter.patient_id,
            title=encounter.title,
            text=encounter.text,
            version=encounter.version,
            created_at=encounter.created_at,
            updated_at=encounter.updated_at,
            updated_by=encounter.updated_by,
        )

    def save_encounter(
        self,
        *,
        encounter_id: str,
        title: str,
        text: str,
        expected_version: int,
        current_user: UserRecord,
    ) -> EncounterResponse:
        if encounter_id not in store.encounters:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found.")

        logger.info("Saving encounter encounter_id=%s user_id=%s", encounter_id, current_user.id)
        with store.lock:
            encounter = store.encounters[encounter_id]
            if encounter.version != expected_version:
                raise VersionConflictError(
                    ConflictPayload(
                        message="Encounter transcript has changed since you loaded it.",
                        current_version=encounter.version,
                        current_text=encounter.text,
                        current_title=encounter.title,
                        updated_by=encounter.updated_by,
                        updated_at=encounter.updated_at,
                    )
                )
            if encounter.title == title and encounter.text == text:
                logger.info(
                    "Encounter unchanged; skipping version bump encounter_id=%s user_id=%s",
                    encounter_id,
                    current_user.id,
                )
                return EncounterResponse(
                    id=encounter.id,
                    patient_id=encounter.patient_id,
                    title=encounter.title,
                    text=encounter.text,
                    version=encounter.version,
                    created_at=encounter.created_at,
                    updated_at=encounter.updated_at,
                    updated_by=encounter.updated_by,
                )

            encounter.title = title
            encounter.text = text
            encounter.version += 1
            encounter.updated_at = utc_now()
            encounter.updated_by = current_user.display_name
            store.add_audit_event(
                patient_id=encounter.patient_id,
                user_id=current_user.id,
                entity_type="encounter",
                entity_id=encounter.id,
                action="updated",
                detail=f"Encounter updated to version {encounter.version}",
            )

        return EncounterResponse(
            id=encounter.id,
            patient_id=encounter.patient_id,
            title=encounter.title,
            text=encounter.text,
            version=encounter.version,
            created_at=encounter.created_at,
            updated_at=encounter.updated_at,
            updated_by=encounter.updated_by,
        )

    def heartbeat(self, patient_id: str, current_user: UserRecord) -> list[PresenceUser]:
        self._get_patient(patient_id)
        logger.info("Presence heartbeat patient_id=%s user_id=%s", patient_id, current_user.id)
        with store.lock:
            store.presence[patient_id][current_user.id] = utc_now()
        return self._active_editors(patient_id, exclude_user_id=current_user.id)

    def _summary_response(self, patient_id: str) -> SummaryResponse:
        summary = store.summaries[patient_id]
        return SummaryResponse(
            patient_id=patient_id,
            status=summary.status,
            patient_status_summary=summary.patient_status_summary,
            watch_items=summary.watch_items,
            next_encounter_focus=summary.next_encounter_focus,
            generated_at=summary.generated_at,
            last_error=summary.last_error,
        )

    def _active_editors(self, patient_id: str, exclude_user_id: str | None = None) -> list[PresenceUser]:
        cutoff = utc_now() - timedelta(seconds=settings.presence_ttl_seconds)
        active_users: list[PresenceUser] = []
        with store.lock:
            current_presence = store.presence.get(patient_id, {})
            stale_users = [
                user_id for user_id, seen_at in current_presence.items() if seen_at < cutoff
            ]
            for user_id in stale_users:
                current_presence.pop(user_id, None)

            for user_id in current_presence:
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                user = store.users.get(user_id)
                if user:
                    active_users.append(
                        PresenceUser(id=user.id, display_name=user.display_name)
                    )
        return active_users

    def _get_patient(self, patient_id: str):
        if patient_id not in store.patients:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
        return store.patients[patient_id]


patient_service = PatientService()
