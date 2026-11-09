const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    // 1. Check dd_screens status
    const screens = await p.query('SELECT id, name, slug, is_active FROM dd_screens ORDER BY id');
    console.log('=== DD SCREENS STATUS ===');
    console.log(JSON.stringify(screens.rows, null, 2));

    // 2. Enable baywatch/Love Nest if inactive
    const updateRes = await p.query("UPDATE dd_screens SET is_active = true WHERE LOWER(slug) = 'baywatch' OR LOWER(name) ILIKE '%baywatch%' OR LOWER(name) ILIKE '%love%nest%'");
    console.log('\n=== UPDATE RESULT ===');
    console.log('Rows updated:', updateRes.rowCount);

    // 3. Verify
    const verify = await p.query('SELECT id, name, slug, is_active FROM dd_screens ORDER BY id');
    console.log('\n=== DD SCREENS AFTER UPDATE ===');
    console.log(JSON.stringify(verify.rows, null, 2));

    // 4. Clear DD conversation history
    const msgDel = await p.query("DELETE FROM chat_messages WHERE session_id LIKE '%_diaries'");
    console.log('\n=== CLEARED DD MESSAGES ===');
    console.log('Messages deleted:', msgDel.rowCount);

    // 5. Reset DD session states
    const sessDel = await p.query("UPDATE chat_sessions SET state = '{}'::jsonb WHERE session_id LIKE '%_diaries'");
    console.log('Sessions reset:', sessDel.rowCount);

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.end();
  }
}
main();
