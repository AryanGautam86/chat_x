"""Password hashing and access tokens."""

import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core import config


def _prepare(password: str) -> bytes:
    """Normalise a password to a fixed-length input for bcrypt.

    bcrypt silently ignores everything past 72 bytes, which would make two long
    passwords sharing a prefix interchangeable. SHA-256 first, then base64, so
    any length maps to 44 bytes with no truncation.
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    # Google-only accounts have no password hash; they must not be loggable
    # via the password form.
    if not password_hash:
        return False

    try:
        return bcrypt.checkpw(_prepare(password), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed/corrupt hash in the database.
        return False


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=config.ACCESS_TOKEN_TTL_MINUTES),
    }

    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Return the token payload, or None if it is invalid or expired."""
    try:
        return jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM],
        )
    except jwt.PyJWTError:
        return None
