"""Settlement API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.schemas.settlement import (
    SettlementCreate, SettlementResponse
)
from app.services import settlement_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.debt_balance import DebtBalance

router = APIRouter(prefix="/settlements", tags=["Settlements"])


@router.get("/summary", response_model=dict)
def get_debt_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get debt summary across all groups for the current user.
    
    Returns:
    - Total amount owed to user
    - Total amount user owes
    - Net balance across all groups
    - Breakdown by group with individual debts
    """
    # Get all groups user is a member of
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    total_owed_to_me = 0.0
    total_i_owe = 0.0
    all_debts = []
    
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
        
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        
        # Add debts where others owe me
        for debt in owed_to_me:
            other_user = db.query(User).filter(User.id == debt.user_from).first()
            total_owed_to_me += float(debt.amount)
            all_debts.append({
                "id": str(debt.id),
                "group_id": str(debt.group_id),
                "group_name": group.name if group else "Unknown",
                "other_user_id": str(debt.user_from),
                "other_user_name": other_user.name if other_user else "Unknown",
                "amount": float(debt.amount),  # Positive - they owe me
                "type": "owed_to_me"
            })
        
        # Add debts where I owe others
        for debt in i_owe:
            other_user = db.query(User).filter(User.id == debt.user_to).first()
            total_i_owe += float(debt.amount)
            all_debts.append({
                "id": str(debt.id),
                "group_id": str(debt.group_id),
                "group_name": group.name if group else "Unknown",
                "other_user_id": str(debt.user_to),
                "other_user_name": other_user.name if other_user else "Unknown",
                "amount": -float(debt.amount),  # Negative - I owe them
                "type": "i_owe"
            })
    
    return {
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "total_owed_to_me": total_owed_to_me,
        "total_i_owe": total_i_owe,
        "net_balance": total_owed_to_me - total_i_owe,
        "debts": all_debts
    }


@router.post("", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
@router.post("/record-payment", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def record_settlement(
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


@router.get("/history", response_model=dict)
def get_settlement_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get settlement history across all groups for the current user.
    
    Returns all recorded settlements (debt payments) with pagination.
    """
    from app.models.settlement import Settlement
    
    # Get all groups user is a member of
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    group_ids = [m.group_id for m in memberships]
    
    # Get settlements for all user's groups
    query = db.query(Settlement).filter(Settlement.group_id.in_(group_ids))
    total_count = query.count()
    
    settlements = query.order_by(Settlement.date.desc()).offset((page - 1) * limit).limit(limit).all()
    
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


@router.get("/optimize", response_model=dict)
def get_optimized_settlements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get optimized settlement suggestions across all groups.
    
    Returns minimized debt transactions using a greedy algorithm.
    """
    # Get all groups user is a member of
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    optimized_by_group = []
    
    for membership in memberships:
        summary = settlement_service.get_group_debt_summary(
            db, membership.group_id, current_user.id
        )
        
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        
        optimized_by_group.append({
            "group_id": str(membership.group_id),
            "group_name": group.name if group else "Unknown",
            "simplified_debts": summary.get("simplified_debts", [])
        })
    
    return {
        "user_id": str(current_user.id),
        "optimized_settlements": optimized_by_group
    }


@router.get("/my-simplified", response_model=dict)
def get_my_simplified_debts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get simplified debts that the current user needs to resolve.
    
    Returns only the debts where the user is either:
    - A debtor (needs to pay someone)
    - A creditor (will receive from someone)
    
    These are the smart-simplified transactions across all groups.
    """
    # Get all groups user is a member of
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    i_need_to_pay = []  # Debts where I am the payer
    i_will_receive = []  # Debts where I am the receiver
    total_i_owe = 0.0
    total_owed_to_me = 0.0
    
    for membership in memberships:
        summary = settlement_service.get_group_debt_summary(
            db, membership.group_id, current_user.id
        )
        
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        group_name = group.name if group else "Unknown"
        
        # Filter simplified debts involving current user
        for debt in summary.get("simplified_debts", []):
            from_id = debt.get("from_user_id")
            to_id = debt.get("to_user_id")
            amount = float(debt.get("amount", 0))
            
            if str(from_id) == str(current_user.id):
                # I need to pay this person
                i_need_to_pay.append({
                    "group_id": str(membership.group_id),
                    "group_name": group_name,
                    "to_user_id": to_id,
                    "to_user_name": debt.get("to_user_name"),
                    "amount": amount
                })
                total_i_owe += amount
            elif str(to_id) == str(current_user.id):
                # I will receive from this person
                i_will_receive.append({
                    "group_id": str(membership.group_id),
                    "group_name": group_name,
                    "from_user_id": from_id,
                    "from_user_name": debt.get("from_user_name"),
                    "amount": amount
                })
                total_owed_to_me += amount
    
    net_balance = total_owed_to_me - total_i_owe
    
    return {
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "total_i_owe": total_i_owe,
        "total_owed_to_me": total_owed_to_me,
        "net_balance": net_balance,
        "status": "settled" if abs(net_balance) < 0.01 and len(i_need_to_pay) == 0 and len(i_will_receive) == 0 else (
            "you_owe" if net_balance < 0 else "you_are_owed"
        ),
        "debts_to_pay": i_need_to_pay,
        "debts_to_receive": i_will_receive
    }


@router.get("/debts/{user_id}", response_model=dict)
def get_debt_details_with_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed debt information between current user and specified user.
    
    Returns debts across all shared groups.
    """
    # Find all groups where both users are members
    current_user_groups = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    other_user_groups = db.query(GroupMember).filter(
        GroupMember.user_id == user_id
    ).all()
    
    current_group_ids = {m.group_id for m in current_user_groups}
    other_group_ids = {m.group_id for m in other_user_groups}
    shared_group_ids = current_group_ids & other_group_ids
    
    if not shared_group_ids:
        return {
            "user_id": str(user_id),
            "shared_groups": [],
            "total_balance": 0.0
        }
    
    # Get debts in shared groups
    debts_info = []
    total_balance = 0.0
    
    for group_id in shared_group_ids:
        # Debts where other user owes current user
        owed_to_me = db.query(DebtBalance).filter(
            DebtBalance.group_id == group_id,
            DebtBalance.user_from == user_id,
            DebtBalance.user_to == current_user.id
        ).all()
        
        # Debts where current user owes other user
        i_owe = db.query(DebtBalance).filter(
            DebtBalance.group_id == group_id,
            DebtBalance.user_from == current_user.id,
            DebtBalance.user_to == user_id
        ).all()
        
        group_balance = sum(d.amount for d in owed_to_me) - sum(d.amount for d in i_owe)
        total_balance += group_balance
        
        group = db.query(Group).filter(Group.id == group_id).first()
        
        debts_info.append({
            "group_id": str(group_id),
            "group_name": group.name if group else "Unknown",
            "balance": group_balance
        })
    
    other_user = db.query(User).filter(User.id == user_id).first()
    
    return {
        "user_id": str(user_id),
        "user_name": other_user.name if other_user else "Unknown",
        "shared_groups": debts_info,
        "total_balance": total_balance
    }
