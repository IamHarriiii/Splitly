import api from './api';

export const getActivityFeed = async (page = 1, limit = 20) => {
  const response = await api.get(`/activity/feed?page=${page}&limit=${limit}`);
  return response.data;
};

export const getGroupActivityFeed = async (groupId, page = 1, limit = 20) => {
  const response = await api.get(`/activity/groups/${groupId}?page=${page}&limit=${limit}`);
  return response.data;
};
