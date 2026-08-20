import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = os.getenv("POSTGRES_URL", "sqlite:///./data/sql_app.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="content_creator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True)
    filename = Column(String)
    title = Column(String, default="")
    description = Column(String, default="")
    tags = Column(String, default="")
    status = Column(String, default="uploaded")
    visibility = Column(String, default="private")
    classroom_id = Column(Integer, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    owner_id = Column(Integer, index=True)
    is_accepting_students = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClassroomStudent(Base):
    __tablename__ = "classroom_students"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, index=True)
    user_id = Column(Integer, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

class LearningHistory(Base):
    __tablename__ = "learning_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    video_id = Column(Integer, index=True)
    watched_at = Column(DateTime, default=datetime.utcnow)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    video_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    user_id = Column(Integer, nullable=True, index=True)
    target_id = Column(String, nullable=True)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

# In testing mode the conftest sets up its own engine & calls create_all itself.
# Skip the auto-create here so tests can inject a SQLite engine cleanly.
if not os.getenv("TESTING"):
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
