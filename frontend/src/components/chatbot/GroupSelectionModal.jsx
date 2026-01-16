import { X, Users } from 'lucide-react';

export default function GroupSelectionModal({ isOpen, groups, onSelect, onClose, onCreateNew }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Select Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 mb-4">
              No common groups found with all participants.
            </p>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create New Group
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Select a group for this expense:
            </p>

            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {groups.map(group => (
                <button
                  key={group.group_id}
                  onClick={() => onSelect(group.group_id)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{group.group_name}</p>
                      <p className="text-sm text-gray-500">{group.member_count} members</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="text-blue-600" size={20} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onCreateNew}
                className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
              >
                Create New Group
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
