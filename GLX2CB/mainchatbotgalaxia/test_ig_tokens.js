/**
 * Test script: Validates all 6 IG Page tokens
 * Run on EC2: node test_ig_tokens.js
 */
require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const https = require("https");

const pages = [
  { name: "Amstel Nest", pageId: process.env.IG_PAGE_ID_AMSTELNEST, token: process.env.IG_TOKEN_AMSTELNEST },
  { name: "Ambrose", pageId: process.env.IG_PAGE_ID_AMBROSE, token: process.env.IG_TOKEN_AMBROSE },
  { name: "La Paraiso", pageId: process.env.IG_PAGE_ID_LAPARAISO, token: process.env.IG_TOKEN_LAPARAISO },
  { name: "Mount View", pageId: process.env.IG_PAGE_ID_MOUNTVIEW, token: process.env.IG_TOKEN_MOUNTVIEW },
  { name: "Heavenly Villa", pageId: process.env.IG_PAGE_ID_HEAVENLYVILLA, token: process.env.IG_TOKEN_HEAVENLYVILLA },
  { name: "Hill View", pageId: process.env.IG_PAGE_ID_HILLVIEW, token: process.env.IG_TOKEN_HILLVIEW },
];

async function testToken(page) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v21.0/${page.pageId}?fields=name,instagram_business_account&access_token=${page.token}`;
    https.get(url, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            console.log(`❌ ${page.name} (${page.pageId}): ${data.error.message}`);
          } else {
            const igId = data.instagram_business_account?.id || "NO IG ACCOUNT LINKED";
            console.log(`✅ ${page.name} (${page.pageId}): Page="${data.name}" IG=${igId}`);
          }
        } catch (e) {
          console.log(`❌ ${page.name}: Parse error`);
        }
        resolve();
      });
    }).on("error", (e) => {
      console.log(`❌ ${page.name}: ${e.message}`);
      resolve();
    });
  });
}

(async () => {
  console.log("Testing 6 IG page tokens...\n");
  for (const p of pages) {
    if (!p.token) {
      console.log(`⚠️  ${p.name}: NO TOKEN in .env`);
      continue;
    }
    console.log(`   Token preview: ${p.token.substring(0, 20)}...${p.token.substring(p.token.length - 10)}`);
    await testToken(p);
  }
  
  // Also check webhook subscription for each page
  console.log("\n\nChecking webhook subscriptions...\n");
  for (const p of pages) {
    if (!p.token) continue;
    await new Promise((resolve) => {
      const url = `https://graph.facebook.com/v21.0/${p.pageId}/subscribed_apps?access_token=${p.token}`;
      https.get(url, (res) => {
        let body = "";
        res.on("data", (c) => body += c);
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data.error) {
              console.log(`❌ ${p.name}: ${data.error.message}`);
            } else {
              const fields = data.data?.[0]?.subscribed_fields || [];
              console.log(`📋 ${p.name}: subscribed_fields = [${fields.join(", ")}]`);
            }
          } catch (e) {
            console.log(`❌ ${p.name}: Parse error`);
          }
          resolve();
        });
      }).on("error", (e) => { console.log(`❌ ${p.name}: ${e.message}`); resolve(); });
    });
  }
})();
