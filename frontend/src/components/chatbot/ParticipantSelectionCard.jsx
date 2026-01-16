import { useState } from 'react';
import { Users, Check } from 'lucide-react';

export default function ParticipantSelectionCard({ users, onConfirm, onCancel }) {
  // Group users by search name
  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.search_name]) {
      acc[user.search_name] = [];
    }
    acc[user.search_name].push(user);
    return acc;
  }, {});

  // Track selected user for each search name
  const [selections, setSelections] = useState(() => {
    const initial = {};
    Object.keys(groupedUsers).forEach(name => {
      // Default select first match
      initial[name] = groupedUsers[name][0]?.user_id || null;
    });
    return initial;
  });

  const handleSelect = (searchName, userId) => {
    setSelections(prev => ({
      ...prev,
      [searchName]: userId
    }));
  };

  const handleConfirm = () => {
    const selectedIds = Object.values(selections).filter(Boolean);
    if (selectedIds.length === Object.keys(groupedUsers).length) {
      onConfirm(selectedIds);
    }
  };

  const allSelected = Object.values(selections).every(Boolean);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Users size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">Select Participants</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Select the correct user for each name:
      </p>

      <div className="space-y-4 mb-4">
        {Object.entries(groupedUsers).map(([searchName, userList]) => (
          <div key={searchName} className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {searchName}
            </p>
            <div className="space-y-2">
              {userList.map(user => {
                const isSelected = selections[searchName] === user.user_id;
                return (
                  <button
                    key={user.user_id}
                    onClick={() => handleSelect(searchName, user.user_id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {isSelected && (
                      <Check size={20} className="text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!allSelected}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
}
