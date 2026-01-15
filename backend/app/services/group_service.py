"""Group service layer - handles all group-related business logic."""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta

from app.models.user import User
from app.models.group import Group, GroupMember, GroupMemberRole
from app.models.invitation import Invitation, InvitationStatus
from app.schemas.group import GroupCreate, GroupUpdate


def create_group(
    db: Session,
    group_data: GroupCreate,
    creator_id: UUID
) -> Group:
    """
    Create a new group with the creator as owner.
    
    Args:
        db: Database session
        group_data: Group creation data
        creator_id: ID of the user creating the group
        
    Returns:
        Created group object
    """
    # Create the group
    db_group = Group(
        name=group_data.name,
        description=group_data.description,
        created_by=creator_id
    )
    db.add(db_group)
    db.flush()  # Get the group ID
    
    # Add creator as owner
    creator_membership = GroupMember(
        group_id=db_group.id,
        user_id=creator_id,
        role=GroupMemberRole.OWNER
    )
    db.add(creator_membership)
    
    # Add other members (if any)
    for member_id in group_data.member_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == member_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {member_id} not found"
            )
        
        # Don't add creator again
        if member_id == creator_id:
            continue
            
        # Create invitation for this user
        invitation = Invitation(
            group_id=db_group.id,
            inviter_id=creator_id,
            invitee_email=user.email,
            invitee_id=member_id,
            status=InvitationStatus.PENDING,
            token=str(uuid4()),
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invitation)
    
    db.commit()
    db.refresh(db_group)
    
    return db_group


def get_user_groups(
    db: Session,
    user_id: UUID,
    page: int = 1,
    limit: int = 20
) -> tuple[List[Group], int]:
    """
    Get all groups that a user is a member of.
    
    Args:
        db: Database session
        user_id: User ID
        page: Page number (1-indexed)
        limit: Items per page
        
    Returns:
        Tuple of (list of groups, total count)
    """
    # Query groups where user is a member
    query = db.query(Group).join(GroupMember).filter(
        GroupMember.user_id == user_id
    )
    
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    groups = query.order_by(Group.created_at.desc()).offset(offset).limit(limit).all()
    
    return groups, total_count


def get_group_details(
    db: Session,
    group_id: UUID,
    current_user_id: UUID
) -> Group:
    """
    Get detailed information about a group.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID
        
    Returns:
        Group object with members
        
    Raises:
        HTTPException: 404 if group not found, 403 if user not a member
    """
    # Fetch group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
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
    
    return group


def update_group(
    db: Session,
    group_id: UUID,
    current_user_id: UUID,
    update_data: GroupUpdate
) -> Group:
    """
    Update group information.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID (must be owner)
        update_data: Update data
        
    Returns:
        Updated group object
        
    Raises:
        HTTPException: 404 if not found, 403 if not owner
    """
    # Fetch group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify user is owner
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user_id,
        GroupMember.role == GroupMemberRole.OWNER
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can update group"
        )
    
    # Update fields
    if update_data.name is not None:
        group.name = update_data.name
    if update_data.description is not None:
        group.description = update_data.description
    
    db.commit()
    db.refresh(group)
    
    return group


def delete_group(
    db: Session,
    group_id: UUID,
    current_user_id: UUID
) -> None:
    """
    Delete a group and all related data.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID (must be owner)
        
    Raises:
        HTTPException: 404 if not found, 403 if not owner
    """
    # Fetch group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify user is owner
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user_id,
        GroupMember.role == GroupMemberRole.OWNER
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can delete group"
        )
    
    # Delete group (cascade will handle related records)
    db.delete(group)
    db.commit()


def add_member(
    db: Session,
    group_id: UUID,
    inviter_id: UUID,
    invitee_email: Optional[str] = None,
    invitee_id: Optional[UUID] = None
) -> Invitation:
    """
    Invite a member to a group.
    
    Args:
        db: Database session
        group_id: Group ID
        inviter_id: ID of user sending invitation
        invitee_email: Email of user to invite
        invitee_id: ID of user to invite
        
    Returns:
        Created invitation object
        
    Raises:
        HTTPException: 404 if group/user not found, 403 if not authorized
    """
    # Verify group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify inviter is a member
    inviter_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == inviter_id
    ).first()
    
    if not inviter_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Determine invitee
    if invitee_id:
        user = db.query(User).filter(User.id == invitee_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        invitee_email = user.email
    elif invitee_email:
        # Check if user exists with this email
        user = db.query(User).filter(User.email == invitee_email).first()
        if user:
            invitee_id = user.id
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or email must be provided"
        )
    
    # Check if user is already a member
    if invitee_id:
        existing_membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == invitee_id
        ).first()
        
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this group"
            )
    
    # Create invitation
    invitation = Invitation(
        group_id=group_id,
        inviter_id=inviter_id,
        invitee_email=invitee_email,
        invitee_id=invitee_id,
        status=InvitationStatus.PENDING,
        token=str(uuid4()),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    return invitation


def remove_member(
    db: Session,
    group_id: UUID,
    owner_id: UUID,
    member_id: UUID
) -> None:
    """
    Remove a member from a group.
    
    Args:
        db: Database session
        group_id: Group ID
        owner_id: ID of group owner
        member_id: ID of member to remove
        
    Raises:
        HTTPException: 404 if not found, 403 if not authorized, 400 if trying to remove owner
    """
    # Verify owner is actually the owner
    owner_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == owner_id,
        GroupMember.role == GroupMemberRole.OWNER
    ).first()
    
    if not owner_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can remove members"
        )
    
    # Get member to remove
    member_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == member_id
    ).first()
    
    if not member_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this group"
        )
    
    # Can't remove owner
    if member_membership.role == GroupMemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove group owner"
        )
    
    # Remove member
    db.delete(member_membership)
    db.commit()


def leave_group(
    db: Session,
    group_id: UUID,
    user_id: UUID
) -> None:
    """
    User leaves a group.
    
    Args:
        db: Database session
        group_id: Group ID
        user_id: User ID
        
    Raises:
        HTTPException: 404 if not found, 400 if owner tries to leave with other members or has outstanding debt
    """
    from app.models.debt_balance import DebtBalance
    
    # Get user's membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this group"
        )
    
    # CHECK OUTSTANDING DEBTS - CRITICAL FIX
    # Check if user owes money
    owes_money = db.query(DebtBalance).filter(
        DebtBalance.group_id == group_id,
        DebtBalance.user_from == user_id,
        DebtBalance.amount > 0
    ).first()
    
    if owes_money:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot leave group with outstanding debt of ${owes_money.amount}. Please settle your debts first."
        )
    
    # Check if others owe user money
    owed_money = db.query(DebtBalance).filter(
        DebtBalance.group_id == group_id,
        DebtBalance.user_to == user_id,
        DebtBalance.amount > 0
    ).first()
    
    if owed_money:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot leave group while others owe you ${owed_money.amount}. Please collect debts first."
        )
    
    # If user is owner, check if there are other members
    if membership.role == GroupMemberRole.OWNER:
        other_members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id != user_id
        ).count()
        
        if other_members > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner cannot leave group with other members. Transfer ownership or remove all members first."
            )
    
    # Remove membership
    db.delete(membership)
    db.commit()



def accept_invitation(
    db: Session,
    token: str,
    current_user_id: UUID
) -> Group:
    """
    Accept a group invitation.
    
    Args:
        db: Database session
        token: Invitation token
        current_user_id: Current user ID
        
    Returns:
        Group object
        
    Raises:
        HTTPException: 404 if not found, 400 if expired/invalid
    """
    # Find invitation
    invitation = db.query(Invitation).filter(Invitation.token == token).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Verify status
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation already {invitation.status.value}"
        )
    
    # Verify not expired
    if datetime.utcnow() > invitation.expires_at:
        invitation.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Verify current user matches invitee
    current_user = db.query(User).filter(User.id == current_user_id).first()
    if invitation.invitee_id and invitation.invitee_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you"
        )
    elif invitation.invitee_email and invitation.invitee_email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you"
        )
    
    # Check if already a member
    existing_membership = db.query(GroupMember).filter(
        GroupMember.group_id == invitation.group_id,
        GroupMember.user_id == current_user_id
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this group"
        )
    
    # Create membership
    membership = GroupMember(
        group_id=invitation.group_id,
        user_id=current_user_id,
        role=GroupMemberRole.MEMBER,
        invited_by=invitation.inviter_id
    )
    db.add(membership)
    
    # Update invitation status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.invitee_id = current_user_id
    
    db.commit()
    
    # Return group
    group = db.query(Group).filter(Group.id == invitation.group_id).first()
    return group


def transfer_ownership(
    db: Session,
    group_id: UUID,
    current_owner_id: UUID,
    new_owner_id: UUID
) -> Group:
    """
    Transfer group ownership to another member.
    
    Args:
        db: Database session
        group_id: Group ID
        current_owner_id: Current owner ID
        new_owner_id: New owner ID
        
    Returns:
        Updated group object
        
    Raises:
        HTTPException: 404 if not found, 403 if not authorized, 400 if invalid
    """
    # Verify current owner
    current_owner_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_owner_id,
        GroupMember.role == GroupMemberRole.OWNER
    ).first()
    
    if not current_owner_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only current owner can transfer ownership"
        )
    
    # Verify new owner is a member
    new_owner_membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == new_owner_id
    ).first()
    
    if not new_owner_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New owner must be a member of the group"
        )
    
    # Cannot transfer to self
    if current_owner_id == new_owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer ownership to yourself"
        )
    
    # Transfer ownership
    current_owner_membership.role = GroupMemberRole.MEMBER
    new_owner_membership.role = GroupMemberRole.OWNER
    
    db.commit()
    
    # Return group
    group = db.query(Group).filter(Group.id == group_id).first()
    return group
