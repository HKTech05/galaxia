/**
 * Database Service — chat_sessions & chat_messages CRUD
 *
 * Uses a pg Pool connected via DATABASE_URL.
 */
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool.query(`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS state JSONB DEFAULT '{}'::jsonb;`).catch(err => {
  console.warn("[DB] Failed to run ALTER TABLE to add 'state' column:", err.message);
});

/* ── Sessions ──────────────────────────────────────────── */

/**
 * Get or create a chat session.
 * Returns the session row.
 */
async function getOrCreateSession(sessionId, customerPhone, phoneNumberId, botType = "celebration", platform = "whatsapp") {
  // Try to find existing
  const existing = await pool.query(
    `SELECT * FROM chat_sessions WHERE session_id = $1`,
    [sessionId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Create new
  const displayName = formatPhone(customerPhone);
  const result = await pool.query(
    `INSERT INTO chat_sessions
       (session_id, customer_phone, display_name, phone_number_id, bot_type, platform)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [sessionId, customerPhone, displayName, phoneNumberId, botType, platform]
  );

  return result.rows[0];
}

/**
 * Save a message and update session metadata.
 */
async function saveMessage(sessionId, role, message, isHuman = false) {
  const result = await pool.query(
    `INSERT INTO chat_messages (session_id, role, message, is_human)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sessionId, role, message, isHuman]
  );

  // Update session last message info
  const unreadInc = role === "user" ? 1 : 0;
  await pool.query(
    `UPDATE chat_sessions
     SET last_message = $2,
         last_message_at = NOW(),
         updated_at = NOW(),
         unread_count = unread_count + $3
     WHERE session_id = $1`,
    [sessionId, message.substring(0, 500), unreadInc]
  );

  return result.rows[0];
}

/* ── Chat List ─────────────────────────────────────────── */

/**
 * Get all chat sessions, sorted by last message time.
 * Optionally filter by phone_number_id.
 */
async function getChats(phoneNumberId = null) {
  let query = `
    SELECT * FROM chat_sessions 
    WHERE phone_number_id != '1015208551685641'
      AND customer_phone NOT IN ('917355630009', '919867677811', '7355630009', '9867677811')
    ORDER BY last_message_at DESC NULLS LAST`;
  let params = [];

  if (phoneNumberId) {
    query = `
      SELECT * FROM chat_sessions 
      WHERE phone_number_id = $1
        AND phone_number_id != '1015208551685641'
        AND customer_phone NOT IN ('917355630009', '919867677811', '7355630009', '9867677811')
      ORDER BY last_message_at DESC NULLS LAST`;
    params = [phoneNumberId];
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get all messages for a session.
 */
async function getChatMessages(sessionId) {
  const result = await pool.query(
    `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

/* ── Session Updates ───────────────────────────────────── */

/**
 * Toggle human mode on/off.
 */
async function setHumanMode(sessionId, isHuman) {
  const result = await pool.query(
    `UPDATE chat_sessions SET is_human_active = $2, updated_at = NOW() WHERE session_id = $1 RETURNING *`,
    [sessionId, isHuman]
  );
  return result.rows[0];
}

/**
 * Update tags for a session.
 */
async function updateTags(sessionId, tags) {
  const result = await pool.query(
    `UPDATE chat_sessions SET tags = $2::jsonb, updated_at = NOW() WHERE session_id = $1 RETURNING *`,
    [sessionId, JSON.stringify(tags)]
  );
  return result.rows[0];
}

/**
 * Mark a session as read (reset unread count).
 */
async function markRead(sessionId) {
  await pool.query(
    `UPDATE chat_sessions SET unread_count = 0, updated_at = NOW() WHERE session_id = $1`,
    [sessionId]
  );
}

/**
 * Get a single session by session_id.
 */
async function getSession(sessionId) {
  const result = await pool.query(
    `SELECT * FROM chat_sessions WHERE session_id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

/* ── Helpers ───────────────────────────────────────────── */

function formatPhone(phone) {
  // Format like "+91 98765 43210"
  if (phone.length === 12 && phone.startsWith("91")) {
    return `+${phone.substring(0, 2)} ${phone.substring(2, 7)} ${phone.substring(7)}`;
  }
  return phone;
}

module.exports = {
  pool,
  getOrCreateSession,
  saveMessage,
  getChats,
  getChatMessages,
  setHumanMode,
  updateTags,
  markRead,
  getSession,
};
