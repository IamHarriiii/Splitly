export default function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        {Icon && (
          <div className={`${color} opacity-20`}>
            <Icon size={48} />
          </div>
        )}
      </div>
    </div>
  );
}
