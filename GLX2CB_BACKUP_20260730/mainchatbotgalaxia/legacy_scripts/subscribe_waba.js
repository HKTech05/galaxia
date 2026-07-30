// subscribe_waba.js — Subscribe using the correct WABA ID
const https = require("https");
const TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = "1498006532042145";

function post(path) {
  return new Promise((resolve, reject) => {
    const data = `access_token=${TOKEN}`;
    const req = https.request({
      hostname: "graph.facebook.com",
      path: `/v21.0/${path}`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": data.length }
    }, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => { console.log("Status:", res.statusCode); resolve(JSON.parse(d)); });
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://graph.facebook.com/v21.0/${path}?access_token=${TOKEN}`, res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

async function main() {
  console.log("=== Check current subscribed apps ===");
  const current = await get(`${WABA_ID}/subscribed_apps`);
  console.log(JSON.stringify(current, null, 2));

  console.log("\n=== Subscribing app to WABA", WABA_ID, "===");
  const result = await post(`${WABA_ID}/subscribed_apps`);
  console.log(JSON.stringify(result, null, 2));

  console.log("\n=== Verify subscription ===");
  const after = await get(`${WABA_ID}/subscribed_apps`);
  console.log(JSON.stringify(after, null, 2));
}

main().catch(e => console.error("Error:", e));
