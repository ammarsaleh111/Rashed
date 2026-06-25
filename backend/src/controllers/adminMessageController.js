import { getDatabase } from '../config/db.js';

const ALLOWED_MESSAGE_STATUSES = new Set(['new', 'read', 'resolved']);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureContactMessagesTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      admin_note TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT CK_contact_messages_status CHECK (status IN ('new', 'read', 'resolved')),
      CONSTRAINT FK_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
};

const normalizeMessageStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'new' || normalized === 'read' || normalized === 'resolved') {
    return normalized;
  }

  return '';
};

export const getAdminMessages = async (request, response, next) => {
  try {
    const db = getDatabase();
    await ensureContactMessagesTable(db);
    const page = Math.max(1, Number.parseInt(request.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit || '25', 10) || 25));
    const offset = (page - 1) * limit;

    const search = String(request.query.search || '').trim();
    const status = normalizeMessageStatus(request.query.status);

    let whereClause = 'WHERE 1=1';
    const whereParams = [];

    if (status) {
      whereClause += ' AND cm.status = ?';
      whereParams.push(status);
    }

    if (search) {
      whereClause += ' AND (cm.full_name ILIKE ? OR cm.email ILIKE ? OR cm.subject ILIKE ? OR cm.message ILIKE ?)';
      const token = `%${search}%`;
      whereParams.push(token, token, token, token);
    }

    const [countRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM contact_messages cm
      ${whereClause}
      `,
      whereParams,
    );

    const [rows] = await db.query(
      `
      SELECT
        cm.id,
        cm.user_id,
        cm.full_name,
        cm.email,
        cm.subject,
        cm.message,
        cm.status,
        cm.admin_note,
        cm.created_at,
        cm.updated_at,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), '') AS account_name
      FROM contact_messages cm
      LEFT JOIN users u ON u.id = cm.user_id
      ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...whereParams, limit, offset],
    );

    return response.status(200).json({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        accountName: row.account_name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status,
        adminNote: row.admin_note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      meta: {
        page,
        limit,
        totalCount: Number(countRows[0]?.total || 0),
        totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminMessage = async (request, response, next) => {
  try {
    const messageId = Number(request.params.id);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      throw createHttpError(400, 'Message id must be a valid positive integer.');
    }

    const status = normalizeMessageStatus(request.body.status);
    if (!ALLOWED_MESSAGE_STATUSES.has(status)) {
      throw createHttpError(400, 'Invalid message status. Allowed: new, read, resolved.');
    }

    const adminNote = request.body.admin_note
      ? String(request.body.admin_note).trim().slice(0, 2000)
      : null;

    const db = getDatabase();
    await ensureContactMessagesTable(db);
    const [result] = await db.query(
      `
      UPDATE contact_messages
      SET status = ?, admin_note = ?, updated_at = now()
      WHERE id = ?
      `,
      [status, adminNote, messageId],
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Message not found.');
    }

    const [rows] = await db.query(
      'SELECT id, status, admin_note, updated_at FROM contact_messages WHERE id = ? LIMIT 1',
      [messageId],
    );

    return response.status(200).json({
      success: true,
      message: 'Message updated successfully.',
      data: {
        id: rows[0].id,
        status: rows[0].status,
        adminNote: rows[0].admin_note,
        updatedAt: rows[0].updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAdminMessage = async (request, response, next) => {
  try {
    const messageId = Number(request.params.id);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      throw createHttpError(400, 'Message id must be a valid positive integer.');
    }

    const db = getDatabase();
    await ensureContactMessagesTable(db);
    const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [messageId]);

    if (!result.affectedRows) {
      throw createHttpError(404, 'Message not found.');
    }

    return response.status(200).json({
      success: true,
      message: 'Message deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
};