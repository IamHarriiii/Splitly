from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID


class SettlementBase(BaseModel):
    """Base settlement schema."""
    amount: float = Field(..., gt=0, description="Settlement amount")
    notes: Optional[str] = Field(None, max_length=500)
    settlement_date: date = Field(default_factory=date.today, alias="date")
    
    class Config:
        populate_by_name = True


class SettlementCreate(SettlementBase):
    """Schema for creating a settlement."""
    group_id: UUID
    receiver_id: UUID  # Person receiving the money


class SettlementResponse(SettlementBase):
    """Schema for settlement response."""
    id: UUID
    group_id: UUID
    group_name: str
    payer_id: UUID
    payer_name: str
    receiver_id: UUID
    receiver_name: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True


class DebtSummaryItem(BaseModel):
    """Individual debt item."""
    user_id: UUID
    user_name: str
    amount: float


class UserDebtSummary(BaseModel):
    """Debt summary for a user in a group."""
    user_id: UUID
    user_name: str
    total_owed_to_user: float  # How much others owe this user
    total_user_owes: float      # How much this user owes others
    net_balance: float          # Positive = owed money, Negative = owes money
    who_owes_you: List[DebtSummaryItem]
    who_you_owe: List[DebtSummaryItem]


class SimplifiedDebt(BaseModel):
    """A simplified debt transaction."""
    from_user_id: UUID
    from_user_name: str
    to_user_id: UUID
    to_user_name: str
    amount: float


class GroupDebtSummary(BaseModel):
    """Complete debt summary for a group."""
    group_id: UUID
    group_name: str
    total_group_expenses: float
    member_summaries: List[UserDebtSummary]
    simplified_debts: List[SimplifiedDebt]
    settlement_suggestions: List[SimplifiedDebt]  # Same as simplified_debts, for clarity


class DebtBalanceResponse(BaseModel):
    """Individual debt balance response."""
    id: UUID
    group_id: UUID
    user_from: UUID
    user_from_name: str
    user_to: UUID
    user_to_name: str
    amount: float
    last_updated: datetime
    
    class Config:
        from_attributes = True
