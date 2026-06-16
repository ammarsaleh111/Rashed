import apiClient from './client.js';

export const checkoutCart = async ({ customer, items } = {}) => {
  const response = await apiClient.post(
    '/orders',
    {
      payment_method: 'COD',
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || '',
      customerCity: customer?.city || '',
      customerAddress: customer?.address || '',
      customerNotes: customer?.notes || '',
      items: Array.isArray(items) ? items : [],
    },
  );

  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders/my');
  return response.data;
};
