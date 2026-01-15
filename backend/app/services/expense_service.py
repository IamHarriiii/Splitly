"""Expense service layer - handles expense operations and debt calculations."""
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional, Tuple
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.debt_balance import DebtBalance
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, SplitType


def calculate_splits(
    amount: float,
    split_type: SplitType,
    splits_input: list,
    num_people: int
) -> List[Tuple[UUID, float, Optional[float]]]:
    """
    Calculate split amounts based on split type.
    
    Args:
        amount: Total expense amount
        split_type: Type of split (equal, exact, percentage)
        splits_input: List of split inputs
        num_people: Number of people splitting
        
    Returns:
        List of tuples (user_id, share_amount, share_percentage)
    """
    result = []
    
    if split_type == SplitType.EQUAL:
        # Divide equally
        share_amount = round(amount / num_people, 2)
        for split in splits_input:
            result.append((split.user_id, share_amount, None))
            
    elif split_type == SplitType.EXACT:
        # Use exact amounts provided
        for split in splits_input:
            result.append((split.user_id, split.share_amount, None))
            
    elif split_type == SplitType.PERCENTAGE:
        # Calculate from percentages
        for split in splits_input:
            share_amount = round((amount * split.share_percentage) / 100, 2)
            result.append((split.user_id, share_amount, split.share_percentage))
    
    return result


def update_debt_balances(
    db: Session,
    group_id: UUID,
    payer_id: UUID,
    splits: List[Tuple[UUID, float]]
):
    """
    Update debt balances after an expense is created.
    
    For each person who owes money, update the debt balance between them and the payer.
    
    Args:
        db: Database session
        group_id: Group ID
        payer_id: User who paid
        splits: List of (user_id, amount) tuples
    """
    for user_id, amount in splits:
        # Skip if user is the payer
        if user_id == payer_id:
            continue
        
        # Convert float to Decimal for database operations
        amount_decimal = Decimal(str(amount))
        
        # Find or create debt balance from user to payer
        debt = db.query(DebtBalance).filter(
            DebtBalance.group_id == group_id,
            DebtBalance.user_from == user_id,
            DebtBalance.user_to == payer_id
        ).first()
        
        if debt:
            # Update existing debt
            debt.amount += amount_decimal
        else:
            # Check if reverse debt exists
            reverse_debt = db.query(DebtBalance).filter(
                DebtBalance.group_id == group_id,
                DebtBalance.user_from == payer_id,
                DebtBalance.user_to == user_id
            ).first()
            
            if reverse_debt:
                # Reduce reverse debt
                if reverse_debt.amount > amount_decimal:
                    reverse_debt.amount -= amount_decimal
                elif reverse_debt.amount < amount_decimal:
                    # Flip the debt
                    new_amount = amount_decimal - reverse_debt.amount
                    db.delete(reverse_debt)
                    new_debt = DebtBalance(
                        group_id=group_id,
                        user_from=user_id,
                        user_to=payer_id,
                        amount=new_amount
                    )
                    db.add(new_debt)
                else:
                    # Debts cancel out
                    db.delete(reverse_debt)
            else:
                # Create new debt
                new_debt = DebtBalance(
                    group_id=group_id,
                    user_from=user_id,
                    user_to=payer_id,
                    amount=amount_decimal
                )
                db.add(new_debt)


def create_expense(
    db: Session,
    expense_data: ExpenseCreate,
    creator_id: UUID
) -> Expense:
    """
    Create a new expense with splits.
    
    Args:
        db: Database session
        expense_data: Expense creation data
        creator_id: ID of user creating the expense
        
    Returns:
        Created expense object
        
    Raises:
        HTTPException: If validation fails
    """
    # Verify payer exists
    payer = db.query(User).filter(User.id == expense_data.paid_by).first()
    if not payer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payer not found"
        )
    
    # If group expense, verify group and memberships
    if expense_data.group_id:
        group = db.query(Group).filter(Group.id == expense_data.group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Verify creator is a member
        creator_membership = db.query(GroupMember).filter(
            GroupMember.group_id == expense_data.group_id,
            GroupMember.user_id == creator_id
        ).first()
        
        if not creator_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Verify all split users are members
        for split in expense_data.splits:
            membership = db.query(GroupMember).filter(
                GroupMember.group_id == expense_data.group_id,
                GroupMember.user_id == split.user_id
            ).first()
            
            if not membership:
                user = db.query(User).filter(User.id == split.user_id).first()
                user_name = user.name if user else str(split.user_id)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {user_name} is not a member of this group"
                )
    
    # Create expense
    db_expense = Expense(
        amount=expense_data.amount,
        description=expense_data.description,
        category=expense_data.category,
        date=expense_data.expense_date,
        is_personal=expense_data.is_personal,
        group_id=expense_data.group_id,
        created_by=creator_id,
        paid_by=expense_data.paid_by
    )
    db.add(db_expense)
    db.flush()  # Get the expense ID
    
    # Calculate and create splits
    splits = calculate_splits(
        expense_data.amount,
        expense_data.split_type,
        expense_data.splits,
        len(expense_data.splits)
    )
    
    for user_id, share_amount, share_percentage in splits:
        split = ExpenseSplit(
            expense_id=db_expense.id,
            user_id=user_id,
            share_amount=share_amount,
            share_percentage=share_percentage
        )
        db.add(split)
    
    # Update debt balances if group expense
    if expense_data.group_id:
        split_tuples = [(user_id, share_amount) for user_id, share_amount, _ in splits]
        update_debt_balances(db, expense_data.group_id, expense_data.paid_by, split_tuples)
    
    db.commit()
    db.refresh(db_expense)
    
    return db_expense


def get_expenses(
    db: Session,
    user_id: UUID,
    group_id: Optional[UUID] = None,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    paid_by: Optional[UUID] = None,
    involves_user: Optional[UUID] = None,
    is_personal: Optional[bool] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[Expense], int]:
    """
    Get expenses with filtering and pagination.
    
    Args:
        db: Database session
        user_id: Current user ID
        ... (filter parameters)
        page: Page number
        limit: Items per page
        
    Returns:
        Tuple of (expenses list, total count)
    """
    # Base query - user must be involved (creator, payer, or in splits)
    query = db.query(Expense).distinct()
    
    # User must be involved in the expense
    query = query.filter(
        (Expense.created_by == user_id) |
        (Expense.paid_by == user_id) |
        (Expense.id.in_(
            db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == user_id)
        ))
    )
    
    # Apply filters
    if group_id:
        query = query.filter(Expense.group_id == group_id)
    
    if category:
        query = query.filter(Expense.category == category)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    if paid_by:
        query = query.filter(Expense.paid_by == paid_by)
    
    if involves_user:
        query = query.filter(
            (Expense.paid_by == involves_user) |
            (Expense.id.in_(
                db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == involves_user)
            ))
        )
    
    if is_personal is not None:
        query = query.filter(Expense.is_personal == is_personal)
    
    if min_amount is not None:
        query = query.filter(Expense.amount >= min_amount)
    
    if max_amount is not None:
        query = query.filter(Expense.amount <= max_amount)
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination and ordering
    offset = (page - 1) * limit
    expenses = query.order_by(Expense.date.desc(), Expense.created_at.desc()).offset(offset).limit(limit).all()
    
    return expenses, total_count


def get_expense_details(
    db: Session,
    expense_id: UUID,
    current_user_id: UUID
) -> Expense:
    """
    Get detailed expense information.
    
    Args:
        db: Database session
        expense_id: Expense ID
        current_user_id: Current user ID
        
    Returns:
        Expense object
        
    Raises:
        HTTPException: 404 if not found, 403 if not authorized
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    # Verify user is involved
    is_involved = (
        expense.created_by == current_user_id or
        expense.paid_by == current_user_id or
        db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == expense_id,
            ExpenseSplit.user_id == current_user_id
        ).first() is not None
    )
    
    if not is_involved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not involved in this expense"
        )
    
    return expense


def update_expense(
    db: Session,
    expense_id: UUID,
    current_user_id: UUID,
    update_data: ExpenseUpdate
) -> Expense:
    """
    Update an expense.
    
    Only the creator can update an expense.
    Note: Updating splits is not supported - delete and recreate instead.
    
    Args:
        db: Database session
        expense_id: Expense ID
        current_user_id: Current user ID
        update_data: Update data
        
    Returns:
        Updated expense
        
    Raises:
        HTTPException: 404 if not found, 403 if not creator
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if expense.created_by != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can update an expense"
        )
    
    # Update fields
    if update_data.amount is not None:
        expense.amount = update_data.amount
    if update_data.description is not None:
        expense.description = update_data.description
    if update_data.category is not None:
        expense.category = update_data.category
    if update_data.expense_date is not None:
        expense.date = update_data.expense_date
    
    db.commit()
    db.refresh(expense)
    
    return expense


def delete_expense(
    db: Session,
    expense_id: UUID,
    current_user_id: UUID
) -> None:
    """
    Delete an expense.
    
    Only the creator can delete. This will also reverse debt balance updates.
    
    Args:
        db: Database session
        expense_id: Expense ID
        current_user_id: Current user ID
        
    Raises:
        HTTPException: 404 if not found, 403 if not creator
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    if expense.created_by != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete an expense"
        )
    
    # Reverse debt balance updates if group expense
    if expense.group_id:
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).all()
        split_tuples = [(split.user_id, -split.share_amount) for split in splits]
        update_debt_balances(db, expense.group_id, expense.paid_by, split_tuples)
    
    # Delete expense (cascade will handle splits)
    db.delete(expense)
    db.commit()
