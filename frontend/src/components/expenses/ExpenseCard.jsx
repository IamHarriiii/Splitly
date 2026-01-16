import { Calendar, User, MoreVertical, Edit, Trash2, X, DollarSign, Tag, Clock, Receipt, Users } from 'lucide-react';
import { useState } from 'react';

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getCategoryColor = (category) => {
    const colors = {
      Food: 'bg-orange-100 text-orange-700',
      Transport: 'bg-blue-100 text-blue-700',
      Entertainment: 'bg-purple-100 text-purple-700',
      Shopping: 'bg-pink-100 text-pink-700',
      Bills: 'bg-red-100 text-red-700',
      Healthcare: 'bg-green-100 text-green-700',
      Groceries: 'bg-yellow-100 text-yellow-700',
      Other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.Other;
  };

  const getCategoryAccent = (category) => {
    const colors = {
      'Food': '#f97316',
      'Transport': '#10b981',
      'Groceries': '#eab308',
      'Entertainment': '#8b5cf6',
      'Shopping': '#ec4899',
      'Bills': '#ef4444',
      'Healthcare': '#06b6d4',
      'Other': '#64748b'
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
    <>
      <div
        className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg text-gray-900">{expense.description}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(expense.category)}`}>
                {expense.category}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(expense.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {expense.payer_name && (
                <span className="flex items-center gap-1">
                  <User size={14} />
                  Paid by {expense.payer_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                ${parseFloat(expense.amount).toFixed(2)}
              </p>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <MoreVertical size={20} />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(expense);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(expense);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Details Popup */}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div
              className="p-5 rounded-t-xl"
              style={{ background: `linear-gradient(135deg, ${getCategoryAccent(expense.category)}, ${getCategoryAccent(expense.category)}cc)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">{expense.description}</h4>
                    <p className="text-white/80 text-sm">{expense.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
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
                  style={{ backgroundColor: `${getCategoryAccent(expense.category)}20` }}
                >
                  <DollarSign size={28} style={{ color: getCategoryAccent(expense.category) }} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Amount</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <p className="font-semibold text-slate-900">{expense.category}</p>
                </div>

                {/* Date */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Date</span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Paid By */}
                {expense.payer_name && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Paid By</span>
                    </div>
                    <p className="font-semibold text-slate-900">{expense.payer_name}</p>
                  </div>
                )}

                {/* Group */}
                {expense.group_name && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-500 font-medium">Group</span>
                    </div>
                    <p className="font-semibold text-slate-900">{expense.group_name}</p>
                  </div>
                )}
              </div>

              {/* Time Info */}
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600">Added</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{getRelativeTime(expense.date)}</span>
              </div>

              {/* Transaction ID */}
              {expense.id && (
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-mono">
                    Transaction ID: {expense.id.toString().slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t bg-slate-50 rounded-b-xl">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(false);
                    onEdit(expense);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
