"""Expense API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse,
    ExpenseSplitResponse, ExpenseFilter
)
from app.services import expense_service
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.expense import ExpenseSplit
from app.models.group import Group

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new expense.
    
    Supports three split types:
    - equal: Split equally among all participants
    - exact: Each person pays exact amount specified
    - percentage: Each person pays percentage of total
    
    Automatically updates debt balances for group expenses.
    """
    expense = expense_service.create_expense(db, expense_data, current_user.id)
    
    # Build response with user details
    return build_expense_response(db, expense)


@router.get("", response_model=dict)
def list_expenses(
    group_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    paid_by: Optional[UUID] = Query(None),
    involves_user: Optional[UUID] = Query(None),
    is_personal: Optional[bool] = Query(None),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get expenses with filtering and pagination.
    
    Returns expenses where the current user is involved (creator, payer, or in splits).
    """
    expenses, total_count = expense_service.get_expenses(
        db=db,
        user_id=current_user.id,
        group_id=group_id,
        category=category,
        start_date=start_date,
        end_date=end_date,
        paid_by=paid_by,
        involves_user=involves_user,
        is_personal=is_personal,
        min_amount=min_amount,
        max_amount=max_amount,
        page=page,
        limit=limit
    )
    
    # Build list responses
    expense_responses = []
    for expense in expenses:
        # Get payer name
        payer = db.query(User).filter(User.id == expense.paid_by).first()
        payer_name = payer.name if payer else "Unknown"
        
        # Get group name if applicable
        group_name = None
        if expense.group_id:
            group = db.query(Group).filter(Group.id == expense.group_id).first()
            group_name = group.name if group else None
        
        # Get split count
        split_count = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).count()
        
        expense_responses.append(ExpenseListResponse(
            id=expense.id,
            amount=expense.amount,
            description=expense.description,
            category=expense.category,
            date=expense.date,
            is_personal=expense.is_personal,
            group_id=expense.group_id,
            group_name=group_name,
            paid_by=expense.paid_by,
            payer_name=payer_name,
            split_count=split_count,
            created_at=expense.created_at
        ))
    
    return {
        "data": expense_responses,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense_details(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed expense information including all splits.
    
    User must be involved in the expense to access this endpoint.
    """
    expense = expense_service.get_expense_details(db, expense_id, current_user.id)
    return build_expense_response(db, expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: UUID,
    update_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an expense.
    
    Only the creator can update an expense.
    Note: Updating splits is not supported - delete and recreate the expense instead.
    """
    expense = expense_service.update_expense(db, expense_id, current_user.id, update_data)
    return build_expense_response(db, expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an expense.
    
    Only the creator can delete an expense.
    This will automatically reverse the debt balance updates.
    """
    expense_service.delete_expense(db, expense_id, current_user.id)
    return None


@router.get("/categories/list", response_model=List[str])
def get_expense_categories(
    group_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of unique expense categories.
    
    Useful for category filters and autocomplete.
    """
    from app.models.expense import Expense
    
    query = db.query(Expense.category).distinct().filter(
        Expense.category.isnot(None),
        (Expense.created_by == current_user.id) |
        (Expense.paid_by == current_user.id) |
        (Expense.id.in_(
            db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == current_user.id)
        ))
    )
    
    if group_id:
        query = query.filter(Expense.group_id == group_id)
    
    categories = [cat[0] for cat in query.all() if cat[0]]
    return sorted(categories)


def build_expense_response(db: Session, expense) -> ExpenseResponse:
    """Helper function to build expense response with all details."""
    # Get creator name
    creator = db.query(User).filter(User.id == expense.created_by).first()
    creator_name = creator.name if creator else "Unknown"
    
    # Get payer name
    payer = db.query(User).filter(User.id == expense.paid_by).first()
    payer_name = payer.name if payer else "Unknown"
    
    # Get group name if applicable
    group_name = None
    if expense.group_id:
        group = db.query(Group).filter(Group.id == expense.group_id).first()
        group_name = group.name if group else None
    
    # Get splits with user names
    splits_data = db.query(ExpenseSplit, User).join(
        User, ExpenseSplit.user_id == User.id
    ).filter(
        ExpenseSplit.expense_id == expense.id
    ).all()
    
    splits = []
    for split, user in splits_data:
        splits.append(ExpenseSplitResponse(
            user_id=user.id,
            user_name=user.name,
            share_amount=split.share_amount,
            share_percentage=split.share_percentage
        ))
    
    return ExpenseResponse(
        id=expense.id,
        amount=expense.amount,
        description=expense.description,
        category=expense.category,
        date=expense.date,
        is_personal=expense.is_personal,
        group_id=expense.group_id,
        group_name=group_name,
        created_by=expense.created_by,
        creator_name=creator_name,
        paid_by=expense.paid_by,
        payer_name=payer_name,
        splits=splits,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )
