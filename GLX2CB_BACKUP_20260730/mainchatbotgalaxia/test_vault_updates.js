/**
 * Comprehensive Bot Test Suite
 * 
 * SECTION A: Exact conversation replay (multi-turn)
 * SECTION B: 5 variations of underage scenario (Hindi/English/Hinglish)
 * SECTION C: 10 generalized tests to verify rest of bot is unaffected
 */

require('dotenv').config();

async function runTests() {
  const chatbotService = require('./services/ai/ChatbotService');
  let passed = 0, failed = 0;

  async function sendMsg(sessionId, message, botType = "digital_diaries") {
    const result = await chatbotService.processMessage(
      sessionId, message, "test_phone", "test_phone_id", botType, "whatsapp"
    );
    return result.reply || "";
  }

  function check(testName, reply, mustContainAny = [], mustNotContainAny = []) {
    console.log(`Bot Reply:\n${reply}\n`);
    let pass = true;

    if (mustContainAny.length > 0) {
      const found = mustContainAny.some(kw => reply.toLowerCase().includes(kw.toLowerCase()));
      if (!found) {
        console.log(`  ❌ FAIL: Expected one of [${mustContainAny.join(", ")}] — none found`);
        pass = false;
      } else {
        console.log(`  ✅ Contains expected keyword`);
      }
    }

    for (const kw of mustNotContainAny) {
      if (reply.toLowerCase().includes(kw.toLowerCase())) {
        console.log(`  ❌ FAIL: Should NOT contain "${kw}"`);
        pass = false;
      }
    }

    if (pass) { passed++; console.log(`  ✅ PASSED`); }
    else { failed++; console.log(`  ❌ FAILED`); }
    console.log("");
    return pass;
  }

  // ══════════════════════════════════════════════════════
  // SECTION A: EXACT CONVERSATION REPLAY (Multi-turn)
  // ══════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log("  SECTION A: EXACT CONVERSATION REPLAY");
  console.log("═══════════════════════════════════════════════════\n");

  const sessA = "test_exact_convo_" + Date.now();

  // Turn 1: "2person only" (context: booking for 2)
  console.log("--- A1: '2person only' ---");
  let r1 = await sendMsg(sessA, "2person only");
  check("A1", r1); // Just check it responds (no specific assertion needed)

  // Turn 2: ID question
  console.log("--- A2: 'Aur adhar ya kuch prof ke liye lag ga khy' ---");
  let r2 = await sendMsg(sessA, "Aur adhar ya kuch prof ke liye lag ga khy");
  check("A2: ID requirement", r2,
    ["id", "aadhaar", "government", "adhar", "pehchaan"],
    []);

  // Turn 3: "Sirf ek person ke liye adhar chalga na" — should say NO, each person needs own ID
  console.log("--- A3: 'Sirf ek person ke liye adhar chalga na' ---");
  let r3 = await sendMsg(sessA, "Sirf ek person ke liye adhar chalga na");
  check("A3: Per-person ID", r3,
    ["nahi", "no", "har", "each", "dono", "alag", "separately", "both"],
    []);

  // Turn 4: THE CRITICAL ONE — "1adult hai aur 1 person 18se kami ke haii"
  console.log("--- A4: '1adult hai aur 1 person 18se kami ke haii' (RED FLAG) ---");
  let r4 = await sendMsg(sessA, "Hamlog 2person rehge usmeinbse 1adult hai aur 1 person 18se kami ke haii");
  check("A4: Underage red flag", r4,
    ["18+", "18 se upar", "cannot", "nahi", "not permitted", "must be 18", "accommodate nahi"],
    ["150", "free", "complimentary", "sirf adult ka id"]);

  // ══════════════════════════════════════════════════════
  // SECTION B: 5 VARIATIONS (Hindi / English / Hinglish)
  // ══════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log("  SECTION B: 5 UNDERAGE SCENARIO VARIATIONS");
  console.log("═══════════════════════════════════════════════════\n");

  const variations = [
    {
      name: "B1 (Hinglish): Partner minor hai",
      msg: "Mera ek partner hai jo 17 saal ka hai, kya wo aa sakta hai?",
      mustContain: ["18+", "cannot", "nahi", "not permitted", "accommodate nahi"],
      mustNotContain: ["150", "free", "child", "bacch"],
    },
    {
      name: "B2 (English): Friend is 16",
      msg: "I want to book for 3 people but one of my friends is only 16 years old. Is that okay?",
      mustContain: ["18+", "cannot", "not permitted", "must be 18"],
      mustNotContain: ["150", "free", "complimentary", "kids policy"],
    },
    {
      name: "B3 (Hindi): Ek ladki 17 saal ki hai",
      msg: "Hum 2 log aayenge, ek ladki 17 saal ki hai, chalega kya?",
      mustContain: ["18+", "nahi", "cannot", "not permitted"],
      mustNotContain: ["150", "free"],
    },
    {
      name: "B4 (Hinglish): Dusra banda minor hai",
      msg: "Mere saath ek aur banda aayega jo abhi minor hai, uski age 17 hai",
      mustContain: ["18+", "nahi", "cannot", "not permitted", "accommodate"],
      mustNotContain: ["150", "free", "child"],
    },
    {
      name: "B5 (English): Boyfriend is 17",
      msg: "My boyfriend is 17, he turns 18 next month. Can he still come?",
      mustContain: ["18+", "cannot", "not permitted", "must be 18", "not allowed"],
      mustNotContain: ["150", "free", "kids"],
    },
  ];

  for (const v of variations) {
    const sess = "test_var_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    console.log(`--- ${v.name} ---`);
    console.log(`User: "${v.msg}"`);
    const reply = await sendMsg(sess, v.msg);
    check(v.name, reply, v.mustContain, v.mustNotContain);
  }

  // ══════════════════════════════════════════════════════
  // SECTION C: 10 GENERALIZED TESTS (other bot features)
  // ══════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log("  SECTION C: 10 GENERALIZED FUNCTIONALITY TESTS");
  console.log("═══════════════════════════════════════════════════\n");

  const generalTests = [
    {
      name: "C1: Pricing inquiry",
      msg: "What is the price for 2 people celebration package?",
      mustContain: ["2,200", "2,950", "celebration"],
      mustNotContain: [],
    },
    {
      name: "C2: Outside food (must refuse)",
      msg: "Can we bring outside food?",
      mustContain: ["not allowed", "nahi"],
      mustNotContain: [],
    },
    {
      name: "C3: Outside cake (must refuse)",
      msg: "Kya hum apna cake laa sakte hai?",
      mustContain: ["not allowed", "nahi", "allowed nahi"],
      mustNotContain: [],
    },
    {
      name: "C4: Screen capacity",
      msg: "How many people can fit in Cine Love?",
      mustContain: ["8"],
      mustNotContain: [],
    },
    {
      name: "C5: Movie Time add-on balloons",
      msg: "Movie time mein balloons add kar sakte hai?",
      mustContain: ["400"],
      mustNotContain: [],
    },
    {
      name: "C6: Location query",
      msg: "Where is Digital Diaries located?",
      mustContain: ["wadala", "mumbai"],
      mustNotContain: [],
    },
    {
      name: "C7: CCTV policy",
      msg: "Is there CCTV in the rooms?",
      mustContain: ["no", "nahi", "privacy"],
      mustNotContain: [],
    },
    {
      name: "C8: Celebration package contents",
      msg: "What does celebration package include?",
      mustContain: ["cake"],
      mustNotContain: ["₹400"],
    },
    {
      name: "C9: Office hours",
      msg: "What are your office hours?",
      mustContain: ["10", "8"],
      mustNotContain: [],
    },
    {
      name: "C10: Family kid explicit (should ALLOW)",
      msg: "I want to bring my 8 year old daughter, is that fine?",
      mustContain: ["150", "allowed", "yes"],
      mustNotContain: ["cannot", "not permitted"],
    },
  ];

  for (const t of generalTests) {
    const sess = "test_gen_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    console.log(`--- ${t.name} ---`);
    console.log(`User: "${t.msg}"`);
    const reply = await sendMsg(sess, t.msg);
    check(t.name, reply, t.mustContain, t.mustNotContain);
  }

  // ══════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log(`  FINAL RESULTS: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`);
  console.log("═══════════════════════════════════════════════════");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error("Fatal:", err); process.exit(1); });
