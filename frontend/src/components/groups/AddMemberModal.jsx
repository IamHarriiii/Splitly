import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { searchUsers, addMember } from '../../services/groups';

export default function AddMemberModal({ isOpen, onClose, groupId, onMemberAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async (query) => {
    setSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : (results.users || []));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    setLoading(true);
    try {
      await addMember(groupId, userId);
      setSearchQuery('');
      setSearchResults([]);
      onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. They may already be in the group.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search Users</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or email..."
                autoFocus
              />
            </div>
          </div>

          {searching && (
            <p className="text-sm text-gray-500 text-center py-4">Searching...</p>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAddMember(user.id)}
                  disabled={loading}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <UserPlus size={16} className="text-blue-600" />
                </button>
              ))}
            </div>
          )}

          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No users found</p>
          )}

          {searchQuery.length < 2 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
