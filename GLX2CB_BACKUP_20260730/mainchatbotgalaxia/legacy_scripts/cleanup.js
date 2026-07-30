const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgres://galaxia_admin:Hani9869!@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com:5432/postgres" });
(async () => {
  await p.query("DELETE FROM chat_messages");
  await p.query("DELETE FROM chat_sessions");
  console.log("Cleaned test data");
  p.end();
})();
