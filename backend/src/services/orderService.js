import { getDatabase } from '../config/db.js';
import {
  getCartByActor,
  getCartItemsForCheckout,
  getDefaultAddressId,
  getOrderItemsByOrderIds,
  getOrdersByUserId,
  insertOrder,
  insertOrderItems,
  resolveActor,
} from '../models/orderModel.js';

const UNIQUE_VIOLATION_CODES = new Set([2601, 2627]);

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizeText = (value) => String(value || '').trim();

const isDuplicateOrderNumberError = (error) => {
  const number = Number(error?.number || error?.originalError?.number || error?.originalError?.info?.number);
  return UNIQUE_VIOLATION_CODES.has(number);
};

const generateOrderNumber = () => {
  const timeFragment = Date.now().toString().slice(-6);
  const randomFragment = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timeFragment}-${randomFragment}`;
};

const getCurrentCart = async ({ actor }) => {
  const db = getDatabase();
  const cart = await getCartByActor(db, actor);

  if (!cart) {
    return null;
  }

  const items = await getCartItemsForCheckout(db, cart.id);

  return {
    ...cart,
    items,
  };
};

export const createCashOnDeliveryOrder = async ({
  actor,
  customerName,
  customerPhone,
  customerAddress,
  total,
}) => {
  const db = getDatabase();
  const connection = await db.getConnection();
  const resolvedActor = actor || {};
  const cart = await getCurrentCart({ actor: resolvedActor });

  if (!cart || !cart.items.length) {
    const error = new Error('Cart is empty. Add items before checkout.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedItems = cart.items;
  const subtotal = toMoney(
    normalizedItems.reduce((sum, item) => sum + Number(item.lineTotal || item.priceAtPurchase * item.quantity), 0),
  );
  const clientTotal = Number(total);

  if (Number.isFinite(clientTotal) && Math.abs(clientTotal - subtotal) > 0.01) {
    const error = new Error('Total does not match cart subtotal.');
    error.statusCode = 400;
    throw error;
  }

  const shippingAddressId = await getDefaultAddressId(db, resolvedActor.userId);
  const tax = 0;
  const shippingCost = 0;
  const totalAmount = subtotal;

  try {
    await connection.beginTransaction();

    let insertedOrder = null;

    for (let attempt = 0; attempt < 5 && !insertedOrder; attempt += 1) {
      const orderNumber = generateOrderNumber();

      try {
        insertedOrder = await insertOrder(connection, {
          orderNumber,
          userId: resolvedActor.userId,
          shippingAddressId,
          subtotal,
          tax,
          shippingCost,
          totalAmount,
          status: 'Pending',
        });
      } catch (error) {
        if (!isDuplicateOrderNumberError(error)) {
          throw error;
        }
      }
    }

    if (!insertedOrder) {
      throw new Error('Unable to generate a unique order number.');
    }

    await insertOrderItems(connection, insertedOrder.id, normalizedItems);
    await connection.commit();

    return {
      id: insertedOrder.id,
      orderNumber: insertedOrder.orderNumber,
      customerName: normalizeText(customerName),
      customerPhone: normalizeText(customerPhone),
      customerAddress: normalizeText(customerAddress),
      subtotal,
      tax,
      shippingCost,
      totalAmount,
      status: 'Pending',
      items: normalizedItems,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getMyOrders = async (userId) => {
  if (!userId) {
    return [];
  }

  const orders = await getOrdersByUserId(userId);

  if (!orders.length) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const items = await getOrderItemsByOrderIds(orderIds);
  const itemsByOrderId = items.reduce((accumulator, item) => {
    if (!accumulator[item.order_id]) {
      accumulator[item.order_id] = [];
    }

    accumulator[item.order_id].push(item);
    return accumulator;
  }, {});

  return orders.map((order) => ({
    ...order,
    items: itemsByOrderId[order.id] || [],
  }));
};

export const getCurrentCartForActor = async (req) => {
  const actor = resolveActor(req);

  if (actor.error) {
    const error = new Error(actor.error.message);
    error.statusCode = actor.error.statusCode;
    throw error;
  }

  return getCurrentCart({ actor });
};
