from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db, Video, User
from services.auth_service import get_current_user
from services.video_processor import process_video_task, UPLOAD_DIR
import os
import shutil

router = APIRouter()

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_extensions = (".mp4", ".mov", ".avi", ".webm", ".mkv")
    is_valid_type = file.content_type and file.content_type.startswith("video/")
    is_valid_ext = file.filename and file.filename.lower().endswith(valid_extensions)
    
    if not (is_valid_type or is_valid_ext):
        raise HTTPException(status_code=400, detail=f"File must be a video. Received: {file.content_type}")

    # Save to database
    new_video = Video(owner_id=current_user.id, filename=file.filename)
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{new_video.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Queue processing task
    background_tasks.add_task(process_video_task, file_path, new_video.id, db)
    
    return {"message": "Video uploaded successfully", "video_id": new_video.id, "status": "processing"}

@router.get("/")
def get_videos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    videos = db.query(Video).filter(Video.owner_id == current_user.id).all()
    return videos

@router.get("/{video_id}")
def get_video(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video
