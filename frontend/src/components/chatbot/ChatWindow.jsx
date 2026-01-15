import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ExpenseConfirmation from './ExpenseConfirmation';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  pendingExpense, 
  onConfirm, 
  onCancel,
  isLoading 
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, pendingExpense]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} isUser={msg.isUser} />
        ))}
        
        {pendingExpense && (
          <ExpenseConfirmation
            expense={pendingExpense}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <Loader2 size={16} className="text-white animate-spin" />
              </div>
              <div className="bg-gray-200 rounded-lg rounded-tl-none px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (e.g., 'I paid $50 for dinner')"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Try: "I paid $50 for dinner" or "How much did I spend on food?"
        </p>
      </form>
    </div>
  );
}
