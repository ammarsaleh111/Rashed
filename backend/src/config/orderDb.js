import mysql from 'mysql2/promise';

let pool;

const getEnv = (name, fallback = '') => String(process.env[name] || fallback).trim();

const resolvePort = (value, fallback) => {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getConfig = () => ({
  host: getEnv('ORDER_DB_HOST', getEnv('DB_HOST', 'localhost')),
  port: resolvePort(process.env.ORDER_DB_PORT || process.env.DB_PORT, 3306),
  user: getEnv('ORDER_DB_USER', getEnv('DB_USER', 'root')),
  password: getEnv('ORDER_DB_PASSWORD', getEnv('DB_PASSWORD', '')),
  database: getEnv('ORDER_DB_NAME', 'rashed_orders'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  charset: 'utf8mb4',
});

export const connectOrderDatabase = async () => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool(getConfig());
  await pool.query('SELECT 1 AS ok');
  console.log('Order database connection established.');
  return pool;
};

export const getOrderDatabase = () => {
  if (!pool) {
    throw new Error('Order database pool has not been initialized.');
  }

  return pool;
};
