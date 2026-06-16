import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mssql from 'mssql';
import mssqlMsnodesqlv8 from 'mssql/msnodesqlv8.js';

dotenv.config();

const isWindowsAuth = String(process.env.DB_AUTH || '').toLowerCase() === 'windows';

const sql = isWindowsAuth ? mssqlMsnodesqlv8 : mssql;

const requiredEnv = ['DB_HOST', 'DB_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

if (!isWindowsAuth) {
  requiredEnv.splice(1, 0, 'DB_USER', 'DB_PASSWORD');
}

const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const resolvePort = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildOdbcConnectionString = (database) => {
  const driver = process.env.DB_ODBC_DRIVER || 'ODBC Driver 18 for SQL Server';
  const host = process.env.DB_HOST;
  const instanceName = process.env.DB_INSTANCE;
  const port = resolvePort(process.env.DB_PORT);
  const serverName = instanceName ? `${host}\\${instanceName}` : host;
  const server = !instanceName && port ? `${serverName},${port}` : serverName;

  return `Driver={${driver}};Server=${server};Database=${database};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;
};

const connectionConfig = isWindowsAuth
  ? { connectionString: buildOdbcConnectionString(process.env.DB_NAME) }
  : {
      server: process.env.DB_HOST,
      ...(resolvePort(process.env.DB_PORT) ? { port: resolvePort(process.env.DB_PORT) } : {}),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
      },
    };

const replacePlaceholders = (queryText) => {
  let index = 0;
  return String(queryText).replace(/\?/g, () => {
    index += 1;
    return `@param${index}`;
  });
};

const executeQuery = async (pool, queryText, params = []) => {
  const normalizedQuery = replacePlaceholders(queryText);
  const request = pool.request();

  params.forEach((value, idx) => {
    request.input(`param${idx + 1}`, value);
  });

  const result = await request.query(normalizedQuery);
  const rows = result.recordset || [];

  result.affectedRows = Array.isArray(result.rowsAffected)
    ? result.rowsAffected.reduce((sum, count) => sum + count, 0)
    : Number(result.rowsAffected || 0);

  let payload = rows;
  const firstRow = rows[0];
  const hasInsertIdRow =
    rows.length === 1 && firstRow && Object.prototype.hasOwnProperty.call(firstRow, 'insertId');

  if (hasInsertIdRow) {
    result.insertId = firstRow.insertId;
    payload = {
      insertId: firstRow.insertId,
      affectedRows: result.affectedRows,
    };
  } else if (!rows.length && Number.isFinite(result.affectedRows)) {
    payload = {
      affectedRows: result.affectedRows,
    };
  }

  return [payload, result];
};

const createAdminAccount = async () => {
  const pool = new sql.ConnectionPool(connectionConfig);
  await pool.connect();
  const connection = {
    execute: (queryText, params) => executeQuery(pool, queryText, params),
  };

  try {
    const email = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(process.env.ADMIN_PASSWORD), 10);
    const firstName = String(process.env.ADMIN_FIRST_NAME || 'Admin').trim() || 'Admin';
    const lastName = String(process.env.ADMIN_LAST_NAME || 'User').trim() || 'User';

    const [rows] = await connection.execute('SELECT TOP 1 id FROM users WHERE email = ?', [email]);
    let adminUserId = rows[0]?.id;

    if (adminUserId) {
      await connection.execute(
        `
          UPDATE users
          SET password_hash = ?, first_name = ?, last_name = ?, role = 'admin'
          WHERE id = ?
        `,
        [passwordHash, firstName, lastName, adminUserId],
      );
    } else {
      const [insertResult] = await connection.execute(
        `
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          OUTPUT INSERTED.id AS insertId
          VALUES (?, ?, ?, ?, 'admin')
        `,
        [email, passwordHash, firstName, lastName],
      );
      adminUserId = insertResult.insertId;
    }

    if (!adminUserId) {
      throw new Error('Failed to create or fetch admin user.');
    }

    await connection.execute(
      `
        IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = ?)
        BEGIN
          INSERT INTO user_profiles (user_id)
          VALUES (?)
        END
      `,
      [adminUserId, adminUserId],
    );

    console.log(`Admin account is ready: ${email}`);
  } finally {
    await pool.close();
  }
};

createAdminAccount().catch((error) => {
  console.error('Admin account provisioning failed.');
  console.error(error.message);
  process.exit(1);
});
