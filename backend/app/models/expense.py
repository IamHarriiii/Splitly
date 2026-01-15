import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, Date, DateTime, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Expense(Base):
    """Expense model."""
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    is_personal = Column(Boolean, default=False, nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    paid_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='check_expense_amount_positive'),
    )
    
    # Relationships
    group = relationship("Group", back_populates="expenses")
    creator = relationship("User", back_populates="created_expenses", foreign_keys=[created_by])
    payer = relationship("User", back_populates="paid_expenses", foreign_keys=[paid_by])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Expense(id={self.id}, amount={self.amount}, description={self.description})>"


class ExpenseSplit(Base):
    """Expense split model (how an expense is divided among participants)."""
    __tablename__ = "expense_splits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    share_amount = Column(Numeric(10, 2), nullable=False)
    share_percentage = Column(Numeric(5, 2), nullable=True)  # Optional, for percentage splits
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('share_amount >= 0', name='check_split_amount_non_negative'),
    )
    
    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")
    
    def __repr__(self):
        return f"<ExpenseSplit(expense_id={self.expense_id}, user_id={self.user_id}, amount={self.share_amount})>"
