from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import Header, HTTPException, status

from app.models import UserRecord
from app.store import store

logger = logging.getLogger("app.services.auth")


class AuthService:
    def login(self, username: str, password: str) -> tuple[str, UserRecord]:
        logger.info("Login attempt for username=%s", username)
        for user in store.users.values():
            if user.username == username and user.password == password:
                token = str(uuid4())
                with store.lock:
                    store.sessions[token] = user.id
                logger.info("Login success for user_id=%s", user.id)
                return token, user
        logger.warning("Login failed for username=%s", username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    def resolve_user(self, authorization: str | None) -> UserRecord:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
            )
        token = authorization.removeprefix("Bearer ").strip()
        user_id = store.sessions.get(token)
        if not user_id or user_id not in store.users:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired.",
            )
        return store.users[user_id]


auth_service = AuthService()


def get_current_user(authorization: str | None = Header(default=None)) -> UserRecord:
    return auth_service.resolve_user(authorization)
