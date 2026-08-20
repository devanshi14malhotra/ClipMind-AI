from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from db.database import User
from services.auth_service import get_password_hash

def setup_demo_users(db_session: Session):
    roles = [
        {"email": "admin@clipmind.com", "role": "administrator", "name": "Admin"},
        {"email": "educator@clipmind.com", "role": "educator", "name": "Educator"},
        {"email": "learner@clipmind.com", "role": "learner", "name": "Learner"},
        {"email": "creator@clipmind.com", "role": "content_creator", "name": "Creator"}
    ]
    for r in roles:
        user = User(
            email=r["email"],
            name=r["name"],
            hashed_password=get_password_hash(r["role"].replace("administrator", "admin") + "123" if r["role"] != "content_creator" else "creator123"),
            role=r["role"]
        )
        db_session.add(user)
    db_session.commit()

def test_login_success(client: TestClient, db_session: Session):
    setup_demo_users(db_session)
    response = client.post("/api/auth/login", data={"username": "admin@clipmind.com", "password": "admin123"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_failure(client: TestClient, db_session: Session):
    setup_demo_users(db_session)
    response = client.post("/api/auth/login", data={"username": "admin@clipmind.com", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"
