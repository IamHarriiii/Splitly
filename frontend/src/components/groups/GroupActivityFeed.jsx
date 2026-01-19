import { useState, useEffect } from 'react';
import { Activity, DollarSign, UserPlus, UserMinus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { getGroupActivityFeed } from '../../services/activity';
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

export default function GroupActivityFeed({ groupId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (groupId) {
      fetchActivities();
    }
  }, [groupId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getGroupActivityFeed(groupId, 1, 10);
      setActivities(data.data || []);
    } catch (err) {
      console.error('Failed to fetch group activities:', err);
      setError('Failed to load activities');
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
    return actionIcons[action] || Activity;
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={24} className="text-indigo-600" />
          Group Activity
        </CardTitle>
        <p className="text-sm text-gray-600">Recent actions in this group</p>
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
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getIcon(activity.action);
              return (
                <div key={activity.id} className="flex gap-3 items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${actionColors[activity.action] || 'bg-gray-100 text-gray-600'}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatTime(activity.created_at)}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500">{activity.user_name}</span>
                    </div>
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
