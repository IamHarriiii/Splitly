"""Expense history model for audit trail."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ExpenseHistory(Base):
    """
    Expense edit history for audit trail.
    Tracks all changes made to expenses.
    """
    __tablename__ = "expense_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    edited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    edited_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Changed fields
    field_changed = Column(String(50), nullable=False)  # 'amount', 'description', 'category', etc.
    old_value = Column(String(500), nullable=True)
    new_value = Column(String(500), nullable=True)
    
    # Relationships
    expense = relationship("Expense")
    editor = relationship("User")
    
    def __repr__(self):
        return f"<ExpenseHistory(expense_id={self.expense_id}, field={self.field_changed}, edited_at={self.edited_at})>"
