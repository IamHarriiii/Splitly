from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class SplitType(str, Enum):
    """Types of expense splits."""
    EQUAL = "equal"
    EXACT = "exact"
    PERCENTAGE = "percentage"


class ExpenseSplitInput(BaseModel):
    """Schema for expense split input."""
    user_id: UUID
    share_amount: Optional[float] = Field(None, ge=0)
    share_percentage: Optional[float] = Field(None, ge=0, le=100)
    
    @validator('share_amount', 'share_percentage')
    def validate_split_values(cls, v):
        """Ensure split values are valid."""
        if v is not None and v < 0:
            raise ValueError("Split values must be non-negative")
        return v


class ExpenseBase(BaseModel):
    """Base expense schema with common fields."""
    amount: float = Field(..., gt=0, description="Total expense amount")
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    expense_date: date = Field(default_factory=date.today, alias="date")
    is_personal: bool = False
    
    class Config:
        populate_by_name = True


class ExpenseCreate(ExpenseBase):
    """Schema for creating a new expense."""
    group_id: Optional[UUID] = None
    paid_by: UUID  # User who paid
    split_type: SplitType = SplitType.EQUAL
    splits: List[ExpenseSplitInput] = Field(..., min_items=1)
    
    @validator('splits')
    def validate_splits(cls, splits, values):
        """Validate splits based on split type."""
        if 'split_type' not in values:
            return splits
            
        split_type = values['split_type']
        
        if split_type == SplitType.EQUAL:
            # For equal split, we don't need share amounts
            return splits
            
        elif split_type == SplitType.EXACT:
            # For exact split, all splits must have share_amount
            for split in splits:
                if split.share_amount is None:
                    raise ValueError("All splits must have share_amount for exact split type")
            
            # Verify total equals expense amount
            total = sum(split.share_amount for split in splits)
            if 'amount' in values and abs(total - values['amount']) > 0.01:
                raise ValueError(f"Sum of splits ({total}) must equal total amount ({values['amount']})")
                
        elif split_type == SplitType.PERCENTAGE:
            # For percentage split, all splits must have share_percentage
            for split in splits:
                if split.share_percentage is None:
                    raise ValueError("All splits must have share_percentage for percentage split type")
            
            # Verify percentages sum to 100
            total_pct = sum(split.share_percentage for split in splits)
            if abs(total_pct - 100) > 0.01:
                raise ValueError(f"Sum of percentages ({total_pct}) must equal 100")
        
        return splits


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense."""
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    expense_date: Optional[date] = Field(None, alias="date")
    
    class Config:
        populate_by_name = True


class ExpenseSplitResponse(BaseModel):
    """Schema for expense split response."""
    user_id: UUID
    user_name: str
    share_amount: float
    share_percentage: Optional[float]
    
    class Config:
        from_attributes = True


class ExpenseResponse(ExpenseBase):
    """Schema for expense response."""
    id: UUID
    group_id: Optional[UUID]
    group_name: Optional[str]
    created_by: UUID
    creator_name: str
    paid_by: UUID
    payer_name: str
    splits: List[ExpenseSplitResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ExpenseListResponse(BaseModel):
    """Schema for expense list item (lighter than full response)."""
    id: UUID
    amount: float
    description: str
    category: Optional[str]
    expense_date: date = Field(alias="date")
    is_personal: bool
    group_id: Optional[UUID]
    group_name: Optional[str]
    paid_by: UUID
    payer_name: str
    split_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ExpenseFilter(BaseModel):
    """Schema for filtering expenses."""
    group_id: Optional[UUID] = None
    category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    paid_by: Optional[UUID] = None
    involves_user: Optional[UUID] = None  # User is either payer or in splits
    is_personal: Optional[bool] = None
    min_amount: Optional[float] = Field(None, ge=0)
    max_amount: Optional[float] = Field(None, ge=0)
    
    @validator('max_amount')
    def validate_amount_range(cls, v, values):
        """Ensure max_amount >= min_amount."""
        if v is not None and 'min_amount' in values and values['min_amount'] is not None:
            if v < values['min_amount']:
                raise ValueError("max_amount must be >= min_amount")
        return v
