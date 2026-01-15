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


@router.post("/parse", response_model=ChatbotResponse)
async def parse_expense(
    request: ChatbotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse expense from natural language input.
    
    Uses AI to extract expense details from user's text.
    Returns parsed data with confidence score.
    
    If confidence is low or fields are missing, returns clarification questions.
    """
    response = await chatbot_service.process_expense_input(
        db=db,
        user_id=current_user.id,
        text=request.text,
        group_id=request.group_id
    )
    
    return response


@router.post("/clarify", response_model=ChatbotResponse)
def handle_clarification(
    request: ClarifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle clarification responses.
    
    User provides missing information requested in clarification questions.
    Returns updated parsed expense.
    """
    try:
        updated_data = chatbot_service.handle_clarification(
            session_id=request.session_id,
            clarifications=request.clarifications
        )
        
        from app.schemas.chatbot import ParsedExpense
        
        parsed_expense = ParsedExpense(
            amount=updated_data.get("amount"),
            description=updated_data.get("description"),
            category=updated_data.get("category"),
            expense_date=updated_data.get("date"),
            confidence=updated_data.get("confidence", 0.9),
            missing_fields=updated_data.get("missing_fields", [])
        )
        
        if parsed_expense.missing_fields:
            # Still need more clarification
            questions = chatbot_service.generate_clarification_questions(
                parsed_expense,
                chatbot_service.get_recent_categories(db, current_user.id)
            )
            
            return ChatbotResponse(
                success=True,
                parsed_expense=parsed_expense,
                needs_clarification=True,
                clarification_questions=questions,
                message="Thanks! I still need a bit more information.",
                session_id=request.session_id
            )
        
        # All fields provided - ready for confirmation
        return ChatbotResponse(
            success=True,
            parsed_expense=parsed_expense,
            needs_clarification=False,
            message="Perfect! Please review and confirm the expense.",
            session_id=None
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/confirm", response_model=dict, status_code=status.HTTP_201_CREATED)
def confirm_and_create_expense(
    request: ConfirmExpenseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm and create expense from parsed data.
    
    User confirms the parsed expense details (with optional edits).
    Creates the actual expense in the database.
    """
    # Convert to ExpenseCreate schema
    expense_data = ExpenseCreate(
        amount=request.amount,
        description=request.description,
        category=request.category,
        expense_date=request.expense_date,
        is_personal=request.group_id is None,
        group_id=request.group_id,
        paid_by=request.paid_by,
        split_type=SplitType(request.split_type),
        splits=[
            ExpenseSplitInput(**split) for split in request.splits
        ]
    )
    
    # Create expense
    expense = create_expense(db, expense_data, current_user.id)
    
    return {
        "success": True,
        "message": "Expense created successfully!",
        "expense_id": expense.id,
        "amount": float(expense.amount),
        "description": expense.description
    }


@router.get("/examples")
def get_example_inputs():
    """
    Get example natural language inputs.
    
    Helpful for users to understand what kind of input the chatbot can parse.
    """
    return {
        "examples": [
            {
                "input": "Spent $25 on coffee",
                "parsed": {
                    "amount": 25,
                    "description": "coffee",
                    "category": "Food",
                    "confidence": "high"
                }
            },
            {
                "input": "Team lunch was $150 yesterday",
                "parsed": {
                    "amount": 150,
                    "description": "team lunch",
                    "category": "Food",
                    "date": "yesterday",
                    "confidence": "high"
                }
            },
            {
                "input": "Paid $50 for groceries",
                "parsed": {
                    "amount": 50,
                    "description": "groceries",
                    "category": "Food",
                    "confidence": "high"
                }
            },
            {
                "input": "Uber to airport $35",
                "parsed": {
                    "amount": 35,
                    "description": "uber to airport",
                    "category": "Transport",
                    "confidence": "high"
                }
            }
        ],
        "tips": [
            "Include the amount and what it was for",
            "Mention the date if not today",
            "Category will be suggested based on your history",
            "Be as specific as possible for better parsing"
        ]
    }
