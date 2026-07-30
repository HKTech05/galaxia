require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testGroupDiscountRule() {
  console.log("=== TESTING GROUP DISCOUNT CONDITIONAL RULE ===");

  // Case A: Group size 10, NO discount requested
  console.log("\n--- TEST CASE A: 'we are 10 people so kese hoga' (No discount asked) ---");
  const sessionA = `test_grp_A_${Date.now()}`;
  const resA = await chatbotService.processMessage(sessionA, "we are 10 people so kese hoga", null, null, "amstel_nest");
  console.log(`Reply A:\n${resA.reply}`);

  const hasDiscountTextA = resA.reply.toLowerCase().includes("group discount") || resA.reply.toLowerCase().includes("1,500 discount") || resA.reply.toLowerCase().includes("1500 discount");
  console.log(`\nCase A Discount Mentioned? ${hasDiscountTextA ? "❌ FAILED (Discount mentioned without request)" : "✅ PASSED (No discount mentioned by default)"}`);

  // Case B: Group size 10, WITH discount requested
  console.log("\n--- TEST CASE B: 'we are 10 people, koi discount ya offer milega kya?' (Discount requested) ---");
  const sessionB = `test_grp_B_${Date.now()}`;
  const resB = await chatbotService.processMessage(sessionB, "we are 10 people, koi discount ya offer milega kya?", null, null, "amstel_nest");
  console.log(`Reply B:\n${resB.reply}`);

  const hasDiscountTextB = resB.reply.toLowerCase().includes("discount") || resB.reply.toLowerCase().includes("1,500") || resB.reply.toLowerCase().includes("1500");
  console.log(`\nCase B Discount Mentioned? ${hasDiscountTextB ? "✅ PASSED (Discount info provided when requested)" : "❌ FAILED (Discount not mentioned despite request)"}`);

  process.exit(0);
}

testGroupDiscountRule();
