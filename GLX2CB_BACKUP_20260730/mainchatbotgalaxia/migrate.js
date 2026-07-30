const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL RDS database.");

    const sqlFilePath = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e5141212-0e25-40d1-909b-a143770b4d41\\schema_setup.sql";
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log("Executing schema script...");
    await client.query(sql);
    
    console.log("Successfully created tables and indexes.");
    
    // Verify creation
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log("Tables in database:", res.rows.map(r => r.table_name).join(", "));
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

runMigration();
