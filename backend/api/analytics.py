from fastapi import APIRouter, Depends
from db.database import get_db, Video
from db.mongodb import get_mongo_db
from services.auth_service import get_current_user
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/")
async def get_analytics(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Total videos uploaded
    total_videos = db.query(Video).filter(Video.owner_id == current_user.id).count()
    
    # 2. Videos processed successfully
    processed_videos = db.query(Video).filter(Video.owner_id == current_user.id, Video.status == "completed").count()
    
    # 3. Get all video IDs for this user
    user_videos = db.query(Video.id).filter(Video.owner_id == current_user.id).all()
    video_ids = [v[0] for v in user_videos]
    
    if not video_ids:
        return {
            "total_videos": 0,
            "processed_videos": 0,
            "total_key_moments": 0,
            "top_keywords": [],
            "total_duration_minutes": 0.0
        }
    
    mongo_db = get_mongo_db()
    
    # Process summaries for keywords and key moments
    summaries = await mongo_db.summaries.find({"video_id": {"$in": video_ids}}).to_list(length=None)
    
    keyword_freq = {}
    total_key_moments = 0
    for s in summaries:
        for kw in s.get("keywords", []):
            kw_clean = kw.strip().title()
            keyword_freq[kw_clean] = keyword_freq.get(kw_clean, 0) + 1
        total_key_moments += len(s.get("key_moments", []))
            
    # Get top 5 keywords
    top_keywords = [{"keyword": k, "count": v} for k, v in sorted(keyword_freq.items(), key=lambda item: item[1], reverse=True)[:5]]
    
    # Calculate estimated total duration based on transcripts (last segment end time)
    transcripts = await mongo_db.transcripts.find({"video_id": {"$in": video_ids}}).to_list(length=None)
    total_duration_seconds = 0
    for t in transcripts:
        segments = t.get("segments", [])
        if segments:
            # The last segment's end time is a good proxy for the processed duration
            total_duration_seconds += segments[-1].get("end", 0)
            
    return {
        "total_videos": total_videos,
        "processed_videos": processed_videos,
        "total_key_moments": total_key_moments,
        "top_keywords": top_keywords,
        "total_duration_minutes": round(total_duration_seconds / 60, 2)
    }
