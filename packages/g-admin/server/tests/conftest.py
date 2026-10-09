import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import gadmin  # noqa: E402


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "gadmin.db"
    monkeypatch.setenv("GADMIN_DB_PATH", str(path))
    return path


@pytest.fixture(autouse=True)
def reset_rate_limit():
    gadmin._last_create_at = 0.0
    yield
    gadmin._last_create_at = 0.0


@pytest.fixture
def app(db_path):
    """Demonstrates mounting the router in a scratch FastAPI app, exactly
    as a consumer would (minus seed's importlib auto-discovery)."""
    application = FastAPI()
    application.include_router(gadmin.router, prefix="/api/gadmin")
    yield application
    gadmin.GADMIN_VERIFY = None


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def as_admin(monkeypatch):
    """Wires GADMIN_VERIFY to treat a `admin=1` cookie as full auth:
    the non-seed integration path (no core.api.admin importable here)."""

    def _verify(request):
        return request.cookies.get("admin") == "1"

    gadmin.GADMIN_VERIFY = _verify
    return {"admin": "1"}


@pytest.fixture
def token(monkeypatch):
    monkeypatch.setenv("GADMIN_TOKEN", "test-token-value")
    return "test-token-value"
