from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date
from uuid import UUID


class ChatbotRequest(BaseModel):
    """Request to parse expense from natural language."""
    text: str = Field(..., min_length=1, max_length=500, description="Natural language expense description")
    group_id: Optional[UUID] = Field(None, description="Optional group context")


class ParsedExpense(BaseModel):
    """Parsed expense details from LLM."""
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    category: Optional[str] = None
    expense_date: Optional[date] = Field(None, alias="date")
    participants: List[str] = Field(default_factory=list, description="Names of people mentioned in split")  # NEW
    split_type: Optional[str] = Field(None, description="equal, exact, or percentage")  # NEW
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    missing_fields: List[str] = Field(default_factory=list, description="Fields that need clarification")
    
    class Config:
        populate_by_name = True


class ParticipantMatch(BaseModel):
    """A single user match for a participant name."""
    user_id: UUID
    full_name: str
    email: str
    avatar_url: Optional[str] = None


class AmbiguousParticipant(BaseModel):
    """Participant name with multiple matches."""
    name_query: str
    matches: List[ParticipantMatch]


class ParticipantResolutionResponse(BaseModel):
    """Response for participant name resolution."""
    needs_disambiguation: bool
    ambiguous_participants: List[AmbiguousParticipant] = Field(default_factory=list)
    resolved_participants: List[UUID] = Field(default_factory=list, description="Auto-resolved participant IDs")


class CommonGroup(BaseModel):
    """A group that contains all participants."""
    group_id: UUID
    group_name: str
    member_count: int


class GroupResolutionResponse(BaseModel):
    """Response for group resolution."""
    common_groups: List[CommonGroup]
    can_create_new: bool = True


class ClarificationQuestion(BaseModel):
    """Clarification question for missing/ambiguous details."""
    field: str
    question: str
    suggestions: Optional[List[str]] = None


class ChatbotResponse(BaseModel):
    """Response from chatbot after parsing."""
    success: bool
    parsed_expense: Optional[ParsedExpense] = None
    needs_clarification: bool = False
    clarification_questions: List[ClarificationQuestion] = Field(default_factory=list)
    participant_resolution: Optional[ParticipantResolutionResponse] = None  # NEW
    message: str
    session_id: Optional[str] = None  # For multi-turn conversations


class ParticipantResolutionRequest(BaseModel):
    """Request to resolve participant names to user IDs."""
    session_id: str
    selected_participants: Dict[str, UUID]  # name_query -> selected_user_id


class GroupResolutionRequest(BaseModel):
    """Request to find common groups."""
    session_id: str
    participant_ids: List[UUID]


class ConfirmExpenseRequest(BaseModel):
    """Request to confirm and create expense."""
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    category: Optional[str] = None
    expense_date: date = Field(default_factory=date.today, alias="date")
    group_id: Optional[UUID] = None
    paid_by: UUID
    split_type: str = "equal"  # equal, exact, percentage
    splits: List[Dict[str, Any]] = Field(..., min_items=1)
    
    class Config:
        populate_by_name = True


class ClarifyRequest(BaseModel):
    """Request to provide clarification."""
    session_id: str
    clarifications: Dict[str, Any]  # field -> value mapping
