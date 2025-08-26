
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models import User, ClientProfile, Document
from app.database import get_db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/clients")
def get_all_clients(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(ClientProfile)
    if status:
        query = query.filter(ClientProfile.status == status)
    clients = query.offset(skip).limit(limit).all()
    return clients

@router.put("/clients/{client_id}/verify")
def verify_client(
    client_id: str,
    verification_notes: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.status = "verified"
    client.verified_by = admin_user.id
    client.verified_at = datetime.utcnow()
    client.verification_notes = verification_notes
    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    return client

@router.get("/clients/{client_id}/documents")
def get_client_documents(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    documents = db.query(Document).filter(Document.client_id == client_id).all()
    return documents
