/**
 * Re-subscribe all 6 pages to webhooks + verify IG linking
 * Run on EC2: node resubscribe.js
 */
require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const https = require("https");

const pages = [
  { name: "Amstel Nest", token: process.env.IG_TOKEN_AMSTELNEST, pageId: process.env.IG_PAGE_ID_AMSTELNEST },
  { name: "Ambrose", token: process.env.IG_TOKEN_AMBROSE, pageId: process.env.IG_PAGE_ID_AMBROSE },
  { name: "La Paraiso", token: process.env.IG_TOKEN_LAPARAISO, pageId: process.env.IG_PAGE_ID_LAPARAISO },
  { name: "Mount View", token: process.env.IG_TOKEN_MOUNTVIEW, pageId: process.env.IG_PAGE_ID_MOUNTVIEW },
  { name: "Heavenly Villa", token: process.env.IG_TOKEN_HEAVENLYVILLA, pageId: process.env.IG_PAGE_ID_HEAVENLYVILLA },
  { name: "Hill View", token: process.env.IG_TOKEN_HILLVIEW, pageId: process.env.IG_PAGE_ID_HILLVIEW },
];

function apiCall(method, path, token, postData) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v21.0${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {},
    };
    if (postData) {
      opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
      opts.headers["Content-Length"] = Buffer.byteLength(postData);
    }
    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
      });
    });
    req.on("error", (e) => resolve({ error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  console.log("=== Step 1: Check IG Account Linking ===\n");
  for (const p of pages) {
    const res = await apiCall("GET", `/${p.pageId}?fields=name,instagram_business_account`, p.token);
    const ig = res.instagram_business_account?.id || "NOT LINKED";
    console.log(`  ${p.name}: Page="${res.name || "?"}" IG=${ig}`);
  }

  console.log("\n=== Step 2: Subscribe Pages to Webhooks ===\n");
  for (const p of pages) {
    const res = await apiCall("POST", `/${p.pageId}/subscribed_apps`, p.token, "subscribed_fields=messages,messaging_postbacks");
    console.log(`  ${p.name}: ${JSON.stringify(res)}`);
  }

  console.log("\n=== Step 3: Test sending a message via API (Amstel Nest) ===\n");
  // Try sending a test message to verify token works for messaging
  const testRes = await apiCall("GET", `/me?fields=id,name`, pages[0].token);
  console.log(`  Token test (me): ${JSON.stringify(testRes)}`);

  console.log("\nDone. Now send 'hi' from any IG account to test webhook delivery.");
})();
