from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, SignupRequest, AuthResponse, Token
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import auth_service
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(
    signup_data: SignupRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    
    Creates a new user account and returns the user info with an access token.
    """
    # Create user
    user_create = UserCreate(
        name=signup_data.name,
        email=signup_data.email,
        password=signup_data.password
    )
    user = auth_service.create_user(db, user_create)
    
    # Generate token
    token = auth_service.generate_token(user)
    
    # Return user and token
    return AuthResponse(
        user=UserResponse.from_orm(user).dict(),
        token=token
    )


@router.post("/login", response_model=AuthResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    
    Authenticates user and returns user info with an access token.
    """
    # Authenticate user
    user = auth_service.authenticate_user(db, login_data.email, login_data.password)
    
    # Generate token
    token = auth_service.generate_token(user)
    
    # Return user and token
    return AuthResponse(
        user=UserResponse.from_orm(user).dict(),
        token=token
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    
    Returns the profile of the currently logged-in user.
    """
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information.
    
    Allows user to update their name and avatar URL.
    """
    updated_user = auth_service.update_user(db, current_user.id, user_data)
    return UserResponse.from_orm(updated_user)
