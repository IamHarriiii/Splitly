import { Calendar, User, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const getCategoryColor = (category) => {
    const colors = {
      Food: 'bg-orange-100 text-orange-700',
      Transport: 'bg-blue-100 text-blue-700',
      Entertainment: 'bg-purple-100 text-purple-700',
      Shopping: 'bg-pink-100 text-pink-700',
      Bills: 'bg-red-100 text-red-700',
      Healthcare: 'bg-green-100 text-green-700',
      Other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.Other;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
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
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border">
                <button
                  onClick={() => {
                    onEdit(expense);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
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
  );
}
