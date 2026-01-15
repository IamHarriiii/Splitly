# 💰 Splitly - Smart Expense Splitting App

<div align="center">

![Splitly Logo](https://img.shields.io/badge/Splitly-Smart%20Expense%20Splitting-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDEyTDEyIDE3TDIyIDEyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

**A modern, full-stack expense splitting application built with React, FastAPI, and PostgreSQL**

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Deployment](#-deployment) • [API Docs](#-api-documentation)

</div>

---

## 📖 About

**Splitly** is a comprehensive expense-splitting application designed to make sharing costs with friends, roommates, and groups effortless. Built as a modern alternative to Splitwise, it features AI-powered expense entry, beautiful analytics, and smart debt settlement algorithms.

### 🎯 Key Highlights

- 🤖 **AI-Powered Entry** - Add expenses naturally: "I paid $50 for dinner"
- 📊 **Beautiful Analytics** - Interactive D3.js charts and spending insights
- ⚖️ **Smart Settlements** - Optimized debt calculation and settlement suggestions
- 🎨 **Modern UI** - Clean, aesthetic design with Tailwind CSS
- 🔐 **Secure** - JWT authentication and encrypted data storage
- 📱 **Responsive** - Perfect experience on mobile, tablet, and desktop

---

## ✨ Features

### 💳 Expense Management
- Create expenses with multiple split types (equal, exact, percentage)
- Category-based organization with color coding
- Attach notes and receipts to expenses
- Edit and delete expenses with full history

### 👥 Group Management
- Create groups for trips, roommates, or any shared expenses
- Add/remove members dynamically
- Group-specific expense tracking
- Member avatars and profiles

### ⚖️ Smart Settlements
- Automatic debt calculation
- Optimized settlement suggestions (minimize transactions)
- Settlement history and tracking
- Visual debt flow diagrams

### 🤖 AI Assistant
- Natural language expense entry
- Conversational analytics queries
- Smart category suggestions
- Context-aware responses

### 📊 Analytics & Insights
- Monthly spending trends (D3.js charts)
- Category breakdown visualization
- Group spending analysis
- Export data to CSV

### 🔐 Security & Privacy
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Secure API endpoints

---

## 🎬 Demo

### 🖼️ Screenshots

<details>
<summary>Click to view screenshots</summary>

#### Landing Page
![Landing Page](screenshots/landing.png)

#### Dashboard
![Dashboard](screenshots/dashboard.png)

#### Groups Management
![Groups](screenshots/groups.png)

#### Expense Tracking
![Expenses](screenshots/expenses.png)

#### AI Chatbot
![Chatbot](screenshots/chatbot.png)

</details>

### 🌐 Live Demo

**Frontend**: [https://splitly.vercel.app](https://splitly.vercel.app)  
**Backend API**: [https://splitly-backend.onrender.com](https://splitly-backend.onrender.com)  
**API Docs**: [https://splitly-backend.onrender.com/docs](https://splitly-backend.onrender.com/docs)

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3 with Vite
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router v6
- **Charts**: D3.js
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **State Management**: React Context API

### Backend
- **Framework**: FastAPI 0.115
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt
- **AI Integration**: OpenRouter API
- **Validation**: Pydantic v2

### DevOps & Deployment
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Database**: Neon (Serverless PostgreSQL)
- **Version Control**: Git & GitHub
- **CI/CD**: Automatic deployments

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 16+
- **Git**

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/splitly.git
cd splitly
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Update .env with your configuration
# DATABASE_URL=postgresql://user:password@localhost:5432/splitly
# SECRET_KEY=your-secret-key-here
# OPENROUTER_API_KEY=your-openrouter-key

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env
# VITE_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 🗄️ Database Setup

```bash
# Create PostgreSQL database
createdb splitly

# Or using psql
psql -U postgres
CREATE DATABASE splitly;
\q

# Run migrations
cd backend
alembic upgrade head
```

---

## 📁 Project Structure

```
splitly/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   ├── core/            # Core configuration
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   ├── alembic/             # Database migrations
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/         # Reusable UI components
│   │   │   ├── dashboard/  # Dashboard components
│   │   │   ├── groups/     # Group components
│   │   │   ├── expenses/   # Expense components
│   │   │   └── chatbot/    # Chatbot components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── lib/             # Utilities
│   ├── package.json         # Node dependencies
│   └── .env.example         # Environment template
│
└── README.md                # This file
```

---

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/splitly

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Integration
OPENROUTER_API_KEY=your-openrouter-api-key

# CORS
CORS_ORIGINS=http://localhost:5173,https://splitly.vercel.app
```

### Frontend Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📚 API Documentation

### Interactive API Docs

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

#### Groups
- `GET /api/v1/groups` - List all groups
- `POST /api/v1/groups` - Create group
- `GET /api/v1/groups/{id}` - Get group details
- `PUT /api/v1/groups/{id}` - Update group
- `DELETE /api/v1/groups/{id}` - Delete group

#### Expenses
- `GET /api/v1/expenses` - List expenses
- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/expenses/{id}` - Get expense
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

#### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard data
- `GET /api/v1/analytics/spending-trends` - Spending trends

#### AI Chatbot
- `POST /api/v1/chatbot/parse` - Parse natural language
- `POST /api/v1/chatbot/confirm` - Confirm expense

---

## 🚢 Deployment

### Quick Deploy (Free Hosting)

#### 1. Database (Neon)
```bash
# Sign up at https://neon.tech
# Create project and get connection string
```

#### 2. Backend (Render)
```bash
# Sign up at https://render.com
# Connect GitHub repo
# Deploy backend with environment variables
```

#### 3. Frontend (Vercel)
```bash
# Sign up at https://vercel.com
# Import GitHub repo
# Deploy with VITE_API_URL environment variable
```

### Detailed Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint and Prettier for JavaScript
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Name](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [D3.js](https://d3js.org/) - Data visualization
- [OpenRouter](https://openrouter.ai/) - AI API aggregator
- Inspired by [Splitwise](https://www.splitwise.com/)

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/splitly?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/splitly?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/splitly)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/splitly)

---

<div align="center">

**Made with ❤️ for better expense sharing**

[⬆ Back to Top](#-splitly---smart-expense-splitting-app)

</div>
