import os
import subprocess
import json
from sqlalchemy.orm import Session
from models import Video
from database import SessionLocal

def process_video_background(video_id: str, file_path: str):
    db: Session = SessionLocal()
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        db.close()
        return

    try:
        video.status = "processing"
        db.commit()

        # Check if ffmpeg is available
        ffmpeg_cmd = "ffmpeg"
        ffprobe_cmd = "ffprobe"
        
        if os.path.exists("./ffmpeg.exe"):
            ffmpeg_cmd = "./ffmpeg.exe"
        if os.path.exists("./ffprobe.exe"):
            ffprobe_cmd = "./ffprobe.exe"

        # 1. Get video duration
        probe = subprocess.check_output(
            [ffprobe_cmd, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", file_path]
        )
        metadata = json.loads(probe)
        duration = float(metadata['format']['duration'])
        video.duration_sec = int(duration)
        video.format = metadata['format']['format_name']

        # 2. Extract thumbnail
        thumbnail_path = f"uploads/{video_id}_thumb.jpg"
        subprocess.check_call(
            [ffmpeg_cmd, "-i", file_path, "-ss", "00:00:01.000", "-vframes", "1", thumbnail_path, "-y"]
        )
        video.thumbnail_url = f"/uploads/{video_id}_thumb.jpg"
        
        # In a real scenario, we might re-encode here. For MS1, we just extract data.

        video.status = "completed" # For Milestone 1
        db.commit()

    except Exception as e:
        print(f"Error processing video {video_id}: {e}")
        video.status = "failed"
        db.commit()
    finally:
        db.close()
