"""Database engine and request-scoped session dependency."""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core import config

# check_same_thread is a SQLite-only concern; guard it so switching
# DATABASE_URL to Postgres needs no code change.
connect_args = (
    {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(config.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=True, autoflush=True)


def get_db():
    """FastAPI dependency yielding a session that is always closed."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
