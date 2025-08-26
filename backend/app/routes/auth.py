
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
from app.models import User, ClientProfile
from app.schemas import UserCreate, UserLogin, UserResponse
from app.database import get_db
from app.utils import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        # Remove: with db.begin():
        hashed_password = get_password_hash(user_data.password)
        user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            password_hash=hashed_password,
            role="client",
            is_active=True,
            email_verified=False
        )
        db.add(user)
        db.flush()  # Ensure user.id is available

        profile = ClientProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            status="new"
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        return UserResponse(id=user.id, email=user.email, role=user.role, is_active=user.is_active)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    
# @router.post("/register", response_model=UserResponse)
# def register(user_data: UserCreate, db: Session = Depends(get_db)):
#     # Check if user exists
#     if db.query(User).filter(User.email == user_data.email).first():
#         raise HTTPException(status_code=400, detail="Email already registered")

#     try:
#         with db.begin():
#             # Create new user
#             hashed_password = get_password_hash(user_data.password)
#             user = User(
#                 id=str(uuid.uuid4()),
#                 email=user_data.email,
#                 password_hash=hashed_password,
#                 role="client",
#                 is_active=True,
#                 email_verified=False
#             )
#             db.add(user)
#             db.flush()  # Ensure user.id is available

#             # Create client profile
#             profile = ClientProfile(
#                 id=str(uuid.uuid4()),
#                 user_id=user.id,
#                 status="new"
#             )
#             db.add(profile)
#         db.refresh(user)
#         return UserResponse(id=user.id, email=user.email, role=user.role, is_active=user.is_active)
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login")
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account inactive")
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }
