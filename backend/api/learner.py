from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db.database import get_db, User, Video, Bookmark, LearningHistory
from services.auth_service import get_current_user

router = APIRouter()

@router.get("/videos/public")
def get_public_videos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only return videos that are marked public
    videos = db.query(Video).filter(Video.visibility == "public").all()
    return videos

@router.post("/bookmark/{video_id}")
def toggle_bookmark(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    existing = db.query(Bookmark).filter(Bookmark.user_id == current_user.id, Bookmark.video_id == video_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Bookmark removed", "bookmarked": False}
    else:
        new_bookmark = Bookmark(user_id=current_user.id, video_id=video_id)
        db.add(new_bookmark)
        db.commit()
        return {"message": "Bookmark added", "bookmarked": True}

@router.get("/bookmarks")
def get_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()
    video_ids = [b.video_id for b in bookmarks]
    if not video_ids:
        return []
    videos = db.query(Video).filter(Video.id.in_(video_ids)).all()
    return videos

@router.post("/history/{video_id}")
def log_history(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # Log history (allow multiple watches, but let's just insert a new record)
    history = LearningHistory(user_id=current_user.id, video_id=video_id)
    db.add(history)
    db.commit()
    return {"message": "History logged"}

@router.get("/history")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get distinct videos watched by the user
    history = db.query(LearningHistory).filter(LearningHistory.user_id == current_user.id).order_by(LearningHistory.watched_at.desc()).all()
    
    # Extract unique video IDs while preserving order
    seen = set()
    video_ids = []
    for h in history:
        if h.video_id not in seen:
            seen.add(h.video_id)
            video_ids.append(h.video_id)
            
    if not video_ids:
        return []
        
    # Fetch videos
    videos = db.query(Video).filter(Video.id.in_(video_ids)).all()
    video_map = {v.id: v for v in videos}
    
    # Return in order
    result = [video_map[vid] for vid in video_ids if vid in video_map]
    return result
