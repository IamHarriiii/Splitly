import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getCategories } from '../../services/expenses';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateExpenseModal({ isOpen, onClose, onSubmit, groups, initialData = null }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupId, setGroupId] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [loading, setLoading] = useState(false);

  const categories = getCategories();

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setCategory(initialData.category);
      setDate(initialData.date || initialData.expense_date);
      setGroupId(initialData.group_id || '');
      setSplitType(initialData.split_type || 'equal');
    } else {
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('Food');
      setDate(new Date().toISOString().split('T')[0]);
      setGroupId('');
      setSplitType('equal');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create splits array - at minimum include current user
      const splits = [{
        user_id: user.id,
        share_amount: groupId ? null : parseFloat(amount), // For personal, user pays full amount
        share_percentage: null
      }];

      await onSubmit({
        amount: parseFloat(amount),
        description,
        category,
        expense_date: date,
        group_id: groupId || null,
        split_type: splitType,
        is_personal: !groupId,
        paid_by: user.id,
        splits: splits
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., Dinner at restaurant"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Personal Expense</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          {groupId && (
            <div>
              <label className="block text-sm font-medium mb-2">Split Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['equal', 'exact', 'percentage'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`px-3 py-2 border rounded-md capitalize transition-colors ${
                      splitType === type
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {splitType === 'equal' && 'Split equally among all members'}
                {splitType === 'exact' && 'Specify exact amounts for each person'}
                {splitType === 'percentage' && 'Split by percentage'}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || !description}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
