import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./svel.db")

# SQLAlchemy's psycopg dialect only recognizes the "postgresql://" scheme, but
# most hosted Postgres providers (and Docker's own POSTGRES_* defaults) still
# hand out "postgres://" URLs.
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql://", 1
    )

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Add columns introduced after the initial create_all to existing SQLite files.

    create_all only creates missing tables, not missing columns on tables that
    already exist, so schema additions need an explicit, idempotent ALTER here.

    This only applies to SQLite: a fresh Postgres database is always created
    from the current models via create_all, so there are no legacy columns to
    backfill there.
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return

    with engine.connect() as conn:
        existing_columns = {
            row[1] for row in conn.exec_driver_sql("PRAGMA table_info(adventures)")
        }
        if existing_columns and "photo_url" not in existing_columns:
            conn.exec_driver_sql("ALTER TABLE adventures ADD COLUMN photo_url TEXT")
            conn.commit()
        for column in ("water_temp_c", "wave_height_m", "tide_height_m"):
            if existing_columns and column not in existing_columns:
                conn.exec_driver_sql(f"ALTER TABLE adventures ADD COLUMN {column} REAL")
                conn.commit()
        if existing_columns and "activity_type" not in existing_columns:
            # NOT NULL + a constant DEFAULT means existing rows are backfilled
            # to 'scuba' automatically by SQLite as part of the ALTER itself.
            conn.exec_driver_sql(
                "ALTER TABLE adventures ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'scuba'"
            )
            conn.commit()
        if existing_columns and "tank_pressure_bar" not in existing_columns:
            conn.exec_driver_sql("ALTER TABLE adventures ADD COLUMN tank_pressure_bar REAL")
            conn.commit()
        if existing_columns and "gas_mix" not in existing_columns:
            conn.exec_driver_sql("ALTER TABLE adventures ADD COLUMN gas_mix TEXT")
            conn.commit()
        if existing_columns and "date" not in existing_columns:
            conn.exec_driver_sql("ALTER TABLE adventures ADD COLUMN date TEXT")
            conn.commit()
        if existing_columns and "created_at" not in existing_columns:
            # SQLite's ALTER TABLE rejects a non-constant default (e.g.
            # CURRENT_TIMESTAMP) on ADD COLUMN, so the column is added plain
            # here and backfilled below - the closest available stand-in for
            # existing rows' true creation date, since that was never
            # recorded before.
            conn.exec_driver_sql("ALTER TABLE adventures ADD COLUMN created_at TIMESTAMP")
            conn.commit()
        if existing_columns:
            # Runs every time (not just when the column was just added above)
            # so any row left over from an interrupted prior migration also
            # gets backfilled, not only rows present the moment the column
            # was created.
            conn.exec_driver_sql(
                "UPDATE adventures SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"
            )
            conn.commit()
        if existing_columns:
            # `adventure_photos` is a brand-new table, created automatically by
            # create_all (which runs before this function) - this backfills
            # each legacy single `photo_url` into it as that adventure's first
            # photo. The NOT IN guard makes it idempotent across repeated runs.
            conn.exec_driver_sql(
                """
                INSERT INTO adventure_photos (adventure_id, url, position)
                SELECT id, photo_url, 0 FROM adventures
                WHERE photo_url IS NOT NULL
                  AND id NOT IN (SELECT adventure_id FROM adventure_photos)
                """
            )
            conn.commit()

        profile_columns = {
            row[1] for row in conn.exec_driver_sql("PRAGMA table_info(user_profiles)")
        }
        for column in ("bio", "certifications", "gear"):
            if profile_columns and column not in profile_columns:
                conn.exec_driver_sql(f"ALTER TABLE user_profiles ADD COLUMN {column} TEXT")
                conn.commit()
