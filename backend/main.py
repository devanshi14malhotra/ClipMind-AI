import os
import sys
import static_ffmpeg
static_ffmpeg.add_paths()
from dotenv import load_dotenv

if not os.getenv("TESTING"):
    load_dotenv()


# Set HuggingFace Token for local models if present
if os.getenv("HF_TOKEN"):
    os.environ["HF_TOKEN"] = os.getenv("HF_TOKEN").split(",")[0].strip()

# Ensure the 'bin' folder is added to the system PATH so FFmpeg can be found globally
bin_path = os.path.join(os.path.dirname(__file__), "bin")
os.environ["PATH"] += os.pathsep + bin_path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import auth, video, admin, insights, analytics, learner, educator, classroom
from db.database import SessionLocal, User
from services.auth_service import get_password_hash

app = FastAPI(title="ClipMind AI Backend")

@app.on_event("startup")
def create_admin_user():
    if os.getenv("TESTING"):
        return
        
    db = SessionLocal()
    roles_to_seed = [
        {"name": "Educator", "email": "educator@clipmind.com", "role": "educator"},
        {"name": "Content Creator", "email": "creator@clipmind.com", "role": "content_creator"},
        {"name": "Administrator", "email": "admin@clipmind.com", "role": "administrator"},
        {"name": "Learner", "email": "learner@clipmind.com", "role": "learner"}
    ]
    
    for user_data in roles_to_seed:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if not user:
            pwd = user_data["role"].replace("administrator", "admin") + "123"
            if pwd == "content_creator123":
                pwd = "creator123"
            hashed_password = get_password_hash(pwd)
            new_user = User(
                name=user_data["name"],
                email=user_data["email"],
                hashed_password=hashed_password,
                role=user_data["role"]
            )
            db.add(new_user)
            db.commit()
    db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(video.router, prefix="/api/video", tags=["video"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(learner.router, prefix="/api/learner", tags=["learner"])
app.include_router(educator.router, prefix="/api/educator", tags=["educator"])
app.include_router(classroom.router, prefix="/api/classroom", tags=["classroom"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
