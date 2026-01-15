"""Group API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.group import (
    GroupCreate, GroupUpdate, GroupResponse, GroupDetailResponse,
    GroupMemberResponse, AddMemberRequest, InvitationResponse
)
from app.services import group_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.group import GroupMember

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new group.
    
    The current user will be added as the group owner.
    Other members can be added via member_ids (they will receive invitations).
    """
    group = group_service.create_group(db, group_data, current_user.id)
    
    # Get member count
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at
    )


@router.get("", response_model=dict)
def list_user_groups(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all groups that the current user is a member of.
    
    Returns paginated list of groups with member counts.
    """
    groups, total_count = group_service.get_user_groups(db, current_user.id, page, limit)
    
    # Build response with member counts
    group_responses = []
    for group in groups:
        member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
        group_responses.append(GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_by=group.created_by,
            member_count=member_count,
            created_at=group.created_at,
            updated_at=group.updated_at
        ))
    
    return {
        "data": group_responses,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_details(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a group.
    
    Includes full member list with roles and user information.
    User must be a member of the group to access this endpoint.
    """
    group = group_service.get_group_details(db, group_id, current_user.id)
    
    # Get all members with user details
    members_data = db.query(GroupMember, User).join(
        User, GroupMember.user_id == User.id
    ).filter(
        GroupMember.group_id == group_id
    ).all()
    
    members = []
    for membership, user in members_data:
        members.append(GroupMemberResponse(
            user_id=user.id,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url,
            role=membership.role,
            joined_at=membership.joined_at
        ))
    
    # Get creator name
    creator = db.query(User).filter(User.id == group.created_by).first()
    creator_name = creator.name if creator else "Unknown"
    
    # Get member count
    member_count = len(members)
    
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=members,
        creator_name=creator_name
    )


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    update_data: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update group information.
    
    Only the group owner can update the group.
    """
    group = group_service.update_group(db, group_id, current_user.id, update_data)
    
    # Get member count
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at
    )


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a group.
    
    Only the group owner can delete the group.
    This will also delete all related data (expenses, settlements, etc.).
    """
    group_service.delete_group(db, group_id, current_user.id)
    return None


@router.post("/{group_id}/members", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def add_member_to_group(
    group_id: UUID,
    member_data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite a member to the group.
    
    Provide either user_id or email.
    An invitation will be created and the user can accept it.
    """
    invitation = group_service.add_member(
        db,
        group_id,
        current_user.id,
        member_data.email,
        member_data.user_id
    )
    
    # Get group and inviter names
    group = db.query(User).filter(User.id == invitation.group_id).first()
    inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
    from app.models.group import Group
    group_obj = db.query(Group).filter(Group.id == invitation.group_id).first()
    
    return InvitationResponse(
        id=invitation.id,
        group_id=invitation.group_id,
        group_name=group_obj.name if group_obj else "Unknown",
        inviter_name=inviter.name if inviter else "Unknown",
        invitee_email=invitation.invitee_email,
        status=invitation.status.value,
        token=invitation.token,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at
    )


@router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_from_group(
    group_id: UUID,
    member_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a member from the group.
    
    Only the group owner can remove members.
    Cannot remove the group owner.
    """
    group_service.remove_member(db, group_id, current_user.id, member_id)
    return None


@router.post("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Leave a group.
    
    If you are the owner and there are other members, you must transfer
    ownership or remove all members before leaving.
    """
    group_service.leave_group(db, group_id, current_user.id)
    return None


@router.post("/invitations/{token}/accept", response_model=GroupResponse)
def accept_group_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept a group invitation.
    
    The invitation token is provided in the invitation email/link.
    """
    group = group_service.accept_invitation(db, token, current_user.id)
    
    # Get member count
    member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
    
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at
    )


@router.get("/invitations/pending", response_model=List[InvitationResponse])
def get_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all pending invitations for the current user.
    """
    from app.models.invitation import Invitation, InvitationStatus
    from app.models.group import Group
    from datetime import datetime
    
    invitations = db.query(Invitation).filter(
        ((Invitation.invitee_id == current_user.id) | (Invitation.invitee_email == current_user.email)),
        Invitation.status == InvitationStatus.PENDING,
        Invitation.expires_at > datetime.utcnow()
    ).all()
    
    result = []
    for invitation in invitations:
        group = db.query(Group).filter(Group.id == invitation.group_id).first()
        inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
        
        result.append(InvitationResponse(
            id=invitation.id,
            group_id=invitation.group_id,
            group_name=group.name if group else "Unknown",
            inviter_name=inviter.name if inviter else "Unknown",
            invitee_email=invitation.invitee_email,
            status=invitation.status.value,
            token=invitation.token,
            expires_at=invitation.expires_at,
            created_at=invitation.created_at
        ))
    
    return result
