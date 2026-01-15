from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.invitation import InvitationStatus


class UserSearchResult(BaseModel):
    """User search result."""
    id: UUID
    name: str
    email: str
    avatar_url: Optional[str]
    
    class Config:
        from_attributes = True


class InvitationResponse(BaseModel):
    """Invitation response."""
    id: UUID
    group_id: UUID
    group_name: str
    inviter_id: UUID
    inviter_name: str
    invitee_email: Optional[str]
    status: InvitationStatus
    token: str
    expires_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class SendInvitationRequest(BaseModel):
    """Request to send invitation."""
    group_id: UUID
    invitee_email: EmailStr
    message: Optional[str] = None
