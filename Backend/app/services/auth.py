"""Account creation and sign-in.

Two routes in, one kind of session out: every path ends with a JWT for a row in
the users table.
"""

import logging

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.core import config
from app.core.security import hash_password, verify_password
from app.db.models import User

logger = logging.getLogger(__name__)

# Google's own issuers; anything else means the token isn't from Google.
_GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class AuthError(Exception):
    """Sign-in or signup could not be completed."""


def normalise_email(email: str) -> str:
    return (email or "").strip().lower()


def find_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == normalise_email(email)).one_or_none()


def register(db: Session, email: str, password: str, name: str = "") -> User:
    email = normalise_email(email)

    if not email or "@" not in email:
        raise AuthError("Enter a valid email address.")

    if len(password or "") < config.MIN_PASSWORD_LENGTH:
        raise AuthError(
            f"Password must be at least {config.MIN_PASSWORD_LENGTH} characters."
        )

    existing = find_by_email(db, email)

    if existing:
        # An account created via Google has no password; let that person add one
        # rather than telling them the email is taken by someone else.
        if existing.password_hash:
            raise AuthError("An account with this email already exists.")

        existing.password_hash = hash_password(password)
        if name and not existing.name:
            existing.name = name.strip()
        db.commit()
        db.refresh(existing)
        logger.info("Added a password to existing Google account %s", email)
        return existing

    user = User(
        email=email,
        name=(name or "").strip() or email.split("@")[0],
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Registered %s", email)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = find_by_email(db, email)

    # Same message for "no such user" and "wrong password" so the endpoint
    # can't be used to enumerate which emails have accounts.
    if not user or not verify_password(password, user.password_hash):
        raise AuthError("Incorrect email or password.")

    return user


def login_with_google(db: Session, credential: str) -> User:
    """Verify a Google ID token and return the matching account, creating it if new."""
    if not config.GOOGLE_CLIENT_ID:
        raise AuthError("Google sign-in is not configured on this server.")

    try:
        claims = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            config.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        # Covers a bad signature, the wrong audience, and expiry.
        logger.warning("Rejected Google credential: %s", exc)
        raise AuthError("Google sign-in failed. Please try again.") from exc

    if claims.get("iss") not in _GOOGLE_ISSUERS:
        raise AuthError("Google sign-in failed. Please try again.")

    if not claims.get("email_verified", False):
        raise AuthError("Your Google email address is not verified.")

    subject = claims.get("sub")
    email = normalise_email(claims.get("email", ""))

    if not subject or not email:
        raise AuthError("Google sign-in returned an incomplete profile.")

    user = db.query(User).filter(User.google_sub == subject).one_or_none()
    if user:
        return user

    # Same person, previously registered with a password: link the accounts
    # rather than failing on the unique email constraint.
    user = find_by_email(db, email)
    if user:
        user.google_sub = subject
        if not user.name:
            user.name = claims.get("name") or email.split("@")[0]
        db.commit()
        db.refresh(user)
        logger.info("Linked Google identity to existing account %s", email)
        return user

    user = User(
        email=email,
        name=claims.get("name") or email.split("@")[0],
        google_sub=subject,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created account from Google sign-in: %s", email)
    return user
