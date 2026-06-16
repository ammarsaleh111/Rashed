import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getDatabase } from '../config/db.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildAuthPayload = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  role: user.role,
});

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('JWT_SECRET is not configured.');
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const {
      email = '',
      password = '',
      firstName = '',
      lastName = '',
    } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!normalizedFirstName || !normalizedLastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required.',
      });
    }

    const db = getDatabase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      OUTPUT INSERTED.id AS insertId
      VALUES (?, ?, ?, ?, 'customer')
      `,
      [normalizedEmail, passwordHash, normalizedFirstName, normalizedLastName],
    );

    await db.query(
      `
      IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = ?)
      BEGIN
        INSERT INTO user_profiles (user_id)
        VALUES (?)
      END
      `,
      [result.insertId, result.insertId],
    );

    const [rows] = await db.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [result.insertId],
    );
    const createdUser = rows[0];
    const token = generateToken(createdUser);

    res.status(201).json({
      success: true,
      data: {
        user: buildAuthPayload(createdUser),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail) || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const db = getDatabase();
    const [users] = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?',
      [normalizedEmail],
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        user: buildAuthPayload(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch logged-in user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUserProfile = async (req, res, next) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT TOP 1
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        up.phone_number,
        up.reward_points,
        up.tier_status
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ?
      `,
      [userId],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const profile = rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        phoneNumber: profile.phone_number,
        rewardPoints: Number(profile.reward_points || 0),
        tierStatus: profile.tier_status || 'Member',
        createdAt: profile.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};
