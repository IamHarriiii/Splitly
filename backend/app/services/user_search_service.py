"""User search service layer."""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from uuid import UUID

from app.models.user import User
from app.models.invitation import Invitation, InvitationStatus


def search_users(
    db: Session,
    query: str,
    limit: int = 10
) -> List[User]:
    """
    Search users by name or email.
    
    Args:
        db: Database session
        query: Search query
        limit: Maximum results
        
    Returns:
        List of matching users
    """
    search_pattern = f"%{query}%"
    
    users = db.query(User).filter(
        or_(
            User.name.ilike(search_pattern),
            User.email.ilike(search_pattern)
        )
    ).limit(limit).all()
    
    return users


def get_user_by_email(db: Session, email: str) -> User:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_pending_invitations_for_user(
    db: Session,
    user_id: UUID
) -> List[Invitation]:
    """
    Get pending invitations for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of pending invitations
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return []
    
    # Get invitations by email or user ID
    invitations = db.query(Invitation).filter(
        Invitation.status == InvitationStatus.PENDING,
        or_(
            Invitation.invitee_id == user_id,
            Invitation.invitee_email == user.email
        )
    ).all()
    
    return invitations


def get_sent_invitations(
    db: Session,
    user_id: UUID
) -> List[Invitation]:
    """
    Get invitations sent by a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of sent invitations
    """
    invitations = db.query(Invitation).filter(
        Invitation.inviter_id == user_id
    ).order_by(Invitation.created_at.desc()).all()
    
    return invitations
