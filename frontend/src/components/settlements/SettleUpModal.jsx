import { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';

export default function SettleUpModal({ isOpen, debt, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debt) {
      setAmount(debt.amount.toString());
      setNote('');
    }
  }, [debt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        group_id: debt.group_id,
        receiver_id: debt.user_id,  // The other user (backend sets payer as current user)
        amount: parseFloat(amount),
        notes: note
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to record settlement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !debt) return null;

  const maxAmount = parseFloat(debt.amount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Settle Up</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">
            {debt.type === 'you_owe' ? 'You owe' : 'Owes you'}
          </p>
          <p className="text-lg font-semibold text-gray-900">{debt.user_name}</p>
          {debt.group_name && (
            <p className="text-xs text-gray-500 mt-1">in {debt.group_name}</p>
          )}
          <div className="mt-3 flex items-baseline gap-2">
            <DollarSign size={20} className="text-blue-600" />
            <p className="text-3xl font-bold text-blue-600">
              {maxAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Amount to Settle *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum: ${maxAmount.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="e.g., Cash payment, Bank transfer"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
