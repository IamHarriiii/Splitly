import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Calendar, DollarSign } from 'lucide-react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../services/expenses';
import { getGroups } from '../services/groups';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ExpenseCard from '../components/expenses/ExpenseCard';
import CreateExpenseModal from '../components/expenses/CreateExpenseModal';
import DeleteExpenseModal from '../components/expenses/DeleteExpenseModal';

export default function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesData, groupsData] = await Promise.all([
        getExpenses({ limit: 50 }),
        getGroups()
      ]);
      setExpenses(Array.isArray(expensesData) ? expensesData : (expensesData.data || []));
      setGroups(Array.isArray(groupsData) ? groupsData : (groupsData.data || []));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (data) => {
    await createExpense(data);
    fetchData();
  };

  const handleUpdateExpense = async (data) => {
    if (!editingExpense) return;
    await updateExpense(editingExpense.id, data);
    setEditingExpense(null);
    fetchData();
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    
    setDeleteLoading(true);
    try {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full border-0 shadow-xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Receipt size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No expenses yet</h3>
              <p className="text-gray-600 mb-6">Start tracking your expenses by adding your first one</p>
              <Button onClick={() => setShowCreateModal(true)} size="lg" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                <Plus size={20} className="mr-2" />
                Add Your First Expense
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
              <p className="text-gray-600 mt-1">{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} tracked</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              <Plus size={20} className="mr-2" />
              Add Expense
            </Button>
          </div>

          <div className="space-y-4">
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onEdit={(expense) => setEditingExpense(expense)}
                onDelete={(expense) => setDeletingExpense(expense)}
              />
            ))}
          </div>
        </div>
      )}

      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateExpense}
        groups={groups}
      />

      {editingExpense && (
        <CreateExpenseModal
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onSubmit={handleUpdateExpense}
          groups={groups}
          initialData={editingExpense}
        />
      )}

      <DeleteExpenseModal
        isOpen={!!deletingExpense}
        expense={deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteExpense}
        loading={deleteLoading}
      />
    </div>
  );
}
