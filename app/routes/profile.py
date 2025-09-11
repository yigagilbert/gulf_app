from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from typing import Optional
import logging
import uuid
import os
import shutil
from pathlib import Path

from app.models import User, ClientProfile, ClientStatus
from app.schemas import ClientProfileUpdate, ClientProfileResponse, ClientProfileCreate
from app.database import get_db
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=ClientProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get current user's profile with proper error handling"""
    try:
        logger.info(f"Fetching profile for user: {current_user.id}")
        
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            logger.warning(f"No profile found for user: {current_user.id}")
            # Create a basic profile if it doesn't exist
            profile = ClientProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                status=ClientStatus.new
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            logger.info(f"Created new profile for user: {current_user.id}")
        
        logger.info(f"Successfully fetched profile for user: {current_user.id}")
        return profile
        
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching profile for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while fetching profile"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching profile for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.put("/me", response_model=ClientProfileResponse)
def update_my_profile(
    profile_data: ClientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile with onboarding support"""
    try:
        logger.info(f"Updating profile for user: {current_user.id}")
        
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            # Create profile if it doesn't exist
            profile = ClientProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                status=ClientStatus.new
            )
            db.add(profile)
            db.flush()
        
        # Update profile with provided data (allows partial updates)
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(profile, field) and value is not None:
                setattr(profile, field, value)
        
        # Update metadata
        profile.updated_at = datetime.utcnow()
        profile.last_modified_by = current_user.id
        
        # Check if onboarding is complete and update status accordingly
        if profile.status == ClientStatus.new and _check_onboarding_complete(profile):
            profile.status = ClientStatus.under_review
            logger.info(f"Profile onboarding completed for user: {current_user.id}")
        
        db.commit()
        db.refresh(profile)
        
        logger.info(f"Successfully updated profile for user: {current_user.id}")
        return profile
        
    except SQLAlchemyError as e:
        logger.error(f"Database error updating profile for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database error occurred while updating profile"
        )
    except Exception as e:
        logger.error(f"Unexpected error updating profile for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.post("/me/onboard", response_model=ClientProfileResponse)
def complete_onboarding(
    profile_data: ClientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete initial onboarding process"""
    try:
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            # Create new profile for onboarding
            profile = ClientProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                status=ClientStatus.new
            )
            db.add(profile)
            db.flush()
        
        # Update with all provided onboarding data
        onboarding_data = profile_data.dict(exclude_unset=True)
        for field, value in onboarding_data.items():
            if hasattr(profile, field) and value is not None:
                setattr(profile, field, value)
        
        # Set onboarding completion status
        if _check_onboarding_complete(profile):
            profile.status = ClientStatus.under_review
        
        profile.updated_at = datetime.utcnow()
        profile.last_modified_by = current_user.id
        
        db.commit()
        db.refresh(profile)
        
        logger.info(f"Onboarding completed for user: {current_user.id}")
        return profile
        
    except Exception as e:
        logger.error(f"Error completing onboarding for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )

@router.get("/me/onboarding-status")
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get onboarding completion status for current user"""
    try:
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            return {
                "needs_onboarding": True,
                "is_complete": False,
                "completion_percentage": 0,
                "missing_fields": _get_required_fields(),
                "status": "new"
            }
        
        completion_status = _get_onboarding_completion(profile)
        
        return {
            "needs_onboarding": not completion_status["is_complete"],
            "is_complete": completion_status["is_complete"],
            "completion_percentage": completion_status["percentage"],
            "missing_fields": completion_status["missing_fields"],
            "status": profile.status.value if profile.status else "new"
        }
        
    except Exception as e:
        logger.error(f"Error getting onboarding status for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get onboarding status"
        )

@router.put("/me/basic", response_model=ClientProfileResponse)
def update_basic_info(
    profile_data: ClientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update basic profile information (used during onboarding steps)"""
    try:
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            profile = ClientProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                status=ClientStatus.new
            )
            db.add(profile)
            db.flush()
        
        # Update only the provided fields
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(profile, field):
                setattr(profile, field, value)
        
        profile.updated_at = datetime.utcnow()
        profile.last_modified_by = current_user.id
        
        db.commit()
        db.refresh(profile)
        
        return profile
        
    except Exception as e:
        logger.error(f"Error updating basic info for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update basic information"
        )

def _check_onboarding_complete(profile: ClientProfile) -> bool:
    """Check if onboarding is complete"""
    required_fields = _get_required_fields()
    
    for field in required_fields:
        if not getattr(profile, field, None):
            return False
    return True

def _get_required_fields() -> list:
    """Get list of required onboarding fields"""
    return [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality',
        'phone_primary', 'address_current', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship'
    ]

@router.post("/me/photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile photo for current user"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPEG and PNG images are allowed"
            )
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads/profile_photos")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        filename = f"{current_user.id}_{uuid.uuid4().hex}.{file_extension}"
        file_path = upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update profile with photo URL
        profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
        if not profile:
            profile = ClientProfile(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                status=ClientStatus.new
            )
            db.add(profile)
        
        profile.profile_photo_url = f"/uploads/profile_photos/{filename}"
        profile.updated_at = datetime.utcnow()
        profile.last_modified_by = current_user.id
        
        db.commit()
        db.refresh(profile)
        
        return {"photo_url": profile.profile_photo_url, "message": "Profile photo uploaded successfully"}
        
    except Exception as e:
        logger.error(f"Error uploading profile photo for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload profile photo: {str(e)}"
        )

def _get_onboarding_completion(profile: ClientProfile) -> dict:
    """Get detailed onboarding completion status"""
    required_fields = _get_required_fields()
    
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