import dotenv from 'dotenv';
import mssql from 'mssql';
import mssqlMsnodesqlv8 from 'mssql/msnodesqlv8.js';

dotenv.config();

const isWindowsAuth = String(process.env.DB_AUTH || '').toLowerCase() === 'windows';

const sql = isWindowsAuth ? mssqlMsnodesqlv8 : mssql;

const requiredEnvVars = ['DB_HOST', 'DB_NAME'];

if (!isWindowsAuth) {
  requiredEnvVars.splice(1, 0, 'DB_USER', 'DB_PASSWORD');
}
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

const main = async () => {
  const pool = new sql.ConnectionPool(connectionConfig);
  await pool.connect();

  try {
    const [identityRows] = await executeQuery(
      pool,
      `
        SELECT t.name AS table_name
        FROM sys.tables t
        INNER JOIN sys.identity_columns ic ON ic.object_id = t.object_id
      `,
    );

    const identityTables = new Set(identityRows.map((row) => String(row.table_name || '').toLowerCase()));

    for (const table of tablesToTruncate) {
      await executeQuery(pool, `ALTER TABLE dbo.${table} NOCHECK CONSTRAINT ALL`);
    }

    for (const table of tablesToTruncate) {
      console.log(`Deleting rows from table: ${table}`);
      await executeQuery(pool, `DELETE FROM dbo.${table}`);

      if (identityTables.has(table.toLowerCase())) {
        try {
          await executeQuery(pool, `DBCC CHECKIDENT ('dbo.${table}', RESEED, 0)`);
        } catch (_error) {
          // Ignore identity reset failures for tables without identity.
        }
      }
    }

    for (const table of tablesToTruncate) {
      await executeQuery(pool, `ALTER TABLE dbo.${table} WITH CHECK CHECK CONSTRAINT ALL`);
    }

    console.log('Database wipe complete. Schema preserved, data removed, identity reset where applicable.');
  } catch (error) {
    console.error('Database wipe failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error('Unexpected error during wipe:', error.message);
  process.exit(1);
});
