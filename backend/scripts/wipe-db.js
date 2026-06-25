import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const tablesToTruncate = [
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const main = async () => {
  const client = await pool.connect();

  try {
    // TRUNCATE with RESTART IDENTITY resets all sequences,
    // CASCADE handles FK dependencies in one shot.
    const tableList = tablesToTruncate.map((t) => `"${t}"`).join(', ');
    await client.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);

    console.log('Database wipe complete. Schema preserved, data removed, identity reset.');
  } catch (error) {
    console.error('Database wipe failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error('Unexpected error during wipe:', error.message);
  process.exit(1);
});
