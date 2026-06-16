import { getOrderDatabase } from '../config/orderDb.js';

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${timestamp}-${randomPart}`;
};

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const insertOrderWithRetry = async (connection, orderPayload) => {
  let attempts = 0;

  while (attempts < 3) {
    const orderNumber = generateOrderNumber();

    try {
      const [orderResult] = await connection.execute(
        `
        INSERT INTO orders (
          order_number,
          user_id,
          customer_name,
          customer_phone,
          customer_email,
          customer_city,
          customer_address,
          customer_notes,
          subtotal,
          shipping_cost,
          tax_amount,
          total_amount,
          currency,
          payment_method,
          status,
          whatsapp_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderNumber,
          orderPayload.userId,
          orderPayload.customerName,
          orderPayload.customerPhone,
          orderPayload.customerEmail || null,
          orderPayload.customerCity || null,
          orderPayload.customerAddress,
          orderPayload.customerNotes || null,
          orderPayload.subtotal,
          orderPayload.shippingCost,
          orderPayload.taxAmount,
          orderPayload.totalAmount,
          'EGP',
          'COD',
          'Pending',
          orderPayload.whatsappPhone || null,
        ],
      );

      return {
        orderId: orderResult.insertId,
        orderNumber,
      };
    } catch (error) {
      if (String(error?.code || '').toUpperCase() !== 'ER_DUP_ENTRY') {
        throw error;
      }

      attempts += 1;
    }
  }

  throw new Error('Unable to generate a unique order number.');
};

export const createOrder = async ({ userId = null, customer, items, subtotal }) => {
  const pool = getOrderDatabase();
  const connection = await pool.getConnection();

  const normalizedItems = items.map((item) => ({
    productName: item.productName,
    variantName: item.variantName || null,
    sku: item.sku || null,
    imageUrl: item.imageUrl || null,
    quantity: Number(item.quantity),
    unitPrice: toMoney(item.unitPrice),
    lineTotal: toMoney(item.lineTotal ?? item.unitPrice * item.quantity),
  }));

  const orderPayload = {
    userId,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email || null,
    customerCity: customer.city || null,
    customerAddress: customer.address,
    customerNotes: customer.notes || null,
    subtotal: toMoney(subtotal),
    shippingCost: 0,
    taxAmount: 0,
    totalAmount: toMoney(subtotal),
    whatsappPhone: process.env.WHATSAPP_NUMBER || '',
  };

  try {
    await connection.beginTransaction();

    const { orderId, orderNumber } = await insertOrderWithRetry(connection, orderPayload);

    for (const item of normalizedItems) {
      await connection.execute(
        `
        INSERT INTO order_items (
          order_id,
          product_name,
          variant_name,
          sku,
          image_url,
          quantity,
          unit_price,
          line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.productName,
          item.variantName,
          item.sku,
          item.imageUrl,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
        ],
      );
    }

    await connection.commit();

    return {
      id: orderId,
      orderNumber,
      customer: {
        name: orderPayload.customerName,
        phone: orderPayload.customerPhone,
        email: orderPayload.customerEmail,
        city: orderPayload.customerCity,
        address: orderPayload.customerAddress,
        notes: orderPayload.customerNotes,
      },
      items: normalizedItems,
      subtotal: orderPayload.subtotal,
      totalAmount: orderPayload.totalAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getOrdersForUser = async (userId) => {
  const pool = getOrderDatabase();
  const [orders] = await pool.execute(
    `
    SELECT
      id,
      order_number AS orderNumber,
      customer_name AS customerName,
      customer_phone AS customerPhone,
      customer_email AS customerEmail,
      customer_city AS customerCity,
      customer_address AS customerAddress,
      subtotal,
      shipping_cost AS shippingCost,
      tax_amount AS taxAmount,
      total_amount AS totalAmount,
      status,
      currency,
      payment_method AS paymentMethod,
      created_at AS createdAt
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId],
  );

  return orders;
};
