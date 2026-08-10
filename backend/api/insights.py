from fastapi import APIRouter, Depends, HTTPException
from db.mongodb import get_mongo_db
from db.database import get_db, Video
from services.auth_service import get_current_user
from sqlalchemy.orm import Session
from bson import json_util
import json

router = APIRouter()

@router.get("/transcript/{video_id}")
async def get_transcript(video_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    mongo_db = get_mongo_db()
    transcript = await mongo_db.transcripts.find_one({"video_id": video_id})
    if not transcript:
        return {"segments": [], "full_text": ""}
    
    # Remove MongoDB's internal _id field
    transcript.pop("_id", None)
    return transcript

@router.get("/summary/{video_id}")
async def get_summary(video_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    mongo_db = get_mongo_db()
    summary = await mongo_db.summaries.find_one({"video_id": video_id})
    if not summary:
        return {"summary": "", "key_moments": [], "keywords": []}
    
    # Remove MongoDB's internal _id field
    summary.pop("_id", None)
    return summary
