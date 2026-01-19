"""Activity logging service layer."""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
from datetime import datetime

from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.user import User
from app.models.group import Group, GroupMember


def log_activity(
    db: Session,
    user_id: UUID,
    action: ActionType,
    entity_type: EntityType,
    entity_id: UUID,
    group_id: Optional[UUID] = None,
    details: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """
    Log an activity.
    
    Args:
        db: Database session
        user_id: User performing the action
        action: Type of action (EXPENSE_CREATED, GROUP_CREATED, etc.)
        entity_type: Type of entity (EXPENSE, GROUP, etc.)
        entity_id: ID of the entity
        group_id: Optional group ID
        details: Optional description
        metadata: Optional metadata dictionary
        
    Returns:
        Created activity log
    """
    activity = ActivityLog(
        user_id=user_id,
        action_type=action,  # Changed from 'action' to 'action_type'
        entity_type=entity_type,
        entity_id=entity_id,
        group_id=group_id,
        action_metadata=metadata
    )
    
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    return activity


def get_user_activity_feed(
    db: Session,
    user_id: UUID,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[ActivityLog], int]:
    """
    Get activity feed for a user.
    
    Returns activities from all groups the user is a member of.
    
    Args:
        db: Database session
        user_id: User ID
        page: Page number
        limit: Items per page
        
    Returns:
        Tuple of (activities list, total count)
    """
    # Get all groups user is a member of
    user_groups = db.query(GroupMember.group_id).filter(
        GroupMember.user_id == user_id
    ).all()
    
    group_ids = [g[0] for g in user_groups]
    
    # Query activities from user's groups or user's personal activities
    query = db.query(ActivityLog).filter(
        (ActivityLog.group_id.in_(group_ids)) |
        (ActivityLog.user_id == user_id)
    )
    
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    activities = query.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    return activities, total_count


def get_group_activity_feed(
    db: Session,
    group_id: UUID,
    current_user_id: UUID,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[ActivityLog], int]:
    """
    Get activity feed for a specific group.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID (must be member)
        page: Page number
        limit: Items per page
        
    Returns:
        Tuple of (activities list, total count)
    """
    from fastapi import HTTPException, status
    
    # Verify user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Query activities for this group
    query = db.query(ActivityLog).filter(ActivityLog.group_id == group_id)
    
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    activities = query.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    return activities, total_count


def format_activity_message(activity: ActivityLog, db: Session) -> str:
    """
    Format activity into human-readable message.
    
    Args:
        activity: Activity log entry
        db: Database session
        
    Returns:
        Formatted message string
    """
    # Get user name
    user = db.query(User).filter(User.id == activity.user_id).first()
    user_name = user.name if user else "Someone"
    
    # Build message based on action and entity type
    action_verb = {
        ActionType.EXPENSE_CREATED: "created an expense",
        ActionType.EXPENSE_UPDATED: "updated an expense",
        ActionType.EXPENSE_DELETED: "deleted an expense",
        ActionType.GROUP_CREATED: "created a group",
        ActionType.GROUP_UPDATED: "updated a group",
        ActionType.GROUP_DELETED: "deleted a group",
        ActionType.MEMBER_ADDED: "added a member",
        ActionType.MEMBER_REMOVED: "removed a member",
        ActionType.MEMBER_JOINED: "joined",
        ActionType.MEMBER_LEFT: "left",
        ActionType.SETTLEMENT_CREATED: "settled a payment"
    }.get(activity.action_type, "performed an action")
    
    message = user_name
    if activity.action_type == ActionType.EXPENSE_CREATED and activity.action_metadata:
        amount = activity.action_metadata.get("amount", "")
        description = activity.action_metadata.get("description", "")
        message = f"{user_name} created expense ${amount}: {description}"
    elif activity.action_type == ActionType.GROUP_CREATED and activity.action_metadata:
        group_name = activity.action_metadata.get("group_name", "")
        message = f"{user_name} created group \"{group_name}\""
    elif activity.action_type == ActionType.MEMBER_ADDED and activity.action_metadata:
        member_name = activity.action_metadata.get("member_name", "")
        message = f"{user_name} added {member_name} to the group"
    elif activity.action_type == ActionType.SETTLEMENT_CREATED and activity.action_metadata:
        amount = activity.action_metadata.get("amount", "")
        receiver = activity.action_metadata.get("receiver_name", "")
        message = f"{user_name} settled ${amount} with {receiver}"
    else:
        message = f"{user_name} {action_verb}"
    
    return message


# Helper functions to log specific activities

def log_expense_created(
    db: Session,
    user_id: UUID,
    expense_id: UUID,
    group_id: Optional[UUID],
    amount: float,
    description: str
):
    """Log expense creation."""
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActionType.EXPENSE_CREATED,
        entity_type=EntityType.EXPENSE,
        entity_id=expense_id,
        group_id=group_id,
        metadata={"amount": amount, "description": description}
    )


def log_group_created(
    db: Session,
    user_id: UUID,
    group_id: UUID,
    group_name: str
):
    """Log group creation."""
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActionType.GROUP_CREATED,
        entity_type=EntityType.GROUP,
        entity_id=group_id,
        group_id=group_id,
        metadata={"group_name": group_name}
    )


def log_member_added(
    db: Session,
    user_id: UUID,
    group_id: UUID,
    member_id: UUID,
    member_name: str
):
    """Log member addition."""
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActionType.MEMBER_ADDED,
        entity_type=EntityType.USER,
        entity_id=member_id,
        group_id=group_id,
        metadata={"member_name": member_name}
    )


def log_settlement_created(
    db: Session,
    user_id: UUID,
    settlement_id: UUID,
    group_id: UUID,
    amount: float,
    receiver_name: str
):
    """Log settlement creation."""
    return log_activity(
        db=db,
        user_id=user_id,
        action=ActionType.SETTLEMENT_CREATED,
        entity_type=EntityType.SETTLEMENT,
        entity_id=settlement_id,
        group_id=group_id,
        metadata={"amount": amount, "receiver_name": receiver_name}
    )
