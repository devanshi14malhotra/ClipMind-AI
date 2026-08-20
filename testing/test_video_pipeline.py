import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from db.database import User, Video
from services.auth_service import get_password_hash

@pytest.fixture
def auth_token(client: TestClient, db_session: Session):
    user = User(email="test@clipmind.com", name="Test", hashed_password=get_password_hash("password"), role="educator")
    db_session.add(user)
    db_session.commit()
    res = client.post("/api/auth/login", data={"username": "test@clipmind.com", "password": "password"})
    return res.json()["access_token"]

def test_video_upload_local(client: TestClient, auth_token: str):
    file_content = b"fake video content"
    res = client.post(
        "/api/video/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        data={"title": "Test Video", "description": "Desc", "tags": "test"},
        files={"file": ("test.mp4", io.BytesIO(file_content), "video/mp4")}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "uploaded"
    assert "video_id" in res.json()

def test_video_upload_missing_classroom_id(client: TestClient, auth_token: str):
    file_content = b"fake video content"
    # Testing the exact 422 error fix: no classroom_id should be perfectly accepted
    res = client.post(
        "/api/video/upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        data={"title": "Test Video"},
        files={"file": ("test.mp4", io.BytesIO(file_content), "video/mp4")}
    )
    assert res.status_code == 200

def test_video_processing_endpoint(client: TestClient, auth_token: str, db_session: Session):
    # Setup dummy video
    user = db_session.query(User).first()
    v = Video(owner_id=user.id, title="Test", filename="test.mp4")
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)

    res = client.post(
        f"/api/video/{v.id}/process",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"generate_transcript": True, "generate_summary": True, "generate_key_moments": True}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "processing"
