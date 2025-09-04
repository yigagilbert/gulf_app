from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models import User, ClientProfile, Document, JobOpportunity, JobApplication, UserRole
from app.schemas import UserCreate, ClientProfileCreate
from app.database import get_db
from app.dependencies import get_admin_user
from app.utils import get_password_hash, verify_password, create_access_token

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

@router.post("/clients")
def create_client(
    user_data: UserCreate,
    profile_data: ClientProfileCreate = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    # Create user
    user = User(
        id=str(__import__('uuid').uuid4()),
        email=user_data.email,
        password_hash= get_password_hash(user_data.password),  # implement hash_password
        role=UserRole.client
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Create profile
    profile = ClientProfile(
        id=str(__import__('uuid').uuid4()),
        user_id=user.id,
        status="new",
        first_name=profile_data.first_name if profile_data else None,
        last_name=profile_data.last_name if profile_data else None
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

@router.delete("/clients/{client_id}")
def delete_client(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    # Optionally delete user and related documents/applications
    db.delete(client)
    db.commit()
    return {"detail": "Client deleted"}

# Update client profile details (admin only)
@router.put("/clients/{client_id}")
def update_client_profile(
    client_id: str,
    profile_data: dict,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in profile_data.items():
        if hasattr(client, field):
            setattr(client, field, value)
    client.last_modified_by = admin_user.id
    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    return client

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
    client.last_modified_by = admin_user.id
    db.commit()
    db.refresh(client)
    return client
@router.get("/clients/{client_id}")
def get_client_profile(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
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

@router.get("/dashboard_stats")
def get_dashboard_stats(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_clients = db.query(ClientProfile).count()
    active_jobs = db.query(JobOpportunity).filter(JobOpportunity.is_active == True).count()
    applications_today = db.query(JobApplication).filter(JobApplication.applied_date == datetime.utcnow().date()).count()
    placement_rate = 0
    return {
        "totalClients": total_clients,
        "activeJobs": active_jobs,
        "applicationsToday": applications_today,
        "placementRate": placement_rate
    }
