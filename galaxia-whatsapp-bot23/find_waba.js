// find_waba.js — Find the actual WABA ID and subscribe
const https = require("https");
const TOKEN = process.env.WHATSAPP_TOKEN;

function get(path) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v21.0/${path}&access_token=${TOKEN}`;
    https.get(url, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = `access_token=${TOKEN}`;
    const req = https.request({
      hostname: "graph.facebook.com",
      path: `/v21.0/${path}`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": data.length }
    }, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Get the WABA ID from the phone number
  console.log("=== Finding WABA ID ===");
  const r1 = await get("1117204771469353?fields=account_id");
  console.log("Account info:", JSON.stringify(r1));

  // Try debug_token to see token info
  console.log("\n=== Token debug ===");
  const r2 = await get("debug_token?input_token=" + TOKEN);
  console.log("Token info:", JSON.stringify(r2, null, 2));

  // If we got WABA ID, subscribe
  if (r1.account_id) {
    console.log("\n=== Subscribing WABA:", r1.account_id, "===");
    const r3 = await post(r1.account_id + "/subscribed_apps");
    console.log("Subscribe result:", JSON.stringify(r3));
  }
}

main().catch(e => console.error("Error:", e));
