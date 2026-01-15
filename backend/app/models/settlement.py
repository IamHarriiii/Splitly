import uuid
from datetime import datetime, date
from sqlalchemy import Column, Numeric, Date, DateTime, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Settlement(Base):
    """Settlement model (records when someone pays back a debt)."""
    __tablename__ = "settlements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    payer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('amount > 0', name='check_settlement_amount_positive'),
        CheckConstraint('payer_id != receiver_id', name='check_settlement_different_users'),
    )
    
    # Relationships
    group = relationship("Group", back_populates="settlements")
    payer = relationship("User", foreign_keys=[payer_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    
    def __repr__(self):
        return f"<Settlement(id={self.id}, payer_id={self.payer_id}, receiver_id={self.receiver_id}, amount={self.amount})>"
