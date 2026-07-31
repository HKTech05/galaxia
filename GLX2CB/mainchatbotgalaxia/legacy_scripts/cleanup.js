const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query("DELETE FROM chat_messages");
  await p.query("DELETE FROM chat_sessions");
  console.log("Cleaned test data");
  p.end();
})();
