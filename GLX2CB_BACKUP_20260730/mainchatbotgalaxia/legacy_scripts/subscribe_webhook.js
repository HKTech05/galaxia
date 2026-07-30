// subscribe_webhook.js — Use Meta Graph API to subscribe webhook programmatically
const https = require("https");

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "1117204771469353";
const APP_ID = "1886284726107284";

async function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://graph.facebook.com/v21.0/${path}`);
    if (method === "GET" && body) {
      Object.entries(body).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const opts = { method, hostname: url.hostname, path: url.pathname + url.search, headers: {} };
    if (method === "POST" && body) {
      const data = new URLSearchParams(body).toString();
      opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
      opts.headers["Content-Length"] = Buffer.byteLength(data);
      const req = https.request(opts, (res) => {
        let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    } else {
      const req = https.request(opts, (res) => {
        let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
      });
      req.on("error", reject);
      req.end();
    }
  });
}

async function main() {
  console.log("=== Step 1: Get WABA ID from phone number ===");
  const phoneInfo = await api("GET", PHONE_ID, { access_token: TOKEN });
  console.log("Phone info:", JSON.stringify(phoneInfo, null, 2));

  // Try to get WABA ID
  console.log("\n=== Step 2: Get WABA ID ===");
  const bizAcct = await api("GET", `${PHONE_ID}`, { fields: "id,display_phone_number", access_token: TOKEN });
  console.log("Business account:", JSON.stringify(bizAcct, null, 2));

  // Try app subscriptions endpoint
  console.log("\n=== Step 3: Check current app subscriptions ===");
  const subs = await api("GET", `${APP_ID}/subscriptions`, { access_token: TOKEN });
  console.log("App subscriptions:", JSON.stringify(subs, null, 2));

  // Subscribe to WABA webhooks using the subscribed_apps endpoint
  // First, find the WABA_ID from the business_id
  console.log("\n=== Step 4: Try subscribing via Graph API ===");
  // The WABA ID is 234381876612911 (from the URL in the Meta dashboard)
  const WABA_ID = "234381876612911";
  const subResult = await api("POST", `${WABA_ID}/subscribed_apps`, { access_token: TOKEN });
  console.log("Subscribe result:", JSON.stringify(subResult, null, 2));

  // Also try registering the phone number
  console.log("\n=== Step 5: Register phone number ===");
  const regResult = await api("POST", `${PHONE_ID}/register`, {
    messaging_product: "whatsapp",
    pin: "123456",
    access_token: TOKEN
  });
  console.log("Register result:", JSON.stringify(regResult, null, 2));
}

main().catch(e => console.error("Error:", e.message));
