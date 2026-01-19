import { useState, useEffect } from 'react';
import { X, Activity, User, Users, DollarSign, UserPlus, UserMinus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { getActivityFeed } from '../../services/activity';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const actionIcons = {
  create: DollarSign,
  update: Edit,
  delete: Trash2,
  add_member: UserPlus,
  remove_member: UserMinus,
  settle: CheckCircle,
};

const actionColors = {
  create: 'bg-green-100 text-green-600',
  update: 'bg-blue-100 text-blue-600',
  delete: 'bg-red-100 text-red-600',
  add_member: 'bg-purple-100 text-purple-600',
  remove_member: 'bg-orange-100 text-orange-600',
  settle: 'bg-emerald-100 text-emerald-600',
};

export default function ActivityFeed({ onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async (page = 1) => {
    try {
      setLoading(true);
      const data = await getActivityFeed(page, 10);
      setActivities(data.data || []);
      setPagination(data.pagination || { page: 1, total_pages: 1 });
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (action) => {
    const Icon = actionIcons[action] || Activity;
    return Icon;
  };

  if (onClose) {
    // Modal view
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <CardTitle className="text-xl">Activity Feed</CardTitle>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activities.map((activity) => {
                  const Icon = getIcon(activity.action);
                  return (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${actionColors[activity.action] || 'bg-gray-100 text-gray-600'}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{formatTime(activity.created_at)}</span>
                            {activity.group_name && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs text-indigo-600 font-medium">{activity.group_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {pagination.total_pages > 1 && (
              <div className="p-4 border-t flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchActivities(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 py-2">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchActivities(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline view (for dashboard)
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => {
              const Icon = getIcon(activity.action);
              return (
                <div key={activity.id} className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${actionColors[activity.action] || 'bg-gray-100 text-gray-600'}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{activity.message}</p>
                    <span className="text-xs text-gray-400">{formatTime(activity.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
