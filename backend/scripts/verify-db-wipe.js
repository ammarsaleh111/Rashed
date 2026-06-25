import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const tables = [
  'reviews',
  'order_items',
  'orders',
  'cart_items',
  'carts',
  'product_images',
  'product_variants',
  'products',
  'categories',
  'addresses',
  'user_profiles',
  'contact_messages',
  'users',
];

const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  for (const table of tables) {
    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM "${table}"`);
    const totalRows = parseInt(countResult.rows[0].total, 10);

    // pg_sequences tracks sequences created by GENERATED ALWAYS AS IDENTITY
    const seqResult = await pool.query(
      `SELECT last_value, increment_by
       FROM pg_sequences
       WHERE sequencename = $1`,
      [`${table}_id_seq`],
    );

    let nextIdentity = null;

    if (seqResult.rows.length > 0) {
      const { last_value, increment_by } = seqResult.rows[0];
      nextIdentity = Number(last_value) + Number(increment_by);
    }

    console.log(`${table}: rows=${totalRows}, next_identity=${nextIdentity}`);
  }
} finally {
  await pool.end();
}
