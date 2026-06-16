import { getDatabase } from '../config/db.js';

const MAX_ITEM_QUANTITY = 20;
const MIN_ITEM_QUANTITY = 1;

const buildCartWhereClause = ({ userId, sessionId }) => {
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

const resolveActor = (req) => {
  const userId = req.user?.id || null;
  const sessionId = String(
    req.headers['x-session-id'] || req.query.session_id || req.body?.session_id || '',
  ).trim();

  if (!userId && !sessionId) {
    return {
      error: {
        statusCode: 400,
        message: 'Guest cart operations require a valid session_id.',
      },
    };
  }

  return {
    userId,
    sessionId: userId ? null : sessionId,
  };
};

const getCartByActor = async (db, actor) => {
  const { clause, params } = buildCartWhereClause(actor);
  const [rows] = await db.query(`SELECT TOP 1 id, user_id, session_id FROM carts WHERE ${clause}`, params);
  return rows[0] || null;
};

const getOrCreateCart = async (db, actor) => {
  const existingCart = await getCartByActor(db, actor);

  if (existingCart) {
    return existingCart;
  }

  const [result] = await db.query(
    'INSERT INTO carts (user_id, session_id) OUTPUT INSERTED.id AS insertId VALUES (?, ?)',
    [actor.userId || null, actor.sessionId || null],
  );

  return {
    id: result.insertId,
    user_id: actor.userId || null,
    session_id: actor.sessionId || null,
  };
};

const getCartItemsWithTotals = async (db, cartId) => {
  const [items] = await db.query(
    `
    SELECT
      ci.id AS cart_item_id,
      ci.quantity,
      pv.id AS variant_id,
      pv.sku,
      pv.size,
      pv.color,
      pv.color_hex,
      pv.price_modifier,
      pv.stock_quantity,
      p.id AS product_id,
      p.name,
      p.slug,
      p.base_price,
      COALESCE(
        (
          SELECT TOP 1 pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
        ),
        ''
      ) AS image_url
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id DESC
    `,
    [cartId],
  );

  let subtotal = 0;
  let totalQuantity = 0;

  const formattedItems = items.map((item) => {
    const unitPrice = Number(item.base_price || 0) + Number(item.price_modifier || 0);
    const lineTotal = unitPrice * Number(item.quantity || 0);
    subtotal += lineTotal;
    totalQuantity += Number(item.quantity || 0);

    return {
      id: item.cart_item_id,
      cartItemId: item.cart_item_id,
      variantId: item.variant_id,
      productId: item.product_id,
      slug: item.slug,
      sku: item.sku,
      name: item.name,
      variant: `${item.color || 'Default'} / ${item.size || 'One Size'}`,
      color: item.color,
      colorHex: item.color_hex,
      size: item.size,
      unitPrice,
      lineTotal,
      quantity: Number(item.quantity || 0),
      stockQuantity: Number(item.stock_quantity || 0),
      imageUrl: item.image_url,
    };
  });

  return {
    items: formattedItems,
    subtotal: Number(subtotal.toFixed(2)),
    itemCount: totalQuantity,
  };
};

const buildCartResponse = async (db, cart) => {
  const { items, subtotal, itemCount } = await getCartItemsWithTotals(db, cart.id);

  return {
    id: cart.id,
    userId: cart.user_id,
    sessionId: cart.session_id,
    items,
    itemCount,
    subtotal,
  };
};

const assertQuantity = (quantity) => {
  const parsed = Number(quantity);

  if (!Number.isInteger(parsed) || parsed < MIN_ITEM_QUANTITY || parsed > MAX_ITEM_QUANTITY) {
    const error = new Error(`Quantity must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const getVariant = async (db, variantId) => {
  const [rows] = await db.query('SELECT TOP 1 id, stock_quantity FROM product_variants WHERE id = ?', [variantId]);
  return rows[0] || null;
};

// @desc    Get current cart
// @route   GET /api/cart
// @access  Public (guest via session_id) / Private (JWT)
export const getCart = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          userId: actor.userId,
          sessionId: actor.sessionId,
          items: [],
          itemCount: 0,
          subtotal: 0,
        },
      });
    }

    const payload = await buildCartResponse(db, cart);
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Public (guest via session_id) / Private (JWT)
export const addToCart = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const variantId = Number(req.body.variant_id);
    const quantity = assertQuantity(req.body.quantity ?? 1);

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid variant_id is required.' });
    }

    const db = getDatabase();
    const variant = await getVariant(db, variantId);

    if (!variant) {
      return res.status(404).json({ success: false, message: 'Product variant was not found.' });
    }

    const cart = await getOrCreateCart(db, actor);

    const [existingItems] = await db.query(
      'SELECT TOP 1 id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?',
      [cart.id, variantId],
    );

    const existingItem = existingItems[0] || null;
    const nextQuantity = existingItem ? Number(existingItem.quantity) + quantity : quantity;

    if (variant.stock_quantity < nextQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${variant.stock_quantity} units available for this variant.`,
      });
    }

    if (existingItem) {
      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQuantity, existingItem.id]);
    } else {
      await db.query('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)', [
        cart.id,
        variantId,
        quantity,
      ]);
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:id
// @access  Public (guest via session_id) / Private (JWT)
export const updateCartItem = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const cartItemId = Number(req.params.id);
    const requestedQuantity = Number(req.body.quantity);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid cart item id is required.' });
    }

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0 || requestedQuantity > MAX_ITEM_QUANTITY) {
      return res.status(400).json({
        success: false,
        message: `Quantity must be between 0 and ${MAX_ITEM_QUANTITY}.`,
      });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const [rows] = await db.query(
      `
      SELECT TOP 1 ci.id, ci.quantity, ci.variant_id, pv.stock_quantity
      FROM cart_items ci
      JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.id = ? AND ci.cart_id = ?
      `,
      [cartItemId, cart.id],
    );

    const cartItem = rows[0];

    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (requestedQuantity === 0) {
      await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [cartItemId, cart.id]);
    } else {
      if (requestedQuantity > Number(cartItem.stock_quantity || 0)) {
        return res.status(400).json({
          success: false,
          message: `Only ${cartItem.stock_quantity} units available for this variant.`,
        });
      }

      await db.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?', [
        requestedQuantity,
        cartItemId,
        cart.id,
      ]);
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Cart item updated.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:id
// @access  Public (guest via session_id) / Private (JWT)
export const removeCartItem = async (req, res, next) => {
  try {
    const actor = resolveActor(req);

    if (actor.error) {
      return res.status(actor.error.statusCode).json({ success: false, message: actor.error.message });
    }

    const cartItemId = Number(req.params.id);

    if (!Number.isInteger(cartItemId) || cartItemId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid cart item id is required.' });
    }

    const db = getDatabase();
    const cart = await getCartByActor(db, actor);

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const [result] = await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [cartItemId, cart.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    const payload = await buildCartResponse(db, cart);

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: payload,
    });
  } catch (error) {
    return next(error);
  }
};
