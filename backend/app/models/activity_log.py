import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ActionType(str, enum.Enum):
    """Activity action type enumeration."""
    EXPENSE_CREATED = "expense_created"
    EXPENSE_UPDATED = "expense_updated"
    EXPENSE_DELETED = "expense_deleted"
    SETTLEMENT_CREATED = "settlement_created"
    GROUP_CREATED = "group_created"
    GROUP_UPDATED = "group_updated"
    GROUP_DELETED = "group_deleted"
    MEMBER_ADDED = "member_added"
    MEMBER_REMOVED = "member_removed"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    USER_LOGGED_IN = "user_logged_in"


class EntityType(str, enum.Enum):
    """Entity type enumeration."""
    EXPENSE = "expense"
    SETTLEMENT = "settlement"
    GROUP = "group"
    USER = "user"


class ActivityLog(Base):
    """Activity log model (tracks all user and group activities)."""
    __tablename__ = "activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    action_type = Column(SQLEnum(ActionType), nullable=False)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action_metadata = Column(JSON, nullable=True)  # Additional context about the action (renamed from metadata)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="activity_logs")
    group = relationship("Group", back_populates="activity_logs")
    
    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action={self.action_type}, user_id={self.user_id})>"


# Create index on timestamp for efficient sorting
Index('idx_activity_timestamp', ActivityLog.timestamp.desc())
