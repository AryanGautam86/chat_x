"""Authentication endpoints.

These are the only routes besides /health and the static bundle that stay open —
you cannot log in through a door that requires being logged in.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import current_user
from app.core import config
from app.core.security import create_access_token
from app.db.models import User
from app.db.session import get_db
from app.services import auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=config.MIN_PASSWORD_LENGTH, max_length=256)
    name: str = Field(default="", max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class GoogleRequest(BaseModel):
    credential: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    email: str
    name: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _issue(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id),
        user=UserOut(id=user.id, email=user.email, name=user.name),
    )


@router.get("/config")
def auth_config() -> dict:
    """What the login page needs to know before anyone signs in."""
    return {
        "google_enabled": bool(config.GOOGLE_CLIENT_ID),
        "google_client_id": config.GOOGLE_CLIENT_ID,
        "min_password_length": config.MIN_PASSWORD_LENGTH,
    }


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        user = auth.register(db, body.email, body.password, body.name)
    except auth.AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _issue(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        user = auth.authenticate(db, body.email, body.password)
    except auth.AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return _issue(user)


@router.post("/google", response_model=TokenOut)
def google_login(body: GoogleRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        user = auth.login_with_google(db, body.credential)
    except auth.AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return _issue(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut(id=user.id, email=user.email, name=user.name)
