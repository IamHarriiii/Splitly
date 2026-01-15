import api from './api';

export const getDashboardData = async (months = 12) => {
  const response = await api.get(`/analytics/dashboard?months=${months}`);
  return response.data;
};

export const getRecentExpenses = async (limit = 10, page = 1) => {
  const response = await api.get(`/expenses?limit=${limit}&page=${page}`);
  return response.data;
};
