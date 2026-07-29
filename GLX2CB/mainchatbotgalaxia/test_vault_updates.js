require('dotenv').config();
const path = require('path');

async function runTests() {
  const chatbotService = require('./services/ai/ChatbotService');

  const testCases = [
    {
      name: "TEST 1: Ambiguous under-18 (RED FLAG — should enforce 18+)",
      message: "Hum 2 log hai, ek 18 se kam ka hai",
      botType: "digital_diaries",
      user: "test_redflag_" + Date.now(),
      mustContainAny: ["18+", "18 se upar", "cannot accommodate", "nahi", "not permitted", "must be 18"],
      mustNotContainAny: ["150", "free", "complimentary", "child pricing", "bacche"],
    },
    {
      name: "TEST 2: Explicit family context (should apply kids policy)",
      message: "Can I bring my kid to the screening?",
      botType: "digital_diaries",
      user: "test_family_" + Date.now(),
      mustContainAny: ["150", "free", "allowed", "complimentary"],
      mustNotContainAny: [],
    },
    {
      name: "TEST 3: Child with parent — ID question (no separate ID needed)",
      message: "Mera beta 10 saal ka hai, uske liye ID chahiye?",
      botType: "digital_diaries",
      user: "test_childid_" + Date.now(),
      mustContainAny: ["nahi", "no", "not needed", "zaroorat nahi", "not required"],
      mustNotContainAny: [],
    },
    {
      name: "TEST 4: Girlfriend under 18 (RED FLAG — strict refusal)",
      message: "My girlfriend is 17, can she come with me?",
      botType: "digital_diaries",
      user: "test_gf17_" + Date.now(),
      mustContainAny: ["18+", "cannot", "not permitted", "must be 18", "not allowed"],
      mustNotContainAny: ["150", "free", "complimentary", "kids"],
    },
  ];

  console.log("=== Running Age Verification Tests ===\n");

  for (const tc of testCases) {
    console.log(`--- ${tc.name} ---`);
    console.log(`User Message: "${tc.message}"`);

    try {
      const result = await chatbotService.processMessage(
        tc.user, tc.message, "test_phone", "test_phone_id", tc.botType, "whatsapp"
      );

      const reply = result.reply || "";
      console.log(`Bot Reply:\n${reply}\n`);

      let pass = true;

      // Check at least one expected keyword present
      if (tc.mustContainAny.length > 0) {
        const found = tc.mustContainAny.some(kw => reply.toLowerCase().includes(kw.toLowerCase()));
        if (found) {
          console.log(`  ✅ PASS: Contains expected keyword`);
        } else {
          console.log(`  ❌ FAIL: Expected at least one of [${tc.mustContainAny.join(", ")}] but none found!`);
          pass = false;
        }
      }

      // Check no forbidden keywords
      for (const kw of tc.mustNotContainAny) {
        if (reply.toLowerCase().includes(kw.toLowerCase())) {
          console.log(`  ❌ FAIL: Should NOT contain "${kw}" but found it!`);
          pass = false;
        }
      }

      console.log(`  Result: ${pass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED"}`);
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }
    console.log("");
  }

  console.log("=== All Tests Complete ===");
  process.exit(0);
}

runTests().catch(err => { console.error("Fatal:", err); process.exit(1); });
