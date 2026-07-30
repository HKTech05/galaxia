require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function test15AdultsGroup() {
  console.log("=== TESTING 15 ADULTS GROUP CALCULATION & NON-TRUNCATION ===");

  const sessionId = `test_15_adults_${Date.now()}`;
  
  // Turn 1: Establish Monday stay
  console.log("\n--- Turn 1: 5 adults Monday ---");
  const res1 = await chatbotService.processMessage(sessionId, "how much for Monday 10th August for 5 adults?", null, null, "amstel_nest");
  console.log(`Reply 1:\n${res1.reply}\n`);

  // Turn 2: Exact user query from screenshot
  console.log("\n--- Turn 2: and if we are group of 15 adults then? ---");
  const res2 = await chatbotService.processMessage(sessionId, "and if we are group of 15 adults then?", null, null, "amstel_nest");
  console.log(`Reply 2:\n${res2.reply}\n`);

  const replyText = res2.reply || "";
  const endsCleanly = /[.?!*)]\s*$/s.test(replyText.trim());
  const hasOption1 = replyText.includes("Option 1");
  const hasOption2 = replyText.includes("Option 2");
  const hasNoCutoff = !replyText.endsWith(":");

  console.log("--------------------------------------------------");
  console.log(`Length: ${replyText.length} chars`);
  console.log(`Has Option 1: ${hasOption1}`);
  console.log(`Has Option 2: ${hasOption2}`);
  console.log(`Ends Cleanly: ${endsCleanly}`);
  console.log(`No Cutoff: ${hasNoCutoff}`);

  if (hasOption1 && hasOption2 && endsCleanly && hasNoCutoff) {
    console.log("✅ TEST PASSED: Response is complete and clean!");
  } else {
    console.error("❌ TEST FAILED: Response was truncated or incomplete.");
  }

  process.exit(0);
}

test15AdultsGroup();
