import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Set HuggingFace Token for local models if present
if os.getenv("HF_TOKEN"):
    os.environ["HF_TOKEN"] = os.getenv("HF_TOKEN").split(",")[0].strip()

# Ensure the 'bin' folder is added to the system PATH so FFmpeg can be found globally
bin_path = os.path.join(os.path.dirname(__file__), "bin")
os.environ["PATH"] += os.pathsep + bin_path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import auth, video, admin, insights
from db.database import SessionLocal, User
from services.auth_service import get_password_hash

app = FastAPI(title="ClipMind AI Backend")

@app.on_event("startup")
def create_admin_user():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "administrator").first()
    if not admin:
        hashed_password = get_password_hash("adminpassword")
        admin_user = User(
            name="Admin",
            email="admin@clipmind.com",
            hashed_password=hashed_password,
            role="administrator"
        )
        db.add(admin_user)
        db.commit()
    db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(video.router, prefix="/api/video", tags=["video"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
