import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db, Video, User, LearningHistory, Bookmark
from services.auth_service import get_current_user, get_current_user_from_query
from services.video_processor import process_video_task, UPLOAD_DIR
import yt_dlp

router = APIRouter()

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(""),
    description: str = Form(""),
    tags: str = Form(""),
    classroom_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_extensions = (".mp4", ".mov", ".avi", ".webm", ".mkv")
    is_valid_type = file.content_type and file.content_type.startswith("video/")
    is_valid_ext = file.filename and file.filename.lower().endswith(valid_extensions)
    
    if not (is_valid_type or is_valid_ext):
        raise HTTPException(status_code=400, detail=f"File must be a video. Received: {file.content_type}")

    # Save to database
    new_video = Video(
        owner_id=current_user.id, 
        filename=file.filename,
        title=title,
        description=description,
        tags=tags,
        status="uploaded",
        classroom_id=classroom_id
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    from db.database import AuditLog
    log = AuditLog(
        action="video_uploaded",
        user_id=current_user.id,
        target_id=str(new_video.id),
        details=f"User uploaded video '{new_video.title}'"
    )
    db.add(log)
    db.commit()
    
    # Save file to disk
    file_path = os.path.join(UPLOAD_DIR, f"{new_video.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Video uploaded successfully", "video_id": new_video.id, "status": "uploaded"}

class YouTubeRequest(BaseModel):
    url: str
    title: str = ""
    description: str = ""
    tags: str = ""
    classroom_id: Optional[int] = None

@router.post("/youtube")
async def import_youtube(
    data: YouTubeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not data.url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")
        
    # Create DB record first to get an ID
    new_video = Video(
        owner_id=current_user.id, 
        filename="youtube_importing.mp4",
        title=data.title or "YouTube Import",
        description=data.description,
        tags=data.tags,
        status="uploaded",
        classroom_id=data.classroom_id
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    from db.database import AuditLog
    log = AuditLog(
        action="video_imported",
        user_id=current_user.id,
        target_id=str(new_video.id),
        details=f"User imported video from YouTube: {data.url}"
    )
    db.add(log)
    db.commit()
    
    # Download with yt-dlp
    try:
        output_filename = f"{new_video.id}_youtube.mp4"
        output_path = os.path.join(UPLOAD_DIR, output_filename)
        
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'outtmpl': output_path,
            'quiet': True,
            'no_warnings': True,
            'extractor_args': {'youtube': {'player_client': ['android', 'web']}}
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(data.url, download=True)
            if not data.title and info.get('title'):
                new_video.title = info['title']
                
        new_video.filename = "youtube.mp4"
        db.commit()
        
    except Exception as e:
        db.delete(new_video)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to download YouTube video: {str(e)}")
        
    return {"message": "YouTube video imported successfully", "video_id": new_video.id, "status": "uploaded"}

from db.mongodb import get_mongo_db

@router.get("/")
async def get_videos(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    videos = db.query(Video).filter(Video.owner_id == current_user.id).all()
    
    video_ids = [v.id for v in videos]
    if not video_ids:
        return []
        
    mongo_db = get_mongo_db()
    summaries = await mongo_db.summaries.find({"video_id": {"$in": video_ids}}).to_list(length=None)
    
    keyword_map = {s["video_id"]: s.get("keywords", []) for s in summaries}
    
    result = []
    for v in videos:
        v_dict = {c.name: getattr(v, c.name) for c in v.__table__.columns}
        v_dict["ai_keywords"] = keyword_map.get(v.id, [])
        result.append(v_dict)
        
    return result

@router.get("/{video_id}")
def get_video(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    # Owner, admin always allowed. Learner/educator can view public or classroom-shared videos.
    is_owner = video.owner_id == current_user.id
    is_admin = current_user.role == "administrator"
    is_shared = current_user.role in ["learner", "educator"] and (video.visibility == "public" or video.classroom_id is not None)
    if not (is_owner or is_admin or is_shared):
        raise HTTPException(status_code=403, detail="Access denied")
    return video

def range_requests_response(
    request: Request, file_path: str, content_type: str
):
    file_size = os.stat(file_path).st_size
    range_header = request.headers.get("range")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Encoding": "identity",
        "Content-Length": str(file_size),
        "Access-Control-Expose-Headers": "Accept-Ranges,Content-Encoding,Content-Length,Content-Range",
    }
    start = 0
    end = file_size - 1
    status_code = 200

    if range_header:
        start_str, end_str = range_header.replace("bytes=", "").split("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        size = end - start + 1
        headers["Content-Length"] = str(size)
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
        status_code = 206

    def yield_file(file_path, start, end, chunk_size=1024 * 1024):
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_to_read = end - start + 1
            while bytes_to_read > 0:
                chunk = f.read(min(chunk_size, bytes_to_read))
                if not chunk:
                    break
                bytes_to_read -= len(chunk)
                yield chunk

    return StreamingResponse(
        yield_file(file_path, start, end),
        headers=headers,
        status_code=status_code,
        media_type=content_type,
    )

@router.get("/stream/{video_id}")
def stream_video(video_id: int, request: Request, current_user: User = Depends(get_current_user_from_query), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    is_owner = video.owner_id == current_user.id
    is_admin = current_user.role == "administrator"
    is_shared = current_user.role in ["learner", "educator"] and (video.visibility == "public" or video.classroom_id is not None)
    if not (is_owner or is_admin or is_shared):
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = os.path.join(UPLOAD_DIR, f"{video.id}_{video.filename}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found on disk")
        
    return range_requests_response(request, file_path, "video/mp4")

@router.delete("/{video_id}")
def delete_video(video_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    file_path = os.path.join(UPLOAD_DIR, f"{video.id}_{video.filename}")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass # Ignore file lock errors if video is still processing
            
    # Delete related records first to avoid foreign key constraints
    db.query(LearningHistory).filter(LearningHistory.video_id == video_id).delete()
    db.query(Bookmark).filter(Bookmark.video_id == video_id).delete()
        
    db.delete(video)
    db.commit()
    return {"message": "Video deleted successfully"}

class ProcessOptions(BaseModel):
    generate_transcript: bool = True
    generate_summary: bool = True
    generate_key_moments: bool = True

@router.post("/{video_id}/process")
def process_video(
    video_id: int, 
    options: ProcessOptions,
    background_tasks: BackgroundTasks, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    # Only owner or admin can process
    if video.owner_id != current_user.id and current_user.role != "administrator":
        raise HTTPException(status_code=403, detail="Access denied")
        
    video.status = "processing"
    db.commit()
    
    file_path = os.path.join(UPLOAD_DIR, f"{video.id}_{video.filename}")
    background_tasks.add_task(process_video_task, file_path, video.id, options)
    
    return {"message": "Processing started", "status": "processing"}

class VisibilityRequest(BaseModel):
    visibility: str
    password: str

from services.auth_service import verify_password

@router.put("/{video_id}/visibility")
def update_visibility(
    video_id: int,
    request: VisibilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.visibility not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="Visibility must be 'public' or 'private'")
        
    # Verify password before allowing visibility change
    if not verify_password(request.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Invalid password verification")
        
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    video.visibility = request.visibility
    db.commit()
    
    return {"message": f"Video visibility changed to {request.visibility}", "visibility": video.visibility}

class ExtractRequest(BaseModel):
    start_time: float
    end_time: float
    title: str = "Extracted Clip"

@router.post("/{video_id}/extract-clip")
async def extract_clip(
    video_id: int,
    request: ExtractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    video = db.query(Video).filter(Video.id == video_id, Video.owner_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    original_path = os.path.join(UPLOAD_DIR, f"{video.id}_{video.filename}")
    if not os.path.exists(original_path):
        raise HTTPException(status_code=404, detail="Source video file not found")
        
    # Create DB record for the new clip
    new_video = Video(
        owner_id=current_user.id,
        filename=f"clip_{video.filename}",
        title=request.title,
        description=f"Extracted from {video.title}",
        status="processing",
        visibility=video.visibility,
        classroom_id=video.classroom_id
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    output_path = os.path.join(UPLOAD_DIR, f"{new_video.id}_{new_video.filename}")
    
    import ffmpeg
    try:
        (
            ffmpeg
            .input(original_path, ss=request.start_time, t=request.end_time - request.start_time)
            .output(output_path, c="copy")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        new_video.status = "uploaded"
        db.commit()
    except ffmpeg.Error as e:
        db.delete(new_video)
        db.commit()
        raise HTTPException(status_code=500, detail=f"FFmpeg extraction failed: {e.stderr.decode()}")
        
    return {"message": "Clip extracted successfully", "video_id": new_video.id}
