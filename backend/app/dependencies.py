# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import jwt
import os
import logging

from app.models import User
from app.database import get_db

logger = logging.getLogger(__name__)

# Security setup
security = HTTPBearer()

# JWT Configuration - Fixed to handle missing environment variables
def get_jwt_config():
    """Get JWT configuration with proper error handling"""
    secret_key = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY")
    algorithm = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")
    
    if not secret_key:
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError("JWT secret key is required in production")
        else:
            # Generate temporary key for development
            import secrets
            secret_key = secrets.token_urlsafe(32)
            logger.warning(f"No JWT secret found. Using temporary key: {secret_key}")
            logger.info("Add to .env file: SECRET_KEY=" + secret_key)
    
    return secret_key, algorithm

SECRET_KEY, ALGORITHM = get_jwt_config()

def decode_jwt_token(token: str) -> dict:
    """Decode JWT token with comprehensive error handling"""
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_signature": True
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Token decoding error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user
    
    Args:
        credentials: Bearer token from Authorization header
        db: Database session
        
    Returns:
        User: Authenticated user object
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Validate token format
        if not credentials or not credentials.credentials:
            logger.warning("No token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No token provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Decode JWT token
        payload = decode_jwt_token(credentials.credentials)
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Query user from database
        try:
            user = db.query(User).filter(User.id == user_id).first()
        except SQLAlchemyError as e:
            logger.error(f"Database error while fetching user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error"
            )
        
        # Check if user exists
        if user is None:
            logger.warning(f"User not found for ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Inactive user attempted access: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.debug(f"Successfully authenticated user: {user_id}")
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user (alias for backward compatibility)
    """
    return current_user

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure current user has admin privileges
    
    Args:
        current_user: Authenticated user
        
    Returns:
        User: Admin user object
        
    Raises:
        HTTPException: If user doesn't have admin privileges
    """
    try:
        admin_roles = ["admin", "super_admin"]
        
        if not current_user.role:
            logger.warning(f"User {current_user.id} has no role assigned")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No role assigned"
            )
        
        # Handle both enum and string roles
        user_role = str(current_user.role).lower()
        if hasattr(current_user.role, 'value'):
            user_role = current_user.role.value
        
        if user_role not in admin_roles:
            logger.warning(
                f"User {current_user.id} with role '{user_role}' "
                f"attempted admin access"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        logger.debug(f"Admin access granted to user: {current_user.id}")
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_admin_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authorization service error"
        )

def get_super_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure current user has super admin privileges
    
    Args:
        current_user: Authenticated user
        
    Returns:
        User: Super admin user object
        
    Raises:
        HTTPException: If user doesn't have super admin privileges
    """
    try:
        # Handle both enum and string roles
        user_role = str(current_user.role).lower()
        if hasattr(current_user.role, 'value'):
            user_role = current_user.role.value
        
        if user_role != "super_admin":
            logger.warning(
                f"User {current_user.id} with role '{user_role}' "
                f"attempted super admin access"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required"
            )
        
        logger.debug(f"Super admin access granted to user: {current_user.id}")
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_super_admin_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authorization service error"
        )

# Optional: User role checking functions
def require_role(*allowed_roles: str):
    """
    Factory function to create role-based dependencies
    
    Usage:
        @app.get("/admin-only")
        def admin_endpoint(user: User = Depends(require_role("admin", "super_admin"))):
            pass
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = str(current_user.role).lower()
        if hasattr(current_user.role, 'value'):
            user_role = current_user.role.value
        
        if user_role not in [role.lower() for role in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker

# Optional: Get user without strict authentication (for optional auth)
def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency - returns None if no token provided
    """
    if not credentials or not credentials.credentials:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None