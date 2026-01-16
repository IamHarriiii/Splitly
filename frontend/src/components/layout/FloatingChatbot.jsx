import { useState } from 'react';
import { Bot, X, Minimize2 } from 'lucide-react';
import ChatWindow from '../chatbot/ChatWindow';
import { sendMessage } from '../../services/chatbot';
import { createExpense } from '../../services/expenses';
import { useAuth } from '../../contexts/AuthContext';
import ParticipantSelectionModal from '../chatbot/ParticipantSelectionModal';
import GroupSelectionModal from '../chatbot/GroupSelectionModal';
import SplitTypeModal from '../chatbot/SplitTypeModal';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function FloatingChatbot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "👋 Hi! I'm your AI expense assistant.\n\nI can help you:\n• Add expenses naturally (e.g., 'I paid $50 for dinner')\n• Answer spending questions (e.g., 'How much did I spend on food?')\n• Track your expenses and debts\n\nWhat would you like to do?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Participant workflow state
  const [participantWorkflow, setParticipantWorkflow] = useState(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [foundUsers, setFoundUsers] = useState([]);
  const [commonGroups, setCommonGroups] = useState([]);

  const handleSendMessage = async (text) => {
    setMessages(prev => [...prev, {
      text,
      isUser: true,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await sendMessage(text);
      
      if (response.success && response.parsed_expense) {
        if (response.parsed_expense.participants && response.parsed_expense.participants.length > 0) {
          await handleParticipantWorkflow(response.parsed_expense);
          return;
        }

        setPendingExpense(response.parsed_expense);
        const message = response.message || "I've parsed your expense. Please review and confirm:";
        setMessages(prev => [...prev, {
          text: message,
          isUser: false,
          timestamp: new Date()
        }]);

      } else if (response.message) {
        setMessages(prev => [...prev, {
          text: response.message,
          isUser: false,
          timestamp: new Date()
        }]);
      } else {
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
      const splits = [{
        user_id: user.id,
        share_amount: parseFloat(pendingExpense.amount),
        share_percentage: null
      }];

      await createExpense({
        amount: parseFloat(pendingExpense.amount),
        description: pendingExpense.description,
        category: pendingExpense.category || 'Other',
        expense_date: pendingExpense.date || new Date().toISOString().split('T')[0],
        group_id: pendingExpense.group_id || null,
        split_type: pendingExpense.split_type || 'equal',
        is_personal: !pendingExpense.group_id,
        paid_by: user.id,
        splits: splits
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

  const handleParticipantWorkflow = async (parsedExpense) => {
    setParticipantWorkflow(parsedExpense);

    try {
      const response = await axios.post('/api/v1/chatbot/search-participants', {
        participant_names: parsedExpense.participants
      });

      if (response.data.users.length === 0) {
        setMessages(prev => [...prev, {
          text: `I couldn't find users named: ${parsedExpense.participants.join(', ')}. Please check the names and try again.`,
          isUser: false,
          timestamp: new Date()
        }]);
        return;
      }

      setFoundUsers(response.data.users);
      setShowParticipantModal(true);

      setMessages(prev => [...prev, {
        text: `Found users for: ${parsedExpense.participants.join(', ')}. Please confirm the participants.`,
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to search participants:', error);
      setMessages(prev => [...prev, {
        text: 'Failed to search for participants. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };

  const handleParticipantsConfirmed = async (participantIds) => {
    setShowParticipantModal(false);

    try {
      const response = await axios.post('/api/v1/chatbot/find-groups', {
        participant_ids: participantIds
      });

      setCommonGroups(response.data.common_groups);
      setParticipantWorkflow(prev => ({ ...prev, participant_ids: participantIds }));
      setShowGroupModal(true);

      setMessages(prev => [...prev, {
        text: response.data.common_groups.length > 0
          ? `Found ${response.data.common_groups.length} common group(s). Please select one.`
          : 'No common groups found. You can create a new group.',
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to find groups:', error);
      setMessages(prev => [...prev, {
        text: 'Failed to find common groups. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };

  const handleGroupSelected = (groupId) => {
    setShowGroupModal(false);
    setParticipantWorkflow(prev => ({ ...prev, group_id: groupId }));
    setShowSplitModal(true);

    setMessages(prev => [...prev, {
      text: 'How would you like to split this expense?',
      isUser: false,
      timestamp: new Date()
    }]);
  };

  const handleSplitTypeSelected = async (splitType) => {
    setShowSplitModal(false);
    setIsLoading(true);

    try {
      await axios.post('/api/v1/chatbot/create-group-expense', {
        amount: participantWorkflow.amount,
        description: participantWorkflow.description,
        category: participantWorkflow.category || 'Other',
        date: participantWorkflow.date || new Date().toISOString().split('T')[0],
        group_id: participantWorkflow.group_id,
        participant_ids: participantWorkflow.participant_ids,
        split_type: splitType
      });

      setMessages(prev => [...prev, {
        text: `✅ Group expense created successfully with ${splitType} split! Anything else I can help with?`,
        isUser: false,
        timestamp: new Date()
      }]);

      setParticipantWorkflow(null);
    } catch (error) {
      console.error('Failed to create group expense:', error);
      setMessages(prev => [...prev, {
        text: '❌ Failed to create group expense. Please try again or add it manually.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewGroup = () => {
    setShowGroupModal(false);
    setMessages(prev => [...prev, {
      text: 'Redirecting you to create a new group...',
      isUser: false,
      timestamp: new Date()
    }]);
    setTimeout(() => {
      setIsOpen(false);
      navigate('/groups');
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
        aria-label="Open AI Assistant"
      >
        <Bot size={28} />
      </button>

      {/* Chatbot Popup */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ 
            transformOrigin: 'bottom right',
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-blue-100">Ask me anything!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Window */}
          <div className="flex-1 overflow-hidden">
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
      )}

      {/* Participant Workflow Modals */}
      <ParticipantSelectionModal
        isOpen={showParticipantModal}
        users={foundUsers}
        onConfirm={handleParticipantsConfirmed}
        onClose={() => setShowParticipantModal(false)}
      />

      <GroupSelectionModal
        isOpen={showGroupModal}
        groups={commonGroups}
        onSelect={handleGroupSelected}
        onClose={() => setShowGroupModal(false)}
        onCreateNew={handleCreateNewGroup}
      />

      <SplitTypeModal
        isOpen={showSplitModal}
        onSelect={handleSplitTypeSelected}
        onClose={() => setShowSplitModal(false)}
      />
    </>
  );
}
