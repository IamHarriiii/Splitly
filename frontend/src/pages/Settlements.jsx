import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { getDebtSummary, recordPayment } from '../services/settlements';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import DebtCard from '../components/settlements/DebtCard';
import SettleUpModal from '../components/settlements/SettleUpModal';

export default function Settlements() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingDebt, setSettlingDebt] = useState(null);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const data = await getDebtSummary();
      setDebts(data.debts || []);
    } catch (error) {
      console.error('Failed to fetch debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleUp = async (data) => {
    await recordPayment(data);
    setSettlingDebt(null);
    fetchDebts();
  };

  const totalOwed = debts
    .filter(d => d.amount < 0)
    .reduce((sum, d) => sum + Math.abs(d.amount), 0);

  const totalToReceive = debts
    .filter(d => d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0);

  const netBalance = totalToReceive - totalOwed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : debts.length === 0 ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md w-full border-0 shadow-xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">All settled up!</h3>
              <p className="text-gray-600 mb-6">You don't owe anyone, and nobody owes you</p>
              <Button onClick={() => navigate('/expenses')} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Add Expenses
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settlements</h1>
            <p className="text-gray-600 mt-1">Manage your debts and payments</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 bg-gradient-to-br from-red-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-red-100 font-medium">You Owe</p>
                  <TrendingDown className="text-red-200" size={24} />
                </div>
                <p className="text-4xl font-bold">${totalOwed.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-100 font-medium">You're Owed</p>
                  <TrendingUp className="text-green-200" size={24} />
                </div>
                <p className="text-4xl font-bold">${totalToReceive.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className={`border-0 bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-amber-500'} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/90 font-medium">Net Balance</p>
                  <Scale className="text-white/80" size={24} />
                </div>
                <p className="text-4xl font-bold">${Math.abs(netBalance).toFixed(2)}</p>
                <p className="text-sm text-white/80 mt-1">
                  {netBalance >= 0 ? 'in your favor' : 'you owe'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Debts List */}
          <div className="space-y-4">
            {debts.map((debt) => (
              <DebtCard
                key={debt.id || `${debt.other_user_id}-${debt.amount}`}
                debt={debt}
                onSettle={(debt) => setSettlingDebt(debt)}
              />
            ))}
          </div>
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
