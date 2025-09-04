# models.py
from sqlalchemy import Column, String, Boolean, DateTime, Text, Date, Integer, DECIMAL, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(enum.Enum):
    client = "client"
    admin = "admin"
    super_admin = "super_admin"

class ClientStatus(enum.Enum):
    new = "new"
    under_review = "under_review"
    verified = "verified"
    in_progress = "in_progress"
    placed = "placed"
    traveled = "traveled"
    inactive = "inactive"

class DocumentType(enum.Enum):
    passport = "passport"
    nin_card = "nin_card"
    cv = "cv"
    certificate = "certificate"
    photo = "photo"
    medical = "medical"
    police_clearance = "police_clearance"
    other = "other"

class JobType(enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    temporary = "temporary"

class ApplicationStatus(enum.Enum):
    applied = "applied"
    screening = "screening"
    interview = "interview"
    offered = "offered"
    accepted = "accepted"
    rejected = "rejected"
    withdrawn = "withdrawn"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.client)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client_profile = relationship(
    "ClientProfile",
    back_populates="user",
    uselist=False,
    foreign_keys="[ClientProfile.user_id]"
)

class ClientProfile(Base):
    __tablename__ = "client_profiles"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Personal Information
    first_name = Column(String)
    middle_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(Date)
    gender = Column(String)
    nationality = Column(String)
    
    # Official Documents
    nin = Column(String, unique=True)
    passport_number = Column(String, unique=True)
    passport_expiry = Column(Date)
    
    # Contact Information
    phone_primary = Column(String)
    phone_secondary = Column(String)
    address_current = Column(Text)
    address_permanent = Column(Text)
    
    # Emergency Contact
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    emergency_contact_relationship = Column(String)
    
    # Profile Management
    profile_photo_url = Column(String)
    status = Column(Enum(ClientStatus), default=ClientStatus.new)
    verification_notes = Column(Text)
    verified_by = Column(String, ForeignKey("users.id"))
    verified_at = Column(DateTime)
    last_modified_by = Column(String, ForeignKey("users.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship(
    "User",
    back_populates="client_profile",
    foreign_keys="[ClientProfile.user_id]"
)
    documents = relationship("Document", back_populates="client")
    job_applications = relationship("JobApplication", back_populates="client")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("client_profiles.id"), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String, ForeignKey("users.id"))
    verified_at = Column(DateTime)
    expiry_date = Column(Date)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("ClientProfile", back_populates="documents")

class JobOpportunity(Base):
    __tablename__ = "job_opportunities"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    city = Column(String)
    job_type = Column(Enum(JobType), default=JobType.full_time)
    salary_range_min = Column(DECIMAL(10, 2))
    salary_range_max = Column(DECIMAL(10, 2))
    currency = Column(String, default="USD")
    requirements = Column(Text)
    benefits = Column(Text)
    application_deadline = Column(Date)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    applications = relationship("JobApplication", back_populates="job")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, ForeignKey("client_profiles.id"), nullable=False)
    job_id = Column(String, ForeignKey("job_opportunities.id"), nullable=False)
    application_status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied)
    applied_date = Column(Date, default=datetime.utcnow)
    interview_date = Column(DateTime)
    notes = Column(Text)
    processed_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("ClientProfile", back_populates="job_applications")
    job = relationship("JobOpportunity", back_populates="applications")