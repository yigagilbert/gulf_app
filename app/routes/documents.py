import base64
import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_client_user, get_current_user, get_user_role_value
from app.models import (
    ClientProfile,
    Document,
    DocumentAccessLevel,
    DocumentReviewStatus,
    DocumentType,
    DocumentVisibility,
    User,
)
from app.schemas import DocumentPreviewResponse, DocumentUploadResponse
from app.storage import build_public_url, read_bytes, save_bytes


router = APIRouter(prefix="/documents", tags=["documents"])


def _serialize_document(document: Document) -> dict:
    return {
        "id": document.id,
        "client_id": document.client_id,
        "document_type": document.document_type.value if hasattr(document.document_type, "value") else document.document_type,
        "file_name": document.file_name,
        "file_size": document.file_size,
        "mime_type": document.mime_type,
        "is_verified": document.is_verified,
        "uploaded_by": document.uploaded_by,
        "uploaded_by_role": document.uploaded_by_role,
        "visibility": document.visibility,
        "access_level": document.access_level,
        "status": document.status,
        "verified_by": document.verified_by,
        "verified_at": document.verified_at,
        "expiry_date": document.expiry_date,
        "uploaded_at": document.uploaded_at,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "file_url": build_public_url(document.file_url),
    }


def _get_document_for_user(document_id: str, current_user: User, db: Session) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if get_user_role_value(current_user) == "client":
        profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
        if not profile or profile.id != document.client_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if document.visibility == DocumentVisibility.admin_only.value:
            raise HTTPException(status_code=403, detail="Access denied")

    return document


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    allowed_types = [
        "image/jpeg", "image/png", "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    max_file_size = 5 * 1024 * 1024

    if not document_type or not isinstance(document_type, str):
        raise HTTPException(status_code=400, detail="Document type is required and must be a string")
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        document_type_enum = DocumentType(document_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document type") from exc

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if len(contents) > max_file_size:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    stored_file = save_bytes("client_documents", file.filename, contents, file.content_type)
    document = Document(
        id=str(uuid.uuid4()),
        client_id=profile.id,
        document_type=document_type_enum,
        file_name=file.filename,
        file_url=stored_file.key,
        file_size=len(contents),
        mime_type=file.content_type,
        is_verified=False,
        file_data=None,
        uploaded_by=current_user.id,
        uploaded_by_role=get_user_role_value(current_user),
        visibility=DocumentVisibility.client_visible.value,
        access_level=DocumentAccessLevel.download_allowed.value,
        status=DocumentReviewStatus.pending.value,
    )

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
def get_my_documents(
    current_user: User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    profile = db.query(ClientProfile).filter(ClientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    documents = db.query(Document).filter(Document.client_id == profile.id).all()
    return [_serialize_document(document) for document in documents]


@router.get("/download/{document_id}")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = _get_document_for_user(document_id, current_user, db)
    if (
        get_user_role_value(current_user) == "client" and
        document.access_level == DocumentAccessLevel.view_only.value
    ):
        raise HTTPException(status_code=403, detail="This document is view-only")

    if document.file_data:
        file_bytes = document.file_data
        mime_type = document.mime_type
    else:
        file_bytes, detected_mime_type = read_bytes(document.file_url)
        mime_type = document.mime_type or detected_mime_type or "application/octet-stream"

    headers = {"Content-Disposition": f'attachment; filename="{document.file_name}"'}
    return StreamingResponse(BytesIO(file_bytes), media_type=mime_type, headers=headers)


@router.get("/{document_id}/preview", response_model=DocumentPreviewResponse)
def get_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = _get_document_for_user(document_id, current_user, db)

    if document.file_data:
        file_bytes = document.file_data
        mime_type = document.mime_type
    else:
        file_bytes, detected_mime_type = read_bytes(document.file_url)
        mime_type = document.mime_type or detected_mime_type

    allow_download = not (
        get_user_role_value(current_user) == "client" and
        document.access_level == DocumentAccessLevel.view_only.value
    )

    return {
        "file_base64": base64.b64encode(file_bytes).decode("utf-8"),
        "mime_type": mime_type,
        "file_name": document.file_name,
        "access_level": document.access_level,
        "allow_download": allow_download,
    }


@router.get("/{document_id}/file")
def get_document_file_legacy(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_document_file(document_id=document_id, current_user=current_user, db=db)
