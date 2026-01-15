"""Chatbot service layer for expense parsing."""
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from datetime import date

from app.services.openrouter_service import parse_expense_with_llm
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense
from app.schemas.chatbot import ParsedExpense, ChatbotResponse, ClarificationQuestion


# Simple in-memory session store (in production, use Redis or database)
chatbot_sessions: Dict[str, Dict[str, Any]] = {}


async def process_expense_input(
    db: Session,
    user_id: UUID,
    text: str,
    group_id: Optional[UUID] = None
) -> ChatbotResponse:
    """
    Process natural language expense input.
    
    Args:
        db: Database session
        user_id: User ID
        text: Natural language input
        group_id: Optional group context
        
    Returns:
        ChatbotResponse with parsed data or clarification questions
    """
    # Get user context
    user_groups = get_user_groups(db, user_id)
    recent_categories = get_recent_categories(db, user_id)
    
    try:
        # Parse with LLM
        parsed_data = await parse_expense_with_llm(
            user_input=text,
            user_groups=user_groups,
            recent_categories=recent_categories
        )
        
        # Create parsed expense object
        parsed_expense = ParsedExpense(
            amount=parsed_data.get("amount"),
            description=parsed_data.get("description"),
            category=parsed_data.get("category"),
            expense_date=parsed_data.get("date"),
            confidence=parsed_data.get("confidence", 0.5),
            missing_fields=parsed_data.get("missing_fields", [])
        )
        
        # Check if clarification is needed
        if parsed_expense.confidence < 0.7 or parsed_expense.missing_fields:
            # Generate clarification questions
            questions = generate_clarification_questions(
                parsed_expense,
                recent_categories
            )
            
            # Create session for multi-turn conversation
            session_id = str(uuid4())
            chatbot_sessions[session_id] = {
                "user_id": user_id,
                "group_id": group_id,
                "parsed_expense": parsed_data,
                "original_text": text
            }
            
            return ChatbotResponse(
                success=True,
                parsed_expense=parsed_expense,
                needs_clarification=True,
                clarification_questions=questions,
                message="I need some clarification to create this expense.",
                session_id=session_id
            )
        
        # High confidence - return parsed data for confirmation
        return ChatbotResponse(
            success=True,
            parsed_expense=parsed_expense,
            needs_clarification=False,
            message="I've parsed your expense. Please review and confirm.",
            session_id=None
        )
        
    except Exception as e:
        return ChatbotResponse(
            success=False,
            parsed_expense=None,
            needs_clarification=False,
            message=f"Sorry, I couldn't parse that expense. Error: {str(e)}"
        )


def generate_clarification_questions(
    parsed_expense: ParsedExpense,
    recent_categories: List[str]
) -> List[ClarificationQuestion]:
    """
    Generate clarification questions for missing/ambiguous fields.
    
    Args:
        parsed_expense: Parsed expense with missing fields
        recent_categories: User's recent categories
        
    Returns:
        List of clarification questions
    """
    questions = []
    
    if "amount" in parsed_expense.missing_fields or not parsed_expense.amount:
        questions.append(ClarificationQuestion(
            field="amount",
            question="How much was the expense?",
            suggestions=None
        ))
    
    if "description" in parsed_expense.missing_fields or not parsed_expense.description:
        questions.append(ClarificationQuestion(
            field="description",
            question="What was this expense for?",
            suggestions=None
        ))
    
    if not parsed_expense.category and recent_categories:
        questions.append(ClarificationQuestion(
            field="category",
            question="What category should this be?",
            suggestions=recent_categories[:5]  # Top 5 recent categories
        ))
    
    return questions


def get_user_groups(db: Session, user_id: UUID) -> List[str]:
    """Get list of user's group names."""
    memberships = db.query(GroupMember, Group).join(
        Group, GroupMember.group_id == Group.id
    ).filter(
        GroupMember.user_id == user_id
    ).all()
    
    return [group.name for _, group in memberships]


def get_recent_categories(db: Session, user_id: UUID, limit: int = 10) -> List[str]:
    """Get user's recent expense categories."""
    expenses = db.query(Expense).filter(
        (Expense.created_by == user_id) |
        (Expense.paid_by == user_id)
    ).filter(
        Expense.category.isnot(None)
    ).order_by(
        Expense.date.desc()
    ).limit(limit * 2).all()  # Get more to deduplicate
    
    # Deduplicate while preserving order
    seen = set()
    categories = []
    for exp in expenses:
        if exp.category and exp.category not in seen:
            seen.add(exp.category)
            categories.append(exp.category)
            if len(categories) >= limit:
                break
    
    return categories


def handle_clarification(
    session_id: str,
    clarifications: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle clarification responses and update parsed expense.
    
    Args:
        session_id: Session ID
        clarifications: Field -> value mapping
        
    Returns:
        Updated parsed expense data
    """
    if session_id not in chatbot_sessions:
        raise ValueError("Invalid or expired session")
    
    session = chatbot_sessions[session_id]
    parsed_data = session["parsed_expense"]
    
    # Update with clarifications
    for field, value in clarifications.items():
        if field in ["amount", "description", "category", "date"]:
            parsed_data[field] = value
    
    # Recalculate missing fields
    missing_fields = []
    if not parsed_data.get("amount"):
        missing_fields.append("amount")
    if not parsed_data.get("description"):
        missing_fields.append("description")
    
    parsed_data["missing_fields"] = missing_fields
    
    # Update confidence
    if not missing_fields:
        parsed_data["confidence"] = 0.9
    
    # Update session
    session["parsed_expense"] = parsed_data
    
    return parsed_data
