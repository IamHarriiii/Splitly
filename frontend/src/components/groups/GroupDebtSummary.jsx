import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, DollarSign, Wallet } from 'lucide-react';
import { getGroupDebtSummary } from '../../services/settlements';
import { useAuth } from '../../contexts/AuthContext';

export default function GroupDebtSummary({ groupId, refreshTrigger }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, [groupId, refreshTrigger]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await getGroupDebtSummary(groupId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch debt summary:', err);
      setError('Failed to load settlement details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  const mySummary = summary.member_summaries.find(m => m.user_id === user.id);
  const simplifiedDebts = summary.simplified_debts || [];

  return (
    <div className="space-y-6">
      {/* 1. My Net Position */}
      {mySummary && (
        <div className={`p-6 rounded-xl border ${
          mySummary.net_balance > 0 
            ? 'bg-green-50 border-green-200' 
            : mySummary.net_balance < 0 
              ? 'bg-orange-50 border-orange-200'
              : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                mySummary.net_balance > 0 ? 'bg-green-100' : mySummary.net_balance < 0 ? 'bg-orange-100' : 'bg-gray-200'
              }`}>
                <Wallet className={
                  mySummary.net_balance > 0 ? 'text-green-600' : mySummary.net_balance < 0 ? 'text-orange-600' : 'text-gray-600'
                } size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Position</h3>
                <p className="text-sm text-gray-600">
                  {mySummary.net_balance > 0 
                    ? 'You are owed in total' 
                    : mySummary.net_balance < 0 
                      ? 'You owe in total' 
                      : 'You are all settled up'}
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              mySummary.net_balance > 0 ? 'text-green-700' : mySummary.net_balance < 0 ? 'text-orange-700' : 'text-gray-700'
            }`}>
              {mySummary.net_balance === 0 
                ? 'All Settled' 
                : `$${Math.abs(mySummary.net_balance).toFixed(2)}`}
            </div>
          </div>
        </div>
      )}

      {/* 2. Simplified Settlements Graph */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-blue-600" />
              Smart Settlements
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Optimized to minimize the number of transactions
            </p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {simplifiedDebts.length} Transactions
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {simplifiedDebts.length > 0 ? (
            simplifiedDebts.map((debt, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs ring-2 ring-white shadow-sm">
                      {debt.from_user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{debt.from_user_name}</span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pays</span>
                    <ArrowRight size={16} className="text-gray-300" />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs ring-2 ring-white shadow-sm">
                      {debt.to_user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{debt.to_user_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg">
                  <DollarSign size={14} className="text-gray-500" />
                  {debt.amount.toFixed(2)}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle2 size={48} className="mx-auto text-green-100 mb-4" />
              <p className="font-medium">No pending settlements!</p>
              <p className="text-sm">Everyone is all settled up.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
