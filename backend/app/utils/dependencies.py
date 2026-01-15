from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.core.security import verify_token
from app.models.user import User
from app.models.group import GroupMember, GroupMemberRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Extracts JWT token from Authorization header, validates it,
    and returns the user object.
    
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = verify_token(token)
        user_id: str = payload.get("user_id")
        
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Fetch user from database
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role.
    
    Raises:
        HTTPException: 403 if user is not an admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_group_membership(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GroupMember:
    """
    Dependency to verify user is a member of the specified group.
    
    Args:
        group_id: UUID of the group
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        GroupMember object
        
    Raises:
        HTTPException: 403 if user is not a member of the group
    """
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    return membership


async def require_group_owner(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GroupMember:
    """
    Dependency to verify user is the owner of the specified group.
    
    Args:
        group_id: UUID of the group
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        GroupMember object
        
    Raises:
        HTTPException: 403 if user is not the group owner
    """
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == GroupMemberRole.OWNER
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can perform this action"
        )
    
    return membership
