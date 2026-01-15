import api from './api';

export const getExpenses = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await api.get(`/expenses${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

export const createExpense = async (data) => {
  const response = await api.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (expenseId, data) => {
  const response = await api.put(`/expenses/${expenseId}`, data);
  return response.data;
};

export const deleteExpense = async (expenseId) => {
  await api.delete(`/expenses/${expenseId}`);
};

export const getCategories = () => {
  return ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];
};
