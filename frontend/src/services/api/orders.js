import apiClient from './client.js';

export const checkoutCart = async ({ customer = {}, total, sessionId } = {}) => {
  const response = await apiClient.post(
    '/orders',
    {
      paymentMethod: 'COD',
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      customerAddress: customer.address || '',
      total,
    },
    {
      headers: sessionId ? { 'x-session-id': sessionId } : {},
    },
  );

  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders/my');
  return response.data;
};
