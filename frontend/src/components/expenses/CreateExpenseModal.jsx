import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { getCategories } from '../../services/expenses';
import { getGroupDetails } from '../../services/groups';
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

  // New state for participants and splits
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});

  const categories = getCategories();

  // Fetch group members when group is selected
  useEffect(() => {
    if (groupId) {
      fetchGroupMembers(groupId);
    } else {
      setGroupMembers([]);
      setSelectedParticipants([]);
    }
  }, [groupId]);

  const fetchGroupMembers = async (gId) => {
    try {
      const groupData = await getGroupDetails(gId);
      setGroupMembers(groupData.members || []);
      // Auto-select all members by default
      setSelectedParticipants(groupData.members?.map(m => m.user_id) || []);
    } catch (error) {
      console.error('Failed to fetch group members:', error);
    }
  };

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
      setSelectedParticipants([]);
      setExactAmounts({});
      setPercentages({});
    }
  }, [initialData, isOpen]);

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
      // Remove from exact amounts/percentages
      const newAmounts = { ...exactAmounts };
      delete newAmounts[userId];
      setExactAmounts(newAmounts);
      const newPercentages = { ...percentages };
      delete newPercentages[userId];
      setPercentages(newPercentages);
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const handleExactAmountChange = (userId, value) => {
    setExactAmounts({
      ...exactAmounts,
      [userId]: parseFloat(value) || 0
    });
  };

  const handlePercentageChange = (userId, value) => {
    setPercentages({
      ...percentages,
      [userId]: parseFloat(value) || 0
    });
  };

  const getTotalExactAmount = () => {
    return Object.values(exactAmounts).reduce((sum, amt) => sum + amt, 0);
  };

  const getTotalPercentage = () => {
    return Object.values(percentages).reduce((sum, pct) => sum + pct, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation for group expenses
      if (groupId) {
        if (selectedParticipants.length === 0) {
          alert('Please select at least one participant');
          setLoading(false);
          return;
        }

        if (splitType === 'exact') {
          const total = getTotalExactAmount();
          if (Math.abs(total - parseFloat(amount)) > 0.01) {
            alert(`Exact amounts (${total.toFixed(2)}) must equal total amount (${amount})`);
            setLoading(false);
            return;
          }
        }

        if (splitType === 'percentage') {
          const total = getTotalPercentage();
          if (Math.abs(total - 100) > 0.01) {
            alert(`Percentages (${total.toFixed(1)}%) must equal 100%`);
            setLoading(false);
            return;
          }
        }
      }

      // Build splits array
      let splits;
      if (groupId) {
        splits = selectedParticipants.map(participantId => ({
          user_id: participantId,
          share_amount: splitType === 'exact' ? (exactAmounts[participantId] || 0) : null,
          share_percentage: splitType === 'percentage' ? (percentages[participantId] || 0) : null
        }));
      } else {
        // Personal expense - only current user
        splits = [{
          user_id: user.id,
          share_amount: parseFloat(amount),
          share_percentage: null
        }];
      }

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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                max={new Date().toISOString().split('T')[0]}
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {groupId && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Split Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['equal', 'exact', 'percentage'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSplitType(type)}
                      className={`px-3 py-2 border rounded-md capitalize transition-colors ${splitType === type
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Participants ({selectedParticipants.length} selected)
                </label>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {groupMembers.map(member => {
                    const isSelected = selectedParticipants.includes(member.user_id);
                    return (
                      <div key={member.user_id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(member.user_id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{member.name}</p>
                            {member.user_id === user.id && (
                              <span className="text-xs text-blue-600">(You)</span>
                            )}
                          </div>

                          {isSelected && splitType === 'exact' && (
                            <div className="w-32">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={exactAmounts[member.user_id] || ''}
                                onChange={(e) => handleExactAmountChange(member.user_id, e.target.value)}
                                placeholder="$0.00"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          )}

                          {isSelected && splitType === 'percentage' && (
                            <div className="w-24">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={percentages[member.user_id] || ''}
                                onChange={(e) => handlePercentageChange(member.user_id, e.target.value)}
                                placeholder="0%"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          )}

                          {isSelected && splitType === 'equal' && (
                            <span className="text-sm text-gray-600">
                              ${(parseFloat(amount) / selectedParticipants.length || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {splitType === 'exact' && selectedParticipants.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Total Allocated:</span>
                      <span className={getTotalExactAmount() !== parseFloat(amount || 0) ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                        ${getTotalExactAmount().toFixed(2)} / ${parseFloat(amount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {splitType === 'percentage' && selectedParticipants.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Total Percentage:</span>
                      <span className={getTotalPercentage() !== 100 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                        {getTotalPercentage().toFixed(1)}% / 100%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
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
