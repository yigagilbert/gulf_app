from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import uuid
import os
import shutil
from pathlib import Path
from app.models import User, ClientProfile, Document, JobOpportunity, JobApplication, UserRole, ClientStatus
from app.schemas import (
    UserCreate, ClientProfileCreate, ClientProfileUpdate, ClientProfileResponse,
    AdminClientListResponse, AdminVerificationUpdate, UserResponse, DocumentCreate
)
from app.database import get_db
from app.dependencies import get_admin_user
from app.utils import get_password_hash, create_access_token

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/clients", response_model=List[AdminClientListResponse])
def get_all_clients(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all clients with optional filtering"""
    query = db.query(ClientProfile)
    
    if status:
        query = query.filter(ClientProfile.status == status)
    
    clients = query.offset(skip).limit(limit).all()
    
    result = []
    for client in clients:
        user = db.query(User).filter(User.id == client.user_id).first()
        
        # Apply search filtering after getting user info
        if search and user:
            search_lower = search.lower()
            if not (
                search_lower in (user.email or '').lower() or
                search_lower in (client.first_name or '').lower() or
                search_lower in (client.last_name or '').lower()
            ):
                continue
        
        result.append(AdminClientListResponse(
            id=client.id,
            user_email=user.email if user else "Unknown",
            first_name=client.first_name,
            last_name=client.last_name,
            status=client.status,
            created_at=client.created_at,
            verification_notes=client.verification_notes
        ))
    
    return result

@router.post("/clients/create", response_model=UserResponse)
def admin_create_client(
    user_data: UserCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin creates a client account"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create user account
        hashed_password = get_password_hash(user_data.password)
        user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            password_hash=hashed_password,
            role=UserRole.client,
            is_active=True,
            email_verified=True  # Admin-created accounts are pre-verified
        )
        db.add(user)
        db.flush()
        
        # Create basic client profile
        profile = ClientProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            status=ClientStatus.new,
            last_modified_by=admin_user.id
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
        
        return UserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            is_active=user.is_active
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create client: {str(e)}"
        )

@router.put("/clients/{client_id}/onboard", response_model=ClientProfileResponse)
def admin_complete_onboarding(
    client_id: str,
    profile_data: ClientProfileUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin completes onboarding process on behalf of client"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Update profile with provided data
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(client_profile, field) and value is not None:
            setattr(client_profile, field, value)
    
    # Update metadata
    client_profile.last_modified_by = admin_user.id
    client_profile.updated_at = datetime.utcnow()
    
    # If all required fields are filled, mark as under_review
    if _check_onboarding_complete(client_profile):
        client_profile.status = ClientStatus.under_review
    
    try:
        db.commit()
        db.refresh(client_profile)
        return client_profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update client profile: {str(e)}"
        )

@router.get("/clients/{client_id}", response_model=ClientProfileResponse)
def get_client_profile(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed client profile for admin"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    return client_profile

@router.put("/clients/{client_id}/verify", response_model=ClientProfileResponse)
def verify_client(
    client_id: str,
    verification_data: AdminVerificationUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Verify client profile"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    client_profile.status = verification_data.status
    if verification_data.verification_notes:
        client_profile.verification_notes = verification_data.verification_notes
    client_profile.verified_by = admin_user.id
    client_profile.verified_at = datetime.utcnow()
    client_profile.last_modified_by = admin_user.id
    
    try:
        db.commit()
        db.refresh(client_profile)
        return client_profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify client: {str(e)}"
        )

@router.get("/clients/{client_id}/documents")
def get_client_documents(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a specific client"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    documents = db.query(Document).filter(Document.client_id == client_id).all()
    return documents

@router.get("/dashboard_stats")
def get_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin"""
    total_clients = db.query(ClientProfile).count()
    new_clients = db.query(ClientProfile).filter(ClientProfile.status == ClientStatus.new).count()
    verified_clients = db.query(ClientProfile).filter(ClientProfile.status == ClientStatus.verified).count()
    active_jobs = db.query(JobOpportunity).filter(JobOpportunity.is_active == True).count()
    total_applications = db.query(JobApplication).count()
    
    return {
        "total_clients": total_clients,
        "new_clients": new_clients,
        "verified_clients": verified_clients,
        "active_jobs": active_jobs,
        "total_applications": total_applications
    }

@router.get("/clients/{client_id}/onboarding-status")
def get_client_onboarding_status(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Check client onboarding completion status"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    completion_status = _get_onboarding_completion(client_profile)
    return {
        "client_id": client_id,
        "is_complete": completion_status["is_complete"],
        "completion_percentage": completion_status["percentage"],
        "missing_fields": completion_status["missing_fields"],
        "status": client_profile.status
    }

def _check_onboarding_complete(profile: ClientProfile) -> bool:
    """Check if onboarding is complete"""
    required_fields = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality',
        'phone_primary', 'address_current', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship'
    ]
    
    for field in required_fields:
        if not getattr(profile, field, None):
            return False
    return True

@router.post("/clients/{client_id}/documents/upload")
def admin_upload_client_document(
    client_id: str,
    file: UploadFile = File(...),
    document_type: str = "other",
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin uploads document for a specific client"""
    # Verify client exists
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    try:
        # Validate file type
        allowed_types = [
            "application/pdf", "image/jpeg", "image/png", "image/jpg",
            "application/msword", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, DOC, DOCX, and image files are allowed"
            )
        
        # Create uploads directory
        upload_dir = Path("uploads/client_documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        filename = f"{client_id}_{document_type}_{uuid.uuid4().hex}.{file_extension}"
        file_path = upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create document record
        document = Document(
            id=str(uuid.uuid4()),
            client_id=client_id,
            document_type=document_type,
            file_name=file.filename,
            file_path=f"/uploads/client_documents/{filename}",
            file_size=os.path.getsize(file_path),
            uploaded_by=admin_user.id,
            upload_date=datetime.utcnow()
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return {
            "id": document.id,
            "document_type": document.document_type,
            "file_name": document.file_name,
            "file_path": document.file_path,
            "message": "Document uploaded successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )

def _get_onboarding_completion(profile: ClientProfile) -> dict:
    """Get detailed onboarding completion status"""
    required_fields = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality',
        'phone_primary', 'address_current', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship'
    ]
    
    optional_fields = [
        'middle_name', 'nin', 'passport_number', 'passport_expiry',
        'phone_secondary', 'address_permanent'
    ]
    
    filled_required = 0
    missing_fields = []
    
    for field in required_fields:
        if getattr(profile, field, None):
            filled_required += 1
        else:
            missing_fields.append(field)
    
    filled_optional = sum(1 for field in optional_fields if getattr(profile, field, None))
    
    total_fields = len(required_fields) + len(optional_fields)
    total_filled = filled_required + filled_optional
    
    return {
        "is_complete": len(missing_fields) == 0,
        "percentage": round((total_filled / total_fields) * 100, 1),
        "missing_fields": missing_fields,
        "required_completed": filled_required,
        "optional_completed": filled_optional
    }