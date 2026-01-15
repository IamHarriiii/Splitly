import api from './api';

export const sendMessage = async (message) => {
  const response = await api.post('/chatbot/parse', { text: message });
  return response.data;
};

export const confirmExpense = async (data) => {
  const response = await api.post('/chatbot/confirm', data);
  return response.data;
};

export const resolveParticipants = async (data) => {
  const response = await api.post('/chatbot/resolve-participants', data);
  return response.data;
};

export const askAnalytics = async (query) => {
  const response = await api.post('/chatbot/analytics', { query });
  return response.data;
};
