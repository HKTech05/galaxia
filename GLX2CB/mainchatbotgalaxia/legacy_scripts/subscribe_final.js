// subscribe_final.js
const https = require("https");
const TOKEN = process.env.WHATSAPP_TOKEN;

function api(method, url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { method, hostname: u.hostname, path: u.pathname + u.search };
    if (method === "POST") {
      const data = `access_token=${TOKEN}`;
      opts.headers = { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": data.length };
      const req = https.request(opts, res => { let d=""; res.on("data",c=>d+=c); res.on("end",()=>resolve(JSON.parse(d))); });
      req.on("error", reject); req.write(data); req.end();
    } else {
      https.get(url, res => { let d=""; res.on("data",c=>d+=c); res.on("end",()=>resolve(JSON.parse(d))); }).on("error", reject);
    }
  });
}

async function main() {
  // Step 1: Get WABA ID from the business user
  console.log("=== Step 1: Get WABA from business ===");
  const r1 = await api("GET", `https://graph.facebook.com/v21.0/122111096727257782/whatsapp_business_accounts?access_token=${TOKEN}`);
  console.log(JSON.stringify(r1, null, 2));

  // Step 2: Try getting WABA from phone number's owner field
  console.log("\n=== Step 2: Phone owner ===");
  const r2 = await api("GET", `https://graph.facebook.com/v21.0/1117204771469353?fields=id,display_phone_number,name_status,quality_rating&access_token=${TOKEN}`);
  console.log(JSON.stringify(r2, null, 2));

  // Step 3: Find WABA using business ID
  console.log("\n=== Step 3: Business owned WABAs ===");
  const r3 = await api("GET", `https://graph.facebook.com/v21.0/234381876612911/owned_whatsapp_business_accounts?access_token=${TOKEN}`);
  console.log(JSON.stringify(r3, null, 2));

  // Step 4: Try client_whatsapp_business_accounts
  console.log("\n=== Step 4: Client WABAs ===");
  const r4 = await api("GET", `https://graph.facebook.com/v21.0/234381876612911/client_whatsapp_business_accounts?access_token=${TOKEN}`);
  console.log(JSON.stringify(r4, null, 2));

  // If we found WABA IDs, try subscribing each
  const allResults = [r1, r3, r4];
  for (const r of allResults) {
    if (r.data) {
      for (const waba of r.data) {
        console.log(`\n=== Subscribing WABA ${waba.id} ===`);
        const sub = await api("POST", `https://graph.facebook.com/v21.0/${waba.id}/subscribed_apps`);
        console.log(JSON.stringify(sub));
      }
    }
  }
}

main().catch(e => console.error("Error:", e));
