from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.database import get_db, User, Classroom, ClassroomStudent, Video, LearningHistory, AuditLog
from services.auth_service import get_current_user, RoleChecker
import string
import random

router = APIRouter()
require_educator = RoleChecker(["educator", "administrator"])
require_learner = RoleChecker(["learner", "administrator"])

def generate_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@router.post("/create")
def create_classroom(
    name: str = Body(..., embed=True),
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    code = generate_code()
    # Ensure uniqueness (simple loop)
    while db.query(Classroom).filter(Classroom.code == code).first():
        code = generate_code()
        
    classroom = Classroom(name=name, code=code, owner_id=current_user.id)
    db.add(classroom)
    
    log = AuditLog(
        action="classroom_created",
        user_id=current_user.id,
        details=f"Educator created classroom '{name}' with code {code}"
    )
    db.add(log)
    db.commit()
    db.refresh(classroom)
    return classroom

@router.post("/join")
def join_classroom(
    code: str = Body(..., embed=True),
    current_user: User = Depends(require_learner),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.code == code.upper()).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Invalid classroom code")
        
    if not classroom.is_accepting_students:
        raise HTTPException(status_code=403, detail="This classroom is no longer accepting new students")
        
    existing = db.query(ClassroomStudent).filter(
        ClassroomStudent.classroom_id == classroom.id,
        ClassroomStudent.user_id == current_user.id
    ).first()
    
    if existing:
        return {"message": "Already joined this classroom", "classroom": classroom}
        
    cs = ClassroomStudent(classroom_id=classroom.id, user_id=current_user.id)
    db.add(cs)
    
    log = AuditLog(
        action="classroom_joined",
        user_id=current_user.id,
        target_id=str(classroom.id),
        details=f"Learner joined classroom '{classroom.name}'"
    )
    db.add(log)
    db.commit()
    return {"message": "Successfully joined classroom", "classroom": classroom}

@router.get("/educator")
def get_educator_classrooms(current_user: User = Depends(require_educator), db: Session = Depends(get_db)):
    classrooms = db.query(Classroom).filter(Classroom.owner_id == current_user.id).all()
    
    result = []
    for c in classrooms:
        student_count = db.query(ClassroomStudent).filter(ClassroomStudent.classroom_id == c.id).count()
        video_count = db.query(Video).filter(Video.classroom_id == c.id).count()
        c_dict = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        c_dict["student_count"] = student_count
        c_dict["video_count"] = video_count
        result.append(c_dict)
    return result

@router.get("/learner")
def get_learner_classrooms(current_user: User = Depends(require_learner), db: Session = Depends(get_db)):
    joined = db.query(ClassroomStudent).filter(ClassroomStudent.user_id == current_user.id).all()
    classroom_ids = [j.classroom_id for j in joined]
    classrooms = db.query(Classroom).filter(Classroom.id.in_(classroom_ids)).all()
    
    result = []
    for c in classrooms:
        video_count = db.query(Video).filter(Video.classroom_id == c.id).count()
        educator = db.query(User).filter(User.id == c.owner_id).first()
        c_dict = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        c_dict["video_count"] = video_count
        c_dict["educator_name"] = educator.name if educator else "Unknown"
        result.append(c_dict)
    return result

@router.put("/{classroom_id}/toggle")
def toggle_enrollment(
    classroom_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    classroom.is_accepting_students = not classroom.is_accepting_students
    db.commit()
    return {"is_accepting_students": classroom.is_accepting_students}

@router.get("/{classroom_id}")
def get_classroom(
    classroom_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom

@router.get("/{classroom_id}/students")
def get_classroom_students(
    classroom_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    students = db.query(User).join(ClassroomStudent, ClassroomStudent.user_id == User.id).filter(ClassroomStudent.classroom_id == classroom.id).all()
    
    return [{"id": s.id, "name": s.name, "email": s.email} for s in students]

@router.delete("/{classroom_id}/students/{user_id}")
def remove_student(
    classroom_id: int,
    user_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    student = db.query(ClassroomStudent).filter(ClassroomStudent.classroom_id == classroom_id, ClassroomStudent.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this classroom")
        
    db.delete(student)
    db.commit()
    return {"message": "Student removed successfully"}

from db.mongodb import get_mongo_db
import asyncio

@router.get("/{classroom_id}/videos")
async def get_classroom_videos(
    classroom_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    videos = db.query(Video).filter(Video.classroom_id == classroom.id).order_by(Video.created_at.desc()).all()
    
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

@router.get("/{classroom_id}/videos/learner")
async def get_classroom_videos_for_learner(
    classroom_id: int,
    current_user: User = Depends(require_learner),
    db: Session = Depends(get_db)
):
    # Verify learner is enrolled in this classroom
    enrollment = db.query(ClassroomStudent).filter(
        ClassroomStudent.classroom_id == classroom_id,
        ClassroomStudent.user_id == current_user.id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this classroom")

    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    videos = db.query(Video).filter(Video.classroom_id == classroom_id, Video.status == "completed").order_by(Video.created_at.desc()).all()
    
    video_ids = [v.id for v in videos]
    if not video_ids:
        return {"classroom": {col.name: getattr(classroom, col.name) for col in classroom.__table__.columns}, "videos": []}
        
    mongo_db = get_mongo_db()
    summaries = await mongo_db.summaries.find({"video_id": {"$in": video_ids}}).to_list(length=None)
    keyword_map = {s["video_id"]: s.get("keywords", []) for s in summaries}
    
    result = []
    for v in videos:
        v_dict = {c.name: getattr(v, c.name) for c in v.__table__.columns}
        v_dict["ai_keywords"] = keyword_map.get(v.id, [])
        result.append(v_dict)
    
    classroom_dict = {col.name: getattr(classroom, col.name) for col in classroom.__table__.columns}
    educator = db.query(User).filter(User.id == classroom.owner_id).first()
    classroom_dict["educator_name"] = educator.name if educator else "Unknown"
        
    return {"classroom": classroom_dict, "videos": result}

@router.get("/{classroom_id}/analytics")
def get_classroom_analytics(
    classroom_id: int,
    current_user: User = Depends(require_educator),
    db: Session = Depends(get_db)
):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id, Classroom.owner_id == current_user.id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    students = db.query(ClassroomStudent).filter(ClassroomStudent.classroom_id == classroom.id).all()
    student_ids = [s.user_id for s in students]
    
    videos = db.query(Video).filter(Video.classroom_id == classroom.id).all()
    video_ids = [v.id for v in videos]
    
    if not video_ids or not student_ids:
        return {"total_views": 0, "active_students": 0}
        
    history = db.query(LearningHistory).filter(
        LearningHistory.video_id.in_(video_ids),
        LearningHistory.user_id.in_(student_ids)
    ).all()
    
    active_student_ids = set(h.user_id for h in history)
    
    return {
        "total_views": len(history),
        "total_students": len(students),
        "active_students": len(active_student_ids),
        "engagement_rate": round(len(active_student_ids) / len(students) * 100, 1) if students else 0
    }
