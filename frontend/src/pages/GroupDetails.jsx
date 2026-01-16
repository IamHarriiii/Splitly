import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, UserPlus, TrendingUp, Edit, Trash2, X, Calendar, User, Tag, Clock, Receipt, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { getGroupDetails, updateGroup, deleteGroup } from '../services/groups';
import { getExpenses, createExpense, getExpenseSplits } from '../services/expenses';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import AddMemberModal from '../components/groups/AddMemberModal';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import DeleteGroupModal from '../components/groups/DeleteGroupModal';
import CreateExpenseModal from '../components/expenses/CreateExpenseModal';
import GroupDebtSummary from '../components/groups/GroupDebtSummary';
import { useAuth } from '../contexts/AuthContext';

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expensesVersion, setExpensesVersion] = useState(0);

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupData, expensesData] = await Promise.all([
        getGroupDetails(id),
        getExpenses({ group_id: id, limit: 10, include_splits: true })
      ]);

      const expensesList = Array.isArray(expensesData) ? expensesData : (expensesData.data || []);

      // Fetch splits for each expense
      const expensesWithSplits = await Promise.all(
        expensesList.map(async (expense) => {
          try {
            const splits = await getExpenseSplits(expense.id);
            return { ...expense, splits: splits || [] };
          } catch (error) {
            console.error(`Failed to fetch splits for expense ${expense.id}:`, error);
            return { ...expense, splits: [] };
          }
        })
      );

      setGroup(groupData);
      setExpenses(expensesWithSplits);
      setExpensesVersion(prev => prev + 1);

      // Debug logging
      console.log('Group Data:', groupData);
      console.log('Group created_by:', groupData.created_by);
      console.log('Current user:', user);
      console.log('Expenses with splits:', expensesWithSplits);
    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = async (data) => {
    try {
      await updateGroup(id, data);
      setShowEditModal(false);
      fetchGroupData();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = async () => {
    setDeleteLoading(true);
    try {
      await deleteGroup(id);
      navigate('/groups');
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateExpense = async (data) => {
    try {
      await createExpense({
        ...data,
        group_id: id,
      });
      setShowAddExpenseModal(false);
      fetchGroupData();
    } catch (error) {
      console.error('Failed to create expense:', error);
      throw error; // Propagate error to modal
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

  // Helper functions for expense popup
  const getCategoryColor = (category) => {
    const colors = {
      'Food': { bg: 'bg-orange-100', text: 'text-orange-700', accent: '#f97316' },
      'Transport': { bg: 'bg-emerald-100', text: 'text-emerald-700', accent: '#10b981' },
      'Groceries': { bg: 'bg-yellow-100', text: 'text-yellow-700', accent: '#eab308' },
      'Entertainment': { bg: 'bg-purple-100', text: 'text-purple-700', accent: '#8b5cf6' },
      'Shopping': { bg: 'bg-pink-100', text: 'text-pink-700', accent: '#ec4899' },
      'Bills': { bg: 'bg-red-100', text: 'text-red-700', accent: '#ef4444' },
      'Healthcare': { bg: 'bg-cyan-100', text: 'text-cyan-700', accent: '#06b6d4' },
      'Other': { bg: 'bg-slate-100', text: 'text-slate-700', accent: '#64748b' }
    };
    return colors[category] || colors['Other'];
  };

  const getRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 sm:p-8 lg:p-12">
      <div className="max-w-[1600px] mx-auto space-y-6">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setShowAddExpenseModal(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add Expense
                </Button>
                {group.created_by === user?.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit size={18} className="mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-red-500/30"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      <Trash2 size={18} className="mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
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
              <Button size="sm" variant="outline" onClick={() => setShowAddMemberModal(true)}>
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
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedExpense(expense)}
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

          {/* Smart Settlements Section */}
          <div className="md:col-span-2 lg:col-span-2">
            <GroupDebtSummary groupId={id} refreshTrigger={expensesVersion} />
          </div>

          {/* Payment Status Section */}
          {expenses.length > 0 && (
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={24} />
                  Payment Status
                </CardTitle>
                <p className="text-sm text-gray-600">Track who has paid and who hasn't for each expense</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Expense Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                          <p className="text-sm text-gray-600">
                            ${expense.amount?.toFixed(2)} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="space-y-2">
                        {expense.splits && expense.splits.length > 0 ? (
                          <>
                            {/* Paid Members */}
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                                <CheckCircle2 size={14} />
                                Paid ({expense.splits.filter(s => s.is_settled).length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {expense.splits
                                  .filter(split => split.is_settled)
                                  .map((split, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full"
                                    >
                                      <CheckCircle2 size={14} className="text-green-600" />
                                      <span className="text-sm text-green-700">
                                        {split.user_name || 'Unknown'} - ${split.share_amount?.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                {expense.splits.filter(s => s.is_settled).length === 0 && (
                                  <p className="text-sm text-gray-500">None</p>
                                )}
                              </div>
                            </div>

                            {/* Unpaid Members */}
                            <div>
                              <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                                <XCircle size={14} />
                                Yet to Pay ({expense.splits.filter(s => !s.is_settled).length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {expense.splits
                                  .filter(split => !split.is_settled)
                                  .map((split, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full"
                                    >
                                      <XCircle size={14} className="text-red-600" />
                                      <span className="text-sm text-red-700">
                                        {split.user_name || 'Unknown'} - ${split.share_amount?.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                {expense.splits.filter(s => !s.is_settled).length === 0 && (
                                  <p className="text-sm text-gray-500">All settled!</p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">No split information available</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        groupId={id}
        onMemberAdded={fetchGroupData}
      />

      {/* Edit Group Modal */}
      <CreateGroupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditGroup}
        initialData={group}
      />

      {/* Delete Group Modal */}
      <DeleteGroupModal
        isOpen={showDeleteModal}
        group={group}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGroup}
        loading={deleteLoading}
      />

      {/* Expense Details Popup */}
      {selectedExpense && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedExpense(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div
              className="p-5 rounded-t-xl"
              style={{ background: `linear-gradient(135deg, ${getCategoryColor(selectedExpense.category).accent}, ${getCategoryColor(selectedExpense.category).accent}cc)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{selectedExpense.description}</h4>
                    <p className="text-white/80 text-sm">{selectedExpense.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Popup Content */}
            <div className="p-5 space-y-4">
              {/* Amount */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${getCategoryColor(selectedExpense.category).accent}20` }}
                >
                  <DollarSign size={28} style={{ color: getCategoryColor(selectedExpense.category).accent }} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Amount</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${parseFloat(selectedExpense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Category</span>
                  </div>
                  <p className="font-semibold text-slate-900">{selectedExpense.category}</p>
                </div>

                {/* Date */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Date</span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedExpense.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Paid By */}
                {selectedExpense.paid_by_name && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Paid By</span>
                    </div>
                    <p className="font-semibold text-slate-900">{selectedExpense.paid_by_name}</p>
                  </div>
                )}

                {/* Group */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Group</span>
                  </div>
                  <p className="font-semibold text-slate-900">{group.name}</p>
                </div>
              </div>

              {/* Time Info */}
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Added</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{getRelativeTime(selectedExpense.date)}</span>
              </div>

              {/* Transaction ID */}
              {selectedExpense.id && (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-mono">
                    Transaction ID: {selectedExpense.id.toString().slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setSelectedExpense(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <CreateExpenseModal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSubmit={handleCreateExpense}
        groups={[group]}
      />
    </div>
  );
}
