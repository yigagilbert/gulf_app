from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import uuid
import base64
from app.models import (
    AdminAuditLog,
    ChatMessage,
    ClientProfile,
    ClientStatus,
    Document,
    DocumentAccessLevel,
    DocumentReviewStatus,
    DocumentType,
    DocumentVisibility,
    EducationRecord,
    EmploymentRecord,
    JobApplication,
    JobOpportunity,
    StatusHistory,
    User,
    UserRole,
)
from app.schemas import (
    AdminClientCreateRequest, ApplicationWorkflowStatusEnum, ClientLifecycleStatusEnum,
    UserCreate, ClientCreate, ClientProfileCreate, ClientProfileUpdate, ClientProfileResponse,
    AdminClientListResponse, AdminVerificationUpdate, UserResponse, DocumentCreate,
    EducationRecordCreate, EducationRecordResponse, EmploymentRecordCreate, EmploymentRecordResponse,
    AdminPasswordResetRequest, AdminUserCreate, AdminUserListResponse, AdminUserUpdate,
    StatusHistoryResponse, StatusUpdateRequest
)
from app.database import get_db
from app.dependencies import get_admin_user, get_super_admin_user
from app.utils import get_password_hash
from app.storage import build_public_url, delete_file, read_bytes, save_bytes

router = APIRouter(prefix="/admin", tags=["admin"])


def _get_profile_photo_base64(profile: ClientProfile) -> Optional[str]:
    if profile.profile_photo_data:
        return base64.b64encode(profile.profile_photo_data).decode("utf-8")
    if profile.profile_photo_url and not build_public_url(profile.profile_photo_url):
        try:
            file_bytes, _ = read_bytes(profile.profile_photo_url)
            return base64.b64encode(file_bytes).decode("utf-8")
        except Exception:
            return None
    return None


def _serialize_document(doc: Document) -> dict:
    return {
        "id": doc.id,
        "document_type": doc.document_type.value if hasattr(doc.document_type, "value") else doc.document_type,
        "file_name": doc.file_name,
        "file_url": build_public_url(doc.file_url),
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "is_verified": doc.is_verified,
        "uploaded_by": doc.uploaded_by,
        "uploaded_by_role": doc.uploaded_by_role,
        "visibility": doc.visibility,
        "access_level": doc.access_level,
        "status": doc.status,
        "verified_by": doc.verified_by,
        "verified_at": doc.verified_at,
        "uploaded_at": doc.uploaded_at,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def _serialize_client_profile(client_profile: ClientProfile, user: Optional[User]) -> dict:
    profile_dict = {
        column.name: getattr(client_profile, column.name)
        for column in ClientProfile.__table__.columns
    }
    profile_dict["user_email"] = user.email if user else None
    profile_dict["profile_photo_url"] = build_public_url(client_profile.profile_photo_url)
    profile_dict["profile_photo_data"] = _get_profile_photo_base64(client_profile)
    if not profile_dict.get("application_status"):
        profile_dict["application_status"] = ApplicationWorkflowStatusEnum.draft.value
    if not profile_dict.get("client_lifecycle_status"):
        profile_dict["client_lifecycle_status"] = ClientLifecycleStatusEnum.new_lead.value
    return profile_dict


def _normalize_application_status(status: Optional[str]) -> str:
    if status and status in {item.value for item in ApplicationWorkflowStatusEnum}:
        return status
    return ApplicationWorkflowStatusEnum.draft.value


def _normalize_lifecycle_status(status: Optional[str]) -> str:
    if status and status in {item.value for item in ClientLifecycleStatusEnum}:
        return status
    return ClientLifecycleStatusEnum.new_lead.value


def _create_status_history(
    db: Session,
    client_id: str,
    previous_status: Optional[str],
    new_status: str,
    status_type: str,
    changed_by: str,
    notes: Optional[str] = None,
) -> None:
    db.add(
        StatusHistory(
            id=str(uuid.uuid4()),
            client_id=client_id,
            previous_status=previous_status,
            new_status=new_status,
            status_type=status_type,
            changed_by=changed_by,
            notes=notes,
        )
    )


def _serialize_admin_user(user: User) -> AdminUserListResponse:
    return AdminUserListResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        role=user.role,
        is_active=user.is_active,
        must_change_password=bool(getattr(user, "must_change_password", False)),
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login_at=user.last_login_at,
        password_changed_at=user.password_changed_at,
    )


def _log_admin_action(db: Session, actor_user: User, action: str, target_user: Optional[User] = None, details: Optional[str] = None) -> None:
    db.add(
        AdminAuditLog(
            id=str(uuid.uuid4()),
            actor_user_id=actor_user.id,
            target_user_id=target_user.id if target_user else None,
            action=action,
            details=details,
        )
    )

def generate_serial_number(db: Session) -> str:
    """Generate unique serial number for client registration"""
    while True:
        # Format: SN-YYYYMMDD-XXXX (e.g., SN-20250109-0001)
        date_part = datetime.now().strftime("%Y%m%d")
        # Get count of clients registered today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = db.query(ClientProfile).filter(
            ClientProfile.registration_date >= today_start
        ).count() + 1
        
        serial_number = f"SN-{date_part}-{today_count:04d}"
        
        # Check if already exists (unlikely but safe)
        existing = db.query(ClientProfile).filter(ClientProfile.serial_number == serial_number).first()
        if not existing:
            return serial_number

def generate_registration_number(db: Session) -> str:
    """Generate unique registration number for client"""
    while True:
        # Format: REG-YYYY-XXXXXXX (e.g., REG-2025-0001234)
        year = datetime.now().year
        # Get total count of all clients for sequential numbering
        total_count = db.query(ClientProfile).count() + 1
        
        registration_number = f"REG-{year}-{total_count:07d}"
        
        # Check if already exists
        existing = db.query(ClientProfile).filter(ClientProfile.registration_number == registration_number).first()
        if not existing:
            return registration_number


@router.get("/users", response_model=List[AdminUserListResponse])
def list_admin_users(
    super_admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    users = (
        db.query(User)
        .filter(User.role.in_([UserRole.admin, UserRole.super_admin]))
        .order_by(User.created_at.desc())
        .all()
    )
    return [_serialize_admin_user(user) for user in users]


@router.post("/users", response_model=AdminUserListResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: AdminUserCreate,
    super_admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=UserRole(payload.role.value),
        is_active=True,
        email_verified=True,
        must_change_password=True,
    )
    db.add(user)
    _log_admin_action(
        db,
        super_admin_user,
        action="create_admin_user",
        target_user=user,
        details=f"Created {payload.role.value} account for {payload.email}",
    )
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.patch("/users/{user_id}", response_model=AdminUserListResponse)
def update_admin_user(
    user_id: str,
    payload: AdminUserUpdate,
    super_admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    if user.id == super_admin_user.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    if user.id == super_admin_user.id and payload.role is not None and payload.role.value != "super_admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own super admin role")

    is_target_super_admin = user.role == UserRole.super_admin
    would_remove_super_admin_privileges = (
        is_target_super_admin and (
            payload.is_active is False or
            (payload.role is not None and payload.role.value != "super_admin")
        )
    )
    if would_remove_super_admin_privileges:
        active_super_admins = (
            db.query(User)
            .filter(User.role == UserRole.super_admin, User.is_active.is_(True))
            .count()
        )
        if active_super_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one active super admin must remain in the system",
            )

    changes = []
    if payload.role is not None and user.role != UserRole(payload.role.value):
        previous_role = user.role.value if hasattr(user.role, "value") else str(user.role)
        user.role = UserRole(payload.role.value)
        changes.append(f"role: {previous_role} -> {payload.role.value}")

    if payload.is_active is not None and user.is_active != payload.is_active:
        user.is_active = payload.is_active
        changes.append(f"is_active: {payload.is_active}")

    if not changes:
        return _serialize_admin_user(user)

    user.updated_at = datetime.utcnow()
    db.add(user)
    _log_admin_action(
        db,
        super_admin_user,
        action="update_admin_user",
        target_user=user,
        details="; ".join(changes),
    )
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)


@router.post("/users/{user_id}/reset-password", response_model=AdminUserListResponse)
def reset_admin_user_password(
    user_id: str,
    payload: AdminPasswordResetRequest,
    super_admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")

    user.password_hash = get_password_hash(payload.new_temporary_password)
    user.must_change_password = True
    user.password_changed_at = None
    user.updated_at = datetime.utcnow()
    db.add(user)
    _log_admin_action(
        db,
        super_admin_user,
        action="reset_admin_password",
        target_user=user,
        details=f"Temporary password reset for {user.email}",
    )
    db.commit()
    db.refresh(user)
    return _serialize_admin_user(user)

@router.get("/clients", response_model=List[AdminClientListResponse])
def get_all_clients(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    application_status: Optional[str] = None,
    lifecycle_status: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all clients with optional filtering"""
    query = db.query(ClientProfile, User).join(User, ClientProfile.user_id == User.id).filter(User.role == UserRole.client)

    if status:
        query = query.filter(ClientProfile.status == status)
    if application_status:
        query = query.filter(ClientProfile.application_status == application_status)
    if lifecycle_status:
        query = query.filter(ClientProfile.client_lifecycle_status == lifecycle_status)
    if search:
        search_value = f"%{search.lower()}%"
        query = query.filter(
            (User.email.ilike(search_value)) |
            (User.phone_number.ilike(search_value)) |
            (ClientProfile.first_name.ilike(search_value)) |
            (ClientProfile.last_name.ilike(search_value)) |
            (ClientProfile.passport_number.ilike(search_value))
        )

    clients = query.order_by(ClientProfile.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for client, user in clients:
        unread_messages = db.query(ChatMessage).filter(
            ChatMessage.client_id == client.id,
            ChatMessage.receiver_id == admin_user.id,
            ChatMessage.is_read.is_(False)
        ).count()
        result.append(AdminClientListResponse(
            id=client.id,
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            phone_number=user.phone_number if user else None,
            first_name=client.first_name,
            last_name=client.last_name,
            profile_photo_url=build_public_url(client.profile_photo_url),
            profile_photo_data=_get_profile_photo_base64(client),
            status=client.status,
            application_status=_normalize_application_status(client.application_status),
            client_lifecycle_status=_normalize_lifecycle_status(client.client_lifecycle_status),
            created_by_admin=bool(client.created_by_admin),
            unread_messages=unread_messages,
            interested_job_category=client.position_applied_for,
            created_at=client.created_at,
            verification_notes=client.verification_notes
        ))
    
    return result

@router.post("/clients/create", response_model=UserResponse)
def admin_create_client(
    client_data: AdminClientCreateRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin creates a client account using phone number as username"""
    # Check if phone number already exists
    existing_user = db.query(User).filter(User.phone_number == client_data.phone_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Check if email exists (if provided)
    if client_data.email:
        existing_email = db.query(User).filter(User.email == client_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    try:
        # Create user account
        hashed_password = get_password_hash(client_data.password)
        user = User(
            id=str(uuid.uuid4()),
            phone_number=client_data.phone_number,
            email=client_data.email,  # Optional
            password_hash=hashed_password,
            role=UserRole.client,
            is_active=True,
            email_verified=True,  # Admin-created accounts are pre-verified
            must_change_password=True,
        )
        db.add(user)
        db.flush()
        
        # Create comprehensive client profile with system-generated fields
        profile = ClientProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            # Basic info from registration
            first_name=client_data.first_name,
            last_name=client_data.last_name,
            contact_1=client_data.phone_number,  # Use phone as primary contact
            # System-generated fields
            registration_date=datetime.utcnow(),
            serial_number=generate_serial_number(db),
            registration_number=generate_registration_number(db),
            status=ClientStatus.new,
            application_status=ApplicationWorkflowStatusEnum.pending_profile_completion.value,
            client_lifecycle_status=ClientLifecycleStatusEnum.new_lead.value,
            created_by_admin=True,
            position_applied_for=client_data.interested_job_category,
            last_modified_by=admin_user.id
        )
        db.add(profile)
        _log_admin_action(
            db,
            admin_user,
            action="create_client_account",
            target_user=user,
            details=f"Created client account for {client_data.phone_number}",
        )
        db.commit()
        db.refresh(user)
        
        return UserResponse(
            id=user.id,
            email=user.email,
            phone_number=user.phone_number,
            role=user.role,
            is_active=user.is_active,
            must_change_password=bool(user.must_change_password),
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create client: {str(e)}"
        )

@router.put("/clients/{client_id}/onboard", response_model=ClientProfileResponse)
def admin_complete_onboarding(
    client_id: str,
    profile_data: ClientProfileUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin completes onboarding process on behalf of client"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Update profile with provided data
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(client_profile, field) and value is not None:
            setattr(client_profile, field, value)
    
    # Update metadata
    client_profile.last_modified_by = admin_user.id
    client_profile.updated_at = datetime.utcnow()
    
    if _check_onboarding_complete(client_profile):
        client_profile.status = ClientStatus.under_review
        client_profile.application_status = ApplicationWorkflowStatusEnum.pending_documents.value
        client_profile.onboarding_completed_at = datetime.utcnow()
        client_profile.client_lifecycle_status = ClientLifecycleStatusEnum.applicant.value
    else:
        client_profile.application_status = ApplicationWorkflowStatusEnum.pending_profile_completion.value

    client_profile.application_status_updated_at = datetime.utcnow()
    client_profile.application_status_updated_by = admin_user.id
    client_profile.lifecycle_status_updated_at = datetime.utcnow()
    client_profile.lifecycle_status_updated_by = admin_user.id
    
    try:
        db.commit()
        db.refresh(client_profile)
        user = db.query(User).filter(User.id == client_profile.user_id).first()
        return _serialize_client_profile(client_profile, user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update client profile: {str(e)}"
        )

@router.get("/clients/{client_id}", response_model=ClientProfileResponse)
def get_client_profile(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed client profile for admin"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    user = db.query(User).filter(User.id == client_profile.user_id).first()
    profile_dict = _serialize_client_profile(client_profile, user)
    return profile_dict

@router.put("/clients/{client_id}/verify", response_model=ClientProfileResponse)
def verify_client(
    client_id: str,
    verification_data: AdminVerificationUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Verify client profile"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    client_profile.status = verification_data.status
    if verification_data.verification_notes:
        client_profile.verification_notes = verification_data.verification_notes
    client_profile.verified_by = admin_user.id
    client_profile.verified_at = datetime.utcnow()
    client_profile.last_modified_by = admin_user.id
    
    try:
        db.commit()
        db.refresh(client_profile)
        user = db.query(User).filter(User.id == client_profile.user_id).first()
        return _serialize_client_profile(client_profile, user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify client: {str(e)}"
        )

@router.get("/dashboard_stats")
def get_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin"""
    client_query = db.query(ClientProfile).join(User, ClientProfile.user_id == User.id).filter(User.role == UserRole.client)
    total_clients = client_query.count()
    new_clients = client_query.filter(ClientProfile.status == ClientStatus.new).count()
    verified_clients = client_query.filter(ClientProfile.status == ClientStatus.verified).count()
    active_jobs = db.query(JobOpportunity).filter(JobOpportunity.is_active == True).count()
    total_applications = db.query(JobApplication).count()
    pending_applications = client_query.filter(ClientProfile.application_status.in_([
        ApplicationWorkflowStatusEnum.pending_profile_completion.value,
        ApplicationWorkflowStatusEnum.pending_documents.value,
        ApplicationWorkflowStatusEnum.submitted.value,
        ApplicationWorkflowStatusEnum.under_review.value,
    ])).count()
    missing_documents = client_query.filter(ClientProfile.application_status == ApplicationWorkflowStatusEnum.pending_documents.value).count()
    clients_in_processing = client_query.filter(ClientProfile.client_lifecycle_status == ClientLifecycleStatusEnum.under_processing.value).count()
    ready_to_travel = client_query.filter(ClientProfile.client_lifecycle_status == ClientLifecycleStatusEnum.ready_to_travel.value).count()
    traveled = client_query.filter(ClientProfile.client_lifecycle_status == ClientLifecycleStatusEnum.traveled.value).count()
    returned = client_query.filter(ClientProfile.client_lifecycle_status == ClientLifecycleStatusEnum.returned.value).count()
    cancelled_or_inactive = client_query.filter(ClientProfile.client_lifecycle_status.in_([
        ClientLifecycleStatusEnum.cancelled.value,
        ClientLifecycleStatusEnum.inactive.value,
    ])).count()
    new_messages = db.query(ChatMessage).filter(ChatMessage.receiver_id == admin_user.id, ChatMessage.is_read.is_(False)).count()
    
    return {
        "total_clients": total_clients,
        "new_clients": new_clients,
        "verified_clients": verified_clients,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "pending_applications": pending_applications,
        "missing_documents": missing_documents,
        "new_messages": new_messages,
        "clients_in_processing": clients_in_processing,
        "ready_to_travel": ready_to_travel,
        "traveled": traveled,
        "returned": returned,
        "cancelled_or_inactive": cancelled_or_inactive,
    }

@router.get("/clients/{client_id}/onboarding-status")
def get_client_onboarding_status(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Check client onboarding completion status"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    completion_status = _get_onboarding_completion(client_profile)
    return {
        "client_id": client_id,
        "is_complete": completion_status["is_complete"],
        "completion_percentage": completion_status["percentage"],
        "missing_fields": completion_status["missing_fields"],
        "status": client_profile.status
    }

def _check_onboarding_complete(profile: ClientProfile) -> bool:
    """Check if onboarding is complete"""
    required_fields = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality',
        'phone_primary', 'address_current', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship'
    ]
    
    for field in required_fields:
        if not getattr(profile, field, None):
            return False
    return True

@router.post("/clients/{client_id}/documents/upload")
async def admin_upload_client_document(
    client_id: str,
    file: UploadFile = File(...),
    document_type: str = "other",
    visibility: str = DocumentVisibility.client_visible.value,
    access_level: str = DocumentAccessLevel.view_only.value,
    status: str = DocumentReviewStatus.pending.value,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin uploads document for a specific client"""
    # Verify client exists
    client_profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    allowed_types = [
        "application/pdf", "image/jpeg", "image/png", "image/jpg",
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOC, DOCX, and image files are allowed"
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="No file uploaded")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        document_type_enum = DocumentType(document_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document type") from exc
    if visibility not in {item.value for item in DocumentVisibility}:
        raise HTTPException(status_code=400, detail="Invalid document visibility")
    if access_level not in {item.value for item in DocumentAccessLevel}:
        raise HTTPException(status_code=400, detail="Invalid document access level")
    if status not in {item.value for item in DocumentReviewStatus}:
        raise HTTPException(status_code=400, detail="Invalid document status")

    stored_file = save_bytes("client_documents", file.filename, contents, file.content_type)

    document = Document(
        id=str(uuid.uuid4()),
        client_id=client_id,
        document_type=document_type_enum,
        file_name=file.filename,
        file_url=stored_file.key,
        file_size=len(contents),
        mime_type=file.content_type,
        uploaded_at=datetime.utcnow(),
        file_data=None,
        uploaded_by=admin_user.id,
        uploaded_by_role="admin",
        visibility=visibility,
        access_level=access_level,
        status=status,
        is_verified=status == DocumentReviewStatus.verified.value,
    )

    db.add(document)
    _log_admin_action(
        db,
        admin_user,
        action="upload_client_document",
        details=f"Uploaded {document_type} for client {client_id}",
    )
    db.commit()
    db.refresh(document)

    return {
        "id": document.id,
        "document_type": document.document_type.value,
        "file_name": document.file_name,
        "message": "Document uploaded successfully"
    }

@router.get("/clients/{client_id}/documents")
def get_client_documents(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a specific client"""
    # Verify client exists
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get all documents for this client
    documents = db.query(Document).filter(Document.client_id == client_id).all()
    
    return [_serialize_document(doc) for doc in documents]

@router.delete("/clients/{client_id}/documents/{document_id}")
def delete_client_document(
    client_id: str,
    document_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a specific document"""
    # Verify client exists
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Find and delete the document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.client_id == client_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    delete_file(document.file_url)
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}

@router.put("/documents/{document_id}/verify")
def verify_document(
    document_id: str,
    verification_data: dict,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Verify or unverify a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    is_verified = verification_data.get("is_verified", False)
    new_status = DocumentReviewStatus.verified.value if is_verified else DocumentReviewStatus.pending.value
    document.is_verified = is_verified
    document.status = new_status
    document.verified_by = admin_user.id if is_verified else None
    document.verified_at = datetime.utcnow() if is_verified else None
    document.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": f"Document {'verified' if is_verified else 'unverified'} successfully",
        "document_id": document.id,
        "is_verified": document.is_verified,
        "status": document.status,
    }

@router.put("/clients/{client_id}/status")
def update_client_status(
    client_id: str,
    status_data: StatusUpdateRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Legacy verification status update for client profile."""
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    new_status = status_data.status
    valid_statuses = {item.value for item in ClientStatus}
    if new_status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client status")

    old_status = client.status
    client.status = ClientStatus(new_status)
    client.updated_at = datetime.utcnow()
    client.last_modified_by = admin_user.id
    
    db.commit()
    
    return {
        "message": f"Client status updated from '{old_status}' to '{new_status}'",
        "client_id": client.id,
        "old_status": old_status.value if hasattr(old_status, "value") else old_status,
        "new_status": new_status,
        "updated_by": admin_user.email
    }


@router.put("/clients/{client_id}/application-status")
def update_client_application_status(
    client_id: str,
    status_data: StatusUpdateRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if status_data.status not in {item.value for item in ApplicationWorkflowStatusEnum}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid application status")

    previous_status = client.application_status
    client.application_status = status_data.status
    client.application_status_notes = status_data.notes
    client.application_status_updated_at = datetime.utcnow()
    client.application_status_updated_by = admin_user.id
    client.updated_at = datetime.utcnow()
    client.last_modified_by = admin_user.id

    _create_status_history(
        db,
        client_id=client.id,
        previous_status=previous_status,
        new_status=status_data.status,
        status_type="application_status",
        changed_by=admin_user.id,
        notes=status_data.notes,
    )
    db.commit()
    return {
        "client_id": client.id,
        "old_status": previous_status,
        "new_status": client.application_status,
        "notes": client.application_status_notes,
    }


@router.put("/clients/{client_id}/lifecycle-status")
def update_client_lifecycle_status(
    client_id: str,
    status_data: StatusUpdateRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if status_data.status not in {item.value for item in ClientLifecycleStatusEnum}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid lifecycle status")

    previous_status = client.client_lifecycle_status
    client.client_lifecycle_status = status_data.status
    client.lifecycle_status_notes = status_data.notes
    client.lifecycle_status_updated_at = datetime.utcnow()
    client.lifecycle_status_updated_by = admin_user.id
    client.updated_at = datetime.utcnow()
    client.last_modified_by = admin_user.id

    _create_status_history(
        db,
        client_id=client.id,
        previous_status=previous_status,
        new_status=status_data.status,
        status_type="lifecycle_status",
        changed_by=admin_user.id,
        notes=status_data.notes,
    )
    db.commit()
    return {
        "client_id": client.id,
        "old_status": previous_status,
        "new_status": client.client_lifecycle_status,
        "notes": client.lifecycle_status_notes,
    }


@router.get("/clients/{client_id}/status-history", response_model=List[StatusHistoryResponse])
def get_client_status_history(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    history = (
        db.query(StatusHistory)
        .filter(StatusHistory.client_id == client_id)
        .order_by(StatusHistory.created_at.desc())
        .all()
    )
    return history

@router.delete("/clients/{client_id}")
def delete_client(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a client and all associated data"""
    # Verify client exists
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get the associated user
    user = db.query(User).filter(User.id == client.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found"
        )
    
    try:
        # Store client info for response
        client_name = f"{client.first_name or ''} {client.last_name or ''}".strip() or "Unnamed Client"
        user_email = user.email
        
        # Delete associated documents first
        documents = db.query(Document).filter(Document.client_id == client_id).all()
        for doc in documents:
            delete_file(doc.file_url)
            db.delete(doc)
        
        delete_file(client.profile_photo_url)
        
        # Delete any chat messages
        chat_messages = db.query(ChatMessage).filter(
            (ChatMessage.sender_id == user.id) | (ChatMessage.receiver_id == user.id)
        ).all()
        for message in chat_messages:
            db.delete(message)
        
        # Delete any job applications
        applications = db.query(JobApplication).filter(JobApplication.client_id == client_id).all()
        for app in applications:
            db.delete(app)
        
        # Delete the client profile
        db.delete(client)
        
        # Delete the user account
        db.delete(user)
        
        # Commit all deletions
        db.commit()
        
        return {
            "message": f"Client '{client_name}' and all associated data deleted successfully",
            "deleted_client": {
                "id": client_id,
                "name": client_name,
                "email": user_email
            },
            "deleted_by": admin_user.email,
            "deleted_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting client: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete client: {str(e)}"
        )

@router.post("/clients/{client_id}/photo")
async def upload_client_profile_photo_admin(
    client_id: str,
    file: UploadFile = File(...),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload profile photo for a client (admin only)"""
    # Get the client
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
        
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG and PNG images are allowed"
        )
    
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="No file uploaded")

        delete_file(client.profile_photo_url)
        stored_file = save_bytes("profile_photos", file.filename, file_bytes, file.content_type)
        client.profile_photo_url = stored_file.key
        client.profile_photo_data = None
        client.updated_at = datetime.utcnow()
        client.last_modified_by = admin_user.id
        
        db.commit()
        db.refresh(client)
        
        return {
            "message": "Client profile photo uploaded successfully",
            "profile_photo_url": build_public_url(client.profile_photo_url),
            "photo_base64": base64.b64encode(file_bytes).decode("utf-8") if not build_public_url(client.profile_photo_url) else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload client profile photo: {str(e)}"
        )

def _get_onboarding_completion(profile: ClientProfile) -> dict:
    """Get detailed onboarding completion status"""
    required_fields = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality',
        'phone_primary', 'address_current', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship'
    ]
    
    optional_fields = [
        'middle_name', 'nin', 'passport_number', 'passport_expiry',
        'phone_secondary', 'address_permanent'
    ]
    
    filled_required = 0
    missing_fields = []
    
    for field in required_fields:
        if getattr(profile, field, None):
            filled_required += 1
        else:
            missing_fields.append(field)
    
    filled_optional = sum(1 for field in optional_fields if getattr(profile, field, None))
    
    total_fields = len(required_fields) + len(optional_fields)
    total_filled = filled_required + filled_optional
    
    return {
        "is_complete": len(missing_fields) == 0,
        "percentage": round((total_filled / total_fields) * 100, 1),
        "missing_fields": missing_fields,
        "required_completed": filled_required,
        "optional_completed": filled_optional
    }

@router.get("/clients/by_user/{user_id}", response_model=ClientProfileResponse)
def get_client_profile_by_user_id(
    user_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get client profile by user ID (for chat sidebar)"""
    client_profile = db.query(ClientProfile).filter(ClientProfile.user_id == user_id).first()
    if not client_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    user = db.query(User).filter(User.id == client_profile.user_id).first()
    return _serialize_client_profile(client_profile, user)

@router.get("/clients/{client_id}/photo")
def get_client_photo(
    client_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    profile = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Photo not found")
    if profile.profile_photo_data:
        return {
            "photo_base64": base64.b64encode(profile.profile_photo_data).decode("utf-8")
        }
    if not profile.profile_photo_url:
        raise HTTPException(status_code=404, detail="Photo not found")
    file_bytes, _ = read_bytes(profile.profile_photo_url)
    return {
        "photo_base64": base64.b64encode(file_bytes).decode("utf-8")
    }

@router.get("/documents/{document_id}/file")
def get_document_file(
    document_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Return the file data for a document as base64, along with its mime type and file name.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    if doc.file_data:
        file_bytes = doc.file_data
    else:
        file_bytes, _ = read_bytes(doc.file_url)
    return {
        "file_base64": base64.b64encode(file_bytes).decode("utf-8"),
        "mime_type": doc.mime_type,
        "file_name": doc.file_name,
        "access_level": doc.access_level,
        "allow_download": True,
    }

@router.get("/applications")
def get_all_applications(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all job applications (admin only)"""
    applications = db.query(JobApplication).all()
    result = []
    for app in applications:
        job = db.query(JobOpportunity).filter(JobOpportunity.id == app.job_id).first()
        result.append({
            "id": app.id,
            "job_id": app.job_id,
            "job": {"title": job.title} if job else None,
            "client_id": app.client_id,
            "application_status": app.application_status,
            "applied_date": app.applied_date,
            "notes": app.notes,
        })
    return result
