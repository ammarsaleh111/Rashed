import jwt from 'jsonwebtoken';

import { getDatabase } from '../config/db.js';

const decodeBearerToken = (authorizationHeader = '') => {
  const [scheme, token] = String(authorizationHeader).split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const attachUserFromToken = async (token) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('JWT secret is not configured.');
    error.statusCode = 500;
    throw error;
  }

  const decoded = jwt.verify(token, secret);
  const userId = Number(decoded.sub);

  if (!userId) {
    const error = new Error('Unauthorized. Invalid token payload.');
    error.statusCode = 401;
    throw error;
  }

  const db = getDatabase();
  const [rows] = await db.query('SELECT TOP 1 id, email, role FROM users WHERE id = ?', [userId]);

  if (!rows.length) {
    const error = new Error('Unauthorized. User no longer exists.');
    error.statusCode = 401;
    throw error;
  }

  return {
    id: rows[0].id,
    email: rows[0].email,
    role: rows[0].role,
  };
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = decodeBearerToken(req.headers.authorization || '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Missing bearer token.' });
    }

    req.user = await attachUserFromToken(token);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token.' });
    }

    return next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = decodeBearerToken(req.headers.authorization || '');

    if (!token) {
      return next();
    }

    req.user = await attachUserFromToken(token);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (error.name === 'JsonWebTokenError' || error.statusCode === 401) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token.' });
    }

    return next(error);
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Login required.' });
  }

  if (String(req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
  }

  return next();
};
