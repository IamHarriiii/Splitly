import { Users, DollarSign, MoreVertical, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';

export default function GroupCard({ group, onView, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{group.description}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
              <button
                onClick={() => {
                  onEdit(group);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit size={16} />
                Edit Group
              </button>
              <button
                onClick={() => {
                  onDelete(group);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Group
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{group.member_count || 0} members</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign size={16} />
          <span>${parseFloat(group.total_expenses || 0).toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={() => onView(group.id)}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        View Details
      </button>
    </div>
  );
}
