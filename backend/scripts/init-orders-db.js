import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.resolve(__dirname, '../sql/migrations/001_create_orders.sql');

const getEnv = (name, fallback = '') => String(process.env[name] || fallback).trim();

const getPort = (value, fallback) => {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
  host: getEnv('ORDER_DB_HOST', getEnv('DB_HOST', 'localhost')),
  port: getPort(process.env.ORDER_DB_PORT || process.env.DB_PORT, 3306),
  user: getEnv('ORDER_DB_USER', getEnv('DB_USER', 'root')),
  password: getEnv('ORDER_DB_PASSWORD', getEnv('DB_PASSWORD', '')),
  database: getEnv('ORDER_DB_NAME', 'rashed_orders'),
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
};

const run = async () => {
  const serverConnection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  await serverConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await serverConnection.end();

  const pool = mysql.createPool(config);
  const migrationSql = await fs.readFile(migrationPath, 'utf8');

  try {
    await pool.query(migrationSql);
    console.log(`Order database initialized successfully: ${config.database}`);
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error('Failed to initialize order database.');
  console.error(error);
  process.exit(1);
});
