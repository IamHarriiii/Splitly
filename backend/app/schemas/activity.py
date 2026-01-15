from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.activity_log import ActionType, EntityType


class ActivityLogBase(BaseModel):
    """Base activity log schema."""
    action: ActionType
    entity_type: EntityType
    entity_id: UUID
    details: Optional[str] = None


class ActivityLogResponse(ActivityLogBase):
    """Activity log response."""
    id: UUID
    user_id: UUID
    user_name: str
    group_id: Optional[UUID]
    group_name: Optional[str]
    action_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActivityFeedItem(BaseModel):
    """Activity feed item with formatted message."""
    id: UUID
    user_id: UUID
    user_name: str
    action: str
    entity_type: str
    entity_id: UUID
    message: str  # Human-readable message
    group_id: Optional[UUID]
    group_name: Optional[str]
    created_at: datetime
    metadata: Optional[Dict[str, Any]]
