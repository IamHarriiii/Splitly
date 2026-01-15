export default function RecentTransactions({ expenses = [] }) {
  // Ensure expenses is an array
  const expensesList = Array.isArray(expenses) ? expenses : [];

  if (expensesList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <p className="text-gray-500 text-center py-8">No recent transactions</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
      <div className="space-y-3">
        {expensesList.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{expense.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {expense.category}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(expense.date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900">${parseFloat(expense.amount).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
