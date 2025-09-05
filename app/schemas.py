# schemas.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

# Enums for validation
class UserRoleEnum(str, Enum):
    client = "client"
    admin = "admin"
    super_admin = "super_admin"

class ClientStatusEnum(str, Enum):
    new = "new"
    under_review = "under_review"
    verified = "verified"
    in_progress = "in_progress"
    placed = "placed"
    traveled = "traveled"
    inactive = "inactive"

class DocumentTypeEnum(str, Enum):
    passport = "passport"
    nin_card = "nin_card"
    cv = "cv"
    certificate = "certificate"
    photo = "photo"
    medical = "medical"
    police_clearance = "police_clearance"
    other = "other"

class JobTypeEnum(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    temporary = "temporary"

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRoleEnum
    is_active: bool
    
    class Config:
        from_attributes = True

# Client Profile schemas
class ClientProfileCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    nin: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    address_current: Optional[str] = None
    address_permanent: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    profile_photo_url: Optional[str] = None

class ClientProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    nin: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    address_current: Optional[str] = None
    address_permanent: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    profile_photo_url: Optional[str] = None

class ClientProfileResponse(BaseModel):
    id: str
    user_id: str
    first_name: Optional[str]
    middle_name: Optional[str]
    last_name: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    nationality: Optional[str]
    nin: Optional[str]
    passport_number: Optional[str]
    passport_expiry: Optional[date]
    phone_primary: Optional[str]
    phone_secondary: Optional[str]
    address_current: Optional[str]
    address_permanent: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_relationship: Optional[str]
    profile_photo_url: Optional[str] = None
    status: ClientStatusEnum
    verification_notes: Optional[str]
    verified_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    last_modified_by: Optional[str]
    
    class Config:
        from_attributes = True

# Document schemas
class DocumentUploadResponse(BaseModel):
    id: str
    document_type: DocumentTypeEnum
    file_name: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    client_id: str
    document_type: DocumentTypeEnum
    file_name: str
    file_size: Optional[int]
    mime_type: Optional[str]
    is_verified: bool
    verified_at: Optional[datetime]
    expiry_date: Optional[date]
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

# Job schemas
class JobOpportunityCreate(BaseModel):
    title: str
    company_name: str
    country: str
    city: Optional[str] = None
    job_type: JobTypeEnum = JobTypeEnum.full_time
    salary_range_min: Optional[float] = None
    salary_range_max: Optional[float] = None
    currency: str = "USD"
    requirements: Optional[str] = None
    benefits: Optional[str] = None
    application_deadline: Optional[date] = None

class JobOpportunityResponse(BaseModel):
    id: str
    title: str
    company_name: str
    country: str
    city: Optional[str]
    job_type: JobTypeEnum
    salary_range_min: Optional[float]
    salary_range_max: Optional[float]
    currency: str
    requirements: Optional[str]
    benefits: Optional[str]
    application_deadline: Optional[date]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Job Application schemas
class JobApplicationCreate(BaseModel):
    job_id: str
    notes: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: str
    client_id: str
    job_id: str
    application_status: str
    applied_date: date
    interview_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Admin specific schemas
class AdminClientListResponse(BaseModel):
    id: str
    user_email: str
    first_name: Optional[str]
    last_name: Optional[str]
    status: ClientStatusEnum
    created_at: datetime
    verification_notes: Optional[str]
    
    class Config:
        from_attributes = True

class AdminVerificationUpdate(BaseModel):
    status: ClientStatusEnum
    verification_notes: Optional[str] = None

class ChatMessageCreate(BaseModel):
    receiver_id: str
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True