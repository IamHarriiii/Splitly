from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.core.exception_handler import (
    splitly_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from app.core.exceptions import SplitlyException

# Create FastAPI application
app = FastAPI(
    title="Splitly API",
    description="Smart Expense & Debt Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# In production, this should be restricted to the frontend domain
origins = []
if hasattr(settings, "cors_origins_list"):
    origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# Register exception handlers
app.add_exception_handler(SplitlyException, splitly_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Splitly API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
