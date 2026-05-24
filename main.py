# main.py
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from app.database import Base, engine
from app.bootstrap import ensure_auth_schema, ensure_default_super_admin, ensure_platform_schema
# Import routers
from app.routes.auth import router as auth_router
from app.routes.profile import router as profile_router
from app.routes.documents import router as documents_router
from app.routes.admin import router as admin_router
from app.routes.jobs import router as jobs_router
from app.routes.chat import router as chat_router
from app.storage import get_local_upload_dir, is_local_storage, validate_storage_config
from app.utils import get_environment

load_dotenv()


def validate_runtime_config() -> None:
    environment = get_environment()
    if environment == "production":
        if not os.getenv("DATABASE_URL"):
            raise RuntimeError("DATABASE_URL is required in production.")
        if not os.getenv("SECRET_KEY"):
            raise RuntimeError("SECRET_KEY is required in production.")
    validate_storage_config()

# Create tables
validate_runtime_config()
Base.metadata.create_all(bind=engine)
ensure_auth_schema(engine)
ensure_platform_schema(engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Placement System API", version="1.0.0")

default_origins = [
    "https://gulf-app.vercel.app",
    "https://consultportal.preview.emergentagent.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://gulfconsultantsug.com",
    "https://www.gulfconsultantsug.com",
]
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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

# Include routers with /api prefix for Kubernetes ingress
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

# Health check endpoint
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "Gulf Consultants API is running"}

uploads_dir = get_local_upload_dir()
if is_local_storage():
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / "profile_photos").mkdir(exist_ok=True)
    (uploads_dir / "client_documents").mkdir(exist_ok=True)
    app.mount("/api/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

ensure_default_super_admin()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
