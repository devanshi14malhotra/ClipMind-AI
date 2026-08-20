from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db, User
from services.auth_service import get_current_user
from pydantic import BaseModel
from typing import List
from db.database import Video, AuditLog, LearningHistory, Bookmark

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class RoleUpdateRequest(BaseModel):
    role: str

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this endpoint"
        )
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_all_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    request: RoleUpdateRequest,
    admin: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    valid_roles = ["content_creator", "educator", "learner", "administrator"]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = request.role
    
    log = AuditLog(
        action="role_updated",
        user_id=admin.id,
        target_id=str(user.id),
        details=f"Updated user {user.email} to {request.role}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"User {user.email} updated to {request.role}"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, 
    admin: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.query(Video).filter(Video.owner_id == user_id).delete()
    db.query(LearningHistory).filter(LearningHistory.user_id == user_id).delete()
    db.query(Bookmark).filter(Bookmark.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    
    log = AuditLog(
        action="user_deleted",
        user_id=admin.id,
        target_id=str(user_id),
        details=f"Deleted user {user.email}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"User {user.email} deleted successfully."}

from datetime import datetime, timedelta
from sqlalchemy import func

@router.get("/system-stats")
def get_system_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_videos = db.query(Video).count()
    
    # Calculate REAL storage from actual disk files
    import os
    from services.video_processor import UPLOAD_DIR
    storage_bytes = 0
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                storage_bytes += os.path.getsize(fpath)
    storage_mb = round(storage_bytes / (1024 * 1024), 2)
    
    today = datetime.utcnow().date()
    activity_data = []
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        # Cast to Date type in PostgreSQL for comparison
        from sqlalchemy import cast, Date
        
        videos_watched = db.query(LearningHistory).filter(cast(LearningHistory.watched_at, Date) == target_date).count()
        videos_uploaded = db.query(Video).filter(cast(Video.created_at, Date) == target_date).count()
        
        activity_data.append({
            "name": target_date.strftime("%a"),
            "watched": videos_watched,
            "uploaded": videos_uploaded
        })

    roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    role_distribution = [{"name": r[0].replace("_", " ").title(), "value": r[1]} for r in roles]
    
    video_statuses = db.query(Video.status, func.count(Video.id)).group_by(Video.status).all()
    video_status_distribution = [{"name": s[0].title(), "value": s[1]} for s in video_statuses]
    
    return {
        "total_users": total_users,
        "total_videos": total_videos,
        "storage_utilized_mb": storage_mb,
        "active_processing_jobs": db.query(Video).filter(Video.status == "processing").count(),
        "activity_data": activity_data,
        "role_distribution": role_distribution,
        "video_status_distribution": video_status_distribution
    }


@router.get("/audit-logs")
def get_audit_logs(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    logs_with_users = db.query(AuditLog, User.name).outerjoin(User, AuditLog.user_id == User.id).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    return [{
        "id": log.AuditLog.id,
        "timestamp": log.AuditLog.timestamp,
        "action": log.AuditLog.action,
        "user_id": log.AuditLog.user_id,
        "user_name": log.name or f"User #{log.AuditLog.user_id}",
        "target_id": log.AuditLog.target_id,
        "details": log.AuditLog.details
    } for log in logs_with_users]

@router.get("/videos")
def get_all_videos(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    videos_with_users = db.query(Video, User.name).outerjoin(User, Video.owner_id == User.id).order_by(Video.created_at.desc()).all()
    # Convert to dict to avoid serialization issues
    return [{
        "id": v.Video.id,
        "owner_id": v.Video.owner_id,
        "owner_name": v.name or f"User #{v.Video.owner_id}",
        "title": v.Video.title,
        "filename": v.Video.filename,
        "status": v.Video.status,
        "created_at": v.Video.created_at.isoformat() if v.Video.created_at else None
    } for v in videos_with_users]

@router.delete("/videos/{video_id}")
def delete_video(video_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    db.query(LearningHistory).filter(LearningHistory.video_id == video_id).delete()
    db.query(Bookmark).filter(Bookmark.video_id == video_id).delete()
    db.query(Video).filter(Video.id == video_id).delete()
    
    log = AuditLog(
        action="video_deleted",
        user_id=admin.id,
        target_id=str(video_id),
        details=f"Admin deleted video '{video.title}' (ID: {video_id})"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Video deleted successfully"}

from db.mongodb import get_mongo_db

@router.get("/videos/{video_id}/details")
async def get_video_details(video_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video_data = {c.name: getattr(video, c.name) for c in video.__table__.columns}
    if video_data.get("created_at"):
        video_data["created_at"] = video_data["created_at"].isoformat()
    
    mongo_db = get_mongo_db()
    summary = await mongo_db.summaries.find_one({"video_id": video_id})
    if summary:
        summary["_id"] = str(summary["_id"])
        video_data["summary"] = summary
    else:
        video_data["summary"] = None
        
    transcript = await mongo_db.transcripts.find_one({"video_id": video_id})
    if transcript:
        transcript["_id"] = str(transcript["_id"])
        video_data["transcript"] = transcript
    else:
        video_data["transcript"] = None
        
    return video_data
