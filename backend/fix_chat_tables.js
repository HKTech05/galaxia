const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    console.log("Connected.");

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
    `);
    console.log("chat_sessions table created.");

    await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id         SERIAL PRIMARY KEY,
            session_id VARCHAR(100) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
            role       VARCHAR(20) NOT NULL,
            message    TEXT NOT NULL,
            is_human   BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    console.log("chat_messages table created.");

    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id, created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_phone_number ON chat_sessions (phone_number_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_msg ON chat_sessions (last_message_at DESC);`);
    console.log("Indexes created. Done!");

    await client.end();
}

run().catch(err => { console.error("Failed:", err); process.exit(1); });
