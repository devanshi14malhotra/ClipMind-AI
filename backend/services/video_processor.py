import ffmpeg
import os
import asyncio
from ai.pipeline import run_ai_pipeline

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def process_video_task(file_path: str, video_id: int, db_session, options):
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
        transcript_segments, full_text, summary_text, key_moments, keywords = run_ai_pipeline(
            file_path, audio_path, 
            generate_transcript=options.generate_transcript, 
            generate_summary=options.generate_summary,
            generate_key_moments=getattr(options, 'generate_key_moments', False)
        )

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
