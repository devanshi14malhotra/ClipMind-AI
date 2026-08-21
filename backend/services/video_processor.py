import ffmpeg
import os
import asyncio
from ai.pipeline import run_ai_pipeline

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
from db.database import SessionLocal, Video

async def process_video_task(file_path: str, video_id: int, options):
    try:
        # Extract thumbnail
        thumbnail_path = f"{UPLOAD_DIR}/thumb_{video_id}.jpg"
        def _run_ffmpeg():
            (
                ffmpeg
                .input(file_path, ss=1)
                .output(thumbnail_path, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        await asyncio.to_thread(_run_ffmpeg)
        
        # Run AI Pipeline
        audio_path = f"{UPLOAD_DIR}/audio_{video_id}.mp3"
        
        def _run_pipeline():
            return run_ai_pipeline(
                file_path, audio_path, 
                generate_transcript=options.generate_transcript, 
                generate_summary=options.generate_summary,
                generate_key_moments=getattr(options, 'generate_key_moments', False)
            )
            
        transcript_segments, full_text, summary_text, short_summary_text, key_moments, keywords = await asyncio.to_thread(_run_pipeline)

        # Store in MongoDB
        from db.mongodb import get_mongo_db
        mongo_db = get_mongo_db()
        
        if options.generate_transcript:
            await mongo_db.transcripts.update_one(
                {"video_id": video_id},
                {"$set": {
                    "segments": transcript_segments,
                    "full_text": full_text
                }},
                upsert=True
            )
            
        gen_summary = options.generate_summary
        gen_key_moments = getattr(options, 'generate_key_moments', False)
        
        if gen_summary or gen_key_moments:
            update_data = {}
            if gen_summary:
                update_data["summary"] = summary_text
                update_data["short_summary"] = short_summary_text
            if gen_key_moments:
                update_data["key_moments"] = key_moments
            if gen_summary or gen_key_moments:
                update_data["keywords"] = keywords
                
            await mongo_db.summaries.update_one(
                {"video_id": video_id},
                {"$set": update_data},
                upsert=True
            )
        
        # Update database status
        from db.database import Video, SessionLocal
        db_session = SessionLocal()
        try:
            video = db_session.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "completed"
                db_session.commit()
        finally:
            db_session.close()
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Update status to failed instead of deleting
        from db.database import Video, SessionLocal
        db_session = SessionLocal()
        try:
            video = db_session.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                db_session.commit()
        finally:
            db_session.close()
            
        if os.path.exists(file_path):
            os.remove(file_path)
