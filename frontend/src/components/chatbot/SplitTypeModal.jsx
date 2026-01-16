import { X } from 'lucide-react';

export default function SplitTypeModal({ isOpen, onSelect, onClose }) {
  if (!isOpen) return null;

  const splitTypes = [
    {
      type: 'equal',
      title: 'Split Equally',
      description: 'Divide the amount equally among all participants',
      icon: '⚖️'
    },
    {
      type: 'exact',
      title: 'Exact Amounts',
      description: 'Specify exact amount for each person',
      icon: '💰'
    },
    {
      type: 'percentage',
      title: 'By Percentage',
      description: 'Split by percentage for each person',
      icon: '📊'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">How to Split?</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Choose how you want to split this expense:
        </p>

        <div className="space-y-3 mb-6">
          {splitTypes.map(split => (
            <button
              key={split.type}
              onClick={() => onSelect(split.type)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{split.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{split.title}</p>
                  <p className="text-sm text-gray-500">{split.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
