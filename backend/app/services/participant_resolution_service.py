"""Participant resolution service for chatbot."""
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Dict
from uuid import UUID

from app.models.user import User
from app.models.group import Group, GroupMember
from app.schemas.chatbot import (
    ParticipantMatch,
    AmbiguousParticipant,
    ParticipantResolutionResponse,
    CommonGroup,
    GroupResolutionResponse
)


def resolve_participant_names(
    db: Session,
    participant_names: List[str],
    current_user_id: UUID
) -> ParticipantResolutionResponse:
    """
    Resolve participant names to user IDs.
    
    Args:
        db: Database session
        participant_names: List of first names mentioned
        current_user_id: Current user ID
        
    Returns:
        ParticipantResolutionResponse with disambiguation info
    """
    ambiguous = []
    resolved = []
    
    for name in participant_names:
        # Search for users by name (case-insensitive, partial match)
        # Search in user's groups only for better relevance
        matches = search_users_in_groups(db, name, current_user_id)
        
        if len(matches) == 0:
            # No matches - add as ambiguous with empty matches
            ambiguous.append(AmbiguousParticipant(
                name_query=name,
                matches=[]
            ))
        elif len(matches) == 1:
            # Exact match - auto-resolve
            resolved.append(matches[0].id)
        else:
            # Multiple matches - need disambiguation
            ambiguous.append(AmbiguousParticipant(
                name_query=name,
                matches=[
                    ParticipantMatch(
                        user_id=user.id,
                        full_name=user.name,
                        email=user.email,
                        avatar_url=None  # Add avatar support later
                    )
                    for user in matches
                ]
            ))
    
    return ParticipantResolutionResponse(
        needs_disambiguation=len(ambiguous) > 0,
        ambiguous_participants=ambiguous,
        resolved_participants=resolved
    )


def search_users_in_groups(
    db: Session,
    name_query: str,
    current_user_id: UUID,
    limit: int = 10
) -> List[User]:
    """
    Search for users by name within current user's groups.
    
    Args:
        db: Database session
        name_query: Name to search for
        current_user_id: Current user ID
        limit: Maximum results
        
    Returns:
        List of matching users
    """
    # Get all groups the current user is in
    user_group_ids = db.query(GroupMember.group_id).filter(
        GroupMember.user_id == current_user_id
    ).subquery()
    
    # Find users in those groups whose name matches
    # Case-insensitive partial match on name
    users = (
        db.query(User)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(
            GroupMember.group_id.in_(user_group_ids),
            User.id != current_user_id,  # Exclude current user
            or_(
                func.lower(User.name).contains(func.lower(name_query)),
                func.lower(User.name).like(f"%{name_query.lower()}%")
            )
        )
        .distinct()
        .limit(limit)
        .all()
    )
    
    return users


def find_common_groups(
    db: Session,
    participant_ids: List[UUID],
    current_user_id: UUID
) -> GroupResolutionResponse:
    """
    Find groups that contain all participants including current user.
    
    Args:
        db: Database session
        participant_ids: List of participant user IDs
        current_user_id: Current user ID
        
    Returns:
        GroupResolutionResponse with common groups
    """
    # Include current user in the list
    all_user_ids = [current_user_id] + participant_ids
    user_count = len(all_user_ids)
    
    # Find groups where ALL users are members
    # This is a complex query - we need groups where the count of matching members equals user_count
    common_groups = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id.in_(all_user_ids))
        .group_by(Group.id)
        .having(func.count(func.distinct(GroupMember.user_id)) == user_count)
        .all()
    )
    
    # Convert to response format
    group_list = []
    for group in common_groups:
        # Count total members
        member_count = db.query(GroupMember).filter(
            GroupMember.group_id == group.id
        ).count()
        
        group_list.append(CommonGroup(
            group_id=group.id,
            group_name=group.name,
            member_count=member_count
        ))
    
    return GroupResolutionResponse(
        common_groups=group_list,
        can_create_new=True
    )
