"""User search and invitation API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.user_search import UserSearchResult, InvitationResponse
from app.services import user_search_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group

router = APIRouter(prefix="/users", tags=["User Search & Invitations"])


@router.get("/search", response_model=List[UserSearchResult])
def search_users(
    q: str = Query(..., min_length=2, description="Search query (name or email)"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by name or email.
    
    Useful for finding users to add to groups.
    Requires at least 2 characters in the search query.
    """
    users = user_search_service.search_users(db, q, limit)
    
    return [
        UserSearchResult(
            id=user.id,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url
        )
        for user in users
    ]


@router.get("/invitations/pending", response_model=List[InvitationResponse])
def get_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get pending invitations for the current user.
    
    Returns invitations that are waiting for acceptance.
    """
    invitations = user_search_service.get_pending_invitations_for_user(db, current_user.id)
    
    # Build responses with group and inviter details
    responses = []
    for invitation in invitations:
        group = db.query(Group).filter(Group.id == invitation.group_id).first()
        inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
        
        responses.append(InvitationResponse(
            id=invitation.id,
            group_id=invitation.group_id,
            group_name=group.name if group else "Unknown",
            inviter_id=invitation.inviter_id,
            inviter_name=inviter.name if inviter else "Unknown",
            invitee_email=invitation.invitee_email,
            status=invitation.status,
            token=invitation.token,
            expires_at=invitation.expires_at,
            created_at=invitation.created_at
        ))
    
    return responses


@router.get("/invitations/sent", response_model=List[InvitationResponse])
def get_sent_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get invitations sent by the current user.
    
    Returns all invitations (pending, accepted, rejected) sent by the user.
    """
    invitations = user_search_service.get_sent_invitations(db, current_user.id)
    
    # Build responses
    responses = []
    for invitation in invitations:
        group = db.query(Group).filter(Group.id == invitation.group_id).first()
        
        responses.append(InvitationResponse(
            id=invitation.id,
            group_id=invitation.group_id,
            group_name=group.name if group else "Unknown",
            inviter_id=invitation.inviter_id,
            inviter_name=current_user.name,
            invitee_email=invitation.invitee_email,
            status=invitation.status,
            token=invitation.token,
            expires_at=invitation.expires_at,
            created_at=invitation.created_at
        ))
    
    return responses
