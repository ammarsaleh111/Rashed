import apiClient from './client.js';

export const submitContactMessage = async (payload) => {
  const response = await apiClient.post('/contact/messages', payload);
  return response.data;
};
