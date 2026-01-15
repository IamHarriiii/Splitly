from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: UUID
    avatar_url: Optional[str]
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """Schema for user in database (includes password hash)."""
    password_hash: str
