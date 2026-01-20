"""Activity log API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.activity import ActivityFeedItem
from app.services import activity_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group

router = APIRouter(prefix="/activity", tags=["Activity Feed"])


@router.get("/feed", response_model=dict)
def get_activity_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get activity feed for the current user.
    
    Returns activities from all groups the user is a member of,
    plus the user's personal activities.
    
    Activities are sorted by most recent first.
    """
    activities, total_count = activity_service.get_user_activity_feed(
        db, current_user.id, page, limit
    )
    
    # Build feed items with formatted messages
    feed_items = []
    for activity in activities:
        # Get user and group names
        user = db.query(User).filter(User.id == activity.user_id).first()
        group = db.query(Group).filter(Group.id == activity.group_id).first() if activity.group_id else None
        
        # Format message
        message = activity_service.format_activity_message(activity, db)
        
        feed_items.append(ActivityFeedItem(
            id=activity.id,
            user_id=activity.user_id,
            user_name=user.name if user else "Unknown",
            action=activity.action_type.value,
            entity_type=activity.entity_type.value,
            entity_id=activity.entity_id,
            message=message,
            group_id=activity.group_id,
            group_name=group.name if group else None,
            created_at=activity.timestamp,
            metadata=activity.action_metadata
        ))
    
    return {
        "data": feed_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }


@router.get("/groups/{group_id}", response_model=dict)
def get_group_activity_feed(
    group_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get activity feed for a specific group.
    
    User must be a member of the group to access this endpoint.
    """
    activities, total_count = activity_service.get_group_activity_feed(
        db, group_id, current_user.id, page, limit
    )
    
    # Build feed items
    feed_items = []
    for activity in activities:
        user = db.query(User).filter(User.id == activity.user_id).first()
        group = db.query(Group).filter(Group.id == activity.group_id).first()
        
        message = activity_service.format_activity_message(activity, db)
        
        feed_items.append(ActivityFeedItem(
            id=activity.id,
            user_id=activity.user_id,
            user_name=user.name if user else "Unknown",
            action=activity.action_type.value,
            entity_type=activity.entity_type.value,
            entity_id=activity.entity_id,
            message=message,
            group_id=activity.group_id,
            group_name=group.name if group else None,
            created_at=activity.timestamp,
            metadata=activity.action_metadata
        ))
    
    return {
        "data": feed_items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }
