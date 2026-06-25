import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../sql/schema.sql');

const openPool = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  client.release();
  return pool;
};

const executeQuery = async (pool, queryText, params = []) => {
  let index = 0;
  const normalizedQuery = String(queryText).replace(/\?/g, () => `$${++index}`);

  const result = await pool.query(normalizedQuery, params);
  const rows = result.rows || [];
  const rowCount = result.rowCount || 0;

  result.affectedRows = rowCount;

  let payload = rows;
  const statementType = String(queryText).trim().split(/\s+/, 1)[0]?.toUpperCase();
  const firstRow = rows[0];
  const hasInsertIdRow =
    rows.length === 1 &&
    firstRow &&
    Object.prototype.hasOwnProperty.call(firstRow, 'insertId');

  if (hasInsertIdRow) {
    result.insertId = firstRow.insertId;
    payload = { insertId: firstRow.insertId, affectedRows: rowCount };
  } else if (!rows.length && statementType !== 'SELECT') {
    payload = { affectedRows: rowCount };
  }

  return [payload, result];
};

const createQueryRunner = (pool) => ({
  query: (queryText, params) => executeQuery(pool, queryText, params),
  execute: (queryText, params) => executeQuery(pool, queryText, params),
});

const parseSqlStatements = (schema) => {
  return schema
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
};

const validateEnvironment = () => {
  const requiredVariables = [
    'DATABASE_URL',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'ADMIN_FIRST_NAME',
    'ADMIN_LAST_NAME',
  ];

  const missingVariables = requiredVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }
};

// ── Seed data (identical to original) ────────────────────────────────────────

const catalogSeed = [
  {
    category: {
      name: 'Football T-shirts',
      slug: 'football-jerseys',
      description: 'Match and training T-shirts for football players and fans.',
    },
    product: {
      name: 'Elite Match T-shirt',
      slug: 'elite-match-jersey',
      description: 'Lightweight football T-shirt with breathable match-day comfort.',
      materialsCare: 'Recycled polyester performance knit. Machine wash cold.',
      basePrice: 79.0,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-JER-ELT-S-BLK', size: 'S', color: 'Black', colorHex: '#141414', priceModifier: 0, stockQuantity: 40 },
        { sku: 'RSH-JER-ELT-M-BLK', size: 'M', color: 'Black', colorHex: '#141414', priceModifier: 0, stockQuantity: 45 },
        { sku: 'RSH-JER-ELT-L-BLK', size: 'L', color: 'Black', colorHex: '#141414', priceModifier: 0, stockQuantity: 38 },
      ],
    },
  },
  {
    category: {
      name: 'Football Boots',
      slug: 'football-boots',
      description: 'Studded football boots for speed, control, and traction.',
    },
    product: {
      name: 'Speed Control Boots',
      slug: 'speed-control-boots',
      description: 'Firm-ground football boots with a light upper and grippy soleplate.',
      materialsCare: 'Synthetic upper. Wipe clean after play.',
      basePrice: 149.0,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-BOT-SPD-41-BLK', size: '41', color: 'Black', colorHex: '#1c1c1c', priceModifier: 0, stockQuantity: 35 },
        { sku: 'RSH-BOT-SPD-42-BLK', size: '42', color: 'Black', colorHex: '#1c1c1c', priceModifier: 0, stockQuantity: 34 },
        { sku: 'RSH-BOT-SPD-43-BLK', size: '43', color: 'Black', colorHex: '#1c1c1c', priceModifier: 0, stockQuantity: 22 },
      ],
    },
  },
  {
    category: {
      name: 'Football Shorts',
      slug: 'football-shorts',
      description: 'Light football shorts for training and match days.',
    },
    product: {
      name: 'Pro Training Shorts',
      slug: 'pro-training-shorts',
      description: 'Breathable football shorts with a clean athletic fit.',
      materialsCare: 'Lightweight polyester. Tumble dry low.',
      basePrice: 45.0,
      isFeatured: false,
      images: [
        'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-SHO-PRO-S-BLU', size: 'S', color: 'Blue', colorHex: '#2563eb', priceModifier: 0, stockQuantity: 50 },
        { sku: 'RSH-SHO-PRO-M-BLU', size: 'M', color: 'Blue', colorHex: '#2563eb', priceModifier: 0, stockQuantity: 52 },
        { sku: 'RSH-SHO-PRO-L-BLU', size: 'L', color: 'Blue', colorHex: '#2563eb', priceModifier: 0, stockQuantity: 47 },
      ],
    },
  },
  {
    category: {
      name: 'Football Balls',
      slug: 'football-balls',
      description: 'Training and match balls for every pitch.',
    },
    product: {
      name: 'Pro Match Ball',
      slug: 'pro-match-ball',
      description: 'Durable football with stable flight and responsive touch.',
      materialsCare: 'PU cover. Inflate to recommended pressure.',
      basePrice: 49.0,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-BAL-PRO-5-WHT', size: '5', color: 'White', colorHex: '#f8fafc', priceModifier: 0,  stockQuantity: 30 },
        { sku: 'RSH-BAL-PRO-4-WHT', size: '4', color: 'White', colorHex: '#f8fafc', priceModifier: -4, stockQuantity: 24 },
        { sku: 'RSH-BAL-PRO-5-VLT', size: '5', color: 'Volt',  colorHex: '#39ff14', priceModifier: 3,  stockQuantity: 18 },
      ],
    },
  },
  {
    category: {
      name: 'Goalkeeper Gloves',
      slug: 'goalkeeper-gloves',
      description: 'Goalkeeper gloves for grip, protection, and confidence.',
    },
    product: {
      name: 'Grip Shield Gloves',
      slug: 'grip-shield-gloves',
      description: 'Football goalkeeper gloves with padded palm grip and wrist support.',
      materialsCare: 'Latex palm. Air dry after use.',
      basePrice: 69.0,
      isFeatured: false,
      images: [
        'https://images.unsplash.com/photo-1600679472829-3044539ce8ed?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-GLV-GRP-8-RED',  size: '8',  color: 'Red', colorHex: '#dc2626', priceModifier: 0, stockQuantity: 30 },
        { sku: 'RSH-GLV-GRP-9-RED',  size: '9',  color: 'Red', colorHex: '#dc2626', priceModifier: 0, stockQuantity: 32 },
        { sku: 'RSH-GLV-GRP-10-RED', size: '10', color: 'Red', colorHex: '#dc2626', priceModifier: 0, stockQuantity: 26 },
      ],
    },
  },
  {
    category: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Football accessories, shin guards, bags, and training extras.',
    },
    product: {
      name: 'Carbon Shin Guards',
      slug: 'carbon-shin-guards',
      description: 'Lightweight shin guards with a secure sleeve fit.',
      materialsCare: 'Wipe clean. Store dry.',
      basePrice: 32.0,
      isFeatured: true,
      images: [
        'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80',
      ],
      variants: [
        { sku: 'RSH-SHG-CBN-S-BLK', size: 'S', color: 'Black', colorHex: '#111827', priceModifier: 0, stockQuantity: 28 },
        { sku: 'RSH-SHG-CBN-M-BLK', size: 'M', color: 'Black', colorHex: '#111827', priceModifier: 0, stockQuantity: 31 },
        { sku: 'RSH-SHG-CBN-L-BLK', size: 'L', color: 'Black', colorHex: '#111827', priceModifier: 0, stockQuantity: 20 },
      ],
    },
  },
];

const DEMO_CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || 'Customer123!';

const demoCustomersSeed = [
  { email: 'nora.hale@demo.rashed.com',  firstName: 'Nora',  lastName: 'Hale',   phoneNumber: '+1-202-555-0101', rewardPoints: 2840, tierStatus: 'Elite',  createdAtDaysAgo: 8,  addressLine1: '1450 Circuit Ave',    city: 'Austin',    state: 'TX', postalCode: '73301' },
  { email: 'omar.ismail@demo.rashed.com', firstName: 'Omar',  lastName: 'Ismail', phoneNumber: '+1-202-555-0102', rewardPoints: 1320, tierStatus: 'Gold',   createdAtDaysAgo: 21, addressLine1: '72 Hudson Point',     city: 'New York',  state: 'NY', postalCode: '10001' },
  { email: 'mila.ross@demo.rashed.com',   firstName: 'Mila',  lastName: 'Ross',   phoneNumber: '+1-202-555-0103', rewardPoints: 640,  tierStatus: 'Silver', createdAtDaysAgo: 34, addressLine1: '880 Harbor Street',   city: 'Miami',     state: 'FL', postalCode: '33101' },
  { email: 'ryan.khaled@demo.rashed.com', firstName: 'Ryan',  lastName: 'Khaled', phoneNumber: '+1-202-555-0104', rewardPoints: 420,  tierStatus: 'Member', createdAtDaysAgo: 52, addressLine1: '11 Industrial Park',  city: 'Chicago',   state: 'IL', postalCode: '60601' },
  { email: 'layla.saeed@demo.rashed.com', firstName: 'Layla', lastName: 'Saeed',  phoneNumber: '+1-202-555-0105', rewardPoints: 980,  tierStatus: 'Gold',   createdAtDaysAgo: 74, addressLine1: '90 Canyon Road',      city: 'Phoenix',   state: 'AZ', postalCode: '85001' },
];

const demoCartSeed = [];

const demoOrderSeed = [
  { orderNumber: 'DEMO-ORD-1001', customerEmail: 'nora.hale@demo.rashed.com',  status: 'Delivered',  daysAgo: 2,   items: [{ variantOffset: 0,  quantity: 2 }, { variantOffset: 9,  quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1002', customerEmail: 'omar.ismail@demo.rashed.com', status: 'Processing', daysAgo: 5,   items: [{ variantOffset: 3,  quantity: 1 }, { variantOffset: 11, quantity: 2 }] },
  { orderNumber: 'DEMO-ORD-1003', customerEmail: 'mila.ross@demo.rashed.com',   status: 'Shipped',    daysAgo: 9,   items: [{ variantOffset: 5,  quantity: 1 }, { variantOffset: 14, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1004', customerEmail: 'ryan.khaled@demo.rashed.com', status: 'Pending',    daysAgo: 13,  items: [{ variantOffset: 2,  quantity: 2 }] },
  { orderNumber: 'DEMO-ORD-1005', customerEmail: 'layla.saeed@demo.rashed.com', status: 'Delivered',  daysAgo: 18,  items: [{ variantOffset: 8,  quantity: 1 }, { variantOffset: 15, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1006', customerEmail: 'nora.hale@demo.rashed.com',   status: 'Delivered',  daysAgo: 27,  items: [{ variantOffset: 6,  quantity: 1 }, { variantOffset: 17, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1007', customerEmail: 'omar.ismail@demo.rashed.com', status: 'Cancelled',  daysAgo: 36,  items: [{ variantOffset: 1,  quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1008', customerEmail: 'mila.ross@demo.rashed.com',   status: 'Delivered',  daysAgo: 49,  items: [{ variantOffset: 4,  quantity: 2 }, { variantOffset: 12, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1009', customerEmail: 'ryan.khaled@demo.rashed.com', status: 'Delivered',  daysAgo: 67,  items: [{ variantOffset: 7,  quantity: 1 }, { variantOffset: 10, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1010', customerEmail: 'layla.saeed@demo.rashed.com', status: 'Delivered',  daysAgo: 84,  items: [{ variantOffset: 13, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1011', customerEmail: 'nora.hale@demo.rashed.com',   status: 'Delivered',  daysAgo: 112, items: [{ variantOffset: 16, quantity: 1 }, { variantOffset: 0, quantity: 1 }] },
  { orderNumber: 'DEMO-ORD-1012', customerEmail: null,                           status: 'Pending',    daysAgo: 3,   items: [{ variantOffset: 3,  quantity: 1 }] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const dateDaysAgo = (days) => {
  const now = Date.now();
  const offset = Number(days || 0) * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

// ── Seed functions ────────────────────────────────────────────────────────────

const seedAdminAccount = async (connection) => {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
  const email = process.env.ADMIN_EMAIL;
  const firstName = process.env.ADMIN_FIRST_NAME;
  const lastName = process.env.ADMIN_LAST_NAME;

  const [users] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  let adminUserId = users[0]?.id;

  if (adminUserId) {
    await connection.execute(
      `UPDATE users
       SET password_hash = ?, first_name = ?, last_name = ?, role = 'admin'
       WHERE id = ?`,
      [passwordHash, firstName, lastName, adminUserId],
    );
  } else {
    const [insertResult] = await connection.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, 'admin')
       RETURNING id AS "insertId"`,
      [email, passwordHash, firstName, lastName],
    );
    adminUserId = insertResult.insertId;
  }

  if (!adminUserId) {
    throw new Error('Admin account creation failed.');
  }

  await connection.execute(
    'INSERT INTO user_profiles (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING',
    [adminUserId],
  );
};

const upsertCategory = async (connection, category) => {
  const [existing] = await connection.execute(
    'SELECT id FROM categories WHERE slug = ? LIMIT 1',
    [category.slug],
  );
  const existingId = existing[0]?.id;

  if (existingId) {
    await connection.execute(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [category.name, category.description || null, existingId],
    );
    return existingId;
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO categories (name, slug, description)
     VALUES (?, ?, ?)
     RETURNING id AS "insertId"`,
    [category.name, category.slug, category.description || null],
  );

  return insertResult.insertId;
};

const upsertProduct = async (connection, product, categoryId) => {
  const [existing] = await connection.execute(
    'SELECT id FROM products WHERE slug = ? LIMIT 1',
    [product.slug],
  );
  const existingId = existing[0]?.id;

  if (existingId) {
    await connection.execute(
      `UPDATE products
       SET category_id = ?, name = ?, description = ?,
           materials_care = ?, base_price = ?, is_featured = ?
       WHERE id = ?`,
      [categoryId, product.name, product.description, product.materialsCare, product.basePrice, product.isFeatured, existingId],
    );
    return existingId;
  }

  const [insertResult] = await connection.execute(
    `INSERT INTO products (category_id, name, slug, description, materials_care, base_price, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id AS "insertId"`,
    [categoryId, product.name, product.slug, product.description, product.materialsCare, product.basePrice, product.isFeatured],
  );

  return insertResult.insertId;
};

const upsertVariant = async (connection, productId, variant) => {
  const [existing] = await connection.execute(
    'SELECT id FROM product_variants WHERE sku = ? LIMIT 1',
    [variant.sku],
  );
  const existingId = existing[0]?.id;

  if (existingId) {
    await connection.execute(
      `UPDATE product_variants
       SET product_id = ?, size = ?, color = ?, color_hex = ?,
           price_modifier = ?, stock_quantity = ?
       WHERE id = ?`,
      [productId, variant.size, variant.color, variant.colorHex || null, variant.priceModifier || 0, variant.stockQuantity || 0, existingId],
    );
    return;
  }

  await connection.execute(
    `INSERT INTO product_variants
       (product_id, sku, size, color, color_hex, price_modifier, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, variant.sku, variant.size, variant.color, variant.colorHex || null, variant.priceModifier || 0, variant.stockQuantity || 0],
  );
};

const upsertProductImage = async (connection, productId, imageUrl, index) => {
  const [rows] = await connection.execute(
    'SELECT id FROM product_images WHERE product_id = ? AND image_url = ? LIMIT 1',
    [productId, imageUrl],
  );

  if (!rows.length) {
    await connection.execute(
      'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)',
      [productId, imageUrl, index === 0, index],
    );
    return;
  }

  await connection.execute(
    'UPDATE product_images SET is_primary = ?, display_order = ? WHERE id = ?',
    [index === 0, index, rows[0].id],
  );
};

const seedCatalogData = async (connection) => {
  for (const entry of catalogSeed) {
    const categoryId = await upsertCategory(connection, entry.category);
    const productId = await upsertProduct(connection, entry.product, categoryId);

    for (const variant of entry.product.variants) {
      await upsertVariant(connection, productId, variant);
    }

    for (let i = 0; i < entry.product.images.length; i += 1) {
      await upsertProductImage(connection, productId, entry.product.images[i], i);
    }
  }
};

const upsertDemoCustomer = async (connection, customer, passwordHash) => {
  const createdAt = dateDaysAgo(customer.createdAtDaysAgo);

  const [users] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [customer.email],
  );
  let userId = users[0]?.id;

  if (userId) {
    await connection.execute(
      `UPDATE users
       SET password_hash = ?, first_name = ?, last_name = ?, role = 'customer', created_at = ?
       WHERE id = ?`,
      [passwordHash, customer.firstName, customer.lastName, createdAt, userId],
    );
  } else {
    const [insertResult] = await connection.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, created_at)
       VALUES (?, ?, ?, ?, 'customer', ?)
       RETURNING id AS "insertId"`,
      [customer.email, passwordHash, customer.firstName, customer.lastName, createdAt],
    );
    userId = insertResult.insertId;
  }

  if (!userId) {
    throw new Error(`Unable to seed demo customer: ${customer.email}`);
  }

  const [profileRows] = await connection.execute(
    'SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (profileRows.length) {
    await connection.execute(
      `UPDATE user_profiles
       SET phone_number = ?, reward_points = ?, tier_status = ?
       WHERE user_id = ?`,
      [customer.phoneNumber, customer.rewardPoints, customer.tierStatus, userId],
    );
  } else {
    await connection.execute(
      'INSERT INTO user_profiles (user_id, phone_number, reward_points, tier_status) VALUES (?, ?, ?, ?)',
      [userId, customer.phoneNumber, customer.rewardPoints, customer.tierStatus],
    );
  }

  const [existingAddresses] = await connection.execute(
    'SELECT id FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1',
    [userId],
  );

  if (existingAddresses.length) {
    await connection.execute(
      `UPDATE addresses
       SET address_line_1 = ?, city = ?, state = ?,
           postal_code = ?, country = 'US', is_default = TRUE
       WHERE id = ?`,
      [customer.addressLine1, customer.city, customer.state, customer.postalCode, existingAddresses[0].id],
    );
    return { userId, addressId: existingAddresses[0].id };
  }

  const [addressResult] = await connection.execute(
    `INSERT INTO addresses (user_id, address_line_1, city, state, postal_code, country, is_default)
     VALUES (?, ?, ?, ?, ?, 'US', TRUE)
     RETURNING id AS "insertId"`,
    [userId, customer.addressLine1, customer.city, customer.state, customer.postalCode],
  );

  return { userId, addressId: addressResult.insertId };
};

const seedDemoCustomers = async (connection) => {
  const passwordHash = await bcrypt.hash(DEMO_CUSTOMER_PASSWORD, 10);
  const customerLookup = new Map();

  for (const customer of demoCustomersSeed) {
    const result = await upsertDemoCustomer(connection, customer, passwordHash);
    customerLookup.set(customer.email, result);
  }

  return customerLookup;
};

const seedDemoCarts = async (connection) => {
  for (const cartSeed of demoCartSeed) {
    const createdAt = dateDaysAgo(cartSeed.daysAgo);
    const [existing] = await connection.execute(
      'SELECT id FROM carts WHERE session_id = ? LIMIT 1',
      [cartSeed.sessionId],
    );

    if (existing.length) {
      await connection.execute(
        'UPDATE carts SET created_at = ?, updated_at = NOW() WHERE id = ?',
        [createdAt, existing[0].id],
      );
      continue;
    }

    await connection.execute(
      'INSERT INTO carts (user_id, session_id, created_at) VALUES (NULL, ?, ?)',
      [cartSeed.sessionId, createdAt],
    );
  }
};

const fetchVariantSeedCatalog = async (connection) => {
  const [rows] = await connection.execute(
    `SELECT pv.id, pv.sku, pv.price_modifier, p.name AS product_name, p.base_price
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     ORDER BY pv.id ASC`,
  );
  return rows;
};

const upsertDemoOrder = async (connection, orderSeed, variants, customerLookup) => {
  if (!variants.length) return;

  const createdAt = dateDaysAgo(orderSeed.daysAgo);
  const selectedItems = orderSeed.items.map((item) => {
    const variant = variants[item.variantOffset % variants.length];
    const unitPrice = Number(variant.base_price || 0) + Number(variant.price_modifier || 0);
    return {
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product_name,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(unitPrice.toFixed(2)),
    };
  });

  const subtotal = Number(
    selectedItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0).toFixed(2),
  );
  const shippingCost = subtotal > 100 ? 0 : 12;
  const tax = Number((subtotal * 0.08).toFixed(2));
  const totalAmount = Number((subtotal + shippingCost + tax).toFixed(2));

  const customer = orderSeed.customerEmail ? customerLookup.get(orderSeed.customerEmail) : null;
  const userId = customer?.userId || null;
  const shippingAddressId = customer?.addressId || null;

  const [existingOrder] = await connection.execute(
    'SELECT id FROM orders WHERE order_number = ? LIMIT 1',
    [orderSeed.orderNumber],
  );

  let orderId;

  if (existingOrder.length) {
    orderId = existingOrder[0].id;
    await connection.execute(
      `UPDATE orders
       SET user_id = ?, shipping_address_id = ?, subtotal = ?, tax = ?,
           shipping_cost = ?, total_amount = ?, status = ?,
           created_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [userId, shippingAddressId, subtotal, tax, shippingCost, totalAmount, orderSeed.status, createdAt, orderId],
    );
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
  } else {
    const [insertResult] = await connection.execute(
      `INSERT INTO orders
         (order_number, user_id, shipping_address_id, subtotal, tax,
          shipping_cost, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id AS "insertId"`,
      [orderSeed.orderNumber, userId, shippingAddressId, subtotal, tax, shippingCost, totalAmount, orderSeed.status, createdAt],
    );
    orderId = insertResult.insertId;
  }

  for (const item of selectedItems) {
    await connection.execute(
      `INSERT INTO order_items
         (order_id, variant_id, product_name, sku, quantity, price_at_purchase)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, item.variantId, item.productName, item.sku, item.quantity, item.unitPrice],
    );
  }
};

const seedDemoOrders = async (connection, customerLookup) => {
  const variants = await fetchVariantSeedCatalog(connection);
  for (const orderSeed of demoOrderSeed) {
    await upsertDemoOrder(connection, orderSeed, variants, customerLookup);
  }
};

const upsertReview = async (connection, review) => {
  const [existing] = await connection.execute(
    'SELECT id FROM reviews WHERE product_id = ? AND user_id = ? AND title = ? LIMIT 1',
    [review.productId, review.userId, review.title],
  );

  if (existing.length) {
    await connection.execute(
      `UPDATE reviews
       SET rating = ?, comment = ?, is_verified_buyer = TRUE, created_at = ?
       WHERE id = ?`,
      [review.rating, review.comment, review.createdAt, existing[0].id],
    );
    return;
  }

  await connection.execute(
    `INSERT INTO reviews
       (product_id, user_id, rating, title, comment, is_verified_buyer, created_at)
     VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
    [review.productId, review.userId, review.rating, review.title, review.comment, review.createdAt],
  );
};

const seedDemoReviews = async (connection, customerLookup) => {
  const [products] = await connection.execute(
    'SELECT id, name FROM products ORDER BY id ASC',
  );
  const customerEmails = Array.from(customerLookup.keys());

  for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
    const product = products[productIndex];

    for (let customerOffset = 0; customerOffset < Math.min(3, customerEmails.length); customerOffset += 1) {
      const email = customerEmails[(productIndex + customerOffset) % customerEmails.length];
      const customer = customerLookup.get(email);

      if (!customer?.userId) continue;

      const rating = 4 + ((productIndex + customerOffset) % 2);
      const title = `Verified Review ${productIndex + 1}-${customerOffset + 1}`;
      const comment = `Consistent quality and fit for ${product.name}.`;

      await upsertReview(connection, {
        productId: product.id,
        userId: customer.userId,
        rating,
        title,
        comment,
        createdAt: dateDaysAgo(4 + productIndex * 3 + customerOffset),
      });
    }
  }
};

const seedDemoOperationalData = async (connection) => {
  const customerLookup = await seedDemoCustomers(connection);
  await seedDemoCarts(connection);
  await seedDemoOrders(connection, customerLookup);
  await seedDemoReviews(connection, customerLookup);
};

// ── Entry point ───────────────────────────────────────────────────────────────

const initializeDatabase = async () => {
  validateEnvironment();

  let dataPool;

  try {
    const schema = await fs.readFile(schemaPath, 'utf8');
    dataPool = await openPool();
    const connection = createQueryRunner(dataPool);

    const statements = parseSqlStatements(schema);
    for (const statement of statements) {
      if (!statement.trim()) continue;
      await dataPool.query(statement);
    }

    await seedAdminAccount(connection);
    await seedCatalogData(connection);
    await seedDemoOperationalData(connection);

    console.log('Database initialized successfully.');
    console.log(`Admin account ready: ${process.env.ADMIN_EMAIL}`);
    console.log(`Demo customer password: ${DEMO_CUSTOMER_PASSWORD}`);
  } catch (error) {
    console.error('Database initialization failed.');
    const message = error?.message || error?.detail || String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    if (dataPool) await dataPool.end();
  }
};

initializeDatabase();
