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
    verified = "verified"
    traveled = "traveled"
    returned = "returned"

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
    # Basic required fields
    first_name: str
    last_name: str
    
    # BIO DATA (Personal Information) - All optional for flexibility
    middle_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # Sex
    tribe: Optional[str] = None
    passport_number: Optional[str] = None
    contact_1: Optional[str] = None  # Primary contact
    contact_2: Optional[str] = None  # Secondary contact
    date_of_birth: Optional[date] = None
    place_of_birth: Optional[str] = None
    nin: Optional[str] = None  # NIN Number
    present_address: Optional[str] = None  # Present Address/Village
    subcounty: Optional[str] = None
    district: Optional[str] = None
    marital_status: Optional[str] = None
    number_of_kids: Optional[int] = None
    height: Optional[str] = None  # e.g., "5'8" or "173cm"
    weight: Optional[str] = None  # e.g., "70kg"
    position_applied_for: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = None
    
    # Legacy fields (backward compatibility)
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    address_current: Optional[str] = None
    address_permanent: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # NEXT OF KIN
    next_of_kin_name: Optional[str] = None
    next_of_kin_contact_1: Optional[str] = None
    next_of_kin_contact_2: Optional[str] = None
    next_of_kin_address: Optional[str] = None  # Present Address/Village
    next_of_kin_subcounty: Optional[str] = None
    next_of_kin_district: Optional[str] = None
    next_of_kin_relationship: Optional[str] = None
    next_of_kin_age: Optional[int] = None
    
    # PARENT'S DETAILS - Father
    father_name: Optional[str] = None
    father_contact_1: Optional[str] = None
    father_contact_2: Optional[str] = None
    father_address: Optional[str] = None  # Present Address/Village
    father_subcounty: Optional[str] = None
    father_district: Optional[str] = None
    
    # PARENT'S DETAILS - Mother
    mother_name: Optional[str] = None
    mother_contact_1: Optional[str] = None
    mother_contact_2: Optional[str] = None
    mother_address: Optional[str] = None  # Present Address/Village
    mother_subcounty: Optional[str] = None
    mother_district: Optional[str] = None
    
    # AGENT INFORMATION
    agent_name: Optional[str] = None
    agent_contact: Optional[str] = None
    
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
class DocumentCreate(BaseModel):
    document_type: str
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    
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