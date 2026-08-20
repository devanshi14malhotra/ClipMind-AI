from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from db.database import get_db, User
from services.auth_service import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "content_creator"

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    valid_roles = ["content_creator", "learner", "educator", "administrator"]
    if user.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(name=user.name, email=user.email, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    from db.database import AuditLog
    log = AuditLog(
        action="user_registered",
        user_id=db_user.id,
        target_id=str(db_user.id),
        details=f"New user registered with role: {user.role}"
    )
    db.add(log)
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }

class UserUpdate(BaseModel):
    name: str
    current_password: str
    new_password: str = ""

@router.put("/me")
def update_me(update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from services.auth_service import verify_password, get_password_hash
    if not verify_password(update.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.name = update.name.strip()
    
    if update.new_password.strip():
        if len(update.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        current_user.hashed_password = get_password_hash(update.new_password)
    
    db.commit()
    db.refresh(current_user)
    
    from db.database import AuditLog
    log = AuditLog(action="profile_updated", user_id=current_user.id, details=f"User updated their profile")
    db.add(log)
    db.commit()
    
    return {"name": current_user.name, "email": current_user.email, "role": current_user.role}

