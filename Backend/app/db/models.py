"""SQLAlchemy ORM models."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)


class User(Base):
    """An account, created by password signup or by Google sign-in.

    password_hash and google_sub are both nullable: a password account has no
    google_sub, and a Google account has no password. An account can end up with
    both if the same email arrives by each route.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
