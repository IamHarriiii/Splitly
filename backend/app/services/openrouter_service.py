"""OpenRouter API integration for LLM-powered expense parsing."""
import httpx
import json
from typing import Dict, Any, Optional, List
from datetime import date

from app.core.config import settings


class OpenRouterClient:
    """Client for OpenRouter API."""
    
    BASE_URL = "https://openrouter.ai/api/v1"
    
    def __init__(self, api_key: str):
        """Initialize OpenRouter client."""
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://splitly.app",  # Optional
            "X-Title": "Splitly Expense Tracker"     # Optional
        }
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "openai/gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Send chat completion request to OpenRouter.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (default: gpt-3.5-turbo)
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            API response dict
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self.headers,
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=30.0
            )
            
            response.raise_for_status()
            return response.json()


def build_expense_parser_prompt(
    user_input: str,
    user_groups: List[str],
    recent_categories: List[str]
) -> List[Dict[str, str]]:
    """
    Build prompt for expense parsing with participant extraction.
    
    Args:
        user_input: User's natural language input
        user_groups: List of user's group names
        recent_categories: List of recently used categories
        
    Returns:
        List of messages for chat completion
    """
    system_prompt = f"""You are an expense parser for a split expense tracking app. Extract expense details from user input.

Context:
- User's groups: {', '.join(user_groups) if user_groups else 'None'}
- Recent categories: {', '.join(recent_categories) if recent_categories else 'None'}

Extract the following fields:
- amount: numeric value (required)
- description: brief description (required)
- category: expense category (optional, suggest from recent categories if applicable)
- date: expense date in YYYY-MM-DD format (default to today if not specified)
- participants: array of FIRST NAMES mentioned in the split (e.g., ["Teja", "Abdul"]) - IMPORTANT: Extract only first names
- split_type: "equal", "exact", or "percentage" (infer from context, default to "equal")

Respond ONLY with valid JSON in this exact format:
{{
  "amount": <number or null>,
  "description": "<string or null>",
  "category": "<string or null>",
  "date": "<YYYY-MM-DD or null>",
  "participants": ["name1", "name2"],
  "split_type": "equal",
  "confidence": <0.0 to 1.0>,
  "missing_fields": ["field1", "field2"]
}}

Confidence scoring:
- 1.0: All required fields present and clear
- 0.8-0.9: Required fields present, some ambiguity
- 0.5-0.7: Missing optional fields or unclear details
- 0.0-0.4: Missing required fields or very ambiguous

Examples:
Input: "Spent $25 on coffee"
Output: {{"amount": 25, "description": "coffee", "category": "Food", "date": null, "participants": [], "split_type": "equal", "confidence": 0.9, "missing_fields": []}}

Input: "Add 1200 rupees dinner, split equally between Teja and Abdul"
Output: {{"amount": 1200, "description": "dinner", "category": "Food", "date": null, "participants": ["Teja", "Abdul"], "split_type": "equal", "confidence": 0.95, "missing_fields": []}}

Input: "Paid $150 for team lunch, split between John, Mary, and Bob"
Output: {{"amount": 150, "description": "team lunch", "category": "Food", "date": null, "participants": ["John", "Mary", "Bob"], "split_type": "equal", "confidence": 0.95, "missing_fields": []}}

Input: "Movie tickets $40, me and Sarah"
Output: {{"amount": 40, "description": "movie tickets", "category": "Entertainment", "date": null, "participants": ["Sarah"], "split_type": "equal", "confidence": 0.9, "missing_fields": []}}

Input: "Bought stuff yesterday"
Output: {{"amount": null, "description": "bought stuff", "category": null, "date": null, "participants": [], "split_type": "equal", "confidence": 0.3, "missing_fields": ["amount"]}}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    return messages


def parse_llm_response(response_text: str) -> Dict[str, Any]:
    """
    Parse and validate LLM JSON response.
    
    Args:
        response_text: Raw LLM response text
        
    Returns:
        Parsed expense dict
        
    Raises:
        ValueError: If response is invalid
    """
    try:
        # Try to extract JSON from response
        # Sometimes LLM adds extra text, so we need to find the JSON block
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        
        if start_idx == -1 or end_idx == 0:
            raise ValueError("No JSON found in response")
        
        json_str = response_text[start_idx:end_idx]
        parsed = json.loads(json_str)
        
        # Validate required fields
        if "confidence" not in parsed:
            parsed["confidence"] = 0.5
        
        if "missing_fields" not in parsed:
            parsed["missing_fields"] = []
        
        # Add missing required fields to missing_fields list
        if not parsed.get("amount"):
            if "amount" not in parsed["missing_fields"]:
                parsed["missing_fields"].append("amount")
        
        if not parsed.get("description"):
            if "description" not in parsed["missing_fields"]:
                parsed["missing_fields"].append("description")
        
        # Adjust confidence based on missing fields
        if parsed["missing_fields"]:
            parsed["confidence"] = min(parsed["confidence"], 0.6)
        
        return parsed
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}")
    except Exception as e:
        raise ValueError(f"Error parsing LLM response: {e}")


async def parse_expense_with_llm(
    user_input: str,
    user_groups: List[str],
    recent_categories: List[str],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Parse expense from natural language using LLM.
    
    Args:
        user_input: User's natural language input
        user_groups: List of user's group names
        recent_categories: List of recently used categories
        api_key: Optional API key (uses settings if not provided)
        
    Returns:
        Parsed expense dict
    """
    if not api_key:
        api_key = settings.OPENROUTER_API_KEY
    
    if not api_key:
        raise ValueError("OpenRouter API key not configured")
    
    client = OpenRouterClient(api_key)
    
    # Build prompt
    messages = build_expense_parser_prompt(user_input, user_groups, recent_categories)
    
    # Get LLM response
    response = await client.chat_completion(messages)
    
    # Extract response text
    if "choices" not in response or not response["choices"]:
        raise ValueError("No response from LLM")
    
    response_text = response["choices"][0]["message"]["content"]
    
    # Parse and validate
    parsed = parse_llm_response(response_text)
    
    return parsed
