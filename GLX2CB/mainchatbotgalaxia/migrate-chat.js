/**
 * Migration: Create chat_sessions and chat_messages tables
 * for the WhatsApp chatbot dashboard system.
 *
 * Run:  node migrate-chat.js
 */
const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id              SERIAL PRIMARY KEY,
        session_id      VARCHAR(100) UNIQUE NOT NULL,
        customer_phone  VARCHAR(30) NOT NULL,
        display_name    VARCHAR(200),
        phone_number_id VARCHAR(50),
        bot_type        VARCHAR(30) DEFAULT 'celebration',
        platform        VARCHAR(20) DEFAULT 'whatsapp',
        is_human_active BOOLEAN DEFAULT false,
        tags            JSONB DEFAULT '[]'::jsonb,
        unread_count    INT DEFAULT 0,
        last_message    TEXT,
        last_message_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id         SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
        role       VARCHAR(20) NOT NULL,
        message    TEXT NOT NULL,
        is_human   BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_chat_messages_session
        ON chat_messages (session_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_chat_sessions_phone_number
        ON chat_sessions (phone_number_id);

      CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_msg
        ON chat_sessions (last_message_at DESC);
    `);

    console.log("✅ chat_sessions and chat_messages tables created successfully.");

    // Verify
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('chat_sessions', 'chat_messages')
      ORDER BY table_name;
    `);
    console.log("Verified tables:", res.rows.map((r) => r.table_name).join(", "));
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
