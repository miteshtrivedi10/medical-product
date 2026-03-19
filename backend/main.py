from __future__ import annotations

import logging

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import (
    CreateEncounterRequest,
    EncounterResponse,
    LoginRequest,
    LoginResponse,
    MedicalHistoryResponse,
    PatientDetailResponse,
    PatientListItemResponse,
    PresenceHeartbeatRequest,
    SaveEncounterRequest,
    SaveMedicalHistoryRequest,
    UserResponse,
)
from app.services.auth_service import auth_service, get_current_user
from app.services.patient_service import VersionConflictError, patient_service
from app.services.summary_service import summary_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(VersionConflictError)
async def version_conflict_handler(_, exc: VersionConflictError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=exc.payload.model_dump(mode="json"),
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    token, user = auth_service.login(payload.username, payload.password)
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
        ),
    )


@app.get("/api/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
    )


@app.get("/api/patients", response_model=list[PatientListItemResponse])
def list_patients(current_user=Depends(get_current_user)) -> list[PatientListItemResponse]:
    return patient_service.list_patients(current_user)


@app.get("/api/patients/{patient_id}", response_model=PatientDetailResponse)
def get_patient_detail(
    patient_id: str, current_user=Depends(get_current_user)
) -> PatientDetailResponse:
    return patient_service.get_patient_detail(patient_id, current_user)


@app.put("/api/patients/{patient_id}/medical-history", response_model=MedicalHistoryResponse)
def save_medical_history(
    patient_id: str,
    payload: SaveMedicalHistoryRequest,
    current_user=Depends(get_current_user),
) -> MedicalHistoryResponse:
    response = patient_service.save_medical_history(
        patient_id=patient_id,
        text=payload.text,
        expected_version=payload.expected_version,
        current_user=current_user,
    )
    summary_service.schedule_generation(patient_id, current_user)
    return response


@app.post("/api/patients/{patient_id}/encounters", response_model=EncounterResponse)
def create_encounter(
    patient_id: str,
    payload: CreateEncounterRequest,
    current_user=Depends(get_current_user),
) -> EncounterResponse:
    response = patient_service.create_encounter(
        patient_id=patient_id,
        title=payload.title,
        text=payload.text,
        current_user=current_user,
    )
    summary_service.schedule_generation(patient_id, current_user)
    return response


@app.get("/api/encounters/{encounter_id}", response_model=EncounterResponse)
def get_encounter(
    encounter_id: str, current_user=Depends(get_current_user)
) -> EncounterResponse:
    return patient_service.get_encounter(encounter_id, current_user)


@app.put("/api/encounters/{encounter_id}", response_model=EncounterResponse)
def save_encounter(
    encounter_id: str,
    payload: SaveEncounterRequest,
    current_user=Depends(get_current_user),
) -> EncounterResponse:
    response = patient_service.save_encounter(
        encounter_id=encounter_id,
        title=payload.title,
        text=payload.text,
        expected_version=payload.expected_version,
        current_user=current_user,
    )
    summary_service.schedule_generation(response.patient_id, current_user)
    return response


@app.post("/api/presence")
def presence_heartbeat(
    payload: PresenceHeartbeatRequest,
    current_user=Depends(get_current_user),
) -> dict[str, object]:
    active_editors = patient_service.heartbeat(payload.patient_id, current_user)
    return {"active_editors": [editor.model_dump() for editor in active_editors]}
