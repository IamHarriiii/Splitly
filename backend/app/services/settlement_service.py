"""Settlement and debt calculation service layer."""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict, Tuple
from uuid import UUID
from collections import defaultdict

from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.settlement import Settlement
from app.models.debt_balance import DebtBalance
from app.models.expense import Expense, ExpenseSplit
from app.schemas.settlement import SettlementCreate, SimplifiedDebt


def calculate_net_balances(group_id: UUID, db: Session) -> Dict[UUID, float]:
    """
    Calculate net balance for each user in a group.
    
    Net balance = (money owed to user) - (money user owes)
    Positive = user should receive money
    Negative = user should pay money
    
    Args:
        group_id: Group ID
        db: Database session
        
    Returns:
        Dictionary mapping user_id to net balance
    """
    balances = defaultdict(float)
    
    # Get all debt balances for the group
    debts = db.query(DebtBalance).filter(DebtBalance.group_id == group_id).all()
    
    for debt in debts:
        # user_to should receive money (positive balance)
        balances[debt.user_to] += float(debt.amount)
        # user_from should pay money (negative balance)
        balances[debt.user_from] -= float(debt.amount)
    
    return dict(balances)


def simplify_debts_greedy(net_balances: Dict[UUID, float]) -> List[Tuple[UUID, UUID, float]]:
    """
    Simplify debts using greedy algorithm.
    
    This algorithm minimizes the number of transactions needed to settle all debts.
    
    Algorithm:
    1. Separate users into creditors (positive balance) and debtors (negative balance)
    2. Match largest creditor with largest debtor
    3. Settle as much as possible between them
    4. Repeat until all debts are settled
    
    Args:
        net_balances: Dictionary of user_id to net balance
        
    Returns:
        List of tuples (from_user, to_user, amount)
    """
    # Separate creditors and debtors
    creditors = []  # People who should receive money
    debtors = []    # People who should pay money
    
    for user_id, balance in net_balances.items():
        if balance > 0.01:  # Small threshold to handle floating point errors
            creditors.append([user_id, balance])
        elif balance < -0.01:
            debtors.append([user_id, -balance])  # Store as positive amount
    
    # Sort by amount (largest first)
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)
    
    simplified = []
    
    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        creditor_id, credit_amount = creditors[i]
        debtor_id, debt_amount = debtors[j]
        
        # Settle the minimum of what's owed and what's needed
        settle_amount = min(credit_amount, debt_amount)
        
        if settle_amount > 0.01:  # Only add if meaningful amount
            simplified.append((debtor_id, creditor_id, round(settle_amount, 2)))
        
        # Update remaining amounts
        creditors[i][1] -= settle_amount
        debtors[j][1] -= settle_amount
        
        # Move to next creditor/debtor if current one is settled
        if creditors[i][1] < 0.01:
            i += 1
        if debtors[j][1] < 0.01:
            j += 1
    
    return simplified


def get_group_debt_summary(
    db: Session,
    group_id: UUID,
    current_user_id: UUID
) -> dict:
    """
    Get complete debt summary for a group.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID
        
    Returns:
        Dictionary with debt summary
        
    Raises:
        HTTPException: 404 if group not found, 403 if not a member
    """
    # Verify group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Calculate total group expenses
    total_expenses = db.query(Expense).filter(
        Expense.group_id == group_id
    ).with_entities(Expense.amount).all()
    total_group_expenses = sum(exp[0] for exp in total_expenses)
    
    # Get all members
    members = db.query(GroupMember, User).join(
        User, GroupMember.user_id == User.id
    ).filter(
        GroupMember.group_id == group_id
    ).all()
    
    # Get all debt balances
    debts = db.query(DebtBalance).filter(DebtBalance.group_id == group_id).all()
    
    # Build member summaries
    member_summaries = []
    for membership, user in members:
        # Calculate what others owe this user
        owed_to_user = sum(
            debt.amount for debt in debts if debt.user_to == user.id
        )
        
        # Calculate what this user owes others
        user_owes = sum(
            debt.amount for debt in debts if debt.user_from == user.id
        )
        
        # Who owes this user
        who_owes_you = []
        for debt in debts:
            if debt.user_to == user.id:
                debtor = db.query(User).filter(User.id == debt.user_from).first()
                who_owes_you.append({
                    "user_id": debt.user_from,
                    "user_name": debtor.name if debtor else "Unknown",
                    "amount": debt.amount
                })
        
        # Who this user owes
        who_you_owe = []
        for debt in debts:
            if debt.user_from == user.id:
                creditor = db.query(User).filter(User.id == debt.user_to).first()
                who_you_owe.append({
                    "user_id": debt.user_to,
                    "user_name": creditor.name if creditor else "Unknown",
                    "amount": debt.amount
                })
        
        member_summaries.append({
            "user_id": user.id,
            "user_name": user.name,
            "total_owed_to_user": owed_to_user,
            "total_user_owes": user_owes,
            "net_balance": owed_to_user - user_owes,
            "who_owes_you": who_owes_you,
            "who_you_owe": who_you_owe
        })
    
    # Calculate simplified debts
    net_balances = calculate_net_balances(group_id, db)
    simplified_transactions = simplify_debts_greedy(net_balances)
    
    # Build simplified debts with user names
    simplified_debts = []
    for from_id, to_id, amount in simplified_transactions:
        from_user = db.query(User).filter(User.id == from_id).first()
        to_user = db.query(User).filter(User.id == to_id).first()
        
        simplified_debts.append({
            "from_user_id": from_id,
            "from_user_name": from_user.name if from_user else "Unknown",
            "to_user_id": to_id,
            "to_user_name": to_user.name if to_user else "Unknown",
            "amount": amount
        })
    
    return {
        "group_id": group_id,
        "group_name": group.name,
        "total_group_expenses": total_group_expenses,
        "member_summaries": member_summaries,
        "simplified_debts": simplified_debts,
        "settlement_suggestions": simplified_debts  # Same as simplified debts
    }


def create_settlement(
    db: Session,
    settlement_data: SettlementCreate,
    payer_id: UUID
) -> Settlement:
    """
    Record a settlement (debt payment).
    
    This updates the debt balances between the payer and receiver.
    
    Args:
        db: Database session
        settlement_data: Settlement data
        payer_id: User making the payment
        
    Returns:
        Created settlement
        
    Raises:
        HTTPException: If validation fails
    """
    # Verify group exists
    group = db.query(Group).filter(Group.id == settlement_data.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Verify payer is a member
    payer_membership = db.query(GroupMember).filter(
        GroupMember.group_id == settlement_data.group_id,
        GroupMember.user_id == payer_id
    ).first()
    
    if not payer_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Verify receiver is a member
    receiver_membership = db.query(GroupMember).filter(
        GroupMember.group_id == settlement_data.group_id,
        GroupMember.user_id == settlement_data.receiver_id
    ).first()
    
    if not receiver_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receiver is not a member of this group"
        )
    
    # Can't settle with yourself
    if payer_id == settlement_data.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot settle with yourself"
        )
    
    # Create settlement record
    settlement = Settlement(
        group_id=settlement_data.group_id,
        payer_id=payer_id,
        receiver_id=settlement_data.receiver_id,
        amount=settlement_data.amount,
        date=settlement_data.settlement_date,
        notes=settlement_data.notes
    )
    db.add(settlement)
    
    # Update debt balances
    # Find debt from payer to receiver
    debt = db.query(DebtBalance).filter(
        DebtBalance.group_id == settlement_data.group_id,
        DebtBalance.user_from == payer_id,
        DebtBalance.user_to == settlement_data.receiver_id
    ).first()
    
    if debt:
        if debt.amount > settlement_data.amount:
            # Reduce the debt
            debt.amount -= settlement_data.amount
        elif debt.amount < settlement_data.amount:
            # Overpaid - create reverse debt
            overpayment = settlement_data.amount - debt.amount
            db.delete(debt)
            
            # Check if reverse debt exists
            reverse_debt = db.query(DebtBalance).filter(
                DebtBalance.group_id == settlement_data.group_id,
                DebtBalance.user_from == settlement_data.receiver_id,
                DebtBalance.user_to == payer_id
            ).first()
            
            if reverse_debt:
                reverse_debt.amount += overpayment
            else:
                new_debt = DebtBalance(
                    group_id=settlement_data.group_id,
                    user_from=settlement_data.receiver_id,
                    user_to=payer_id,
                    amount=overpayment
                )
                db.add(new_debt)
        else:
            # Exact payment - delete debt
            db.delete(debt)
    else:
        # No existing debt - create reverse debt (receiver now owes payer)
        reverse_debt = db.query(DebtBalance).filter(
            DebtBalance.group_id == settlement_data.group_id,
            DebtBalance.user_from == settlement_data.receiver_id,
            DebtBalance.user_to == payer_id
        ).first()
        
        if reverse_debt:
            reverse_debt.amount += settlement_data.amount
        else:
            new_debt = DebtBalance(
                group_id=settlement_data.group_id,
                user_from=settlement_data.receiver_id,
                user_to=payer_id,
                amount=settlement_data.amount
            )
            db.add(new_debt)
    
    db.commit()
    db.refresh(settlement)
    
    return settlement


def get_group_settlements(
    db: Session,
    group_id: UUID,
    current_user_id: UUID,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[Settlement], int]:
    """
    Get settlements for a group.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID
        page: Page number
        limit: Items per page
        
    Returns:
        Tuple of (settlements list, total count)
    """
    # Verify user is a member
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Query settlements
    query = db.query(Settlement).filter(Settlement.group_id == group_id)
    
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    settlements = query.order_by(Settlement.date.desc(), Settlement.created_at.desc()).offset(offset).limit(limit).all()
    
    return settlements, total_count
