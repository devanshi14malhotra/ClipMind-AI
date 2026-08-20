"""
conftest.py — Shared test fixtures for ClipMind AI test suite.
Uses an in-memory SQLite DB so tests never touch the real Postgres DB.
MongoDB calls are not made in unit tests (AI pipeline is not invoked).
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── MUST be set before any backend module is imported ─────────────────────────
# This prevents db/database.py from trying to connect to Postgres at import time.
os.environ["TESTING"] = "1"
os.environ["POSTGRES_URL"] = "sqlite:///:memory:"
os.environ["MONGO_URL"] = "mongodb://localhost:27017/"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["GROQ_API_KEYS"] = "dummy_key"

# Add backend directory to sys.path so all backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import unittest.mock
from mongomock_motor import AsyncMongoMockClient

# Mock MongoDB client BEFORE importing main
mock_mongo_client = AsyncMongoMockClient()
def override_get_mongo_db():
    return mock_mongo_client["clipmind_db"]

patcher = unittest.mock.patch("db.mongodb.get_mongo_db", side_effect=override_get_mongo_db)
patcher.start()

from main import app
from db.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── In-memory SQLite (isolated, fast, no real DB needed) ──────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Patch SessionLocal globally so background tasks use it
session_patcher = unittest.mock.patch("db.database.SessionLocal", new=TestingSessionLocal)
session_patcher.start()

# Mock process_video_task to avoid running heavy async background work that races with DB drops
unittest.mock.patch("api.video.process_video_task").start()


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# ── client fixture: module-scoped so the FastAPI app is only started once ──────
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ── db_session fixture: function-scoped to isolate each test ──────────────────
@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
