import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, Settings, UserPlus, TrendingUp } from 'lucide-react';
import { getGroupDetails } from '../services/groups';
import { getExpenses } from '../services/expenses';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupData, expensesData] = await Promise.all([
        getGroupDetails(id),
        getExpenses({ group_id: id, limit: 10 })
      ]);
      setGroup(groupData);
      setExpenses(Array.isArray(expensesData) ? expensesData : (expensesData.data || []));
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Group not found</h3>
            <p className="text-gray-600 mb-6">This group doesn't exist or you don't have access to it</p>
            <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/groups')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
        </div>

        {/* Group Info Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{group.name}</CardTitle>
                {group.description && (
                  <p className="text-blue-100">{group.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => navigate(`/groups/${id}/settings`)}
              >
                <Settings size={20} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Members</p>
                  <p className="text-2xl font-bold">{group.member_count || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recent Expenses</p>
                  <p className="text-2xl font-bold">{expenses.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Members Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users size={24} />
                Members
              </CardTitle>
              <Button size="sm" variant="outline">
                <UserPlus size={16} className="mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.members && group.members.length > 0 ? (
                  group.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {member.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No members yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses Card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={24} />
                Recent Expenses
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/expenses', { state: { groupId: id } })}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-gray-600">
                          {expense.paid_by_name || 'Unknown'} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        ${expense.amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No expenses yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
