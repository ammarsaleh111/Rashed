const DEFAULT_COUNTRY_CODE = '20';

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('0')) {
    return `${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return digits;
};

const formatCurrency = (value) => `${Number(value || 0).toFixed(2)} EGP`;

export const buildOrderConfirmationMessage = ({ orderNumber, customer, items, totalAmount }) => {
  const lines = [
    'Order Confirmation',
    '',
    `Order ID: #${orderNumber}`,
    '',
    'Customer:',
    `Name: ${customer?.name || ''}`,
    `Phone: ${customer?.phone || ''}`,
    '',
    'Address:',
    `${customer?.address || ''}`,
    '',
    'Items:',
    ...(Array.isArray(items)
      ? items.map((item) => {
          const quantity = Number(item.quantity || 0);
          const lineTotal = Number(item.lineTotal || Number(item.unitPrice || 0) * quantity);
          return `- ${item.productName} x ${quantity} = ${formatCurrency(lineTotal)}`;
        })
      : []),
    '',
    `Total: ${formatCurrency(totalAmount)}`,
    '',
    'Please confirm this order.',
  ];

  return lines.join('\n');
};

export const buildWhatsAppUrl = ({ orderNumber, customer, items, totalAmount }) => {
  const whatsappNumber = normalizePhoneNumber(process.env.WHATSAPP_NUMBER);
  const message = buildOrderConfirmationMessage({ orderNumber, customer, items, totalAmount });

  if (!whatsappNumber) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};
