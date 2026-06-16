import apiClient from './client.js';

export const getHealthStatus = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

