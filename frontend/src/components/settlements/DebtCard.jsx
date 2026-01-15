import { User, ArrowRight } from 'lucide-react';

export default function DebtCard({ debt, onSettle }) {
  const isOwed = debt.type === 'owed_to_you';
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-5 border-l-4 hover:shadow-lg transition-shadow ${
      isOwed ? 'border-green-500' : 'border-red-500'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isOwed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <User size={28} className={isOwed ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">
              {isOwed ? 'owes you' : 'you owe'}
            </p>
            <p className="font-semibold text-xl text-gray-900">{debt.user_name}</p>
            {debt.group_name && (
              <p className="text-xs text-gray-500 mt-1">in {debt.group_name}</p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className={`text-3xl font-bold mb-2 ${
            isOwed ? 'text-green-600' : 'text-red-600'
          }`}>
            ${parseFloat(debt.amount).toFixed(2)}
          </p>
          <button
            onClick={() => onSettle(debt)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Settle Up
          </button>
        </div>
      </div>
    </div>
  );
}
