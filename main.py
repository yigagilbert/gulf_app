# main.py
import os
import uvicorn
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
# Import routers
from app.routes.auth import router as auth_router
from app.routes.profile import router as profile_router
from app.routes.documents import router as documents_router
from app.routes.admin import router as admin_router
from app.routes.jobs import router as jobs_router
from app.routes.chat import router as chat_router
# Default admin creation (utility function)
from app.models import User
from app.utils import get_password_hash
from app.database import get_db
from sqlalchemy.exc import IntegrityError

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Placement System API", version="1.0.0")

# ENHANCED CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gulf-app.vercel.app",
        "http://localhost:3000",      # React dev server
        "http://127.0.0.1:3000",     # Alternative localhost
        "https://localhost:3000",     # HTTPS version
        "https://127.0.0.1:3000",    # HTTPS alternative
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type", 
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Include routers with /api prefix for proper routing
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api") 
app.include_router(documents_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD")

def create_default_admin():
    db = next(get_db())
    admin = db.query(User).filter(User.email == DEFAULT_ADMIN_EMAIL).first()
    if not admin:
        hashed_password = get_password_hash(DEFAULT_ADMIN_PASSWORD)
        admin = User(
            id=str(uuid.uuid4()),
            email=DEFAULT_ADMIN_EMAIL,
            password_hash=hashed_password,
            role="super_admin",
            is_active=True,
            email_verified=True
        )
        db.add(admin)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
        print(f"Default admin created: {DEFAULT_ADMIN_EMAIL}")
    else:
        print(f"Default admin already exists: {DEFAULT_ADMIN_EMAIL}")

create_default_admin()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)