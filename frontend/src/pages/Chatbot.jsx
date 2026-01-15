import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import ChatWindow from '../components/chatbot/ChatWindow';
import { sendMessage, confirmExpense } from '../services/chatbot';
import { createExpense } from '../services/expenses';

export default function Chatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      text: "👋 Hi! I'm your AI expense assistant.\n\nI can help you:\n• Add expenses naturally (e.g., 'I paid $50 for dinner')\n• Answer spending questions (e.g., 'How much did I spend on food?')\n• Track your expenses and debts\n\nWhat would you like to do?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text) => {
    // Add user message
    setMessages(prev => [...prev, {
      text,
      isUser: true,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await sendMessage(text);
      
      if (response.intent === 'CREATE_EXPENSE' && response.parsed_expense) {
        // Expense detected
        setPendingExpense(response.parsed_expense);
        setMessages(prev => [...prev, {
          text: "I found an expense! Please review the details below and confirm:",
          isUser: false,
          timestamp: new Date()
        }]);
      } else if (response.intent === 'QUERY_ANALYTICS' || response.intent === 'QUERY_EXPENSES' || response.intent === 'QUERY_DEBTS') {
        // Analytics query
        setMessages(prev => [...prev, {
          text: response.response || response.message || "I found some information for you.",
          isUser: false,
          timestamp: new Date()
        }]);
      } else if (response.message) {
        // General response
        setMessages(prev => [...prev, {
          text: response.message,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
        // Fallback
        setMessages(prev => [...prev, {
          text: "I'm not sure I understood that. Could you rephrase? Try saying something like 'I paid $50 for dinner' or 'How much did I spend this month?'",
          isUser: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error. Please try again or rephrase your message.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingExpense) return;

    setIsLoading(true);
    try {
      // Create the expense using the expenses service
      await createExpense({
        amount: parseFloat(pendingExpense.amount),
        description: pendingExpense.description,
        category: pendingExpense.category || 'Other',
        expense_date: pendingExpense.date || new Date().toISOString().split('T')[0],
        group_id: pendingExpense.group_id || null,
        split_type: pendingExpense.split_type || 'equal',
        is_personal: !pendingExpense.group_id
      });

      setMessages(prev => [...prev, {
        text: "✅ Expense created successfully! Anything else I can help with?",
        isUser: false,
        timestamp: new Date()
      }]);
      setPendingExpense(null);
    } catch (error) {
      console.error('Failed to create expense:', error);
      setMessages(prev => [...prev, {
        text: "❌ Failed to create expense. Please try again or add it manually from the Expenses page.",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingExpense(null);
    setMessages(prev => [...prev, {
      text: "Expense cancelled. What else can I help you with?",
      isUser: false,
      timestamp: new Date()
    }]);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2 ml-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Sparkles size={12} />
                    Powered by AI
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 overflow-hidden">
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          pendingExpense={pendingExpense}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
