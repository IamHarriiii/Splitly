import api from './api';

export const getGroups = async (page = 1, limit = 20) => {
  const response = await api.get(`/groups?page=${page}&limit=${limit}`);
  return response.data;
};

export const getGroupDetails = async (groupId) => {
  const response = await api.get(`/groups/${groupId}`);
  return response.data;
};

export const createGroup = async (data) => {
  const response = await api.post('/groups', data);
  return response.data;
};

export const updateGroup = async (groupId, data) => {
  const response = await api.put(`/groups/${groupId}`, data);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  await api.delete(`/groups/${groupId}`);
};

export const addMember = async (groupId, userId) => {
  const response = await api.post(`/groups/${groupId}/members`, { user_id: userId });
  return response.data;
};

export const removeMember = async (groupId, userId) => {
  await api.delete(`/groups/${groupId}/members/${userId}`);
};

export const searchUsers = async (query) => {
  const response = await api.get(`/users/search?q=${query}`);
  return response.data;
};
