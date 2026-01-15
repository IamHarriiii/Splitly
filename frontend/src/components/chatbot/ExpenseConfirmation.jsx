import { Check, X } from 'lucide-react';

export default function ExpenseConfirmation({ expense, onConfirm, onCancel }) {
  return (
    <div className="mb-4 mx-auto max-w-md">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-lg p-4 shadow-md">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Check size={16} className="text-white" />
          </div>
          <h3 className="font-semibold text-gray-900">Confirm Expense</h3>
        </div>

        <div className="space-y-2 mb-4 bg-white rounded-md p-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="text-sm font-semibold text-gray-900">
              ${parseFloat(expense.amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Description:</span>
            <span className="text-sm font-semibold text-gray-900">
              {expense.description}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Category:</span>
            <span className="text-sm font-semibold text-gray-900">
              {expense.category}
            </span>
          </div>
          {expense.participants && expense.participants.length > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Participants:</span>
              <span className="text-sm font-semibold text-gray-900">
                {expense.participants.join(', ')}
              </span>
            </div>
          )}
          {expense.split_type && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Split:</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {expense.split_type}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
