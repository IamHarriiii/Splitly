import { Users, Plus } from 'lucide-react';

export default function GroupSelectionCard({ groups, onSelect, onCancel, onCreateNew }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Users size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">Select Group</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Choose a group for this expense:
      </p>

      <div className="space-y-2 mb-4">
        {groups.length > 0 ? (
          groups.map(group => (
            <button
              key={group.group_id}
              onClick={() => onSelect(group.group_id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {group.group_name[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{group.group_name}</p>
                <p className="text-xs text-gray-500">{group.member_count} members</p>
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No common groups found with these participants.
          </p>
        )}
        
        <button
          onClick={onCreateNew}
          className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <Plus size={20} />
          </div>
          <p className="font-medium text-gray-600">Create New Group</p>
        </button>
      </div>

      <button
        onClick={onCancel}
        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
      >
        Cancel
      </button>
    </div>
  );
}
