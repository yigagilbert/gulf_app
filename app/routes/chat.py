from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import ChatMessage, User, UserRole
from app.schemas import ChatMessageCreate, ChatMessageResponse
from app.database import get_db
from app.dependencies import get_current_user, get_admin_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/send", response_model=ChatMessageResponse)
def send_message(
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat_msg = ChatMessage(
        id=str(uuid.uuid4()),
        sender_id=current_user.id,
        receiver_id=message.receiver_id,
        content=message.content,
        sent_at=datetime.utcnow()
    )
    db.add(chat_msg)
    db.commit()
    db.refresh(chat_msg)
    return chat_msg

@router.get("/history", response_model=list[ChatMessageResponse])
def get_chat_history(
    with_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == with_user_id)) |
        ((ChatMessage.sender_id == with_user_id) & (ChatMessage.receiver_id == current_user.id))
    ).order_by(ChatMessage.sent_at.asc()).all()
    return messages

@router.get("/admins")
def get_available_admins(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of available admins for clients to chat with"""
    admins = db.query(User).filter(
        User.role.in_([UserRole.admin, UserRole.super_admin]),
        User.is_active == True
    ).all()
    
    return [
        {
            "id": admin.id,
            "email": admin.email,
            "role": admin.role,
            "name": f"Admin ({admin.email.split('@')[0] if admin.email else 'Unknown'})"
        }
        for admin in admins
    ]

@router.get("/admin/inbox", response_model=list[ChatMessageResponse])
def admin_inbox(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(ChatMessage.receiver_id == current_user.id).order_by(ChatMessage.sent_at.desc()).all()
    return messages