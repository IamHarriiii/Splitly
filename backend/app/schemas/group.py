from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.group import GroupMemberRole


class GroupBase(BaseModel):
    """Base group schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class GroupCreate(GroupBase):
    """Schema for creating a new group."""
    member_ids: List[UUID] = Field(default_factory=list, description="List of user IDs to add as members")


class GroupUpdate(BaseModel):
    """Schema for updating a group."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class GroupMemberResponse(BaseModel):
    """Schema for group member response."""
    user_id: UUID
    name: str
    email: str
    avatar_url: Optional[str]
    role: GroupMemberRole
    joined_at: datetime
    
    class Config:
        from_attributes = True


class GroupResponse(GroupBase):
    """Schema for basic group response."""
    id: UUID
    created_by: UUID
    member_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    """Schema for detailed group response with members."""
    members: List[GroupMemberResponse]
    creator_name: str


class DebtSummary(BaseModel):
    """Schema for debt summary."""
    user_id: UUID
    user_name: str
    amount: float
    

class GroupDebtSummary(BaseModel):
    """Schema for group debt summary."""
    total_owed_to_user: float
    total_user_owes: float
    net_balance: float
    who_owes_you: List[DebtSummary]
    who_you_owe: List[DebtSummary]
    simplified_debts: List[dict]  # Will contain {from, to, amount}


class AddMemberRequest(BaseModel):
    """Schema for adding a member to a group."""
    user_id: Optional[UUID] = None
    email: Optional[str] = None
    
    class Config:
        # At least one of user_id or email must be provided
        pass


class InvitationResponse(BaseModel):
    """Schema for invitation response."""
    id: UUID
    group_id: UUID
    group_name: str
    inviter_name: str
    invitee_email: str
    status: str
    token: str
    expires_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
