/**
 * Test script: Simulates an Instagram DM webhook payload
 * Run on EC2: node test_ig_webhook.js
 */
const http = require("http");

const payload = JSON.stringify({
  object: "instagram",
  entry: [{
    id: "1095910160272189",
    time: Date.now(),
    messaging: [{
      sender: { id: "9999999999" },
      recipient: { id: "1095910160272189" },
      timestamp: Date.now(),
      message: { mid: "test_mid_123", text: "hi" }
    }]
  }]
});

console.log("Sending test IG payload to localhost:4001/webhook ...");
console.log("Payload:", payload.substring(0, 200));

const req = http.request({
  hostname: "127.0.0.1",
  port: 4001,
  path: "/webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
}, (res) => {
  let body = "";
  res.on("data", (c) => body += c);
  res.on("end", () => {
    console.log("Response:", res.statusCode, body.substring(0, 200));
    console.log("\nNow check: pm2 logs wa-chatbot --lines 10 --nostream");
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(payload);
req.end();
