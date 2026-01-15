from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date
from uuid import UUID


class CategoryBreakdown(BaseModel):
    """Breakdown of expenses by category."""
    category: str
    total_amount: float
    expense_count: int
    percentage: float


class MonthlyTrend(BaseModel):
    """Monthly expense trend."""
    month: str  # Format: "2026-01"
    total_expenses: float
    expense_count: int
    categories: List[CategoryBreakdown]


class UserFinancialSummary(BaseModel):
    """Financial summary for a user."""
    user_id: UUID
    user_name: str
    total_expenses: float
    total_paid: float
    total_owed_to_user: float
    total_user_owes: float
    net_balance: float
    expense_count: int
    group_count: int


class GroupFinancialSummary(BaseModel):
    """Financial summary for a group."""
    group_id: UUID
    group_name: str
    total_expenses: float
    member_count: int
    expense_count: int
    settlement_count: int
    total_settled: float
    outstanding_debts: float


class DashboardSummary(BaseModel):
    """Complete dashboard summary for a user."""
    user_summary: UserFinancialSummary
    recent_expenses: List[dict]  # List of recent expense summaries
    group_summaries: List[GroupFinancialSummary]
    category_breakdown: List[CategoryBreakdown]
    monthly_trends: List[MonthlyTrend]
    top_categories: List[CategoryBreakdown]  # Top 5 categories


class GroupAnalytics(BaseModel):
    """Detailed analytics for a group."""
    group_id: UUID
    group_name: str
    date_range: Dict[str, Optional[date]]  # start_date, end_date
    total_expenses: float
    expense_count: int
    average_expense: float
    largest_expense: float
    smallest_expense: float
    category_breakdown: List[CategoryBreakdown]
    monthly_trends: List[MonthlyTrend]
    member_contributions: List[Dict]  # Who paid what
    most_active_member: Dict  # user_id, user_name, expense_count


class ExpenseTrend(BaseModel):
    """Expense trend over time."""
    period: str  # daily, weekly, monthly
    data_points: List[Dict]  # {date/period, amount, count}
