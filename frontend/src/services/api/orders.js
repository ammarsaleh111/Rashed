import apiClient from './client.js';

export const checkoutCart = async ({ sessionId, shippingAddressId, taxRate, shippingCost } = {}) => {
  const response = await apiClient.post(
    '/orders',
    {
      payment_method: 'COD',
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(shippingAddressId ? { shipping_address_id: shippingAddressId } : {}),
      ...(typeof taxRate === 'number' ? { tax_rate: taxRate } : {}),
      ...(typeof shippingCost === 'number' ? { shipping_cost: shippingCost } : {}),
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
