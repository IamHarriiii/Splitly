# Splitly Backend - Complete API Documentation

Smart Expense & Debt Management System - Backend API

## 🎉 Backend Phase 1 Complete!

All 10 sprints of Backend Phase 1 have been successfully implemented, including:
- ✅ Authentication & User Management
- ✅ Groups & Members Management
- ✅ Expenses with 3 Split Types
- ✅ Settlements & Debt Calculation
- ✅ Dashboard & Analytics
- ✅ Activity Logging
- ✅ AI Chatbot Integration
- ✅ User Search & Invitations
- ✅ Middleware & Error Handling
- ✅ Comprehensive Documentation

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0+
- **Migrations**: Alembic
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **AI Integration**: OpenRouter API
- **Validation**: Pydantic v2

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- OpenRouter API Key (for AI features)

### Installation

```bash
# 1. Clone and navigate
cd backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment variables (see .env.example)
cp .env.example .env
# Edit .env with your configuration

# 5. Create database
createdb splitly_db

# 6. Run migrations
alembic upgrade head

# 7. Start server
uvicorn app.main:app --reload
```

Access the API at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Complete API Reference

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register new user |
| POST | `/login` | Login and get JWT token |
| GET | `/me` | Get current user profile |
| PUT | `/me` | Update user profile |

### 👥 Groups (`/api/v1/groups`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new group |
| GET | `/` | List user's groups (paginated) |
| GET | `/{id}` | Get group details with members |
| PUT | `/{id}` | Update group (owner only) |
| DELETE | `/{id}` | Delete group (owner only) |
| POST | `/{id}/members` | Add member or send invitation |
| DELETE | `/{id}/members/{user_id}` | Remove member (owner only) |
| POST | `/{id}/leave` | Leave group |
| POST | `/invitations/{token}/accept` | Accept invitation |
| GET | `/invitations/pending` | Get pending invitations |

### 💰 Expenses (`/api/v1/expenses`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create expense (equal/exact/percentage split) |
| GET | `/` | List expenses with filters |
| GET | `/{id}` | Get expense details with splits |
| PUT | `/{id}` | Update expense (creator only) |
| DELETE | `/{id}` | Delete expense (creator only) |
| GET | `/categories/list` | Get unique categories |

**Split Types**:
- `equal`: Split equally among participants
- `exact`: Custom amounts for each person
- `percentage`: Percentage-based split

### 💳 Debts & Settlements (`/api/v1/debts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/{id}/summary` | Complete debt summary with simplification |
| GET | `/groups/{id}/balances` | Raw debt balances |
| POST | `/settlements` | Record a settlement payment |
| GET | `/groups/{id}/settlements` | Settlement history |
| GET | `/my-summary` | User's debt summary across all groups |

**Debt Simplification**: Uses greedy algorithm to minimize transactions

### 📊 Analytics & Dashboard (`/api/v1/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Complete dashboard with trends |
| GET | `/groups/{id}` | Group analytics with date filters |
| GET | `/summary` | Quick financial summary |

**Dashboard Includes**:
- User financial summary
- Recent expenses (last 10)
- Group summaries
- Category breakdown
- Monthly trends (configurable months)
- Top 5 categories

### 📝 Activity Feed (`/api/v1/activity`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/feed` | User's activity feed (paginated) |
| GET | `/groups/{id}` | Group-specific activity feed |

**Tracked Activities**:
- Expense created/updated/deleted
- Group created/updated/deleted
- Member added/removed/joined/left
- Settlements created

### 🤖 AI Chatbot (`/api/v1/chatbot`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/parse` | Parse expense from natural language |
| POST | `/clarify` | Provide clarification for ambiguous input |
| POST | `/confirm` | Confirm and create expense |
| GET | `/examples` | Get example inputs |

**Example Inputs**:
- "Spent $25 on coffee"
- "Team lunch was $150 yesterday"
- "Paid $50 for groceries"

**Features**:
- Context-aware parsing (user's groups & categories)
- Confidence scoring (0-1)
- Multi-turn clarification
- Session management

### 👤 User Search & Invitations (`/api/v1/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q={query}` | Search users by name/email |
| GET | `/invitations/pending` | Get pending invitations |
| GET | `/invitations/sent` | Get sent invitations |

## Features

### Security
- ✅ JWT authentication with 7-day expiration
- ✅ bcrypt password hashing
- ✅ Password strength validation
- ✅ CORS protection
- ✅ Rate limiting (60 req/min per IP)
- ✅ Request ID tracking

### Error Handling
- ✅ Custom exception classes
- ✅ Standardized error responses
- ✅ Detailed validation errors
- ✅ Request ID in all responses

### Data Validation
- ✅ Pydantic schemas for all endpoints
- ✅ Input sanitization
- ✅ Type safety
- ✅ Custom validators

### Performance
- ✅ Database connection pooling
- ✅ Efficient queries with SQLAlchemy
- ✅ Pagination on all list endpoints
- ✅ Request/response logging

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/splitly_db

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# OpenRouter AI
OPENROUTER_API_KEY=your-api-key-here

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Environment
ENVIRONMENT=development
```

## Database Models

- **User**: User accounts with authentication
- **Group**: Expense groups
- **GroupMember**: Group membership with roles
- **Expense**: Expenses with split information
- **ExpenseSplit**: Individual expense splits
- **Settlement**: Debt payment records
- **DebtBalance**: Current debt balances
- **Invitation**: Group invitations
- **ActivityLog**: Activity tracking

## Development

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing

```bash
# Run service layer tests
python test_groups.py
python test_expenses.py
python test_debts.py
python test_analytics.py
python test_activity.py
```

## API Response Format

### Success Response
```json
{
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_count": 100,
    "total_pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Input validation failed",
    "details": [...]
  },
  "request_id": "uuid"
}
```

## Production Deployment

### Recommendations
1. Use environment-specific `.env` files
2. Enable HTTPS/TLS
3. Use Redis for rate limiting (replace in-memory)
4. Setup proper logging (e.g., Sentry)
5. Use database connection pooling
6. Enable database backups
7. Monitor API performance
8. Setup CI/CD pipeline

### Docker Support (Optional)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## License

Proprietary - All rights reserved

## Support

For issues or questions, please refer to the API documentation at `/docs`
