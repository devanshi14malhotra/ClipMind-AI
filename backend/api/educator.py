from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from db.database import get_db, User, Video, LearningHistory, Bookmark
from db.mongodb import get_mongo_db
from services.auth_service import get_current_user, RoleChecker
from typing import List

router = APIRouter()

require_educator = RoleChecker(["educator", "administrator"])

@router.put("/video/{video_id}/transcript")
async def edit_transcript(
    video_id: int, 
    segments: list = Body(...),
    current_user: User = Depends(require_educator), 
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video and current_user.role != "administrator":
        raise HTTPException(status_code=404, detail="Video not found or you don't have permission")
        
    mongo_db = get_mongo_db()
    
    # Update transcript segments in MongoDB
    await mongo_db.transcripts.update_one(
        {"video_id": video_id},
        {"$set": {"segments": segments}}
    )
    
    return {"message": "Transcript updated successfully"}

@router.post("/video/{video_id}/materials")
async def generate_materials(
    video_id: int, 
    material_type: str = Body(...), # "quiz" or "study_guide"
    current_user: User = Depends(require_educator), 
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video and current_user.role != "administrator":
        raise HTTPException(status_code=404, detail="Video not found")
        
    mongo_db = get_mongo_db()
    transcript = await mongo_db.transcripts.find_one({"video_id": video_id})
    if not transcript:
        raise HTTPException(status_code=404, detail="No transcript found to generate materials from")
        
    full_text = transcript.get("full_text", "")
    
    from ai.api_client import groq_generate_materials
    
    try:
        real_material = groq_generate_materials(full_text, material_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
        
    # Store it in MongoDB so it can be retrieved later
    await mongo_db.learning_materials.update_one(
        {"video_id": video_id, "type": material_type},
        {"$set": {"content": real_material, "video_id": video_id, "type": material_type}},
        upsert=True
    )
    
    return {"message": f"{material_type} generated successfully", "data": real_material}

@router.get("/analytics")
def get_classroom_analytics(current_user: User = Depends(require_educator), db: Session = Depends(get_db)):
    # Get all videos by this educator
    videos = db.query(Video).filter(Video.owner_id == current_user.id).all()
    video_ids = [v.id for v in videos]
    
    if not video_ids:
        return {"total_student_views": 0, "total_bookmarks": 0, "videos": []}
        
    # Get views
    history = db.query(LearningHistory).filter(LearningHistory.video_id.in_(video_ids)).all()
    
    # Get bookmarks
    bookmarks = db.query(Bookmark).filter(Bookmark.video_id.in_(video_ids)).all()
    
    return {
        "total_student_views": len(history),
        "total_bookmarks": len(bookmarks),
        "unique_students": len(set(h.user_id for h in history)),
        "videos_tracked": len(video_ids)
    }
