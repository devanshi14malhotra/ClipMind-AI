import ffmpeg
import os
import asyncio
from ai.pipeline import run_ai_pipeline

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_video_task(file_path: str, video_id: int, db_session):
    try:
        # Extract thumbnail
        thumbnail_path = f"{UPLOAD_DIR}/thumb_{video_id}.jpg"
        (
            ffmpeg
            .input(file_path, ss=1)
            .output(thumbnail_path, vframes=1)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        
        # Run AI Pipeline
        audio_path = f"{UPLOAD_DIR}/audio_{video_id}.mp3"
        transcript_segments, full_text, summary_text, key_moments = run_ai_pipeline(file_path, audio_path)

        # Store in MongoDB
        from db.mongodb import get_mongo_db
        mongo_db = get_mongo_db()
        await mongo_db.transcripts.insert_one({
            "video_id": video_id,
            "segments": transcript_segments,
            "full_text": full_text
        })
        await mongo_db.summaries.insert_one({
            "video_id": video_id,
            "summary": summary_text,
            "key_moments": key_moments
        })
        
        # Update database status
        from db.database import Video
        video = db_session.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "completed"
            db_session.commit()
            
    except Exception as e:
        print(f"Error processing video: {e}")
        from db.database import Video
        video = db_session.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "failed"
            db_session.commit()
