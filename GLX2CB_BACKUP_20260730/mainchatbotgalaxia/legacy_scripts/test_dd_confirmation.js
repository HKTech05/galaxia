// test_dd_confirmation.js — Send a test DD booking confirmation via WhatsApp
const https = require("https");

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TO = "918237309564";

const voucherUrl = "https://galaxiaresorts.com/api/bookings/dd/voucher/DD-20260418-DEMO";

const message = [
  "\u2705 *Booking Confirmed!*",
  "",
  "Thank you for booking with Galaxia Digital Diaries.",
  "",
  "\ud83d\udccb *Booking Ref:* DD-20260418-DEMO",
  "",
  "\ud83d\udcc5 *Date:* Friday, 18 April 2026",
  "\ud83d\udd50 *Time:* 2:00 PM - 4:00 PM",
  "\ud83c\udfac *Screen:* Sandy Screen (Beach Theme)",
  "\ud83c\udf89 *Package:* Celebration Pack",
  "\ud83d\udc65 *Guests:* 2",
  "",
  "\ud83d\udcb0 *Total:* Rs.2,950",
  "\u2705 *Advance Paid:* Rs.2,950",
  "",
  "\ud83d\udcc4 View your booking voucher:",
  voucherUrl,
  "",
  "We look forward to hosting you! \ud83c\udfac",
  "",
  "- _Galaxia Resorts_",
  "www.galaxiaresorts.com"
].join("\n");

const payload = JSON.stringify({
  messaging_product: "whatsapp",
  to: TO,
  type: "text",
  text: { body: message }
});

const payloadBytes = Buffer.byteLength(payload, "utf8");

const req = https.request({
  hostname: "graph.facebook.com",
  path: "/v21.0/" + PHONE_ID + "/messages",
  method: "POST",
  headers: {
    "Authorization": "Bearer " + TOKEN,
    "Content-Type": "application/json",
    "Content-Length": payloadBytes
  }
}, function(res) {
  var body = "";
  res.on("data", function(c) { body += c; });
  res.on("end", function() {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.write(payload);
req.end();
