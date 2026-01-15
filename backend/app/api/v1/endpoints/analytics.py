"""Analytics and dashboard API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import date

from app.core.database import get_db
from app.schemas.analytics import (
    DashboardSummary, GroupAnalytics
)
from app.services import analytics_service
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])


@router.get("/dashboard", response_model=DashboardSummary)
def get_user_dashboard(
    months: int = Query(6, ge=1, le=24, description="Number of months for trends"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete dashboard summary for the current user.
    
    Returns:
    - User financial summary (total expenses, debts, net balance)
    - Recent expenses (last 10)
    - Group summaries
    - Category breakdown
    - Monthly trends
    - Top 5 categories
    
    The dashboard provides a comprehensive overview of the user's financial activity.
    """
    dashboard = analytics_service.get_user_dashboard(db, current_user.id, months)
    return dashboard


@router.get("/groups/{group_id}", response_model=GroupAnalytics)
def get_group_analytics(
    group_id: UUID,
    start_date: Optional[date] = Query(None, description="Filter from this date"),
    end_date: Optional[date] = Query(None, description="Filter until this date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed analytics for a specific group.
    
    Returns:
    - Total expenses and statistics (average, largest, smallest)
    - Category breakdown
    - Monthly trends
    - Member contributions (who paid what)
    - Most active member
    
    Optionally filter by date range for specific period analysis.
    """
    analytics = analytics_service.get_group_analytics(
        db, group_id, current_user.id, start_date, end_date
    )
    return analytics


@router.get("/summary")
def get_quick_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a quick financial summary for the current user.
    
    Returns key metrics without detailed breakdowns.
    Useful for quick checks or mobile apps.
    """
    from app.models.expense import Expense, ExpenseSplit
    from app.models.debt_balance import DebtBalance
    from app.models.group import GroupMember
    
    # Get total expenses
    user_expenses = db.query(Expense).filter(
        (Expense.created_by == current_user.id) |
        (Expense.paid_by == current_user.id) |
        (Expense.id.in_(
            db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == current_user.id)
        ))
    ).all()
    
    total_expenses = sum(exp.amount for exp in user_expenses)
    total_paid = sum(exp.amount for exp in user_expenses if exp.paid_by == current_user.id)
    
    # Get debt balances
    owed_to_user = db.query(DebtBalance).filter(DebtBalance.user_to == current_user.id).all()
    user_owes = db.query(DebtBalance).filter(DebtBalance.user_from == current_user.id).all()
    
    total_owed_to_user = sum(debt.amount for debt in owed_to_user)
    total_user_owes = sum(debt.amount for debt in user_owes)
    
    # Get group count
    group_count = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).count()
    
    return {
        "user_id": current_user.id,
        "user_name": current_user.name,
        "total_expenses": total_expenses,
        "total_paid": total_paid,
        "total_owed_to_me": total_owed_to_user,
        "total_i_owe": total_user_owes,
        "net_balance": total_owed_to_user - total_user_owes,
        "expense_count": len(user_expenses),
        "group_count": group_count
    }
