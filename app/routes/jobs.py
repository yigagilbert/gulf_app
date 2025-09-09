from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from app.models import User, JobOpportunity, JobApplication, ClientProfile
from app.schemas import JobOpportunityCreate, JobOpportunityResponse, JobApplicationResponse
from app.database import get_db
from app.dependencies import get_admin_user, get_current_user

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

@router.put("/{job_id}", response_model=JobOpportunityResponse)
def update_job(
    job_id: str,
    job_data: JobOpportunityCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobOpportunity).filter(JobOpportunity.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Update fields
    for field, value in job_data.dict(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/apply", response_model=dict)
def apply_for_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobOpportunity).filter(JobOpportunity.id == job_id, JobOpportunity.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")
    # Check if user already applied (use JobApplication model)
    from app.models import JobApplication, ClientProfile
    client_profile = db.query(ClientProfile).filter(ClientProfile.user_id == user.id).first()
    if not client_profile:
        raise HTTPException(status_code=400, detail="User does not have a client profile.")
    existing = db.query(JobApplication).filter(JobApplication.job_id == job_id, JobApplication.client_id == client_profile.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this job.")
    application = JobApplication(
        id=str(uuid.uuid4()),
        job_id=job_id,
        client_id=client_profile.id,
        application_status="applied"
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return {"message": "Application submitted successfully", "application_id": application.id}

@router.delete("/{job_id}", response_model=dict)
def delete_job(
    job_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    job = db.query(JobOpportunity).filter(JobOpportunity.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete associated job applications first
    db.query(JobApplication).filter(JobApplication.job_id == job_id).delete()
    
    # Then delete the job
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


# Get job applications for current client
@router.get("/applications", response_model=list[JobApplicationResponse])
def get_my_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_profile = db.query(ClientProfile).filter(ClientProfile.user_id == user.id).first()
    if not client_profile:
        raise HTTPException(status_code=400, detail="User does not have a client profile.")
    applications = db.query(JobApplication).filter(JobApplication.client_id == client_profile.id).order_by(JobApplication.created_at.desc()).all()
    return applications

# Get all job applications (admin only)
@router.get("/admin/applications", response_model=list[JobApplicationResponse])
def get_all_applications(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    applications = db.query(JobApplication).order_by(JobApplication.created_at.desc()).all()
    return applications