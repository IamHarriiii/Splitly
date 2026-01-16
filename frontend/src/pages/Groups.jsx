import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../services/groups';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import DeleteGroupModal from '../components/groups/DeleteGroupModal';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deletingGroup, setDeletingGroup] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await getGroups();
      setGroups(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (data) => {
    await createGroup(data);
    fetchGroups();
  };

  const handleEditGroup = async (data) => {
    await updateGroup(editingGroup.id, data);
    setEditingGroup(null);
    fetchGroups();
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    
    setDeleteLoading(true);
    try {
      await deleteGroup(deletingGroup.id);
      setDeletingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const groupGradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-amber-500',
    'from-red-500 to-rose-500',
    'from-indigo-500 to-violet-500',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full border-0 shadow-xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <UsersIcon size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-600 mb-6">Create your first group to start splitting expenses with friends</p>
              <Button onClick={() => setShowCreateModal(true)} size="lg" className="w-full">
                <Plus size={20} className="mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Groups</h1>
              <p className="text-gray-600 mt-1">{groups.length} {groups.length === 1 ? 'group' : 'groups'}</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={20} className="mr-2" />
              New Group
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group, index) => (
              <Card
                key={group.id}
                className="border-0 overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer group"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className={`h-2 bg-gradient-to-r ${groupGradients[index % groupGradients.length]}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{group.name}</CardTitle>
                      <p className="text-sm text-gray-600">{group.member_count || 0} members</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(group.member_count || 0, 3))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${groupGradients[(index + i) % groupGradients.length]} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    {(group.member_count || 0) > 3 && (
                      <span className="text-xs text-gray-500">+{group.member_count - 3} more</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
      />

      {editingGroup && (
        <CreateGroupModal
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onSubmit={handleEditGroup}
          initialData={editingGroup}
        />
      )}

      <DeleteGroupModal
        isOpen={!!deletingGroup}
        group={deletingGroup}
        onClose={() => setDeletingGroup(null)}
        onConfirm={handleDeleteGroup}
        loading={deleteLoading}
      />
    </div>
  );
}
