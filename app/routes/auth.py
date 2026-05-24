import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ClientProfile, ClientStatus, User, UserRole
from app.schemas import (
    ApplicationWorkflowStatusEnum,
    AuthResponse,
    ClientCreate,
    ClientLifecycleStatusEnum,
    ClientLogin,
    LoginRequest,
    PasswordChangeRequest,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        role=user.role,
        is_active=user.is_active,
        must_change_password=bool(getattr(user, "must_change_password", False)),
    )


def _build_auth_response(user: User) -> AuthResponse:
    access_token = create_access_token(data={"sub": user.id})
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=_serialize_user(user),
    )


def _find_user_by_identifier(db: Session, identifier: str) -> User | None:
    normalized_identifier = identifier.strip()
    return (
        db.query(User)
        .filter((User.email == normalized_identifier) | (User.phone_number == normalized_identifier))
        .first()
    )


def _authenticate_user(db: Session, identifier: str, password: str) -> User:
    user = _find_user_by_identifier(db, identifier)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive",
        )
    return user


@router.post("/register/client", response_model=AuthResponse)
def register_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone_number == client_data.phone_number).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

    if client_data.email and db.query(User).filter(User.email == client_data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        phone_number=client_data.phone_number,
        email=client_data.email,
        password_hash=get_password_hash(client_data.password),
        role=UserRole.client,
        is_active=True,
        email_verified=False,
        must_change_password=False,
        password_changed_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()

    profile = ClientProfile(
        id=str(uuid.uuid4()),
        user_id=user.id,
        first_name=client_data.first_name,
        last_name=client_data.last_name,
        contact_1=client_data.phone_number,
        status=ClientStatus.new,
        application_status=ApplicationWorkflowStatusEnum.pending_profile_completion.value,
        client_lifecycle_status=ClientLifecycleStatusEnum.new_lead.value,
        position_applied_for=client_data.interested_job_category,
        registration_date=datetime.utcnow(),
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_auth_response(user)


@router.post("/register/admin")
def register_admin(_: UserCreate, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public admin registration is disabled",
    )


@router.post("/login", response_model=AuthResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    user = _authenticate_user(db, login_request.identifier, login_request.password)
    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_auth_response(user)


@router.post("/login/client", response_model=AuthResponse)
def login_client(client_credentials: ClientLogin, db: Session = Depends(get_db)):
    return login(
        LoginRequest(
            identifier=client_credentials.phone_number,
            password=client_credentials.password,
        ),
        db,
    )


@router.post("/login/admin", response_model=AuthResponse)
def login_admin(user_credentials: UserLogin, db: Session = Depends(get_db)):
    return login(
        LoginRequest(identifier=user_credentials.email, password=user_credentials.password),
        db,
    )


@router.post("/change-password", response_model=UserResponse)
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    current_user.password_changed_at = datetime.utcnow()
    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _serialize_user(current_user)


@router.get("/me", response_model=UserResponse)
def get_authenticated_user(current_user: User = Depends(get_current_user)):
    return _serialize_user(current_user)
