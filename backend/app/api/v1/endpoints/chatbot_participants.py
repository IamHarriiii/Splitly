"""Chatbot API endpoints for AI-powered expense parsing."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.schemas.chatbot import (
    ChatbotRequest, ChatbotResponse, ConfirmExpenseRequest, ClarifyRequest
)
from app.services import chatbot_service
from app.services.expense_service import create_expense
from app.schemas.expense import ExpenseCreate, ExpenseSplitInput, SplitType
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])


@router.post("/search-participants")
def search_participants(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by participant names.
    Returns users with emails for disambiguation.
    """
    participant_names = request.get("participant_names", [])
    users = chatbot_service.search_users_by_names(db, participant_names)
    return {"users": users}


@router.post("/find-groups")
def find_common_groups_endpoint(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find groups containing current user and all participants.
    """
    participant_ids = request.get("participant_ids", [])
    participant_uuids = [UUID(pid) for pid in participant_ids]
    groups = chatbot_service.find_common_groups(db, current_user.id, participant_uuids)
    return {"common_groups": groups}


@router.post("/create-group-expense")
def create_group_expense_from_chat(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create group expense from chatbot conversation.
    """
    try:
        # Build splits based on split type
        splits = []
        participant_ids = [UUID(pid) for pid in request["participant_ids"]]
        
        if request["split_type"] == "equal":
            # Equal split among all participants
            for pid in participant_ids:
                splits.append(ExpenseSplitInput(
                    user_id=pid,
                    share_amount=None,
                    share_percentage=None
                ))
        elif request["split_type"] == "exact":
            # Exact amounts provided
            for pid, amount in zip(participant_ids, request.get("amounts", [])):
                splits.append(ExpenseSplitInput(
                    user_id=pid,
                    share_amount=amount,
                    share_percentage=None
                ))
        elif request["split_type"] == "percentage":
            # Percentages provided
            for pid, pct in zip(participant_ids, request.get("percentages", [])):
                splits.append(ExpenseSplitInput(
                    user_id=pid,
                    share_amount=None,
                    share_percentage=pct
                ))
        
        # Create expense
        expense_create = ExpenseCreate(
            amount=request["amount"],
            description=request["description"],
            category=request["category"],
            expense_date=request.get("date"),
            group_id=UUID(request["group_id"]),
            split_type=SplitType(request["split_type"]),
            is_personal=False,
            paid_by=current_user.id,
            splits=splits
        )
        
        expense = create_expense(db, expense_create, current_user.id)
        
        return {
            "success": True,
            "expense_id": str(expense.id),
            "message": "Group expense created successfully!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create group expense: {str(e)}"
        )
