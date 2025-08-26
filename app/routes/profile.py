from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from typing import Optional
import logging

from app.models import User, ClientProfile
from app.schemas import ClientProfileUpdate, ClientProfileResponse
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
            logger.warning(f"Profile not found for user: {current_user.id}")
            # Auto-create profile if it doesn't exist (common scenario)
            profile = ClientProfile(
                id=str(__import__('uuid').uuid4()),
                user_id=current_user.id,
                status="new"
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            logger.info(f"Created new profile for user: {current_user.id}")
        
        logger.info(f"Profile retrieved successfully for user: {current_user.id}")
        return profile
        
    except SQLAlchemyError as e:
        logger.error(f"Database error while fetching profile: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )
    except Exception as e:
        logger.error(f"Unexpected error while fetching profile: {e}")
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
    """Update current user's profile with validation and error handling"""
    try:
        logger.info(f"Updating profile for user: {current_user.id}")
        
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            logger.error(f"Profile not found for user: {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Profile not found"
            )
        
        # Get all possible fields from schema
        all_fields = set(ClientProfileUpdate.model_fields.keys())
        update_data = profile_data.dict(exclude_unset=True)

        # If no data provided, do nothing
        if not update_data:
            logger.warning("No data provided for profile update")
            return profile

        # For each field in schema, set to value if provided, else set to None
        for field in all_fields:
            if hasattr(profile, field):
                value = update_data.get(field, None)
                setattr(profile, field, value)
                logger.debug(f"Set {field} to {value} for user {current_user.id}")
            else:
                logger.warning(f"Attempted to update invalid field: {field}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid field: {field}"
                )

        # Update timestamp
        profile.updated_at = datetime.utcnow()

        # Commit changes
        db.commit()
        db.refresh(profile)

        logger.info(f"Profile updated successfully for user: {current_user.id}")
        return profile
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error while updating profile: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )
    except Exception as e:
        logger.error(f"Unexpected error while updating profile: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )

@router.get("/me/basic")
def get_profile_basic_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get basic profile info without full model validation (debugging endpoint)"""
    try:
        profile = db.query(ClientProfile).filter(
            ClientProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            return {
                "user_id": current_user.id,
                "profile_exists": False,
                "message": "No profile found"
            }
        
        return {
            "user_id": current_user.id,
            "profile_exists": True,
            "profile_id": profile.id,
            "status": profile.status,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
        
    except Exception as e:
        logger.error(f"Error in basic profile info: {e}")
        return {
            "error": str(e),
            "user_id": current_user.id if current_user else None
        }

# ==== FIX 3: Debug CORS endpoint ====
@router.options("/me")
def profile_options():
    """Handle preflight requests"""
    return {"message": "OK"}