
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.models import User, JobOpportunity
from app.schemas import JobOpportunityCreate
from app.database import get_db
from app.dependencies import get_admin_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/", response_model=dict)
def create_job(
    job_data: JobOpportunityCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    job = JobOpportunity(
        id=str(uuid.uuid4()),
        **job_data.dict(),
        created_by=admin_user.id,
        is_active=True
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"message": "Job created successfully", "job_id": job.id}

@router.get("/")
def get_jobs(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    jobs = db.query(JobOpportunity).filter(
        JobOpportunity.is_active == is_active
    ).offset(skip).limit(limit).all()
    return jobs
