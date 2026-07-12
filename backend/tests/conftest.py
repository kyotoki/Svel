import os
import sys
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import routes.adventures as adventures_module  # noqa: E402
import routes.uploads as uploads_module  # noqa: E402
from auth import get_current_user_id  # noqa: E402
from database import Base, get_db  # noqa: E402
from main import app  # noqa: E402
from moderation import ModerationResult  # noqa: E402

DEFAULT_TEST_MARINE_CONDITIONS = {
    "water_temp_c": 24.5,
    "wave_height_m": 0.8,
    "tide_height_m": 0.3,
}

DEFAULT_TEST_MODERATION_RESULT = ModerationResult(rejected=False, scores={"none": 0.99}, flagged_categories={})

_current_user = {"id": "user_a"}


def _override_get_current_user_id():
    return _current_user["id"]


app.dependency_overrides[get_current_user_id] = _override_get_current_user_id

# A single shared in-memory engine for the whole test session. dependency_overrides
# lives on the one shared `app` instance, so if each test file installed its own
# get_db override, whichever file's assignment ran last during pytest collection
# would silently win for every test module - see fastapi_testing_gotchas memory.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    reset_current_user()
    yield


@pytest.fixture(autouse=True)
def stub_marine_weather():
    """Adventure creation calls out to a real third-party marine weather API.

    Stub it by default so the test suite doesn't depend on network access or an
    upstream service being up (fetch_marine_conditions is never allowed to make
    a real HTTP call during the test suite); tests that care about
    marine-weather behavior specifically can override this via mock.patch in
    their own body.
    """
    with mock.patch.object(
        adventures_module,
        "fetch_marine_conditions",
        return_value=dict(DEFAULT_TEST_MARINE_CONDITIONS),
    ):
        yield


@pytest.fixture(autouse=True)
def stub_moderation():
    """Photo upload calls out to a real third-party moderation API (Sightengine).

    Stub it by default so the test suite doesn't depend on network access or
    real Sightengine credentials (check_image_for_nudity is never allowed to
    make a real HTTP call during the test suite); tests that care about
    moderation behavior specifically (tests/test_moderation.py,
    tests/test_uploads.py's rejection/fail-open cases) override this via
    mock.patch in their own body.
    """
    with mock.patch.object(
        uploads_module,
        "check_image_for_nudity",
        return_value=DEFAULT_TEST_MODERATION_RESULT,
    ):
        yield


def as_user(user_id: str):
    _current_user["id"] = user_id


def reset_current_user():
    _current_user["id"] = "user_a"


def remove_auth_override():
    """Temporarily let requests hit the real auth dependency (e.g. to assert 401s)."""
    app.dependency_overrides.pop(get_current_user_id, None)


def restore_auth_override():
    app.dependency_overrides[get_current_user_id] = _override_get_current_user_id
