const normalizeText = (value) => String(value || '').trim();

const normalizeMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
};

export const validateCreateOrderRequest = (req, res, next) => {
  const body = req.body || {};
  const customerName = normalizeText(body.customerName || body.name);
  const customerPhone = normalizeText(body.customerPhone || body.phone);
  const customerAddress = normalizeText(body.customerAddress || body.address);
  const paymentMethod = normalizeText(body.paymentMethod || body.payment_method || 'COD').toUpperCase();
  const total = normalizeMoney(body.total);

  if (paymentMethod !== 'COD') {
    return res.status(400).json({ success: false, message: 'Only Cash on Delivery (COD) is supported.' });
  }

  if (!customerName || customerName.length < 2) {
    return res.status(400).json({ success: false, message: 'customerName is required.' });
  }

  if (customerPhone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ success: false, message: 'customerPhone is required.' });
  }

  if (!customerAddress || customerAddress.length < 6) {
    return res.status(400).json({ success: false, message: 'customerAddress is required.' });
  }

  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ success: false, message: 'total is required.' });
  }

  req.orderInput = {
    userId: req.user?.id || null,
    sessionId: String(req.headers['x-session-id'] || req.body?.session_id || req.query?.session_id || '').trim(),
    customerName,
    customerPhone,
    customerAddress,
    total,
  };

  return next();
};
