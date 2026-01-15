import { X, AlertTriangle } from 'lucide-react';

export default function DeleteExpenseModal({ isOpen, expense, onClose, onConfirm, loading }) {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600">Delete Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 rounded-md">
            <AlertTriangle className="text-red-600" size={24} />
            <p className="text-sm text-red-800">This action cannot be undone!</p>
          </div>

          <p className="text-gray-700 mb-2">
            Are you sure you want to delete this expense?
          </p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-semibold">{expense.description}</p>
            <p className="text-sm text-gray-600">${parseFloat(expense.amount).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
