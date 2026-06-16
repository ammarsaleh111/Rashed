const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} EGP`;

export const buildOrderConfirmationMessage = (payload) => {
  const orderId = payload?.orderId || payload?.orderNumber || '';
  const customer = payload?.customer || {};
  const customerName = payload?.customerName || customer.name || '';
  const customerPhone = payload?.customerPhone || customer.phone || '';
  const customerAddress = payload?.customerAddress || customer.address || '';
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const total = payload?.totalAmount ?? payload?.total ?? 0;

  const lines = [
    'Order Confirmation',
    '',
    `Order ID: #${orderId}`,
    '',
    'Customer:',
    `Name: ${customerName || ''}`,
    `Phone: ${customerPhone || ''}`,
    '',
    'Address:',
    `${customerAddress || ''}`,
    '',
    'Items:',
    ...(Array.isArray(items)
      ? items.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
          const lineTotal = Number(item.lineTotal ?? unitPrice * quantity);

          return `* ${item.productName || 'Item'} x ${quantity} = ${formatMoney(lineTotal)}`;
        })
      : []),
    '',
    `Total: ${formatMoney(total)}`,
    '',
    'Please confirm this order.',
  ];

  return lines.join('\n');
};

export const buildWhatsAppUrl = (order) => {
  const whatsappNumber = normalizePhoneNumber(process.env.WHATSAPP_NUMBER);
  const message = buildOrderConfirmationMessage(order);
  const encodedMessage = encodeURIComponent(message);

  if (!whatsappNumber) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
};
