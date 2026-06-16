import { getDatabase } from '../config/db.js';

const DEFAULT_TAX_RATE = 0.08;
const DEFAULT_SHIPPING_COST = 12;
const FREE_SHIPPING_THRESHOLD = 100;
const COD_PAYMENT_METHOD = 'COD';

const resolveActor = (req) => {
  const userId = req.user?.id || null;
  const sessionId = String(
    req.headers['x-session-id'] || req.body?.session_id || req.query?.session_id || '',
  ).trim();

  if (!userId && !sessionId) {
    return {
      error: {
        statusCode: 400,
        message: 'Checkout requires authentication or a guest session_id.',
      },
    };
  }

  return {
    userId,
    sessionId: userId ? null : sessionId,
  };
};

const buildCartWhereClause = ({ userId, sessionId }) => {
  if (userId) {
    return { clause: 'user_id = ?', params: [userId] };
  }

  return { clause: 'session_id = ?', params: [sessionId] };
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${timestamp}-${randomPart}`;
};

const fetchCartItems = async (connection, cartId) => {
  const [rows] = await connection.query(
    `
    SELECT
      ci.id AS cart_item_id,
      ci.quantity,
      pv.id AS variant_id,
      pv.sku,
      pv.stock_quantity,
      pv.price_modifier,
      p.id AS product_id,
      p.name AS product_name,
      p.base_price
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id ASC
    `,
    [cartId],
  );

  return rows;
};

export const checkoutCart = async (req, res, next) => {
  const db = getDatabase();
  const actor = resolveActor(req);

  if (actor.error) {
    return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
  }

  const taxRate = Number(req.body?.tax_rate || DEFAULT_TAX_RATE);
  const forceShippingCost = Number(req.body?.shipping_cost);
  const shippingAddressId = req.body?.shipping_address_id ? Number(req.body.shipping_address_id) : null;
  const requestedPaymentMethod = String(req.body?.payment_method || COD_PAYMENT_METHOD)
    .trim()
    .toUpperCase();

  if (requestedPaymentMethod !== COD_PAYMENT_METHOD) {
    return res.status(400).json({
      success: false,
      message: 'Only Cash on Delivery (COD) is supported for checkout.',
    });
  }

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.25) {
    return res.status(400).json({ success: false, message: 'tax_rate must be between 0 and 0.25.' });
  }

  if (shippingAddressId !== null && (!Number.isInteger(shippingAddressId) || shippingAddressId <= 0)) {
    return res.status(400).json({ success: false, message: 'shipping_address_id must be a valid integer.' });
  }

  const where = buildCartWhereClause(actor);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [cartRows] = await connection.query(
      `SELECT TOP 1 id, user_id, session_id FROM carts WHERE ${where.clause}`,
      where.params,
    );

    if (!cartRows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const cart = cartRows[0];
    const cartItems = await fetchCartItems(connection, cart.id);

    if (!cartItems.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty. Add items before checkout.' });
    }

    let subtotal = 0;

    for (const item of cartItems) {
      if (Number(item.stock_quantity) < Number(item.quantity)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product_name}. Available: ${item.stock_quantity}`,
        });
      }

      const unitPrice = Number(item.base_price) + Number(item.price_modifier || 0);
      subtotal += unitPrice * Number(item.quantity);
    }

    subtotal = Number(subtotal.toFixed(2));
    const shippingCost = Number.isFinite(forceShippingCost)
      ? Number(forceShippingCost.toFixed(2))
      : subtotal > FREE_SHIPPING_THRESHOLD
        ? 0
        : DEFAULT_SHIPPING_COST;
    const tax = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = Number((subtotal + shippingCost + tax).toFixed(2));

    let orderNumber = generateOrderNumber();
    let attempts = 0;

    while (attempts < 3) {
      const [existingOrder] = await connection.query('SELECT TOP 1 id FROM orders WHERE order_number = ?', [orderNumber]);
      if (!existingOrder.length) {
        break;
      }
      orderNumber = generateOrderNumber();
      attempts += 1;
    }

    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (
        order_number,
        user_id,
        shipping_address_id,
        subtotal,
        tax,
        shipping_cost,
        total_amount,
        status
      )
      OUTPUT INSERTED.id AS insertId
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [
        orderNumber,
        cart.user_id || null,
        shippingAddressId,
        subtotal,
        tax,
        shippingCost,
        totalAmount,
      ],
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      const unitPrice = Number(item.base_price) + Number(item.price_modifier || 0);

      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          variant_id,
          product_name,
          sku,
          quantity,
          price_at_purchase
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [orderId, item.variant_id, item.product_name, item.sku, item.quantity, unitPrice],
      );

      const [stockUpdateResult] = await connection.query(
        'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?',
        [item.quantity, item.variant_id, item.quantity],
      );

      if (!stockUpdateResult.affectedRows) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock changed during checkout for ${item.product_name}. Please review your cart and retry.`,
        });
      }
    }

    await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully. Payment method: Cash on Delivery.',
      data: {
        order: {
          id: orderId,
          orderNumber,
          status: 'Pending',
          paymentMethod: COD_PAYMENT_METHOD,
          subtotal,
          tax,
          shippingCost,
          totalAmount,
        },
        cart: {
          id: cart.id,
          items: [],
          itemCount: 0,
          subtotal: 0,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const db = getDatabase();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const [orders] = await db.query(
      `
      SELECT
        id,
        order_number,
        subtotal,
        tax,
        shipping_cost,
        total_amount,
        status,
        created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};
