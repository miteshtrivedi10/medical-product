from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SummaryStatus = Literal["idle", "generating", "completed", "failed"]


@dataclass
class UserRecord:
    id: str
    username: str
    password: str
    display_name: str


@dataclass
class PatientRecord:
    id: str
    full_name: str
    dob: str


@dataclass
class MedicalHistoryRecord:
    patient_id: str
    text: str
    version: int
    updated_at: datetime
    updated_by: str


@dataclass
class EncounterRecord:
    id: str
    patient_id: str
    title: str
    text: str
    version: int
    created_at: datetime
    updated_at: datetime
    updated_by: str


@dataclass
class SummaryRecord:
    patient_id: str
    status: SummaryStatus
    patient_status_summary: str = ""
    watch_items: list[str] = field(default_factory=list)
    next_encounter_focus: str = ""
    generated_at: datetime | None = None
    input_hash: str = ""
    last_error: str | None = None


@dataclass
class AuditEvent:
    id: str
    patient_id: str
    user_id: str
    entity_type: str
    entity_id: str
    action: str
    happened_at: datetime
    detail: str


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    token: str
    user: UserResponse


class PresenceUser(BaseModel):
    id: str
    display_name: str


class MedicalHistoryResponse(BaseModel):
    patient_id: str
    text: str
    version: int
    updated_at: datetime
    updated_by: str


class EncounterListItemResponse(BaseModel):
    id: str
    title: str
    version: int
    updated_at: datetime
    updated_by: str


class EncounterResponse(BaseModel):
    id: str
    patient_id: str
    title: str
    text: str
    version: int
    created_at: datetime
    updated_at: datetime
    updated_by: str


class SummaryResponse(BaseModel):
    patient_id: str
    status: SummaryStatus
    patient_status_summary: str = ""
    watch_items: list[str] = Field(default_factory=list)
    next_encounter_focus: str = ""
    generated_at: datetime | None = None
    last_error: str | None = None


class PatientListItemResponse(BaseModel):
    id: str
    full_name: str
    dob: str
    summary_status: SummaryStatus
    active_editors: list[PresenceUser] = Field(default_factory=list)


class PatientDetailResponse(BaseModel):
    id: str
    full_name: str
    dob: str
    medical_history: MedicalHistoryResponse
    encounters: list[EncounterListItemResponse]
    latest_summary: SummaryResponse
    active_editors: list[PresenceUser] = Field(default_factory=list)


class SaveMedicalHistoryRequest(BaseModel):
    text: str
    expected_version: int = Field(ge=0)


class CreateEncounterRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    text: str


class SaveEncounterRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    text: str
    expected_version: int = Field(ge=1)


class PresenceHeartbeatRequest(BaseModel):
    patient_id: str


class ConflictPayload(BaseModel):
    message: str
    current_version: int
    current_text: str
    current_title: str | None = None
    updated_by: str
    updated_at: datetime
