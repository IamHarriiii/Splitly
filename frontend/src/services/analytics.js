import api from './api';

export const getGroupAnalytics = async (groupId, startDate = null, endDate = null) => {
  let url = `/analytics/groups/${groupId}`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += '?' + params.toString();
  
  const response = await api.get(url);
  return response.data;
};

export const getQuickSummary = async () => {
  const response = await api.get('/analytics/summary');
  return response.data;
};
