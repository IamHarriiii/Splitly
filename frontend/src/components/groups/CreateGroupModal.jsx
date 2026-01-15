import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { searchUsers } from '../../services/groups';

export default function CreateGroupModal({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
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
      setSearchResults(results.users || results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const addMember = (user) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name,
        description,
        member_ids: selectedMembers.map(m => m.id)
      });
      // Reset form
      setName('');
      setDescription('');
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., Weekend Trip"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Add Members</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search users by name or email..."
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addMember(user)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
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

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">Selected Members ({selectedMembers.length})</p>
                {selectedMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-md">
                    <span className="text-sm">{member.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
