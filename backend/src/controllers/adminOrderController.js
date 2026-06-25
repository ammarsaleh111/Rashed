import { getDatabase } from '../config/db.js';

const ALLOWED_ORDER_STATUSES = new Set(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'pending') {
    return 'Pending';
  }

  if (normalized === 'processing') {
    return 'Processing';
  }

  if (normalized === 'shipped') {
    return 'Shipped';
  }

  if (normalized === 'delivered') {
    return 'Delivered';
  }

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'Cancelled';
  }

  return '';
};

export const getAdminOrders = async (request, response, next) => {
  try {
    const db = getDatabase();
    const page = Math.max(1, Number.parseInt(request.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit || '25', 10) || 25));
    const offset = (page - 1) * limit;

    const search = String(request.query.search || '').trim();
    const normalizedStatus = normalizeStatus(request.query.status);

    let whereClause = 'WHERE 1=1';
    const whereParams = [];

    if (normalizedStatus) {
      whereClause += ' AND o.status = ?';
      whereParams.push(normalizedStatus);
    }

    if (search) {
      whereClause += " AND (o.order_number ILIKE ? OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE ? OR u.email ILIKE ?)";
      const token = `%${search}%`;
      whereParams.push(token, token, token);
    }

    const [countRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${whereClause}
      `,
      whereParams,
    );

    const [rows] = await db.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Guest Checkout') AS customer_name,
        COALESCE(u.email, 'Guest') AS customer_email,
        o.subtotal,
        o.tax,
        o.shipping_cost,
        o.total_amount,
        o.status,
        o.tracking_number,
        o.created_at,
        o.updated_at,
        COUNT(oi.id) AS item_count,
        COALESCE(SUM(oi.quantity), 0) AS total_units
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereClause}
      GROUP BY
        o.id,
        o.order_number,
        o.user_id,
        u.first_name,
        u.last_name,
        u.email,
        o.subtotal,
        o.tax,
        o.shipping_cost,
        o.total_amount,
        o.status,
        o.tracking_number,
        o.created_at,
        o.updated_at
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...whereParams, limit, offset],
    );

    return response.status(200).json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        subtotal: Number(row.subtotal || 0),
        tax: Number(row.tax || 0),
        shippingCost: Number(row.shipping_cost || 0),
        totalAmount: Number(row.total_amount || 0),
        status: row.status,
        trackingNumber: row.tracking_number,
        itemCount: Number(row.item_count || 0),
        totalUnits: Number(row.total_units || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      meta: {
        page,
        limit,
        totalCount: Number(countRows[0]?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOrderById = async (request, response, next) => {
  try {
    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw createHttpError(400, 'Order id must be a valid positive integer.');
    }

    const db = getDatabase();

    const [orders] = await db.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Guest Checkout') AS customer_name,
        COALESCE(u.email, 'Guest') AS customer_email,
        o.subtotal,
        o.tax,
        o.shipping_cost,
        o.total_amount,
        o.status,
        o.tracking_number,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId],
    );

    if (!orders.length) {
      throw createHttpError(404, 'Order not found.');
    }

    const [items] = await db.query(
      `
      SELECT
        oi.id,
        oi.product_name,
        oi.sku,
        oi.quantity,
        oi.price_at_purchase,
        oi.variant_id,
        pv.size,
        pv.color,
        pv.color_hex
      FROM order_items oi
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [orderId],
    );

    const order = orders[0];

    return response.status(200).json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        subtotal: Number(order.subtotal || 0),
        tax: Number(order.tax || 0),
        shippingCost: Number(order.shipping_cost || 0),
        totalAmount: Number(order.total_amount || 0),
        status: order.status,
        trackingNumber: order.tracking_number,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: items.map((item) => ({
          id: item.id,
          productName: item.product_name,
          sku: item.sku,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.price_at_purchase || 0),
          lineTotal: Number((Number(item.quantity || 0) * Number(item.price_at_purchase || 0)).toFixed(2)),
          variantId: item.variant_id,
          size: item.size,
          color: item.color,
          colorHex: item.color_hex,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminOrderStatus = async (request, response, next) => {
  try {
    const orderId = Number(request.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw createHttpError(400, 'Order id must be a valid positive integer.');
    }

    const nextStatus = normalizeStatus(request.body.status);

    if (!ALLOWED_ORDER_STATUSES.has(nextStatus)) {
      throw createHttpError(400, 'Invalid status. Allowed: Pending, Processing, Shipped, Delivered, Cancelled.');
    }

    const trackingNumber = request.body.tracking_number
      ? String(request.body.tracking_number).trim().slice(0, 100)
      : null;

    const db = getDatabase();
    const [result] = await db.query(
      `
      UPDATE orders
      SET status = ?, tracking_number = ?, updated_at = now()
      WHERE id = ?
      `,
      [nextStatus, trackingNumber, orderId],
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Order not found.');
    }

    const [rows] = await db.query(
      'SELECT id, order_number, status, tracking_number, updated_at FROM orders WHERE id = ? LIMIT 1',
      [orderId],
    );

    return response.status(200).json({
      success: true,
      message: 'Order status updated successfully.',
      data: {
        id: rows[0].id,
        orderNumber: rows[0].order_number,
        status: rows[0].status,
        trackingNumber: rows[0].tracking_number,
        updatedAt: rows[0].updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};