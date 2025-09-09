
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
from app.models import User, ClientProfile, UserRole, ClientStatus
from app.schemas import UserCreate, ClientCreate, UserLogin, ClientLogin, UserResponse
from app.database import get_db
from app.utils import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register/client")
def register_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    """Register a new client using phone number as username"""
    # Check if phone number already exists
    if db.query(User).filter(User.phone_number == client_data.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check if email exists (if provided)
    if client_data.email and db.query(User).filter(User.email == client_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        hashed_password = get_password_hash(client_data.password)
        user = User(
            id=str(uuid.uuid4()),
            phone_number=client_data.phone_number,
            email=client_data.email,  # Optional
            password_hash=hashed_password,
            role=UserRole.client,
            is_active=True,
            email_verified=False
        )
        db.add(user)
        db.flush()  # Ensure user.id is available
        
        # Create client profile with basic info
        profile = ClientProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            first_name=client_data.first_name,
            last_name=client_data.last_name,
            contact_1=client_data.phone_number,  # Use phone as primary contact
            status=ClientStatus.new,
            registration_date=datetime.utcnow()
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        
        # Create access token for immediate login
        access_token = create_access_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "phone_number": user.phone_number,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/register/admin")
def register_admin(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new admin using email (kept for admin accounts)"""
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        hashed_password = get_password_hash(user_data.password)
        user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            password_hash=hashed_password,
            role=UserRole.admin,
            is_active=True,
            email_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create access token for immediate login
        access_token = create_access_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "phone_number": user.phone_number,
                "role": user.role,
                "is_active": user.is_active
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login/client")
def login_client(client_credentials: ClientLogin, db: Session = Depends(get_db)):
    """Client login using phone number as username"""
    user = db.query(User).filter(User.phone_number == client_credentials.phone_number).first()
    if not user or not verify_password(client_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account inactive")
    if user.role != UserRole.client:
        raise HTTPException(status_code=401, detail="Invalid login method for this account type")
    
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "phone_number": user.phone_number,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }

@router.post("/login/admin")
def login_admin(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Admin login using email (traditional)"""
    user = db.query(User).filter(User.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account inactive")
    if user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=401, detail="Invalid login method for this account type")
    
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role,
            "is_active": user.is_active
        }
    }

# Legacy login endpoint for backward compatibility
@router.post("/login")
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Legacy login endpoint - redirects to admin login"""
    return login_admin(user_credentials, db)
