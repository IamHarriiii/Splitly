from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: UUID
    email: str
    role: str


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: str
    password: str


class SignupRequest(BaseModel):
    """Schema for signup request."""
    name: str
    email: str
    password: str


class AuthResponse(BaseModel):
    """Schema for authentication response (includes user and token)."""
    user: dict
    token: Token
