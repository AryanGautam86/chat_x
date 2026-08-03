"""Shared route dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

# auto_error=False so a missing header produces our own 401 with a WWW-
# Authenticate hint rather than FastAPI's bare 403.
_bearer = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated.",
    headers={"WWW-Authenticate": "Bearer"},
)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the signed-in user, or reject the request with 401."""
    if credentials is None or not credentials.credentials:
        raise _UNAUTHENTICATED

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise _UNAUTHENTICATED

    subject = payload.get("sub")
    if not subject:
        raise _UNAUTHENTICATED

    user = db.query(User).filter(User.id == int(subject)).one_or_none() if str(
        subject
    ).isdigit() else None

    # The token may outlive the account it names.
    if user is None:
        raise _UNAUTHENTICATED

    return user
