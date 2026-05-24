from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_admin_user, get_current_user, get_user_role_value
from app.models import ChatMessage, ClientProfile, User, UserRole
from app.schemas import (
    ChatConversationResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatUnreadCountResponse,
)
from app.storage import build_public_url


router = APIRouter(prefix="/chat", tags=["chat"])


def _get_client_profile_for_user(db: Session, user_id: str) -> ClientProfile | None:
    return db.query(ClientProfile).filter(ClientProfile.user_id == user_id).first()


def _serialize_message(message: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse.model_validate(message)


def _build_display_name(user: User, profile: ClientProfile | None) -> str:
    if profile and (profile.first_name or profile.last_name):
        return f"{profile.first_name or ''} {profile.last_name or ''}".strip()
    if user.email:
        return user.email
    if user.phone_number:
        return user.phone_number
    return "Unknown User"


def _ensure_can_message(sender: User, receiver: User) -> None:
    sender_role = get_user_role_value(sender)
    receiver_role = get_user_role_value(receiver)

    if sender_role == "client" and receiver_role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Clients can only message admins")
    if sender_role in {"admin", "super_admin"} and receiver_role != "client":
        raise HTTPException(status_code=403, detail="Admins can only message clients here")


@router.post("/send", response_model=ChatMessageResponse)
def send_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(User).filter(User.id == message.receiver_id, User.is_active.is_(True)).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    _ensure_can_message(current_user, receiver)

    sender_role = get_user_role_value(current_user)
    client_profile = (
        _get_client_profile_for_user(db, current_user.id)
        if sender_role == "client"
        else _get_client_profile_for_user(db, receiver.id)
    )

    chat_msg = ChatMessage(
        id=str(uuid.uuid4()),
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        client_id=client_profile.id if client_profile else None,
        sender_role=sender_role,
        content=message.content,
        sent_at=datetime.utcnow(),
        is_read=False,
    )
    db.add(chat_msg)
    db.commit()
    db.refresh(chat_msg)
    return _serialize_message(chat_msg)


@router.get("/history", response_model=list[ChatMessageResponse])
def get_chat_history(
    with_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    other_user = db.query(User).filter(User.id == with_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Conversation user not found")

    _ensure_can_message(current_user, other_user)

    messages = (
        db.query(ChatMessage)
        .filter(
            or_(
                (ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == with_user_id),
                (ChatMessage.sender_id == with_user_id) & (ChatMessage.receiver_id == current_user.id),
            )
        )
        .order_by(ChatMessage.sent_at.asc())
        .all()
    )

    unread_messages = [
        message for message in messages
        if message.receiver_id == current_user.id and not message.is_read
    ]
    for message in unread_messages:
        message.is_read = True
        message.read_at = datetime.utcnow()

    if unread_messages:
        db.commit()

    return [_serialize_message(message) for message in messages]


@router.post("/history/{with_user_id}/read", response_model=ChatUnreadCountResponse)
def mark_conversation_read(
    with_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unread_messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.sender_id == with_user_id,
            ChatMessage.receiver_id == current_user.id,
            ChatMessage.is_read.is_(False),
        )
        .all()
    )
    for message in unread_messages:
        message.is_read = True
        message.read_at = datetime.utcnow()
    if unread_messages:
        db.commit()
    remaining = db.query(ChatMessage).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read.is_(False),
    ).count()
    return ChatUnreadCountResponse(unread_count=remaining)


@router.get("/admins")
def get_available_admins(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    admins = db.query(User).filter(
        User.role.in_([UserRole.admin, UserRole.super_admin]),
        User.is_active == True,
        User.must_change_password == False
    ).all()

    return [
        {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role,
            "name": f"Admin ({admin.email.split('@')[0] if admin.email else 'Support'})"
        }
        for admin in admins
    ]


@router.get("/conversations", response_model=list[ChatConversationResponse])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = (
        db.query(ChatMessage)
        .filter(or_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == current_user.id))
        .order_by(ChatMessage.sent_at.desc())
        .all()
    )

    conversations = {}
    for message in messages:
        other_user_id = message.receiver_id if message.sender_id == current_user.id else message.sender_id
        existing = conversations.get(other_user_id)
        if existing is None:
            other_user = db.query(User).filter(User.id == other_user_id).first()
            other_profile = _get_client_profile_for_user(db, other_user_id) if other_user else None
            conversations[other_user_id] = {
                "user_id": other_user_id,
                "client_id": message.client_id,
                "display_name": _build_display_name(other_user, other_profile) if other_user else "Unknown User",
                "latest_message": _serialize_message(message),
                "unread_count": 0,
                "profile_photo_url": build_public_url(other_profile.profile_photo_url) if other_profile else None,
            }
        if message.receiver_id == current_user.id and not message.is_read:
            conversations[other_user_id]["unread_count"] += 1

    return [ChatConversationResponse(**conversation) for conversation in conversations.values()]


@router.get("/unread-count", response_model=ChatUnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unread_count = db.query(ChatMessage).filter(
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.is_read.is_(False)
    ).count()
    return ChatUnreadCountResponse(unread_count=unread_count)


@router.get("/admin/inbox", response_model=list[ChatMessageResponse])
def admin_inbox(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.receiver_id == current_user.id)
        .order_by(ChatMessage.sent_at.desc())
        .all()
    )
    return [_serialize_message(message) for message in messages]
