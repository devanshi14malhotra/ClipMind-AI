"""
ClipMind AI — Full API Test Suite
Covers: Auth, User Management, Video Upload, Insights, Analytics,
        Learner features, Educator features, Admin features, Classrooms.
Run from project root: cd testing && pytest -v
"""

import pytest
import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from db.database import User, Video, Classroom, ClassroomStudent
from services.auth_service import get_password_hash


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def make_user(db: Session, email: str, role: str, password: str = "Test123!", name: str = None) -> User:
    user = User(
        email=email,
        name=name or role.replace("_", " ").title(),
        hashed_password=get_password_hash(password),
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client: TestClient, email: str, password: str = "Test123!") -> str:
    res = client.post("/api/auth/login", data={"username": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def make_video(db: Session, owner_id: int, title: str = "Test Video",
               status: str = "uploaded", classroom_id: int = None) -> Video:
    v = Video(owner_id=owner_id, title=title, filename="test.mp4",
              status=status, classroom_id=classroom_id)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


# ─────────────────────────────────────────────
#  MODULE 1 · AUTH & USER MANAGEMENT
# ─────────────────────────────────────────────

class TestAuthRegistration:
    def test_register_content_creator(self, client, db_session):
        res = client.post("/api/auth/register", json={
            "name": "Test Creator", "email": "new_creator@test.com",
            "password": "Test123!", "role": "content_creator"
        })
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_register_learner(self, client, db_session):
        res = client.post("/api/auth/register", json={
            "name": "Test Learner", "email": "new_learner@test.com",
            "password": "Test123!", "role": "learner"
        })
        assert res.status_code == 200

    def test_register_educator(self, client, db_session):
        res = client.post("/api/auth/register", json={
            "name": "Test Educator", "email": "new_edu@test.com",
            "password": "Test123!", "role": "educator"
        })
        assert res.status_code == 200

    def test_register_admin(self, client, db_session):
        res = client.post("/api/auth/register", json={
            "name": "Test Admin", "email": "new_admin@test.com",
            "password": "Test123!", "role": "administrator"
        })
        assert res.status_code == 200

    def test_register_duplicate_email(self, client, db_session):
        make_user(db_session, "dup@test.com", "learner")
        res = client.post("/api/auth/register", json={
            "name": "Dup", "email": "dup@test.com", "password": "Test123!", "role": "learner"
        })
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"].lower()

    def test_register_invalid_role(self, client, db_session):
        res = client.post("/api/auth/register", json={
            "name": "X", "email": "x@test.com", "password": "Test123!", "role": "hacker"
        })
        assert res.status_code == 400


class TestAuthLogin:
    def test_login_success_all_roles(self, client, db_session):
        for role in ["content_creator", "learner", "educator", "administrator"]:
            make_user(db_session, f"{role}@test.com", role)
            token = login(client, f"{role}@test.com")
            assert token

    def test_login_wrong_password(self, client, db_session):
        make_user(db_session, "x@test.com", "learner")
        res = client.post("/api/auth/login", data={"username": "x@test.com", "password": "wrong"})
        assert res.status_code == 401

    def test_login_unknown_email(self, client, db_session):
        res = client.post("/api/auth/login", data={"username": "nobody@test.com", "password": "pass"})
        assert res.status_code == 401

    def test_get_me(self, client, db_session):
        make_user(db_session, "me@test.com", "educator", name="Ed User")
        token = login(client, "me@test.com")
        res = client.get("/api/auth/me", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "me@test.com"
        assert data["name"] == "Ed User"
        assert data["role"] == "educator"

    def test_get_me_unauthenticated(self, client, db_session):
        res = client.get("/api/auth/me")
        assert res.status_code == 401


class TestProfileUpdate:
    def test_update_name(self, client, db_session):
        make_user(db_session, "edit@test.com", "content_creator", password="Test123!")
        token = login(client, "edit@test.com")
        res = client.put("/api/auth/me", json={
            "name": "New Name", "current_password": "Test123!", "new_password": ""
        }, headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["name"] == "New Name"

    def test_update_name_wrong_password(self, client, db_session):
        make_user(db_session, "edit2@test.com", "educator")
        token = login(client, "edit2@test.com")
        res = client.put("/api/auth/me", json={
            "name": "Fail", "current_password": "WrongPass", "new_password": ""
        }, headers=auth_header(token))
        assert res.status_code == 400

    def test_update_password(self, client, db_session):
        make_user(db_session, "pwchange@test.com", "learner", password="OldPass1!")
        token = login(client, "pwchange@test.com", "OldPass1!")
        res = client.put("/api/auth/me", json={
            "name": "Learner", "current_password": "OldPass1!", "new_password": "NewPass2!"
        }, headers=auth_header(token))
        assert res.status_code == 200
        # Should now be able to login with new password
        new_token = login(client, "pwchange@test.com", "NewPass2!")
        assert new_token


# ─────────────────────────────────────────────
#  MODULE 2 · VIDEO UPLOAD
# ─────────────────────────────────────────────

class TestVideoUpload:
    def test_upload_mp4(self, client, db_session):
        make_user(db_session, "creator@test.com", "content_creator")
        token = login(client, "creator@test.com")
        res = client.post(
            "/api/video/upload",
            headers=auth_header(token),
            data={"title": "My Video", "description": "A test", "tags": "ai,test"},
            files={"file": ("video.mp4", io.BytesIO(b"fakevideo"), "video/mp4")}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "uploaded"
        assert "video_id" in data

    def test_upload_without_title(self, client, db_session):
        make_user(db_session, "creator2@test.com", "content_creator")
        token = login(client, "creator2@test.com")
        res = client.post(
            "/api/video/upload",
            headers=auth_header(token),
            files={"file": ("video.mp4", io.BytesIO(b"fake"), "video/mp4")}
        )
        assert res.status_code == 200  # title is optional

    def test_upload_invalid_file_type(self, client, db_session):
        make_user(db_session, "creator3@test.com", "content_creator")
        token = login(client, "creator3@test.com")
        res = client.post(
            "/api/video/upload",
            headers=auth_header(token),
            files={"file": ("malware.exe", io.BytesIO(b"fake"), "application/octet-stream")}
        )
        assert res.status_code == 400

    def test_upload_unauthenticated(self, client, db_session):
        res = client.post(
            "/api/video/upload",
            files={"file": ("v.mp4", io.BytesIO(b"fake"), "video/mp4")}
        )
        assert res.status_code == 401

    def test_get_my_videos(self, client, db_session):
        user = make_user(db_session, "lister@test.com", "content_creator")
        token = login(client, "lister@test.com")
        make_video(db_session, user.id, "Video A")
        make_video(db_session, user.id, "Video B")
        res = client.get("/api/video/", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_cannot_see_other_users_videos(self, client, db_session):
        userA = make_user(db_session, "userA@test.com", "content_creator")
        userB = make_user(db_session, "userB@test.com", "content_creator")
        make_video(db_session, userA.id, "A's Secret Video")
        tokenB = login(client, "userB@test.com")
        res = client.get("/api/video/", headers=auth_header(tokenB))
        assert res.status_code == 200
        assert len(res.json()) == 0  # B should not see A's video

    def test_get_video_by_id(self, client, db_session):
        user = make_user(db_session, "getter@test.com", "content_creator")
        v = make_video(db_session, user.id, "My Video")
        token = login(client, "getter@test.com")
        res = client.get(f"/api/video/{v.id}", headers=auth_header(token))
        assert res.status_code == 200

    def test_get_video_wrong_owner(self, client, db_session):
        userA = make_user(db_session, "owner@test.com", "content_creator")
        userB = make_user(db_session, "thief@test.com", "content_creator")
        v = make_video(db_session, userA.id)
        tokenB = login(client, "thief@test.com")
        res = client.get(f"/api/video/{v.id}", headers=auth_header(tokenB))
        assert res.status_code == 404

    def test_delete_video(self, client, db_session):
        user = make_user(db_session, "deleter@test.com", "content_creator")
        v = make_video(db_session, user.id)
        token = login(client, "deleter@test.com")
        res = client.delete(f"/api/video/{v.id}", headers=auth_header(token))
        assert res.status_code == 200

    def test_process_video(self, client, db_session):
        user = make_user(db_session, "processor@test.com", "content_creator")
        v = make_video(db_session, user.id)
        token = login(client, "processor@test.com")
        res = client.post(
            f"/api/video/{v.id}/process",
            headers=auth_header(token),
            json={"generate_transcript": True, "generate_summary": True, "generate_key_moments": True}
        )
        assert res.status_code == 200
        assert res.json()["status"] == "processing"

    def test_visibility_change_wrong_password(self, client, db_session):
        user = make_user(db_session, "vis@test.com", "content_creator")
        v = make_video(db_session, user.id)
        token = login(client, "vis@test.com")
        res = client.put(
            f"/api/video/{v.id}/visibility",
            headers=auth_header(token),
            json={"visibility": "public", "password": "WrongPass"}
        )
        assert res.status_code == 403

    def test_visibility_change_correct_password(self, client, db_session):
        make_user(db_session, "vis2@test.com", "content_creator", password="Test123!")
        user = db_session.query(User).filter_by(email="vis2@test.com").first()
        v = make_video(db_session, user.id)
        token = login(client, "vis2@test.com")
        res = client.put(
            f"/api/video/{v.id}/visibility",
            headers=auth_header(token),
            json={"visibility": "public", "password": "Test123!"}
        )
        assert res.status_code == 200
        assert res.json()["visibility"] == "public"


# ─────────────────────────────────────────────
#  MODULE 3 & 4 & 5 · INSIGHTS (Transcript, Summary, Key Moments)
# ─────────────────────────────────────────────

class TestInsights:
    def test_transcript_not_found_returns_empty(self, client, db_session):
        user = make_user(db_session, "t@test.com", "content_creator")
        v = make_video(db_session, user.id)
        token = login(client, "t@test.com")
        res = client.get(f"/api/insights/transcript/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["segments"] == []

    def test_summary_not_found_returns_empty(self, client, db_session):
        user = make_user(db_session, "s@test.com", "content_creator")
        v = make_video(db_session, user.id)
        token = login(client, "s@test.com")
        res = client.get(f"/api/insights/summary/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["summary"] == ""
        assert data["short_summary"] == ""
        assert data["key_moments"] == []

    def test_summary_includes_short_summary_field(self, client, db_session):
        """Verify short_summary key is always present in summary response."""
        user = make_user(db_session, "ss@test.com", "educator")
        v = make_video(db_session, user.id)
        token = login(client, "ss@test.com")
        res = client.get(f"/api/insights/summary/{v.id}", headers=auth_header(token))
        assert "short_summary" in res.json()

    def test_materials_empty(self, client, db_session):
        user = make_user(db_session, "m@test.com", "educator")
        v = make_video(db_session, user.id)
        token = login(client, "m@test.com")
        res = client.get(f"/api/insights/materials/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json() == []


# ─────────────────────────────────────────────
#  MODULE 6 · ANALYTICS
# ─────────────────────────────────────────────

class TestAnalytics:
    def test_analytics_zero_state(self, client, db_session):
        make_user(db_session, "ana@test.com", "content_creator")
        token = login(client, "ana@test.com")
        res = client.get("/api/analytics/", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["total_videos"] == 0
        assert data["processed_videos"] == 0
        assert data["total_key_moments"] == 0
        assert "summaries_generated" in data
        assert "total_duration_minutes" in data

    def test_analytics_counts_own_videos(self, client, db_session):
        user = make_user(db_session, "ana2@test.com", "content_creator")
        make_video(db_session, user.id, "V1", status="completed")
        make_video(db_session, user.id, "V2", status="completed")
        make_video(db_session, user.id, "V3", status="uploaded")
        token = login(client, "ana2@test.com")
        res = client.get("/api/analytics/", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert data["total_videos"] == 3
        assert data["processed_videos"] == 2

    def test_analytics_unauthenticated(self, client, db_session):
        res = client.get("/api/analytics/")
        assert res.status_code == 401


# ─────────────────────────────────────────────
#  LEARNER FEATURES
# ─────────────────────────────────────────────

class TestLearnerFeatures:
    def test_get_public_videos(self, client, db_session):
        creator = make_user(db_session, "pub_creator@test.com", "content_creator")
        make_video(db_session, creator.id, "Public Vid", status="completed")
        # manually set visibility=public
        v = db_session.query(Video).first()
        v.visibility = "public"
        db_session.commit()

        learner = make_user(db_session, "pub_learner@test.com", "learner")
        token = login(client, "pub_learner@test.com")
        res = client.get("/api/learner/videos/public", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_bookmark_toggle_add(self, client, db_session):
        creator = make_user(db_session, "bk_creator@test.com", "content_creator")
        v = make_video(db_session, creator.id)
        learner = make_user(db_session, "bk_learner@test.com", "learner")
        token = login(client, "bk_learner@test.com")
        res = client.post(f"/api/learner/bookmark/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["bookmarked"] is True

    def test_bookmark_toggle_remove(self, client, db_session):
        creator = make_user(db_session, "bk2_creator@test.com", "content_creator")
        v = make_video(db_session, creator.id)
        learner = make_user(db_session, "bk2_learner@test.com", "learner")
        token = login(client, "bk2_learner@test.com")
        # Add
        client.post(f"/api/learner/bookmark/{v.id}", headers=auth_header(token))
        # Remove
        res = client.post(f"/api/learner/bookmark/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["bookmarked"] is False

    def test_get_bookmarks(self, client, db_session):
        creator = make_user(db_session, "bkl_creator@test.com", "content_creator")
        v = make_video(db_session, creator.id)
        learner = make_user(db_session, "bkl_learner@test.com", "learner")
        token = login(client, "bkl_learner@test.com")
        client.post(f"/api/learner/bookmark/{v.id}", headers=auth_header(token))
        res = client.get("/api/learner/bookmarks", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_log_and_get_history(self, client, db_session):
        creator = make_user(db_session, "hist_creator@test.com", "content_creator")
        v = make_video(db_session, creator.id)
        learner = make_user(db_session, "hist_learner@test.com", "learner")
        token = login(client, "hist_learner@test.com")
        client.post(f"/api/learner/history/{v.id}", headers=auth_header(token))
        res = client.get("/api/learner/history", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) == 1


# ─────────────────────────────────────────────
#  EDUCATOR FEATURES
# ─────────────────────────────────────────────

class TestEducatorFeatures:
    def test_educator_analytics(self, client, db_session):
        edu = make_user(db_session, "edu_ana@test.com", "educator")
        token = login(client, "edu_ana@test.com")
        res = client.get("/api/educator/analytics", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert "total_student_views" in data
        assert "total_bookmarks" in data

    def test_learner_cannot_access_educator_analytics(self, client, db_session):
        make_user(db_session, "lrn_ana@test.com", "learner")
        token = login(client, "lrn_ana@test.com")
        res = client.get("/api/educator/analytics", headers=auth_header(token))
        assert res.status_code == 403


# ─────────────────────────────────────────────
#  CLASSROOM SYSTEM
# ─────────────────────────────────────────────

class TestClassroom:
    def test_create_classroom(self, client, db_session):
        edu = make_user(db_session, "edu_cls@test.com", "educator")
        token = login(client, "edu_cls@test.com")
        res = client.post("/api/classroom/create", headers=auth_header(token), json={
            "name": "CS 101", "description": "Intro to CS"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "CS 101"
        assert "code" in data
        assert len(data["code"]) == 6

    def test_learner_joins_classroom(self, client, db_session):
        edu = make_user(db_session, "edu_join@test.com", "educator")
        edu_token = login(client, "edu_join@test.com")
        cls_res = client.post("/api/classroom/create", headers=auth_header(edu_token), json={"name": "Physics"})
        join_code = cls_res.json()["code"]

        learner = make_user(db_session, "lrn_join@test.com", "learner")
        lrn_token = login(client, "lrn_join@test.com")
        res = client.post("/api/classroom/join", headers=auth_header(lrn_token), json={"code": join_code})
        assert res.status_code == 200

    def test_wrong_join_code(self, client, db_session):
        learner = make_user(db_session, "lrn_bad@test.com", "learner")
        token = login(client, "lrn_bad@test.com")
        res = client.post("/api/classroom/join", headers=auth_header(token), json={"code": "ZZZZZZ"})
        assert res.status_code == 404

    def test_learner_cannot_create_classroom(self, client, db_session):
        make_user(db_session, "lrn_create@test.com", "learner")
        token = login(client, "lrn_create@test.com")
        res = client.post("/api/classroom/create", headers=auth_header(token), json={"name": "Hack"})
        assert res.status_code == 403

    def test_get_my_classrooms_educator(self, client, db_session):
        edu = make_user(db_session, "edu_list@test.com", "educator")
        token = login(client, "edu_list@test.com")
        client.post("/api/classroom/create", headers=auth_header(token), json={"name": "Class A"})
        client.post("/api/classroom/create", headers=auth_header(token), json={"name": "Class B"})
        res = client.get("/api/classroom/educator", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_get_learner_classrooms(self, client, db_session):
        edu = make_user(db_session, "edu_lc@test.com", "educator")
        edu_token = login(client, "edu_lc@test.com")
        cls_res = client.post("/api/classroom/create", headers=auth_header(edu_token), json={"name": "Math"})
        join_code = cls_res.json()["code"]

        learner = make_user(db_session, "lrn_lc@test.com", "learner")
        lrn_token = login(client, "lrn_lc@test.com")
        client.post("/api/classroom/join", headers=auth_header(lrn_token), json={"code": join_code})

        res = client.get("/api/classroom/learner", headers=auth_header(lrn_token))
        assert res.status_code == 200
        assert len(res.json()) == 1

    def test_get_classroom_students(self, client, db_session):
        edu = make_user(db_session, "edu_stu@test.com", "educator")
        edu_token = login(client, "edu_stu@test.com")
        cls_res = client.post("/api/classroom/create", headers=auth_header(edu_token), json={"name": "Biology"})
        join_code = cls_res.json()["code"]
        cls_id = cls_res.json()["id"]

        learner = make_user(db_session, "lrn_stu@test.com", "learner")
        lrn_token = login(client, "lrn_stu@test.com")
        client.post("/api/classroom/join", headers=auth_header(lrn_token), json={"code": join_code})

        res = client.get(f"/api/classroom/{cls_id}/students", headers=auth_header(edu_token))
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["email"] == "lrn_stu@test.com"

    def test_classroom_analytics(self, client, db_session):
        edu = make_user(db_session, "edu_ca@test.com", "educator")
        edu_token = login(client, "edu_ca@test.com")
        cls_res = client.post("/api/classroom/create", headers=auth_header(edu_token), json={"name": "Analytics Class"})
        cls_id = cls_res.json()["id"]

        res = client.get(f"/api/classroom/{cls_id}/analytics", headers=auth_header(edu_token))
        assert res.status_code == 200
        data = res.json()
        assert "total_views" in data


# ─────────────────────────────────────────────
#  ADMIN FEATURES
# ─────────────────────────────────────────────

class TestAdminFeatures:
    def test_admin_get_all_users(self, client, db_session):
        make_user(db_session, "admin@test.com", "administrator")
        make_user(db_session, "u1@test.com", "learner")
        make_user(db_session, "u2@test.com", "educator")
        token = login(client, "admin@test.com")
        res = client.get("/api/admin/users", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) >= 3

    def test_non_admin_cannot_access_admin(self, client, db_session):
        make_user(db_session, "notadmin@test.com", "educator")
        token = login(client, "notadmin@test.com")
        res = client.get("/api/admin/users", headers=auth_header(token))
        assert res.status_code == 403

    def test_admin_change_user_role(self, client, db_session):
        admin = make_user(db_session, "admin_role@test.com", "administrator")
        target = make_user(db_session, "target_role@test.com", "learner")
        token = login(client, "admin_role@test.com")
        res = client.put(
            f"/api/admin/users/{target.id}/role",
            headers=auth_header(token),
            json={"role": "educator"}
        )
        assert res.status_code == 200
        db_session.refresh(target)
        assert target.role == "educator"

    def test_admin_change_invalid_role(self, client, db_session):
        admin = make_user(db_session, "admin_bad_role@test.com", "administrator")
        target = make_user(db_session, "target_bad@test.com", "learner")
        token = login(client, "admin_bad_role@test.com")
        res = client.put(
            f"/api/admin/users/{target.id}/role",
            headers=auth_header(token),
            json={"role": "superuser"}
        )
        assert res.status_code == 400

    def test_admin_delete_user(self, client, db_session):
        admin = make_user(db_session, "admin_del@test.com", "administrator")
        victim = make_user(db_session, "victim@test.com", "learner")
        token = login(client, "admin_del@test.com")
        res = client.delete(f"/api/admin/users/{victim.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert db_session.query(User).filter_by(email="victim@test.com").first() is None

    def test_admin_system_stats(self, client, db_session):
        make_user(db_session, "admin_stats@test.com", "administrator")
        token = login(client, "admin_stats@test.com")
        res = client.get("/api/admin/system-stats", headers=auth_header(token))
        assert res.status_code == 200
        data = res.json()
        assert "total_users" in data
        assert "total_videos" in data
        assert "storage_utilized_mb" in data
        assert "active_processing_jobs" in data
        assert "activity_data" in data
        assert "role_distribution" in data

    def test_admin_audit_logs(self, client, db_session):
        make_user(db_session, "admin_logs@test.com", "administrator")
        token = login(client, "admin_logs@test.com")
        res = client.get("/api/admin/audit-logs", headers=auth_header(token))
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_admin_get_all_videos(self, client, db_session):
        admin = make_user(db_session, "admin_vids@test.com", "administrator")
        creator = make_user(db_session, "creator_av@test.com", "content_creator")
        make_video(db_session, creator.id, "Admin Can See This")
        token = login(client, "admin_vids@test.com")
        res = client.get("/api/admin/videos", headers=auth_header(token))
        assert res.status_code == 200
        assert len(res.json()) >= 1

    def test_admin_delete_video(self, client, db_session):
        admin = make_user(db_session, "admin_delv@test.com", "administrator")
        creator = make_user(db_session, "creator_dv@test.com", "content_creator")
        v = make_video(db_session, creator.id)
        token = login(client, "admin_delv@test.com")
        res = client.delete(f"/api/admin/videos/{v.id}", headers=auth_header(token))
        assert res.status_code == 200
        assert db_session.query(Video).filter_by(id=v.id).first() is None


# ─────────────────────────────────────────────
#  HEALTH CHECK
# ─────────────────────────────────────────────

class TestHealth:
    def test_health_endpoint(self, client, db_session):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
