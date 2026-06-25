import { getDatabase } from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value) => String(value || '').trim();

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

export const submitContactMessage = async (request, response, next) => {
  try {
    const fullName = normalizeText(request.body.full_name ?? request.body.fullName);
    const email = normalizeText(request.body.email).toLowerCase();
    const subject = normalizeText(request.body.subject);
    const message = normalizeText(request.body.message);

    if (!fullName) {
      throw createHttpError(400, 'full_name is required.');
    }

    if (!EMAIL_REGEX.test(email)) {
      throw createHttpError(400, 'A valid email is required.');
    }

    if (!subject) {
      throw createHttpError(400, 'subject is required.');
    }

    if (!message || message.length < 10) {
      throw createHttpError(400, 'message must be at least 10 characters long.');
    }

    const db = getDatabase();
    await ensureContactMessagesTable(db);

    const [result] = await db.query(
      `
      INSERT INTO contact_messages (user_id, full_name, email, subject, message, status)
      VALUES (?, ?, ?, ?, ?, 'new')
      RETURNING id
      `,
      [request.user?.id || null, fullName, email, subject, message],
    );

    return response.status(201).json({
      success: true,
      message: 'Your message has been received. Our team will contact you soon.',
      data: {
        id: result.insertId,
        fullName,
        email,
        subject,
        status: 'new',
      },
    });
  } catch (error) {
    return next(error);
  }
};