import { useState } from 'react';
import { X, Receipt, Calendar, DollarSign, User, Users, Tag, Clock, ChevronRight } from 'lucide-react';

export default function RecentTransactions({ expenses = [] }) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Ensure expenses is an array
  const expensesList = Array.isArray(expenses) ? expenses : [];

  // Generate a short description for better distinction
  const getShortDescription = (expense) => {
    const amount = parseFloat(expense.amount || 0);
    const category = expense.category || 'Other';

    if (amount >= 1000) {
      return `Large ${category.toLowerCase()} expense`;
    } else if (amount >= 500) {
      return `Medium ${category.toLowerCase()} expense`;
    } else if (amount >= 100) {
      return `Regular ${category.toLowerCase()} expense`;
    } else {
      return `Small ${category.toLowerCase()} expense`;
    }
  };

  // Get relative time (today, yesterday, X days ago)
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

  // Get category color
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

  if (expensesList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Receipt size={22} className="text-blue-600" />
          Recent Transactions
        </h2>
        <p className="text-gray-500 text-center py-8">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Receipt size={22} className="text-blue-600" />
        Recent Transactions
      </h2>
      <div className="space-y-2">
        {expensesList.map((expense) => {
          const categoryColors = getCategoryColor(expense.category);
          return (
            <div
              key={expense.id}
              className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200 group"
              onClick={() => setSelectedTransaction(expense)}
            >
              {/* Left Section - Icon & Details */}
              <div className="flex items-center gap-4 flex-1">
                {/* Category Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${categoryColors.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Tag size={20} className={categoryColors.text} />
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{getShortDescription(expense)}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs ${categoryColors.bg} ${categoryColors.text} px-2 py-0.5 rounded-full font-medium`}>
                      {expense.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {getRelativeTime(expense.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Section - Amount & Arrow */}
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-gray-900">
                  ${parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Details Popup */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div
              className="p-5 rounded-t-xl"
              style={{ background: `linear-gradient(135deg, ${getCategoryColor(selectedTransaction.category).accent}, ${getCategoryColor(selectedTransaction.category).accent}cc)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{selectedTransaction.description}</h4>
                    <p className="text-white/80 text-sm">{getShortDescription(selectedTransaction)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
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
                  style={{ backgroundColor: `${getCategoryColor(selectedTransaction.category).accent}20` }}
                >
                  <DollarSign size={28} style={{ color: getCategoryColor(selectedTransaction.category).accent }} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Amount</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${parseFloat(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <p className="font-semibold text-slate-900">{selectedTransaction.category}</p>
                </div>

                {/* Date */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Date</span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedTransaction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Paid By */}
                {selectedTransaction.payer_name && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Paid By</span>
                    </div>
                    <p className="font-semibold text-slate-900">{selectedTransaction.payer_name}</p>
                  </div>
                )}

                {/* Group */}
                {selectedTransaction.group_name && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Group</span>
                    </div>
                    <p className="font-semibold text-slate-900">{selectedTransaction.group_name}</p>
                  </div>
                )}
              </div>

              {/* Time Info */}
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Added</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{getRelativeTime(selectedTransaction.date)}</span>
              </div>

              {/* Transaction ID (if available) */}
              {selectedTransaction.id && (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-mono">
                    Transaction ID: {selectedTransaction.id.toString().slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
