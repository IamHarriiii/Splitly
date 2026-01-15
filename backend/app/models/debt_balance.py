import uuid
from datetime import datetime
from sqlalchemy import Column, Numeric, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class DebtBalance(Base):
    """
    Debt balance model (simplified debts between users in a group).
    This table stores the optimized/simplified debt relationships.
    """
    __tablename__ = "debt_balances"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_from = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='check_debt_amount_positive'),
        CheckConstraint('user_from != user_to', name='check_debt_different_users'),
        UniqueConstraint('group_id', 'user_from', 'user_to', name='uq_group_debt'),
    )
    
    # Relationships
    group = relationship("Group", back_populates="debt_balances")
    debtor = relationship("User", foreign_keys=[user_from])
    creditor = relationship("User", foreign_keys=[user_to])
    
    def __repr__(self):
        return f"<DebtBalance(group_id={self.group_id}, user_from={self.user_from}, user_to={self.user_to}, amount={self.amount})>"
