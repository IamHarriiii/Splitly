import { Split, Percent, Calculator } from 'lucide-react';

export default function SplitTypeCard({ onSelect, onCancel }) {
  const splitTypes = [
    { 
      type: 'equal', 
      label: 'Equal Split', 
      description: 'Split equally among all',
      icon: Split,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      type: 'percentage', 
      label: 'Percentage', 
      description: 'Custom percentages',
      icon: Percent,
      color: 'from-blue-500 to-indigo-500'
    },
    { 
      type: 'exact', 
      label: 'Exact Amounts', 
      description: 'Specific amount per person',
      icon: Calculator,
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Split size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">Split Type</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        How would you like to split this expense?
      </p>

      <div className="space-y-2 mb-4">
        {splitTypes.map(({ type, label, description, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
              <Icon size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
      >
        Cancel
      </button>
    </div>
  );
}
