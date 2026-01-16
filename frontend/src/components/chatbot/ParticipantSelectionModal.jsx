import { X } from 'lucide-react';

export default function ParticipantSelectionModal({ isOpen, users, onConfirm, onClose }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Group users by search name and get selected user for each
    const selectedUsers = {};
    users.forEach(user => {
      if (!selectedUsers[user.search_name]) {
        selectedUsers[user.search_name] = user.user_id;
      }
    });
    onConfirm(Object.values(selectedUsers));
  };

  // Group users by search name to show duplicates
  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.search_name]) {
      acc[user.search_name] = [];
    }
    acc[user.search_name].push(user);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Confirm Participants</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Found the following users. Please confirm:
        </p>

        <div className="space-y-3 mb-6">
          {Object.entries(groupedUsers).map(([searchName, userList]) => (
            <div key={searchName} className="border rounded-lg p-3">
              <p className="font-medium text-sm text-gray-700 mb-2">
                Searching for: {searchName}
              </p>
              {userList.length === 1 ? (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {userList[0].name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{userList[0].name}</p>
                    <p className="text-gray-500 text-xs">{userList[0].email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600">Multiple users found - using first match</p>
                  {userList.map(user => (
                    <div key={user.user_id} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
