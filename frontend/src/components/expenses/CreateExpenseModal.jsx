import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { toast } from 'sonner';
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
  const [paidBy, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);

  // New state for participants and splits
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});

  // Category autocomplete state
  const [categoryInput, setCategoryInput] = useState('Food');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);

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

  // Auto-select group if only one is available
  useEffect(() => {
    if (groups && groups.length === 1 && !groupId && !initialData) {
      setGroupId(groups[0].id);
    }
  }, [groups, groupId, initialData]);

  // Set default paidBy
  useEffect(() => {
    if (user && !paidBy) {
      setPaidBy(user.id);
    }
  }, [user, paidBy]);

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
      setCategoryInput(initialData.category);
      setDate(initialData.date || initialData.expense_date);
      setGroupId(initialData.group_id || '');
      setPaidBy(initialData.paid_by || user.id);
      setSplitType(initialData.split_type || 'equal');
    } else {
      // Reset form
      setAmount('');
      setDescription('');
      setCategory('Food');
      setCategoryInput('Food');
      setDate(new Date().toISOString().split('T')[0]);
      setGroupId('');
      setPaidBy(user.id);
      setSplitType('equal');
      setSelectedParticipants([]);
      setExactAmounts({});
      setPercentages({});
    }
  }, [initialData, isOpen]);

  // Handle category input change
  const handleCategoryInputChange = (value) => {
    setCategoryInput(value);
    setCategory(value);

    if (value.trim()) {
      const filtered = categories.filter(cat =>
        cat.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
      setShowCategorySuggestions(true);
    } else {
      setFilteredCategories([]);
      setShowCategorySuggestions(false);
    }
  };

  // Select category from suggestions
  const selectCategory = (cat) => {
    setCategoryInput(cat);
    setCategory(cat);
    setShowCategorySuggestions(false);
  };

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
          toast.error('Please select at least one participant');
          setLoading(false);
          return;
        }

        if (splitType === 'exact') {
          const total = getTotalExactAmount();
          if (Math.abs(total - parseFloat(amount)) > 0.01) {
            toast.error(`Exact amounts (${total.toFixed(2)}) must equal total amount (${amount})`);
            setLoading(false);
            return;
          }
        }

        if (splitType === 'percentage') {
          const total = getTotalPercentage();
          if (Math.abs(total - 100) > 0.01) {
            toast.error(`Percentages (${total.toFixed(1)}%) must equal 100%`);
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
        paid_by: paidBy || user.id,
        splits: splits
      });
      toast.success('Expense created successfully');
      onClose();
    } catch (error) {
      console.error('Expense creation error:', error);
      const errorMessage = error.response?.data?.detail
        ? JSON.stringify(error.response.data.detail)
        : 'Failed to save expense. Please try again.';
      toast.error(errorMessage);
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
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => handleCategoryInputChange(e.target.value)}
                onFocus={() => {
                  if (categoryInput.trim()) {
                    const filtered = categories.filter(cat =>
                      cat.toLowerCase().includes(categoryInput.toLowerCase())
                    );
                    setFilteredCategories(filtered);
                    setShowCategorySuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowCategorySuggestions(false), 200);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type category (e.g., Food, Transport)"
              />

              {/* Suggestions Dropdown */}
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat}
                      onClick={() => selectCategory(cat)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <span className="font-medium">{cat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom category indicator */}
              {categoryInput && !categories.includes(categoryInput) && (
                <p className="text-xs text-blue-600 mt-1">
                  ✨ Custom category: "{categoryInput}"
                </p>
              )}
            </div>


          </div>

          <div className="grid grid-cols-2 gap-4">
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

            {groupId && groupMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Paid By</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {groupMembers.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user_id === user.id ? 'You' : member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
