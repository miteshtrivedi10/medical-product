from __future__ import annotations

import threading
from datetime import UTC, datetime
from uuid import uuid4

from app.models import (
    AuditEvent,
    EncounterRecord,
    MedicalHistoryRecord,
    PatientRecord,
    SummaryRecord,
    UserRecord,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


class InMemoryStore:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.users: dict[str, UserRecord] = {}
        self.sessions: dict[str, str] = {}
        self.patients: dict[str, PatientRecord] = {}
        self.medical_histories: dict[str, MedicalHistoryRecord] = {}
        self.encounters: dict[str, EncounterRecord] = {}
        self.patient_encounters: dict[str, list[str]] = {}
        self.summaries: dict[str, SummaryRecord] = {}
        self.presence: dict[str, dict[str, datetime]] = {}
        self.audit_events: list[AuditEvent] = []
        self.summary_requested_hashes: dict[str, str] = {}
        self.summary_tasks: dict[str, object] = {}
        self._seed()

    def _seed(self) -> None:
        users = [
            UserRecord("user-1", "ava.clark", "Aster@101", "Ava Clark"),
            UserRecord("user-2", "nolan.reed", "Harbor@202", "Nolan Reed"),
            UserRecord("user-3", "priya.shah", "Cedar@303", "Priya Shah"),
            UserRecord("user-4", "marco.ellis", "Pine@404", "Marco Ellis"),
            UserRecord("user-5", "dana.cho", "River@505", "Dana Cho"),
        ]
        for user in users:
            self.users[user.id] = user

        patients = [
            PatientRecord("patient-1", 'James "Jim" Wright', "1944-01-02"),
            PatientRecord("patient-2", "Bettye Wellons", "1940-01-23"),
        ]
        for patient in patients:
            self.patients[patient.id] = patient
            self.patient_encounters[patient.id] = []
            self.presence[patient.id] = {}
            self.summaries[patient.id] = SummaryRecord(
                patient_id=patient.id,
                status="idle",
            )

        now = utc_now()
        self.medical_histories["patient-1"] = MedicalHistoryRecord(
            patient_id="patient-1",
            version=1,
            updated_at=now,
            updated_by="Ava Clark",
            text=(
                "- Lymphedema (I89.0)\n"
                "- Onychogryphosis (L60.2)\n"
                "- Pain, unspecified (R52)\n"
                "- Previous knee surgeries\n"
                "- Unable to provide adequate self-care due to body habitus\n"
                "- History of chronic swelling, edema, and lymphorrhea of both legs\n"
                "- NKDA\n"
                "- Current meds include triamcinolone cream, bacitracin, and Vitamin A&D ointment\n"
            ),
        )
        self.medical_histories["patient-2"] = MedicalHistoryRecord(
            patient_id="patient-2",
            version=1,
            updated_at=now,
            updated_by="Ava Clark",
            text=(
                "- GERD / reflux\n"
                "- Hysterectomy\n"
                "- Colonoscopy\n"
                "- Family history of hypertension\n"
                "- Never smoker\n"
                "- Right knee severe osteoarthritis with valgus deformity\n"
                "- Prior cortisone and gel injections\n"
                "- Allergies: penicillins, sulfa antibiotics\n"
                "- Medications include amlodipine, carvedilol, chlorthalidone, famotidine, trazodone\n"
            ),
        )

        encounter_1 = EncounterRecord(
            id="encounter-1",
            patient_id="patient-1",
            title="Wound care follow-up",
            version=1,
            created_at=now,
            updated_at=now,
            updated_by="Ava Clark",
            text=(
                "- Patient has a cardiologist at Austin Heart.\n"
                "- No recent hospitalizations.\n"
                "- Hard of hearing and needs direct speech.\n"
                "- Up to date on flu, RSV, and COVID booster.\n"
                "- No recent UTI symptoms or treatment.\n"
                "- Uses snuff but does not drink alcohol or smoke cigarettes.\n"
                "- Blood pressure 115/65, pulse 62 irregular, oxygen saturation 97% on room air.\n"
                "- Shortness of breath with moderate exertion.\n"
                "- Uses a walker and cannot leave home unassisted.\n"
                "- Reports generalized pain level 5 affecting sleep, controlled with medication.\n"
                "- Lives alone with paid caregiver support.\n"
            ),
        )
        encounter_2 = EncounterRecord(
            id="encounter-2",
            patient_id="patient-2",
            title="Routine home health check",
            version=1,
            created_at=now,
            updated_at=now,
            updated_by="Ava Clark",
            text=(
                "- Patient weighs 134 pounds and is 5 feet 3 inches tall.\n"
                "- Blood pressure 110/62, oxygen level 99% on room air, heart rate 83, respirations 18.\n"
                "- Did not receive COVID-19 and shingles vaccines.\n"
                "- Transportation is provided by daughter Lisa, who is also caregiver.\n"
                "- No medical power of attorney or living will in place.\n"
                '- Patient recalled "bed," "blue," and "sock" without difficulty.\n'
            ),
        )
        self.encounters[encounter_1.id] = encounter_1
        self.encounters[encounter_2.id] = encounter_2
        self.patient_encounters["patient-1"].append(encounter_1.id)
        self.patient_encounters["patient-2"].append(encounter_2.id)

    def add_audit_event(
        self,
        *,
        patient_id: str,
        user_id: str,
        entity_type: str,
        entity_id: str,
        action: str,
        detail: str,
    ) -> None:
        self.audit_events.append(
            AuditEvent(
                id=str(uuid4()),
                patient_id=patient_id,
                user_id=user_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                happened_at=utc_now(),
                detail=detail,
            )
        )


store = InMemoryStore()
