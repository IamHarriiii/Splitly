"""Conversational analytics service for chatbot queries."""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from enum import Enum

from app.services.analytics_service import get_user_dashboard, get_group_analytics
from app.services.settlement_service import get_group_debt_summary
from app.services.group_service import get_user_groups


class QueryIntent(str, Enum):
    """Types of query intents."""
    CREATE_EXPENSE = "create_expense"
    QUERY_EXPENSES = "query_expenses"
    QUERY_DEBTS = "query_debts"
    QUERY_ANALYTICS = "query_analytics"
    QUERY_GROUPS = "query_groups"
    UNKNOWN = "unknown"


def build_intent_classification_prompt(user_input: str) -> List[Dict[str, str]]:
    """
    Build prompt for intent classification and parameter extraction.
    
    Args:
        user_input: User's natural language input
        
    Returns:
        List of messages for LLM
    """
    system_prompt = """You are an intent classifier for an expense tracking chatbot. Classify user intent and extract query parameters.

Classify into one of these intents:
1. CREATE_EXPENSE - User wants to add a new expense
   Examples: "Add $50 dinner", "Paid 1200 rupees for movie"
   
2. QUERY_EXPENSES - User asking about their expenses
   Examples: "What's my total expense?", "How much did I spend on food?"
   
3. QUERY_DEBTS - User asking about debts/balances
   Examples: "How much do I owe?", "Who owes me money?"
   
4. QUERY_ANALYTICS - User asking for analytics/insights
   Examples: "What are my top categories?", "Show my spending trend"
   
5. QUERY_GROUPS - User asking about groups
   Examples: "What are my groups?", "Who's in Weekend Trip group?"
   
6. UNKNOWN - Cannot determine intent

Extract parameters:
- time_range: "today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "all_time"
- category: expense category if mentioned (e.g., "food", "transport")
- group_name: group name if mentioned
- person_name: person's name if mentioned
- aggregation: "total", "count", "average", "list", "top_categories"
- limit: number if asking for "top N" (e.g., "top 3")

Respond ONLY with valid JSON:
{{
  "intent": "<intent_type>",
  "parameters": {{
    "time_range": "<time_range or null>",
    "category": "<category or null>",
    "group_name": "<group_name or null>",
    "person_name": "<person_name or null>",
    "aggregation": "<aggregation or null>",
    "limit": <number or null>
  }},
  "confidence": <0.0 to 1.0>
}}

Examples:

Input: "What's my total expense last month?"
Output: {{"intent": "QUERY_EXPENSES", "parameters": {{"time_range": "last_month", "aggregation": "total"}}, "confidence": 0.95}}

Input: "How much do I owe?"
Output: {{"intent": "QUERY_DEBTS", "parameters": {{}}, "confidence": 0.9}}

Input: "Show my top 3 expense categories"
Output: {{"intent": "QUERY_ANALYTICS", "parameters": {{"aggregation": "top_categories", "limit": 3}}, "confidence": 0.95}}

Input: "Add $50 dinner split with John"
Output: {{"intent": "CREATE_EXPENSE", "parameters": {{}}, "confidence": 0.95}}

Input: "What did I spend on food this week?"
Output: {{"intent": "QUERY_EXPENSES", "parameters": {{"time_range": "this_week", "category": "food", "aggregation": "total"}}, "confidence": 0.9}}

Input: "How much do I owe in Weekend Trip group?"
Output: {{"intent": "QUERY_DEBTS", "parameters": {{"group_name": "Weekend Trip"}}, "confidence": 0.95}}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    return messages


def calculate_date_range(time_range: Optional[str]) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Convert time_range string to start and end datetime.
    
    Args:
        time_range: Time range string
        
    Returns:
        Tuple of (start_date, end_date)
    """
    if not time_range:
        return None, None
    
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if time_range == "today":
        return today_start, now
    elif time_range == "yesterday":
        yesterday = today_start - timedelta(days=1)
        return yesterday, today_start
    elif time_range == "this_week":
        week_start = today_start - timedelta(days=now.weekday())
        return week_start, now
    elif time_range == "last_week":
        week_start = today_start - timedelta(days=now.weekday() + 7)
        week_end = week_start + timedelta(days=7)
        return week_start, week_end
    elif time_range == "this_month":
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return month_start, now
    elif time_range == "last_month":
        first_of_this_month = now.replace(day=1)
        last_month_end = first_of_this_month - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return last_month_start, last_month_end.replace(hour=23, minute=59, second=59)
    elif time_range == "this_year":
        year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return year_start, now
    elif time_range == "all_time":
        return None, None
    
    return None, None


async def handle_expense_query(
    db: Session,
    user_id: UUID,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle expense-related queries.
    
    Args:
        db: Database session
        user_id: User ID
        parameters: Query parameters
        
    Returns:
        Query result data
    """
    time_range = parameters.get("time_range")
    category = parameters.get("category")
    aggregation = parameters.get("aggregation", "total")
    
    # Get dashboard data
    dashboard = get_user_dashboard(db, user_id, months=1 if time_range == "last_month" else 12)
    
    if aggregation == "total":
        total = dashboard["user_summary"]["total_expenses"]
        return {
            "type": "total_expense",
            "amount": float(total),
            "time_range": time_range,
            "category": category
        }
    elif aggregation == "count":
        count = dashboard["user_summary"]["expense_count"]
        return {
            "type": "expense_count",
            "count": count,
            "time_range": time_range
        }
    
    return {"type": "expense_query", "data": dashboard}


async def handle_debt_query(
    db: Session,
    user_id: UUID,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle debt-related queries.
    
    Args:
        db: Database session
        user_id: User ID
        parameters: Query parameters
        
    Returns:
        Query result data
    """
    from app.models.debt_balance import DebtBalance
    
    group_name = parameters.get("group_name")
    
    # Calculate debts directly from DebtBalance table
    # What user owes
    owes = db.query(DebtBalance).filter(
        DebtBalance.user_from == user_id
    ).all()
    total_owed = sum(float(debt.amount) for debt in owes)
    
    # What others owe user
    owed_to = db.query(DebtBalance).filter(
        DebtBalance.user_to == user_id
    ).all()
    total_owed_to_you = sum(float(debt.amount) for debt in owed_to)
    
    # Filter by group if specified
    if group_name:
        # Find group by name
        groups, _ = get_user_groups(db, user_id)
        matching_group = next((g for g in groups if group_name.lower() in g.name.lower()), None)
        
        if matching_group:
            group_debts = get_group_debt_summary(db, matching_group.id, user_id)
            return {
                "type": "group_debt",
                "group_name": matching_group.name,
                "debts": group_debts
            }
    
    return {
        "type": "user_debt",
        "total_owed": total_owed,
        "total_owed_to_you": total_owed_to_you,
        "debts": {
            "you_owe": [{"user_id": str(d.user_to), "amount": float(d.amount)} for d in owes],
            "owed_to_you": [{"user_id": str(d.user_from), "amount": float(d.amount)} for d in owed_to]
        }
    }


async def handle_analytics_query(
    db: Session,
    user_id: UUID,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle analytics-related queries.
    
    Args:
        db: Database session
        user_id: User ID
        parameters: Query parameters
        
    Returns:
        Query result data
    """
    aggregation = parameters.get("aggregation")
    limit = parameters.get("limit", 5)
    
    # Get dashboard data
    dashboard = get_user_dashboard(db, user_id, months=12)
    
    if aggregation == "top_categories":
        categories = dashboard["category_breakdown"][:limit]
        return {
            "type": "top_categories",
            "categories": categories,
            "limit": limit
        }
    
    return {
        "type": "analytics",
        "data": dashboard
    }


async def handle_group_query(
    db: Session,
    user_id: UUID,
    parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle group-related queries.
    
    Args:
        db: Database session
        user_id: User ID
        parameters: Query parameters
        
    Returns:
        Query result data
    """
    groups, total = get_user_groups(db, user_id)
    
    return {
        "type": "user_groups",
        "count": total,
        "groups": [{"id": str(g.id), "name": g.name} for g in groups]
    }


def format_natural_response(intent: QueryIntent, data: Dict[str, Any]) -> str:
    """
    Format query result as natural language response.
    
    Args:
        intent: Query intent
        data: Query result data
        
    Returns:
        Natural language response
    """
    if intent == QueryIntent.QUERY_EXPENSES:
        if data["type"] == "total_expense":
            time_str = f" {data['time_range'].replace('_', ' ')}" if data.get("time_range") else ""
            category_str = f" on {data['category']}" if data.get("category") else ""
            return f"Your total expense{time_str}{category_str} was ${data['amount']:.2f}"
        elif data["type"] == "expense_count":
            time_str = f" {data['time_range'].replace('_', ' ')}" if data.get("time_range") else ""
            return f"You created {data['count']} expenses{time_str}"
    
    elif intent == QueryIntent.QUERY_DEBTS:
        if data["type"] == "user_debt":
            owed = data["total_owed"]
            owed_to_you = data["total_owed_to_you"]
            
            if owed == 0 and owed_to_you == 0:
                return "You're all settled up! No debts."
            elif owed > 0 and owed_to_you == 0:
                return f"You owe ${owed:.2f} in total"
            elif owed == 0 and owed_to_you > 0:
                return f"You are owed ${owed_to_you:.2f} in total"
            else:
                return f"You owe ${owed:.2f} and are owed ${owed_to_you:.2f}"
        
        elif data["type"] == "group_debt":
            return f"In {data['group_name']} group: {len(data['debts'])} debt entries"
    
    elif intent == QueryIntent.QUERY_ANALYTICS:
        if data["type"] == "top_categories":
            categories = data["categories"]
            if not categories:
                return "No expense categories found"
            
            lines = [f"Your top {data['limit']} expense categories:"]
            for i, cat in enumerate(categories, 1):
                # Handle both 'total' and 'amount' field names
                amount = cat.get('total') or cat.get('amount', 0)
                percentage = cat.get('percentage', 0)
                category_name = cat.get('category') or cat.get('name', 'Unknown')
                lines.append(f"{i}. {category_name} - ${float(amount):.2f} ({float(percentage):.1f}%)")
            return "\n".join(lines)
    
    elif intent == QueryIntent.QUERY_GROUPS:
        count = data["count"]
        if count == 0:
            return "You're not in any groups yet"
        elif count == 1:
            return f"You're in 1 group: {data['groups'][0]['name']}"
        else:
            group_names = ", ".join([g["name"] for g in data["groups"][:3]])
            more = f" and {count - 3} more" if count > 3 else ""
            return f"You're in {count} groups: {group_names}{more}"
    
    return "I found some information but couldn't format it properly"
