# utils.py
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import os
import secrets
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration with proper validation
def get_jwt_secret():
    """Get JWT secret key with fallback for development"""
    # Try different possible environment variable names
    secret_key =  os.getenv("SECRET_KEY", "qyvUhnfOstdZTFD_5OTFmDxdipvdz_3yfUsy8MogLRI")

    if not secret_key:
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError(
                "JWT secret key is required in production. "
                "Set JWT_SECRET_KEY environment variable."
            )
        else:
            # Generate a secure key for development
            secret_key = secrets.token_urlsafe(32)
            logger.warning(
                f"No JWT secret key found in environment variables. "
                f"Generated temporary key: {secret_key}"
            )
            logger.info(
                "For production, set JWT_SECRET_KEY environment variable. "
                "Add to .env file: JWT_SECRET_KEY=" + secret_key
            )
    
    # Validate key strength (should be at least 32 bytes)
    if len(secret_key.encode('utf-8')) < 32:
        logger.warning("JWT secret key should be at least 32 bytes for security")
    
    return secret_key

# Initialize JWT settings
SECRET_KEY = get_jwt_secret()
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Validate algorithm
ALLOWED_ALGORITHMS = ["HS256", "HS384", "HS512"]
if ALGORITHM not in ALLOWED_ALGORITHMS:
    logger.warning(f"Using non-standard algorithm: {ALGORITHM}")

def verify_password(plain_password, hashed_password):
    """Verify a plain password against a hashed password"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password):
    """Generate password hash"""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        raise

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token with proper validation"""
    if not data:
        raise ValueError("Token data cannot be empty")
    
    to_encode = data.copy()
    
    # Set expiration
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=24)
    
    # Add standard JWT claims
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,  # Not before
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"JWT encoding error: {e}")
        logger.error(f"SECRET_KEY type: {type(SECRET_KEY)}")
        logger.error(f"SECRET_KEY is None: {SECRET_KEY is None}")
        raise

def decode_access_token(token: str):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": True,
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise
    except Exception as e:
        logger.error(f"Token decoding error: {e}")
        raise

# Development helper function
def generate_secret_key():
    """Generate a secure secret key for development"""
    key = secrets.token_urlsafe(32)
    print(f"Generated secure secret key: {key}")
    print(f"Add to your .env file: JWT_SECRET_KEY={key}")
    return key

# Startup validation
def validate_jwt_config():
    """Validate JWT configuration on startup"""
    if not SECRET_KEY:
        raise ValueError("JWT SECRET_KEY is required")
    
    if len(SECRET_KEY.encode('utf-8')) < 32:
        logger.warning("JWT secret key should be at least 32 bytes")
    
    logger.info(f"JWT configured with algorithm: {ALGORITHM}")

# Run validation
validate_jwt_config()