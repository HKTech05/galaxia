// Check schema of chat_sessions table
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    // Check which schema chat_sessions is in
    const schema = await p.query("SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'chat_sessions'");
    console.log('chat_sessions schema:', JSON.stringify(schema.rows));
    
    // Check current search_path
    const sp = await p.query("SHOW search_path");
    console.log('search_path:', JSON.stringify(sp.rows));
    
    // Try a direct query
    const result = await p.query("SELECT count(1) FROM chat_sessions");
    console.log('Direct count:', result.rows[0]);
    
    // Try with explicit schema
    const result2 = await p.query("SELECT count(1) FROM public.chat_sessions");
    console.log('public.chat_sessions count:', result2.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
    
    // Check if it's actually there in a different way
    try {
      const all = await p.query("SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%chat%' OR tablename LIKE '%Chat%'");
      console.log('All chat-like tables:', JSON.stringify(all.rows));
    } catch (e2) {
      console.error('Even fallback failed:', e2.message);
    }
  } finally {
    await p.end();
  }
}
run();
