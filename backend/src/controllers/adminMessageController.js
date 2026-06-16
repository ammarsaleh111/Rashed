import { getDatabase } from '../config/db.js';

const ALLOWED_MESSAGE_STATUSES = new Set(['new', 'read', 'resolved']);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureContactMessagesTable = async (db) => {
  await db.query(`
    IF OBJECT_ID('dbo.contact_messages', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.contact_messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NULL,
        full_name NVARCHAR(150) NOT NULL,
        email NVARCHAR(255) NOT NULL,
        subject NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_contact_messages_status DEFAULT 'new',
        admin_note NVARCHAR(MAX) NULL,
        created_at DATETIME2(0) NOT NULL CONSTRAINT DF_contact_messages_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_contact_messages_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_contact_messages_status CHECK (status IN ('new', 'read', 'resolved')),
        CONSTRAINT FK_contact_messages_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE SET NULL
      )
    END
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
      whereClause += ' AND (cm.full_name LIKE ? OR cm.email LIKE ? OR cm.subject LIKE ? OR cm.message LIKE ?)';
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
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `,
      [...whereParams, offset, limit],
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
      SET status = ?, admin_note = ?, updated_at = SYSUTCDATETIME()
      WHERE id = ?
      `,
      [status, adminNote, messageId],
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Message not found.');
    }

    const [rows] = await db.query(
      'SELECT TOP 1 id, status, admin_note, updated_at FROM contact_messages WHERE id = ?',
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
