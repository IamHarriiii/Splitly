from fastapi import APIRouter
from app.api.v1.endpoints import auth, groups, expenses, debts, analytics, activity, chatbot, users

api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router)

# Include groups routes
api_router.include_router(groups.router)

# Include expenses routes
api_router.include_router(expenses.router)

# Include debts and settlements routes
api_router.include_router(debts.router)

# Include analytics and dashboard routes
api_router.include_router(analytics.router)

# Include activity feed routes
api_router.include_router(activity.router)

# Include AI chatbot routes
api_router.include_router(chatbot.router)

# Include user search and invitations routes
api_router.include_router(users.router)