import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const requiredEnv = ['DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const executeQuery = async (client, queryText, params = []) => {
  let index = 0;
  const normalizedQuery = String(queryText).replace(/\?/g, () => `$${++index}`);

  const result = await client.query(normalizedQuery, params);
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

const createAdminAccount = async () => {
  const client = await pool.connect();

  try {
    const email = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(process.env.ADMIN_PASSWORD), 10);
    const firstName = String(process.env.ADMIN_FIRST_NAME || 'Admin').trim() || 'Admin';
    const lastName = String(process.env.ADMIN_LAST_NAME || 'User').trim() || 'User';

    const [rows] = await executeQuery(
      client,
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    let adminUserId = rows[0]?.id;

    if (adminUserId) {
      await executeQuery(
        client,
        `UPDATE users
         SET password_hash = ?, first_name = ?, last_name = ?, role = 'admin'
         WHERE id = ?`,
        [passwordHash, firstName, lastName, adminUserId],
      );
    } else {
      const [insertResult] = await executeQuery(
        client,
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES (?, ?, ?, ?, 'admin')
         RETURNING id AS "insertId"`,
        [email, passwordHash, firstName, lastName],
      );
      adminUserId = insertResult.insertId;
    }

    if (!adminUserId) {
      throw new Error('Failed to create or fetch admin user.');
    }

    await executeQuery(
      client,
      'INSERT INTO user_profiles (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING',
      [adminUserId],
    );

    console.log(`Admin account is ready: ${email}`);
  } finally {
    client.release();
    await pool.end();
  }
};

createAdminAccount().catch((error) => {
  console.error('Admin account provisioning failed.');
  console.error(error.message);
  process.exit(1);
});
