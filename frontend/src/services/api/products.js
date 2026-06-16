import apiClient from './client.js';

export const getProducts = async (params = {}) => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const getProductBySlug = async (slug) => {
  const response = await apiClient.get(`/products/${slug}`);
  return response.data;
};
