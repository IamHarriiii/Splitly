"""Settlement and debt API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.settlement import (
    SettlementCreate, SettlementResponse, GroupDebtSummary,
    DebtBalanceResponse
)
from app.services import settlement_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.debt_balance import DebtBalance

router = APIRouter(prefix="/debts", tags=["Debts & Settlements"])


@router.get("/groups/{group_id}/summary", response_model=GroupDebtSummary)
def get_group_debt_summary(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete debt summary for a group.
    
    Returns:
    - Total group expenses
    - Individual member balances
    - Who owes whom
    - Simplified debt transactions (minimized)
    - Settlement suggestions
    
    The simplified debts use a greedy algorithm to minimize the number
    of transactions needed to settle all debts.
    """
    summary = settlement_service.get_group_debt_summary(db, group_id, current_user.id)
    return summary


@router.get("/groups/{group_id}/balances", response_model=List[DebtBalanceResponse])
def get_group_debt_balances(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all debt balances for a group.
    
    Returns the raw debt balances (before simplification).
    Useful for detailed debt tracking.
    """
    # Verify user is a member
    from app.models.group import GroupMember
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Get all debt balances
    debts = db.query(DebtBalance).filter(DebtBalance.group_id == group_id).all()
    
    # Build responses with user names
    responses = []
    for debt in debts:
        from_user = db.query(User).filter(User.id == debt.user_from).first()
        to_user = db.query(User).filter(User.id == debt.user_to).first()
        
        responses.append(DebtBalanceResponse(
            id=debt.id,
            group_id=debt.group_id,
            user_from=debt.user_from,
            user_from_name=from_user.name if from_user else "Unknown",
            user_to=debt.user_to,
            user_to_name=to_user.name if to_user else "Unknown",
            amount=debt.amount,
            last_updated=debt.last_updated
        ))
    
    return responses


@router.post("/settlements", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def create_settlement(
    settlement_data: SettlementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record a settlement (debt payment).
    
    This creates a settlement record and automatically updates the debt balances.
    
    The current user is the payer. Specify who receives the payment in receiver_id.
    """
    settlement = settlement_service.create_settlement(db, settlement_data, current_user.id)
    
    # Build response with names
    group = db.query(Group).filter(Group.id == settlement.group_id).first()
    payer = db.query(User).filter(User.id == settlement.payer_id).first()
    receiver = db.query(User).filter(User.id == settlement.receiver_id).first()
    
    return SettlementResponse(
        id=settlement.id,
        group_id=settlement.group_id,
        group_name=group.name if group else "Unknown",
        payer_id=settlement.payer_id,
        payer_name=payer.name if payer else "Unknown",
        receiver_id=settlement.receiver_id,
        receiver_name=receiver.name if receiver else "Unknown",
        amount=settlement.amount,
        settlement_date=settlement.date,
        notes=settlement.notes,
        created_at=settlement.created_at
    )


@router.get("/groups/{group_id}/settlements", response_model=dict)
def get_group_settlements(
    group_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get settlement history for a group.
    
    Returns all recorded settlements (debt payments) with pagination.
    """
    settlements, total_count = settlement_service.get_group_settlements(
        db, group_id, current_user.id, page, limit
    )
    
    # Build responses
    settlement_responses = []
    for settlement in settlements:
        group = db.query(Group).filter(Group.id == settlement.group_id).first()
        payer = db.query(User).filter(User.id == settlement.payer_id).first()
        receiver = db.query(User).filter(User.id == settlement.receiver_id).first()
        
        settlement_responses.append(SettlementResponse(
            id=settlement.id,
            group_id=settlement.group_id,
            group_name=group.name if group else "Unknown",
            payer_id=settlement.payer_id,
            payer_name=payer.name if payer else "Unknown",
            receiver_id=settlement.receiver_id,
            receiver_name=receiver.name if receiver else "Unknown",
            amount=settlement.amount,
            settlement_date=settlement.date,
            notes=settlement.notes,
            created_at=settlement.created_at
        ))
    
    return {
        "data": settlement_responses,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }


@router.get("/my-summary", response_model=dict)
def get_my_debt_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get debt summary across all groups for the current user.
    
    Returns:
    - Total amount owed to user
    - Total amount user owes
    - Net balance across all groups
    - Breakdown by group
    """
    from app.models.group import GroupMember
    
    # Get all groups user is a member of
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    total_owed_to_me = 0.0
    total_i_owe = 0.0
    group_summaries = []
    
    for membership in memberships:
        # Get debts where user receives money
        owed_to_me = db.query(DebtBalance).filter(
            DebtBalance.group_id == membership.group_id,
            DebtBalance.user_to == current_user.id
        ).all()
        
        # Get debts where user owes money
        i_owe = db.query(DebtBalance).filter(
            DebtBalance.group_id == membership.group_id,
            DebtBalance.user_from == current_user.id
        ).all()
        
        group_owed_to_me = sum(debt.amount for debt in owed_to_me)
        group_i_owe = sum(debt.amount for debt in i_owe)
        
        total_owed_to_me += group_owed_to_me
        total_i_owe += group_i_owe
        
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        
        group_summaries.append({
            "group_id": membership.group_id,
            "group_name": group.name if group else "Unknown",
            "owed_to_me": group_owed_to_me,
            "i_owe": group_i_owe,
            "net_balance": group_owed_to_me - group_i_owe
        })
    
    return {
        "user_id": current_user.id,
        "user_name": current_user.name,
        "total_owed_to_me": total_owed_to_me,
        "total_i_owe": total_i_owe,
        "net_balance": total_owed_to_me - total_i_owe,
        "group_summaries": group_summaries
    }
