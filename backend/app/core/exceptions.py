"""Custom exception classes for the application."""
from fastapi import HTTPException, status


class SplitlyException(Exception):
    """Base exception for Splitly application."""
    
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ResourceNotFoundException(SplitlyException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource: str, resource_id: str = None):
        message = f"{resource} not found"
        if resource_id:
            message = f"{resource} with ID {resource_id} not found"
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class UnauthorizedException(SplitlyException):
    """Raised when user is not authenticated."""
    
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(SplitlyException):
    """Raised when user doesn't have permission."""
    
    def __init__(self, message: str = "You don't have permission to perform this action"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class ValidationException(SplitlyException):
    """Raised when input validation fails."""
    
    def __init__(self, message: str, field: str = None):
        if field:
            message = f"Validation error for field '{field}': {message}"
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY)


class DuplicateResourceException(SplitlyException):
    """Raised when trying to create a duplicate resource."""
    
    def __init__(self, resource: str, field: str = None):
        message = f"{resource} already exists"
        if field:
            message = f"{resource} with this {field} already exists"
        super().__init__(message, status.HTTP_409_CONFLICT)


class RateLimitException(SplitlyException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS)


class ExternalServiceException(SplitlyException):
    """Raised when external service (like OpenRouter) fails."""
    
    def __init__(self, service: str, message: str = None):
        msg = f"External service '{service}' error"
        if message:
            msg = f"{msg}: {message}"
        super().__init__(msg, status.HTTP_503_SERVICE_UNAVAILABLE)
