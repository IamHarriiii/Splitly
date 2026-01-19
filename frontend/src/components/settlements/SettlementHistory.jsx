import { useState, useEffect } from 'react';
import { History, ArrowRight, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSettlementHistory } from '../../services/settlements';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

export default function SettlementHistory() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total_count: 0 });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const data = await getSettlementHistory(page, 10);
      setSettlements(data.data || []);
      setPagination(data.pagination || { page: 1, total_pages: 1, total_count: 0 });
    } catch (err) {
      console.error('Failed to fetch settlement history:', err);
      setError('Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && settlements.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={24} className="text-indigo-600" />
            Settlement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History size={24} className="text-indigo-600" />
          Settlement History
        </CardTitle>
        <p className="text-sm text-gray-600">Past payments and settlements</p>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <History size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500">No settlement history yet</p>
            <p className="text-sm text-gray-400 mt-1">Recorded payments will appear here</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Payer Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {settlement.payer_name?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex items-center gap-2">
                        <ArrowRight size={20} className="text-green-500" />
                      </div>
                      
                      {/* Receiver Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {settlement.receiver_name?.charAt(0).toUpperCase() || 'R'}
                      </div>
                      
                      {/* Names and Details */}
                      <div>
                        <p className="font-medium text-gray-900">
                          <span className="text-blue-600">{settlement.payer_name}</span>
                          {' paid '}
                          <span className="text-emerald-600">{settlement.receiver_name}</span>
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(settlement.settlement_date)}
                          </span>
                          {settlement.group_name && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                              {settlement.group_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        ${parseFloat(settlement.amount).toFixed(2)}
                      </p>
                      {settlement.notes && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                          <FileText size={12} />
                          {settlement.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Showing page {pagination.page} of {pagination.total_pages} ({pagination.total_count} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchHistory(pagination.page - 1)}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.total_pages || loading}
                    onClick={() => fetchHistory(pagination.page + 1)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
