import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import ChatWindow from '../chatbot/ChatWindow';
import { sendMessage } from '../../services/chatbot';
import { createExpense } from '../../services/expenses';
import { useAuth } from '../../contexts/AuthContext';
import ParticipantSelectionCard from '../chatbot/ParticipantSelectionCard';
import GroupSelectionCard from '../chatbot/GroupSelectionCard';
import SplitTypeCard from '../chatbot/SplitTypeCard';
import CreateGroupCard from '../chatbot/CreateGroupCard';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { createGroup } from '../../services/groups';

export default function FloatingChatbot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "👋 Hi! I'm your AI expense assistant.\n\nI can help you:\n• Add expenses naturally (e.g., 'I paid $50 for dinner')\n• Split expenses (e.g., 'Split $100 between John and Mary')\n• Answer spending questions\n\nWhat would you like to do?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Participant workflow state
  const [participantWorkflow, setParticipantWorkflow] = useState(null);
  const [showParticipantCard, setShowParticipantCard] = useState(false);
  const [showGroupCard, setShowGroupCard] = useState(false);
  const [showSplitCard, setShowSplitCard] = useState(false);
  const [showCreateGroupCard, setShowCreateGroupCard] = useState(false);
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
          text: "I'm not sure I understood that. Could you rephrase? Try saying something like 'I paid $50 for dinner' or 'Split $100 between John and Mary'",
          isUser: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error. Please try again.",
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
        text: "❌ Failed to create expense. Please try again.",
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
    setIsLoading(true);

    try {
      const response = await api.post('/chatbot/search-participants', {
        participant_names: parsedExpense.participants
      });

      if (response.data.users.length === 0) {
        setMessages(prev => [...prev, {
          text: `I couldn't find users named: ${parsedExpense.participants.join(', ')}. Please check the names and try again.`,
          isUser: false,
          timestamp: new Date()
        }]);
        setIsLoading(false);
        return;
      }

      setFoundUsers(response.data.users);
      setShowParticipantCard(true);

      setMessages(prev => [...prev, {
        text: `Found users for: ${parsedExpense.participants.join(', ')}. Please select the correct ones below:`,
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleParticipantsConfirmed = async (participantIds) => {
    setShowParticipantCard(false);
    setIsLoading(true);

    try {
      const response = await api.post('/chatbot/find-groups', {
        participant_ids: participantIds
      });

      setCommonGroups(response.data.common_groups);
      setParticipantWorkflow(prev => ({ ...prev, participant_ids: participantIds }));
      setShowGroupCard(true);

      setMessages(prev => [...prev, {
        text: response.data.common_groups.length > 0
          ? `Great! Found ${response.data.common_groups.length} group(s). Select one below:`
          : 'No common groups found. You can create a new group:',
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupSelected = (groupId) => {
    setShowGroupCard(false);
    setParticipantWorkflow(prev => ({ ...prev, group_id: groupId }));
    setShowSplitCard(true);

    setMessages(prev => [...prev, {
      text: 'How would you like to split this expense?',
      isUser: false,
      timestamp: new Date()
    }]);
  };

  const handleSplitTypeSelected = async (splitType) => {
    setShowSplitCard(false);
    setIsLoading(true);

    try {
      await api.post('/chatbot/create-group-expense', {
        amount: participantWorkflow.amount,
        description: participantWorkflow.description,
        category: participantWorkflow.category || 'Other',
        date: participantWorkflow.date || new Date().toISOString().split('T')[0],
        group_id: participantWorkflow.group_id,
        participant_ids: participantWorkflow.participant_ids,
        split_type: splitType
      });

      setMessages(prev => [...prev, {
        text: `✅ Group expense created successfully with ${splitType} split! Anything else?`,
        isUser: false,
        timestamp: new Date()
      }]);

      setParticipantWorkflow(null);
    } catch (error) {
      console.error('Failed to create group expense:', error);
      setMessages(prev => [...prev, {
        text: '❌ Failed to create group expense. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewGroup = () => {
    setShowGroupCard(false);
    setShowCreateGroupCard(true);
    setMessages(prev => [...prev, {
      text: 'Fill in the details to create a new group:',
      isUser: false,
      timestamp: new Date()
    }]);
  };

  const handleGroupCreated = async (groupData) => {
    setShowCreateGroupCard(false);
    setIsLoading(true);

    try {
      const newGroup = await createGroup(groupData);

      setMessages(prev => [...prev, {
        text: `✅ Group "${groupData.name}" created! Now select split type:`,
        isUser: false,
        timestamp: new Date()
      }]);

      // Set the new group and proceed to split type selection
      setParticipantWorkflow(prev => ({ ...prev, group_id: newGroup.id }));
      setShowSplitCard(true);
    } catch (error) {
      console.error('Failed to create group:', error);
      setMessages(prev => [...prev, {
        text: '❌ Failed to create group. Please try again.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelWorkflow = () => {
    setShowParticipantCard(false);
    setShowGroupCard(false);
    setShowSplitCard(false);
    setShowCreateGroupCard(false);
    setParticipantWorkflow(null);
    setMessages(prev => [...prev, {
      text: 'Cancelled. What else can I help you with?',
      isUser: false,
      timestamp: new Date()
    }]);
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
          style={{ transformOrigin: 'bottom right' }}
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
              participantCard={showParticipantCard && (
                <ParticipantSelectionCard
                  users={foundUsers}
                  onConfirm={handleParticipantsConfirmed}
                  onCancel={cancelWorkflow}
                />
              )}
              groupCard={showGroupCard && (
                <GroupSelectionCard
                  groups={commonGroups}
                  onSelect={handleGroupSelected}
                  onCancel={cancelWorkflow}
                  onCreateNew={handleCreateNewGroup}
                />
              )}
              splitCard={showSplitCard && (
                <SplitTypeCard
                  onSelect={handleSplitTypeSelected}
                  onCancel={cancelWorkflow}
                />
              )}
              createGroupCard={showCreateGroupCard && (
                <CreateGroupCard
                  onSubmit={handleGroupCreated}
                  onCancel={cancelWorkflow}
                />
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}

