"""Reconciliation service for verifying debt balance integrity."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from uuid import UUID
from decimal import Decimal

from app.models.debt_balance import DebtBalance
from app.models.expense import Expense, ExpenseSplit


def reconcile_group_debts(db: Session, group_id: UUID) -> Dict[str, Any]:
    """
    Reconcile debt balances with actual expenses.
    
    Compares stored debt balances with calculated balances from expenses
    to detect any discrepancies.
    
    Args:
        db: Database session
        group_id: Group ID to reconcile
        
    Returns:
        Report of discrepancies found
    """
    # Get current debt balances
    current_debts = db.query(DebtBalance).filter(
        DebtBalance.group_id == group_id
    ).all()
    
    # Calculate balances from expenses
    calculated_balances = calculate_balances_from_expenses(db, group_id)
    
    # Compare
    discrepancies = []
    
    # Check each calculated balance against stored
    for calc in calculated_balances:
        # Find matching debt balance
        current = next(
            (d for d in current_debts 
             if str(d.user_from) == calc['user_from'] 
             and str(d.user_to) == calc['user_to']),
            None
        )
        
        if current:
            stored_amount = float(current.amount)
            calc_amount = calc['amount']
            
            if abs(stored_amount - calc_amount) > 0.01:  # Allow 1 cent tolerance
                discrepancies.append({
                    'user_from': calc['user_from'],
                    'user_to': calc['user_to'],
                    'stored_amount': stored_amount,
                    'calculated_amount': calc_amount,
                    'difference': calc_amount - stored_amount
                })
        else:
            # Missing debt balance
            if calc['amount'] > 0.01:
                discrepancies.append({
                    'user_from': calc['user_from'],
                    'user_to': calc['user_to'],
                    'stored_amount': 0,
                    'calculated_amount': calc['amount'],
                    'difference': calc['amount'],
                    'issue': 'missing_debt_balance'
                })
    
    # Check for extra stored debts (not in calculated)
    for current in current_debts:
        calc = next(
            (c for c in calculated_balances
             if c['user_from'] == str(current.user_from)
             and c['user_to'] == str(current.user_to)),
            None
        )
        
        if not calc and float(current.amount) > 0.01:
            discrepancies.append({
                'user_from': str(current.user_from),
                'user_to': str(current.user_to),
                'stored_amount': float(current.amount),
                'calculated_amount': 0,
                'difference': -float(current.amount),
                'issue': 'extra_debt_balance'
            })
    
    return {
        'group_id': str(group_id),
        'discrepancies_found': len(discrepancies),
        'discrepancies': discrepancies,
        'status': 'ok' if len(discrepancies) == 0 else 'mismatch'
    }


def calculate_balances_from_expenses(db: Session, group_id: UUID) -> List[Dict[str, Any]]:
    """
    Calculate debt balances from scratch based on expenses.
    
    Args:
        db: Database session
        group_id: Group ID
        
    Returns:
        List of calculated balances
    """
    # Get all expenses for the group
    expenses = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.is_personal == False
    ).all()
    
    # Calculate net balances between users
    balances = {}  # (user_from, user_to) -> amount
    
    for expense in expenses:
        payer_id = str(expense.paid_by)
        
        # Get splits for this expense
        splits = db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == expense.id
        ).all()
        
        for split in splits:
            participant_id = str(split.user_id)
            share_amount = float(split.share_amount)
            
            # Skip if payer is the participant (they don't owe themselves)
            if payer_id == participant_id:
                continue
            
            # Participant owes payer
            key = (participant_id, payer_id)
            balances[key] = balances.get(key, 0) + share_amount
    
    # Convert to list format
    result = []
    for (user_from, user_to), amount in balances.items():
        if amount > 0.01:  # Only include non-zero balances
            result.append({
                'user_from': user_from,
                'user_to': user_to,
                'amount': round(amount, 2)
            })
    
    return result


def fix_debt_discrepancies(db: Session, group_id: UUID) -> None:
    """
    Fix debt balance discrepancies by recalculating from expenses.
    
    WARNING: This will delete all existing debt balances and recreate them.
    
    Args:
        db: Database session
        group_id: Group ID
    """
    # Delete all current debt balances for this group
    db.query(DebtBalance).filter(
        DebtBalance.group_id == group_id
    ).delete()
    
    # Recalculate and create new ones
    calculated_balances = calculate_balances_from_expenses(db, group_id)
    
    for balance in calculated_balances:
        if balance['amount'] > 0:
            debt = DebtBalance(
                group_id=group_id,
                user_from=balance['user_from'],
                user_to=balance['user_to'],
                amount=Decimal(str(balance['amount']))
            )
            db.add(debt)
    
    db.commit()
