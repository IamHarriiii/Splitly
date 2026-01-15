"""Analytics and dashboard service layer."""
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from fastapi import HTTPException, status
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from datetime import datetime, date, timedelta
from collections import defaultdict

from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.models.debt_balance import DebtBalance


def get_user_dashboard(
    db: Session,
    user_id: UUID,
    months: int = 6
) -> dict:
    """
    Get complete dashboard summary for a user.
    
    Args:
        db: Database session
        user_id: User ID
        months: Number of months for trends (default 6)
        
    Returns:
        Complete dashboard data
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Calculate date range
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get all expenses user is involved in
    user_expenses = db.query(Expense).filter(
        (Expense.created_by == user_id) |
        (Expense.paid_by == user_id) |
        (Expense.id.in_(
            db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == user_id)
        ))
    ).all()
    
    # Calculate totals
    total_expenses = sum(float(exp.amount) for exp in user_expenses)
    total_paid = sum(float(exp.amount) for exp in user_expenses if exp.paid_by == user_id)
    
    # Get debt balances
    owed_to_user = db.query(DebtBalance).filter(DebtBalance.user_to == user_id).all()
    user_owes = db.query(DebtBalance).filter(DebtBalance.user_from == user_id).all()
    
    total_owed_to_user = sum(float(debt.amount) for debt in owed_to_user)
    total_user_owes = sum(float(debt.amount) for debt in user_owes)
    
    # Get group count
    group_count = db.query(GroupMember).filter(GroupMember.user_id == user_id).count()
    
    # User summary
    user_summary = {
        "user_id": user_id,
        "user_name": user.name,
        "total_expenses": total_expenses,
        "total_paid": total_paid,
        "total_owed_to_user": total_owed_to_user,
        "total_user_owes": total_user_owes,
        "net_balance": total_owed_to_user - total_user_owes,
        "expense_count": len(user_expenses),
        "group_count": group_count
    }
    
    # Recent expenses (last 10)
    recent_expenses = db.query(Expense).filter(
        (Expense.created_by == user_id) |
        (Expense.paid_by == user_id) |
        (Expense.id.in_(
            db.query(ExpenseSplit.expense_id).filter(ExpenseSplit.user_id == user_id)
        ))
    ).order_by(Expense.date.desc(), Expense.created_at.desc()).limit(10).all()
    
    recent_expense_list = []
    for exp in recent_expenses:
        payer = db.query(User).filter(User.id == exp.paid_by).first()
        group = db.query(Group).filter(Group.id == exp.group_id).first() if exp.group_id else None
        
        recent_expense_list.append({
            "id": exp.id,
            "amount": exp.amount,
            "description": exp.description,
            "category": exp.category,
            "date": exp.date,
            "payer_name": payer.name if payer else "Unknown",
            "group_name": group.name if group else None
        })
    
    # Group summaries
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
    group_summaries = []
    
    for membership in memberships:
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        if not group:
            continue
        
        group_expenses = db.query(Expense).filter(Expense.group_id == group.id).all()
        member_count = db.query(GroupMember).filter(GroupMember.group_id == group.id).count()
        settlements = db.query(Settlement).filter(Settlement.group_id == group.id).all()
        
        total_settled = sum(float(s.amount) for s in settlements)
        
        # Outstanding debts for this group
        group_debts = db.query(DebtBalance).filter(DebtBalance.group_id == group.id).all()
        outstanding = sum(float(d.amount) for d in group_debts)
        
        group_summaries.append({
            "group_id": group.id,
            "group_name": group.name,
            "total_expenses": sum(float(e.amount) for e in group_expenses),
            "member_count": member_count,
            "expense_count": len(group_expenses),
            "settlement_count": len(settlements),
            "total_settled": total_settled,
            "outstanding_debts": outstanding
        })
    
    # Category breakdown
    category_breakdown = calculate_category_breakdown(user_expenses)
    
    # Monthly trends
    monthly_trends = calculate_monthly_trends(user_expenses, months)
    
    # Top 5 categories
    top_categories = sorted(category_breakdown, key=lambda x: x["total_amount"], reverse=True)[:5]
    
    return {
        "user_summary": user_summary,
        "recent_expenses": recent_expense_list,
        "group_summaries": group_summaries,
        "category_breakdown": category_breakdown,
        "monthly_trends": monthly_trends,
        "top_categories": top_categories
    }


def calculate_category_breakdown(expenses: List[Expense]) -> List[dict]:
    """Calculate expense breakdown by category."""
    category_totals = defaultdict(lambda: {"amount": 0.0, "count": 0})
    total_amount = sum(float(exp.amount) for exp in expenses)
    
    for exp in expenses:
        category = exp.category or "Uncategorized"
        category_totals[category]["amount"] += float(exp.amount)
        category_totals[category]["count"] += 1
    
    breakdown = []
    for category, data in category_totals.items():
        percentage = (data["amount"] / total_amount * 100) if total_amount > 0 else 0
        breakdown.append({
            "category": category,
            "total_amount": data["amount"],
            "expense_count": data["count"],
            "percentage": round(percentage, 2)
        })
    
    return sorted(breakdown, key=lambda x: x["total_amount"], reverse=True)


def calculate_monthly_trends(expenses: List[Expense], months: int = 6) -> List[dict]:
    """Calculate monthly expense trends."""
    # Group expenses by month
    monthly_data = defaultdict(lambda: {"expenses": [], "total": 0.0, "count": 0})
    
    for exp in expenses:
        month_key = exp.date.strftime("%Y-%m")
        monthly_data[month_key]["expenses"].append(exp)
        monthly_data[month_key]["total"] += float(exp.amount)
        monthly_data[month_key]["count"] += 1
    
    # Build trends
    trends = []
    for month, data in sorted(monthly_data.items()):
        # Category breakdown for this month
        category_breakdown = calculate_category_breakdown(data["expenses"])
        
        trends.append({
            "month": month,
            "total_expenses": data["total"],
            "expense_count": data["count"],
            "categories": category_breakdown
        })
    
    return trends


def get_group_analytics(
    db: Session,
    group_id: UUID,
    current_user_id: UUID,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> dict:
    """
    Get detailed analytics for a group.
    
    Args:
        db: Database session
        group_id: Group ID
        current_user_id: Current user ID
        start_date: Optional start date filter
        end_date: Optional end date filter
        
    Returns:
        Group analytics data
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
    
    # Get expenses with date filter
    query = db.query(Expense).filter(Expense.group_id == group_id)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    expenses = query.all()
    
    if not expenses:
        return {
            "group_id": group_id,
            "group_name": group.name,
            "date_range": {"start_date": start_date, "end_date": end_date},
            "total_expenses": 0.0,
            "expense_count": 0,
            "average_expense": 0.0,
            "largest_expense": 0.0,
            "smallest_expense": 0.0,
            "category_breakdown": [],
            "monthly_trends": [],
            "member_contributions": [],
            "most_active_member": None
        }
    
    # Calculate statistics
    amounts = [float(exp.amount) for exp in expenses]
    total_expenses = sum(amounts)
    expense_count = len(expenses)
    average_expense = total_expenses / expense_count
    largest_expense = max(amounts)
    smallest_expense = min(amounts)
    
    # Category breakdown
    category_breakdown = calculate_category_breakdown(expenses)
    
    # Monthly trends
    monthly_trends = calculate_monthly_trends(expenses)
    
    # Member contributions (who paid what)
    member_payments = defaultdict(lambda: {"amount": 0.0, "count": 0})
    
    for exp in expenses:
        member_payments[exp.paid_by]["amount"] += float(exp.amount)
        member_payments[exp.paid_by]["count"] += 1
    
    member_contributions = []
    for user_id, data in member_payments.items():
        user = db.query(User).filter(User.id == user_id).first()
        member_contributions.append({
            "user_id": user_id,
            "user_name": user.name if user else "Unknown",
            "total_paid": data["amount"],
            "expense_count": data["count"],
            "percentage": round((data["amount"] / total_expenses * 100), 2)
        })
    
    member_contributions.sort(key=lambda x: x["total_paid"], reverse=True)
    
    # Most active member (by expense count)
    most_active = max(member_payments.items(), key=lambda x: x[1]["count"])
    most_active_user = db.query(User).filter(User.id == most_active[0]).first()
    
    most_active_member = {
        "user_id": most_active[0],
        "user_name": most_active_user.name if most_active_user else "Unknown",
        "expense_count": most_active[1]["count"]
    }
    
    return {
        "group_id": group_id,
        "group_name": group.name,
        "date_range": {"start_date": start_date, "end_date": end_date},
        "total_expenses": total_expenses,
        "expense_count": expense_count,
        "average_expense": round(average_expense, 2),
        "largest_expense": largest_expense,
        "smallest_expense": smallest_expense,
        "category_breakdown": category_breakdown,
        "monthly_trends": monthly_trends,
        "member_contributions": member_contributions,
        "most_active_member": most_active_member
    }
