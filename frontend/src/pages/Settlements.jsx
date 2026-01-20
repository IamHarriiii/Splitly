import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, TrendingUp, TrendingDown, CheckCircle, ArrowRight, User } from 'lucide-react';
import { getMySimplifiedDebts, recordPayment } from '../services/settlements';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import SettleUpModal from '../components/settlements/SettleUpModal';
import SettlementHistory from '../components/settlements/SettlementHistory';

export default function Settlements() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settlingDebt, setSettlingDebt] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getMySimplifiedDebts();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch simplified debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleUp = async (paymentData) => {
    await recordPayment(paymentData);
    setSettlingDebt(null);
    fetchData();
  };

  const handleSettleClick = (debt, type) => {
    // Build debt object for modal
    if (type === 'pay') {
      setSettlingDebt({
        group_id: debt.group_id,
        other_user_id: debt.to_user_id,
        user_name: debt.to_user_name,
        group_name: debt.group_name,
        amount: debt.amount,
        type: 'you_owe'
      });
    } else {
      // For receiving, we show info but can't force others to pay
      setSettlingDebt({
        group_id: debt.group_id,
        other_user_id: debt.from_user_id,
        user_name: debt.from_user_name,
        group_name: debt.group_name,
        amount: debt.amount,
        type: 'owed_to_you'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isSettled = data?.status === 'settled';
  const debtsToPayCount = data?.debts_to_pay?.length || 0;
  const debtsToReceiveCount = data?.debts_to_receive?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {isSettled ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full border-0 shadow-xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All settled up!</h3>
              <p className="text-gray-600 mb-6">You don't owe anyone, and nobody owes you</p>
              <Button onClick={() => navigate('/expenses')}>
                Add Expenses
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settlements</h1>
              <p className="text-gray-600 mt-1">Smart simplified debts you need to resolve</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 bg-gradient-to-br from-red-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-red-100 font-medium">You Owe</p>
                  <TrendingDown className="text-red-200" size={24} />
                </div>
                  <p className="text-4xl font-bold">${(data?.total_i_owe || 0).toFixed(2)}</p>
                  <p className="text-sm text-red-100 mt-1">{debtsToPayCount} payment{debtsToPayCount !== 1 ? 's' : ''} to make</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 font-medium">You're Owed</p>
                  <TrendingUp className="text-green-200" size={24} />
                </div>
                  <p className="text-4xl font-bold">${(data?.total_owed_to_me || 0).toFixed(2)}</p>
                  <p className="text-sm text-green-100 mt-1">{debtsToReceiveCount} payment{debtsToReceiveCount !== 1 ? 's' : ''} incoming</p>
              </CardContent>
            </Card>

              <Card className={`border-0 bg-gradient-to-br ${(data?.net_balance || 0) >= 0 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-amber-500'} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/90 font-medium">Net Balance</p>
                  <Scale className="text-white/80" size={24} />
                </div>
                  <p className="text-4xl font-bold">${Math.abs(data?.net_balance || 0).toFixed(2)}</p>
                <p className="text-sm text-white/80 mt-1">
                    {(data?.net_balance || 0) >= 0 ? 'in your favor' : 'you owe'}
                </p>
              </CardContent>
            </Card>
          </div>

            {/* Debts You Need to Pay */}
            {debtsToPayCount > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingDown size={20} />
                    Payments You Need to Make ({debtsToPayCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.debts_to_pay.map((debt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                          <User size={24} className="text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">You</span>
                            <ArrowRight size={16} className="text-red-500" />
                            <span className="font-medium text-gray-900">{debt.to_user_name}</span>
                          </div>
                          <p className="text-sm text-gray-500">in {debt.group_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">${debt.amount.toFixed(2)}</p>
                        <button
                          onClick={() => handleSettleClick(debt, 'pay')}
                          className="mt-1 px-4 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Pay Now
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Debts Others Owe You */}
            {debtsToReceiveCount > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp size={20} />
                    Payments Coming to You ({debtsToReceiveCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.debts_to_receive.map((debt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <User size={24} className="text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{debt.from_user_name}</span>
                            <ArrowRight size={16} className="text-green-500" />
                            <span className="font-medium text-gray-900">You</span>
                          </div>
                          <p className="text-sm text-gray-500">in {debt.group_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">${debt.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">Waiting for payment</p>
                      </div>
                  </div>
                ))}
                </CardContent>
              </Card>
            )}

            {/* Settlement History */}
            <SettlementHistory />
        </div>
      )}

      <SettleUpModal
        isOpen={!!settlingDebt}
        debt={settlingDebt}
        onClose={() => setSettlingDebt(null)}
        onSubmit={handleSettleUp}
      />
    </div>
  );
}
