import mssql from 'mssql';
import mssqlMsnodesqlv8 from 'mssql/msnodesqlv8.js';

let pool;

const resolvePort = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isWindowsAuth = () => String(process.env.DB_AUTH || '').toLowerCase() === 'windows';

let sqlDriver = mssql;

const buildOdbcConnectionString = (database) => {
  const driver = process.env.DB_ODBC_DRIVER || 'ODBC Driver 18 for SQL Server';
  const host = process.env.DB_HOST;
  const instanceName = process.env.DB_INSTANCE;
  const port = resolvePort(process.env.DB_PORT);
  const serverName = instanceName ? `${host}\\${instanceName}` : host;
  const server = !instanceName && port ? `${serverName},${port}` : serverName;

  return `Driver={${driver}};Server=${server};Database=${database};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;
};

const getDatabaseConfig = () => {
  const instanceName = process.env.DB_INSTANCE;
  const port = resolvePort(process.env.DB_PORT);

  if (isWindowsAuth()) {
    return {
      connectionString: buildOdbcConnectionString(process.env.DB_NAME),
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  return {
    server: process.env.DB_HOST,
    ...(port ? { port } : {}),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      ...(instanceName ? { instanceName } : {}),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
};

const replacePlaceholders = (queryText) => {
  let index = 0;
  return String(queryText).replace(/\?/g, () => {
    index += 1;
    return `@param${index}`;
  });
};

const createRequest = (target, params = []) => {
  const request = target.request();

  params.forEach((value, idx) => {
    request.input(`param${idx + 1}`, value);
  });

  return request;
};

const executeQuery = async (target, queryText, params = []) => {
  const normalizedQuery = replacePlaceholders(queryText);
  const request = createRequest(target, params);
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

const createTransactionalClient = (transaction) => ({
  query: (queryText, params) => executeQuery(transaction, queryText, params),
  beginTransaction: () => transaction.begin(),
  commit: () => transaction.commit(),
  rollback: () => transaction.rollback(),
  release: async () => {},
});

const createDatabaseClient = (target) => ({
  query: (queryText, params) => executeQuery(target, queryText, params),
  getConnection: async () => {
    const transaction = new sqlDriver.Transaction(pool);
    return createTransactionalClient(transaction);
  },
});

export const connectDatabase = async () => {
  try {
    sqlDriver = isWindowsAuth() ? mssqlMsnodesqlv8 : mssql;
    pool = await sqlDriver.connect(getDatabaseConfig());
    await pool.request().query('SELECT 1 AS ok');
    console.log('Database connection established.');
    return createDatabaseClient(pool);
  } catch (error) {
    const detail =
      error?.message ||
      error?.originalError?.message ||
      error?.originalError?.info?.message ||
      error?.originalError?.info?.error?.message;
    const message = `Database connection failed: ${detail || error}`;
    console.error(message);
    if (error && typeof error === 'object') {
      console.error(error);
    }
    throw new Error(message);
  }
};

export const getDatabase = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }

  return createDatabaseClient(pool);
};

