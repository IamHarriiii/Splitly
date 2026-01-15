import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData, getRecentExpenses } from '../services/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import MonthlyTrendChart from '../components/dashboard/MonthlyTrendChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import { DollarSign, TrendingUp, TrendingDown, Users, Plus, Receipt, Bot, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboard, expenses] = await Promise.all([
        getDashboardData(12),
        getRecentExpenses(10)
      ]);
      setDashboardData(dashboard);
      setRecentExpenses(expenses.items || expenses);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 mb-4 text-center">{error}</p>
            <Button onClick={fetchData} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = dashboardData?.user_summary || {};
  const monthlyTrend = dashboardData?.monthly_trend || [];
  const categoryBreakdown = dashboardData?.category_breakdown || [];

  const quickActions = [
    { 
      icon: Plus, 
      label: 'Add Expense', 
      description: 'Track a new expense',
      path: '/expenses', 
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50'
    },
    { 
      icon: Users, 
      label: 'New Group', 
      description: 'Create a group',
      path: '/groups', 
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      hoverBg: 'hover:bg-emerald-50'
    },
    { 
      icon: Bot, 
      label: 'AI Assistant', 
      description: 'Chat with AI',
      path: '/chatbot', 
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      hoverBg: 'hover:bg-violet-50'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                Welcome back, {user?.name}! 
                <Sparkles className="text-blue-500" size={28} />
              </h1>
              <p className="text-slate-600">Here's your financial overview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-slate-200 bg-white ${action.hoverBg}`}
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center`}>
                    <action.icon className={action.iconColor} size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{action.label}</h3>
                    <p className="text-sm text-slate-600">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600">Total Expenses</p>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign className="text-blue-600" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">${parseFloat(summary.total_expenses || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600">You Owe</p>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="text-red-600" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">${parseFloat(summary.total_you_owe || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600">Owed to You</p>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="text-emerald-600" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">${parseFloat(summary.total_owed_to_you || 0).toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600">Active Groups</p>
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Users className="text-violet-600" size={20} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{summary.group_count || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyTrendChart data={monthlyTrend} />
          <CategoryChart data={categoryBreakdown} />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions expenses={recentExpenses} />
      </main>
    </div>
  );
}
