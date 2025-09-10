from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime
from app.models import User, Document, ClientProfile
from app.schemas import DocumentUploadResponse
from app.database import get_db
from app.dependencies import get_current_user
import base64


router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_types = [
        "image/jpeg", "image/png", "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    if not document_type or not isinstance(document_type, str):
        raise HTTPException(status_code=400, detail="Document type is required and must be a string")
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    document = Document(
        id=str(uuid.uuid4()),
        client_id=profile.id,
        document_type=document_type,
        file_name=file.filename,
        file_url=file_path,
        file_size=os.path.getsize(file_path),
        mime_type=file.content_type,
        is_verified=False
    )
    file_bytes = file.file.read()
    document.file_data = file_bytes
    db.add(document)
    db.commit()
    db.refresh(document)
    return DocumentUploadResponse(
        id=document.id,
        document_type=document.document_type,
        file_name=document.file_name,
        uploaded_at=document.uploaded_at
    )

@router.get("/me")
def get_my_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    documents = db.query(Document).filter(Document.client_id == profile.id).all()
    return documents

@router.get("/download/{document_id}")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role == "client":
        profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
        if profile.id != document.client_id:
            raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(document.file_url):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=document.file_url,
        filename=document.file_name,
        media_type=document.mime_type
    )

@router.get("/documents/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_data:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "file_base64": base64.b64encode(doc.file_data).decode("utf-8")
    }
