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
            missing_fields=parsed_data.get("missing_fields", []),
            participants=parsed_data.get("participants", [])  # Include participants!
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


def search_users_by_names(db: Session, names: List[str]) -> List[Dict[str, Any]]:
    """
    Search for users by first names.
    Returns list of users with potential duplicates.
    """
    results = []
    
    for name in names:
        # Case-insensitive search
        users = db.query(User).filter(
            User.name.ilike(f"%{name}%")
        ).all()
        
        for user in users:
            results.append({
                "search_name": name,
                "user_id": str(user.id),
                "name": user.name,
                "email": user.email
            })
    
    return results


def find_common_groups(
    db: Session,
    current_user_id: UUID,
    participant_ids: List[UUID]
) -> List[Dict[str, Any]]:
    """
    Find groups that contain current user and all participants.
    """
    # Get all groups current user is in
    user_groups = db.query(GroupMember).filter(
        GroupMember.user_id == current_user_id
    ).all()
    
    user_group_ids = {m.group_id for m in user_groups}
    
    # Find groups that contain all participants
    common_groups = []
    
    for group_id in user_group_ids:
        # Check if all participants are in this group
        members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).all()
        
        member_ids = {m.user_id for m in members}
        
        # Check if all participants are members
        if all(pid in member_ids for pid in participant_ids):
            group = db.query(Group).filter(Group.id == group_id).first()
            if group:
                common_groups.append({
                    "group_id": str(group.id),
                    "group_name": group.name,
                    "member_count": len(members)
                })
    
    return common_groups


def create_participant_conversation(
    user_id: UUID,
    parsed_data: Dict[str, Any]
) -> str:
    """
    Create conversation state for participant-based expense.
    """
    from datetime import datetime
    
    session_id = f"participant_{user_id}_{datetime.now().timestamp()}"
    
    chatbot_sessions[session_id] = {
        "user_id": str(user_id),
        "step": "confirm_participants",
        "data": {
            "amount": parsed_data.get("amount"),
            "description": parsed_data.get("description"),
            "category": parsed_data.get("category"),
            "date": parsed_data.get("date"),
            "participant_names": parsed_data.get("participants", []),
            "split_type": parsed_data.get("split_type", "equal"),
            "participants": [],  # Will be filled after confirmation
            "group_id": None,
            "splits": []
        },
        "created_at": datetime.now().isoformat()
    }
    
    return session_id


def update_participant_conversation(
    session_id: str,
    step: str,
    data_updates: Dict[str, Any]
) -> bool:
    """
    Update participant conversation state.
    """
    if session_id not in chatbot_sessions:
        return False
    
    chatbot_sessions[session_id]["step"] = step
    chatbot_sessions[session_id]["data"].update(data_updates)
    return True
