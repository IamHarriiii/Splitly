import api from './api';

export const getDebtSummary = async () => {
  const response = await api.get('/settlements/summary');
  return response.data;
};

export const getGroupDebtSummary = async (groupId) => {
  const response = await api.get(`/debts/groups/${groupId}/summary`);
  return response.data;
};

export const recordSettlement = async (data) => {
  const response = await api.post('/settlements', data);
  return response.data;
};

export const recordPayment = async (data) => {
  const response = await api.post('/settlements/record-payment', data);
  return response.data;
};

export const getSettlementHistory = async () => {
  const response = await api.get('/settlements/history');
  return response.data;
};

export const optimizeDebts = async () => {
  const response = await api.get('/settlements/optimize');
  return response.data;
};

export const getDebtDetails = async (userId) => {
  const response = await api.get(`/settlements/debts/${userId}`);
  return response.data;
};
