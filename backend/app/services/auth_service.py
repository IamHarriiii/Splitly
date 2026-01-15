from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from uuid import UUID

from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, validate_password_strength
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.auth import Token
from app.core.config import settings


def create_user(db: Session, user_data: UserCreate) -> User:
    """
    Create a new user.
    
    Args:
        db: Database session
        user_data: User creation data
        
    Returns:
        Created user object
        
    Raises:
        HTTPException: 400 if email already exists or password is weak
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Create user
    hashed_password = hash_password(user_data.password)
    db_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Authenticate a user with email and password.
    
    Args:
        db: Database session
        email: User email
        password: User password
        
    Returns:
        Authenticated user object
        
    Raises:
        HTTPException: 401 if credentials are invalid
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    return user


def generate_token(user: User) -> Token:
    """
    Generate JWT access token for user.
    
    Args:
        user: User object
        
    Returns:
        Token object with access_token and token_type
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value
        },
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


def update_user(db: Session, user_id: UUID, user_data: UserUpdate) -> User:
    """
    Update user information.
    
    Args:
        db: Database session
        user_id: User ID
        user_data: Update data
        
    Returns:
        Updated user object
        
    Raises:
        HTTPException: 404 if user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_data.name is not None:
        user.name = user_data.name
    if user_data.avatar_url is not None:
        user.avatar_url = user_data.avatar_url
    
    db.commit()
    db.refresh(user)
    
    return user
