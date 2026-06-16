import { getDatabase } from '../config/db.js';

export const getHealthStatus = async (_request, response, next) => {
  try {
    const database = getDatabase();
    const [rows] = await database.query('SELECT 1 AS ok');

    response.json({
      status: 'ok',
      api: 'Rashed backend',
      database: rows[0]?.ok === 1 ? 'connected' : 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

