import { getDatabase } from '../config/db.js';

const buildActorWhereClause = ({ userId, sessionId }) => {
  if (userId) {
    return {
      clause: 'user_id = ?',
      params: [userId],
    };
  }

  return {
    clause: 'session_id = ?',
    params: [sessionId],
  };
};

export const resolveActor = (req) => {
  const userId = req.user?.id || null;
  const sessionId = String(
    req.headers['x-session-id'] || req.query.session_id || req.body?.session_id || '',
  ).trim();

  if (!userId && !sessionId) {
    return {
      error: {
        statusCode: 400,
        message: 'Guest checkout requires a valid session_id.',
      },
    };
  }

  return {
    userId,
    sessionId: userId ? null : sessionId,
  };
};

export const getCartByActor = async (db, actor) => {
  const { clause, params } = buildActorWhereClause(actor);
  const [rows] = await db.query(`SELECT TOP 1 id, user_id, session_id FROM carts WHERE ${clause}`, params);
  return rows[0] || null;
};

export const getCartItemsForCheckout = async (db, cartId) => {
  const [items] = await db.query(
    `
    SELECT
      ci.id AS cart_item_id,
      ci.quantity,
      pv.id AS variant_id,
      pv.sku,
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

  return items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const priceAtPurchase = Number(item.base_price || 0) + Number(item.price_modifier || 0);

    return {
      cartItemId: item.cart_item_id,
      productId: item.product_id,
      variantId: item.variant_id,
      sku: item.sku,
      productName: item.product_name,
      quantity,
      priceAtPurchase: Number(priceAtPurchase.toFixed(2)),
      lineTotal: Number((priceAtPurchase * quantity).toFixed(2)),
    };
  });
};

export const getDefaultAddressId = async (db, userId) => {
  if (!userId) {
    return null;
  }

  const [rows] = await db.query(
    `
    SELECT TOP 1 id
    FROM addresses
    WHERE user_id = ?
    ORDER BY is_default DESC, id DESC
    `,
    [userId],
  );

  return rows[0]?.id || null;
};

export const insertOrder = async (connection, orderPayload) => {
  const [result] = await connection.query(
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderPayload.orderNumber,
      orderPayload.userId || null,
      orderPayload.shippingAddressId || null,
      orderPayload.subtotal,
      orderPayload.tax,
      orderPayload.shippingCost,
      orderPayload.totalAmount,
      orderPayload.status || 'Pending',
    ],
  );

  return {
    id: result.insertId,
    orderNumber: orderPayload.orderNumber,
  };
};

export const insertOrderItems = async (connection, orderId, items) => {
  for (const item of items) {
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
      [
        orderId,
        item.variantId,
        item.productName,
        item.sku,
        item.quantity,
        item.priceAtPurchase,
      ],
    );
  }
};

export const getOrdersByUserId = async (userId) => {
  const db = getDatabase();

  const [orders] = await db.query(
    `
    SELECT
      id,
      order_number,
      user_id,
      shipping_address_id,
      subtotal,
      tax,
      shipping_cost,
      total_amount,
      status,
      tracking_number,
      created_at,
      updated_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId],
  );

  return orders;
};

export const getOrderItemsByOrderIds = async (orderIds) => {
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return [];
  }

  const db = getDatabase();
  const placeholders = orderIds.map(() => '?').join(', ');
  const [items] = await db.query(
    `
    SELECT
      id,
      order_id,
      variant_id,
      product_name,
      sku,
      quantity,
      price_at_purchase
    FROM order_items
    WHERE order_id IN (${placeholders})
    ORDER BY id ASC
    `,
    orderIds,
  );

  return items;
};
