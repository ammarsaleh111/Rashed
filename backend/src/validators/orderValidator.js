const normalizeText = (value) => String(value || '').trim();

const normalizeMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
};

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items)) {
    return null;
  }

  const normalized = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const productName = normalizeText(item.productName || item.name);
    const quantity = Number(item.quantity);
    const unitPrice = normalizeMoney(item.unitPrice);
    const lineTotal = normalizeMoney(item.lineTotal ?? unitPrice * quantity);

    if (!productName || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return null;
    }

    normalized.push({
      productName,
      variantName: normalizeText(item.variantName || item.variant || ''),
      sku: normalizeText(item.sku || ''),
      imageUrl: normalizeText(item.imageUrl || ''),
      quantity,
      unitPrice,
      lineTotal: Number.isFinite(lineTotal) ? lineTotal : Number((unitPrice * quantity).toFixed(2)),
    });
  }

  return normalized;
};

export const validateCreateOrderRequest = (req, res, next) => {
  const body = req.body || {};
  const customerName = normalizeText(body.customerName || body.name);
  const customerPhone = normalizeText(body.customerPhone || body.phone);
  const customerAddress = normalizeText(body.customerAddress || body.address);
  const customerCity = normalizeText(body.customerCity || body.city || '');
  const customerEmail = normalizeText(body.customerEmail || body.email || '');
  const customerNotes = normalizeText(body.customerNotes || body.notes || '');
  const paymentMethod = normalizeText(body.paymentMethod || body.payment_method || 'COD').toUpperCase();
  const items = normalizeOrderItems(body.items);

  if (paymentMethod !== 'COD') {
    return res.status(400).json({ success: false, message: 'Only Cash on Delivery (COD) is supported.' });
  }

  if (!customerName || customerName.length < 2) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }

  if (!customerPhone || customerPhone.length < 7) {
    return res.status(400).json({ success: false, message: 'Customer phone is required.' });
  }

  if (!customerAddress || customerAddress.length < 6) {
    return res.status(400).json({ success: false, message: 'Customer address is required.' });
  }

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: 'At least one order item is required.' });
  }

  if (customerEmail) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(customerEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
  }

  const subtotal = Number(
    items.reduce((sum, item) => sum + Number(item.lineTotal || item.unitPrice * item.quantity), 0).toFixed(2),
  );

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return res.status(400).json({ success: false, message: 'Order total must be greater than zero.' });
  }

  req.orderInput = {
    customerName,
    customerPhone,
    customerAddress,
    customerCity,
    customerEmail,
    customerNotes,
    paymentMethod,
    items,
    subtotal,
  };

  return next();
};
