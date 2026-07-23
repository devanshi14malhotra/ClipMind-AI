from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="content_creator")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    videos = relationship("Video", back_populates="owner")

class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String, nullable=True)
    file_url = Column(String)
    duration_sec = Column(Integer, nullable=True)
    format = Column(String, nullable=True)
    size_mb = Column(Float, nullable=True)
    status = Column(String, default="uploaded")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    thumbnail_url = Column(String, nullable=True)
    
    # Store JSON representation as text for transcripts/summaries
    transcript = Column(String, nullable=True)
    short_summary = Column(String, nullable=True)
    detailed_summary = Column(String, nullable=True)

    owner = relationship("User", back_populates="videos")
