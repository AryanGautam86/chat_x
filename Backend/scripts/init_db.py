"""Create the database tables.

Usually unnecessary — app startup does this too — but useful for setting up a
database before the first run.

Usage (from Backend/):
    python -m scripts.init_db
"""

from app.core import config
from app.db.models import Base
from app.db.session import engine


def main() -> None:
    print(f"Creating tables in {config.DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("Database ready.")


if __name__ == "__main__":
    main()
