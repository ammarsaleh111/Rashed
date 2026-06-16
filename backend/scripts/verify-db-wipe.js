import dotenv from 'dotenv';
import mssql from 'mssql';
import mssqlMsnodesqlv8 from 'mssql/msnodesqlv8.js';

dotenv.config();

const isWindowsAuth = String(process.env.DB_AUTH || '').toLowerCase() === 'windows';

const sql = isWindowsAuth ? mssqlMsnodesqlv8 : mssql;

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

const pool = new sql.ConnectionPool(connectionConfig);
await pool.connect();

try {
  for (const table of tables) {
    const [countRows] = await executeQuery(pool, `SELECT COUNT(*) AS total FROM dbo.${table}`);
    const [identityRows] = await executeQuery(
      pool,
      `SELECT IDENT_CURRENT('dbo.${table}') AS current_identity, IDENT_INCR('dbo.${table}') AS identity_increment`,
    );

    const totalRows = Number(countRows?.[0]?.total || 0);
    const currentIdentity = identityRows?.[0]?.current_identity ?? null;
    const identityIncrement = identityRows?.[0]?.identity_increment ?? null;

    let nextIdentity = null;
    if (currentIdentity !== null && identityIncrement !== null) {
      nextIdentity = Number(currentIdentity) + Number(identityIncrement);
    }

    console.log(`${table}: rows=${totalRows}, next_identity=${nextIdentity}`);
  }
} finally {
  await pool.close();
}
