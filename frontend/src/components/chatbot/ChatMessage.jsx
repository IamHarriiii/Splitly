import { User, Bot } from 'lucide-react';

export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-600' : 'bg-gray-600'
        }`}>
          {isUser ? (
            <User size={16} className="text-white" />
          ) : (
            <Bot size={16} className="text-white" />
          )}
        </div>

        {/* Message Bubble */}
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-gray-200 text-gray-900 rounded-tl-none'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
