/**
 * 25-Test Comprehensive Suite
 * 
 * A: Amstel Nest booking link tests (5)
 * B: Payment link hallucination prevention (5)
 * C: Blank reply fallback verification (2)
 * D: Digital Diaries age verification (3)
 * E: General functionality (10)
 */
require('dotenv').config();

async function runTests() {
  const chatbotService = require('./services/ai/ChatbotService');
  let passed = 0, failed = 0, total = 0;

  async function send(sessionId, message, botType = "amstel_nest") {
    return (await chatbotService.processMessage(sessionId, message, "test_phone", "test_phone_id", botType, "whatsapp")).reply || "";
  }

  function check(name, reply, mustContainAny = [], mustNotContainAny = []) {
    total++;
    console.log(`[${total}] ${name}`);
    console.log(`  Reply: ${reply.substring(0, 200)}${reply.length > 200 ? '...' : ''}`);
    let pass = true;
    if (mustContainAny.length > 0) {
      const found = mustContainAny.some(k => reply.toLowerCase().includes(k.toLowerCase()));
      if (!found) { console.log(`  ❌ Expected one of: [${mustContainAny.join(", ")}]`); pass = false; }
    }
    for (const k of mustNotContainAny) {
      if (reply.toLowerCase().includes(k.toLowerCase())) { console.log(`  ❌ Should NOT contain: "${k}"`); pass = false; }
    }
    if (pass) { passed++; console.log(`  ✅ PASSED`); } else { failed++; console.log(`  ❌ FAILED`); }
    console.log("");
    return pass;
  }

  const ts = Date.now();

  // ═══ A: AMSTEL NEST BOOKING LINK (5 tests) ═══
  console.log("═══ A: BOOKING LINK TESTS ═══\n");

  // A1: Multi-turn — availability then "yes" → must include link
  const sA1 = `tA1_${ts}`;
  await send(sA1, "Check in 15 Aug, Check out 16 Aug, 2 people");
  const rA1b = await send(sA1, "Yes");
  check("A1: 'Yes' after availability → booking link", rA1b,
    ["galaxiaresorts.com/staycation/amstel-nest"],
    ["share your full name", "share your name", "send the payment link", "email address"]);

  // A2: "Proceed with booking" → link
  const sA2 = `tA2_${ts}`;
  await send(sA2, "Check in 10 Aug, Check out 11 Aug, 2 adults");
  const rA2 = await send(sA2, "Proceed with the booking");
  check("A2: 'Proceed with booking' → booking link", rA2,
    ["galaxiaresorts.com/staycation/amstel-nest"],
    ["email", "phone number", "full name"]);

  // A3: Family cottage explicit → correct link
  const sA3 = `tA3_${ts}`;
  await send(sA3, "Check in 12 Aug, Check out 13 Aug, 5 adults");
  const rA3 = await send(sA3, "Family cottage book karo");
  check("A3: Family cottage → family-cottage link", rA3,
    ["galaxiaresorts.com/staycation"],
    ["share your full name", "send the payment link"]);

  // A4: Bot 3 booking link test
  const sA4 = `tA4_${ts}`;
  const rA4 = await send(sA4, "I want to book Santorini villa for 10 Aug", "staycation");
  check("A4: Bot 3 Santorini → includes link", rA4,
    ["galaxiaresorts.com"],
    []);

  // A5: "Book it" response
  const sA5 = `tA5_${ts}`;
  await send(sA5, "Amstel Nest 9 Aug to 10 Aug, 2 people");
  const rA5 = await send(sA5, "Book it");
  check("A5: 'Book it' → booking link", rA5,
    ["galaxiaresorts.com/staycation/amstel-nest"],
    ["share your", "payment link"]);

  // ═══ B: PAYMENT LINK HALLUCINATION PREVENTION (5 tests) ═══
  console.log("═══ B: ANTI-PAYMENT-LINK TESTS ═══\n");

  // B1: "Yes I want to book" must NOT ask for personal details
  const sB1 = `tB1_${ts}`;
  await send(sB1, "Check in 11 Aug, Check out 12 Aug, 3 adults");
  const rB1 = await send(sB1, "Yes I want to book");
  check("B1: Must NOT ask for personal details", rB1,
    ["galaxiaresorts.com"],
    ["full name", "email address", "send the payment link", "send the 80% advance"]);

  // B2: "Okay let's book"
  const sB2 = `tB2_${ts}`;
  await send(sB2, "Standard cottage 13 Aug to 14 Aug, 2 people");
  const rB2 = await send(sB2, "Okay let's book");
  check("B2: 'Okay lets book' → no personal details ask", rB2,
    ["galaxiaresorts.com"],
    ["email", "share your full name"]);

  // B3: Hinglish "haan book karo"
  const sB3 = `tB3_${ts}`;
  await send(sB3, "9 Aug se 10 Aug, 2 log");
  const rB3 = await send(sB3, "Haan book karo");
  check("B3: Hinglish 'haan book karo' → link, no details ask", rB3,
    ["galaxiaresorts.com"],
    ["email", "phone number", "payment link"]);

  // B4: "I'll pay tomorrow" should NOT trigger details collection
  const sB4 = `tB4_${ts}`;
  await send(sB4, "Check in 15 Aug, Check out 16 Aug, 2 adults");
  await send(sB4, "Yes");
  const rB4 = await send(sB4, "I'll pay tomorrow");
  check("B4: 'I'll pay tomorrow' → no details collection", rB4,
    [],
    ["share your full name", "email address", "send the 80%"]);

  // B5: Direct "book standard cottage" without prior flow
  const sB5 = `tB5_${ts}`;
  const rB5 = await send(sB5, "I want to book standard cottage for 10 August");
  check("B5: Direct booking request → link or ask dates", rB5,
    [],
    ["share your full name", "email address", "send the payment link"]);

  // ═══ C: BLANK REPLY FALLBACK (2 tests) ═══
  console.log("═══ C: BLANK REPLY TESTS ═══\n");

  // C1: Verify fallback text exists in code (structural check)
  const chatbotPath = require('path').resolve(__dirname, './services/ai/ChatbotService.js');
  const chatbotCode = require('fs').readFileSync(chatbotPath, 'utf8');
  const hasFallback = chatbotCode.includes("Sorry, I couldn't process your request");
  check("C1: ChatbotService has empty reply fallback", hasFallback ? "fallback present" : "", ["fallback"], []);

  // C2: Verify db.js has null guard
  const dbPath = require('path').resolve(__dirname, './services/db.js');
  const dbCode = require('fs').readFileSync(dbPath, 'utf8');
  const hasGuard = dbCode.includes("safeMessage");
  check("C2: db.js has null message guard", hasGuard ? "safemessage present" : "", ["safemessage"], []);

  // ═══ D: DD AGE VERIFICATION (3 tests) ═══
  console.log("═══ D: DD AGE VERIFICATION ═══\n");

  const rD1 = await send(`tD1_${ts}`, "Ek person 18 se kam hai", "digital_diaries");
  check("D1: Underage red flag → 18+ enforced", rD1,
    ["18+", "cannot", "nahi", "not permitted"],
    ["150", "free", "complimentary"]);

  const rD2 = await send(`tD2_${ts}`, "Can I bring my kid?", "digital_diaries");
  check("D2: Family kid → allowed", rD2,
    ["150", "allowed", "yes"],
    ["cannot", "not permitted"]);

  const rD3 = await send(`tD3_${ts}`, "My girlfriend is 17, can she come?", "digital_diaries");
  check("D3: GF 17 → strict refusal", rD3,
    ["18+", "cannot", "not permitted", "must be 18", "not allowed"],
    ["150", "free"]);

  // ═══ E: GENERAL FUNCTIONALITY (10 tests) ═══
  console.log("═══ E: GENERAL FUNCTIONALITY ═══\n");

  check("E1: Pricing inquiry", await send(`tE1_${ts}`, "What is the price?"),
    ["4,950", "5,950", "6,950", "standard"], []);

  check("E2: Location", await send(`tE2_${ts}`, "Where is Amstel Nest?"),
    ["karjat"], []);

  check("E3: Food policy", await send(`tE3_${ts}`, "Is food included?"),
    ["veg", "breakfast", "lunch", "dinner", "meal"], []);

  check("E4: Check-in time", await send(`tE4_${ts}`, "What is check in time?"),
    ["1:00", "1 pm", "1:00 pm"], []);

  check("E5: Security deposit", await send(`tE5_${ts}`, "Security deposit kitna hai?"),
    ["2,000"], []);

  check("E6: Cancellation policy", await send(`tE6_${ts}`, "What is cancellation policy?"),
    ["refund", "21", "10"], []);

  check("E7: DD outside food (must refuse)", await send(`tE7_${ts}`, "Can we bring outside food?", "digital_diaries"),
    ["not allowed", "nahi"], []);

  check("E8: DD CCTV", await send(`tE8_${ts}`, "Is there CCTV in rooms?", "digital_diaries"),
    ["no", "privacy", "nahi"], []);

  check("E9: Collaboration (should auto-reply)", await send(`tE9_${ts}`, "We want to collaborate with you"),
    ["collaborat", "team will contact"], []);

  check("E10: Office hours", await send(`tE10_${ts}`, "What are your office hours?", "digital_diaries"),
    ["10", "8"], []);

  // ═══ SUMMARY ═══
  console.log("═══════════════════════════════════════");
  console.log(`  FINAL: ${passed} PASSED / ${failed} FAILED / ${total} TOTAL`);
  console.log("═══════════════════════════════════════");
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error("Fatal:", e); process.exit(1); });
