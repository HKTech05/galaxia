require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');
const fs = require('fs');
const path = require('path');

async function run25VagueSimulations() {
  console.log("=== RUNNING 25 VAGUE & SLANG CUSTOMER TEST SIMULATIONS ===");

  const testCases = [
    {
      id: 1,
      bot: "amstel_nest",
      input: "bhai price batao na",
      description: "Hinglish slang asking for generalized price without dates",
      checkFn: (reply) => reply.includes("Amstel Nest Standard Cottage") && reply.includes("14 Aug (Prime Date)") && reply.includes("Security deposit is *₹2,000*")
    },
    {
      id: 2,
      bot: "amstel_nest",
      input: "no just say price",
      description: "Customer refusing date flow and asking directly for price",
      checkFn: (reply) => reply.includes("Amstel Nest Standard Cottage") && reply.includes("14 Aug (Prime Date): *₹7,950*") && reply.includes("Security deposit")
    },
    {
      id: 3,
      bot: "amstel_nest",
      input: "14th aug scene kya hai 2 adults",
      description: "Slang asking for 14th August prime date rate",
      checkFn: (reply) => reply.includes("7,950") || reply.includes("14 Aug")
    },
    {
      id: 4,
      bot: "amstel_nest",
      input: "15 august ka kitna hai for 2 people",
      description: "Asking for 15th August prime date rate",
      checkFn: (reply) => reply.includes("8,500") || reply.includes("15 Aug")
    },
    {
      id: 5,
      bot: "amstel_nest",
      input: "14 aug family cottage price",
      description: "Prime date 14 August for Family Cottage",
      checkFn: (reply) => reply.includes("11,000") || reply.includes("14 Aug")
    },
    {
      id: 6,
      bot: "amstel_nest",
      input: "15 aug family cottage 4 adults",
      description: "Prime date 15 August for Family Cottage",
      checkFn: (reply) => reply.includes("13,500") || reply.includes("15 Aug")
    },
    {
      id: 7,
      bot: "amstel_nest",
      input: "auto mil jayega station se?",
      description: "Rickshaw availability query from Karjat station",
      checkFn: (reply) => reply.includes("Mahesh") && reply.includes("+91 92847 96472")
    },
    {
      id: 8,
      bot: "amstel_nest",
      input: "hookah milega vahan?",
      description: "Hookah provision query",
      checkFn: (reply) => reply.includes("allowed") && reply.includes("+91 99877 34458")
    },
    {
      id: 9,
      bot: "staycation",
      input: "hookah milega?",
      description: "Hookah provision query on Bot 3 Staycation",
      checkFn: (reply) => reply.includes("allowed") && reply.includes("+91 81695 19564")
    },
    {
      id: 10,
      bot: "amstel_nest",
      input: "5th adult kahan soyega family cottage mein?",
      description: "Extra adult sleeping arrangements query (No living area phrasing)",
      checkFn: (reply) => reply.toLowerCase().includes("extra mattress") && !reply.toLowerCase().includes("living area")
    },
    {
      id: 11,
      bot: "amstel_nest",
      input: "station se kitna door hai property",
      description: "Station distance query",
      checkFn: (reply) => reply.includes("30-40")
    },
    {
      id: 12,
      bot: "amstel_nest",
      input: "disc do na thoda",
      description: "Hinglish slang asking for discount without mentioning group size",
      checkFn: (reply) => reply.includes("discount") || reply.includes("1,500") || reply.includes("6")
    },
    {
      id: 13,
      bot: "amstel_nest",
      input: "khana free hai kya?",
      description: "Food included query",
      checkFn: (reply) => reply.toLowerCase().includes("meal") || reply.toLowerCase().includes("included") || reply.toLowerCase().includes("veg")
    },
    {
      id: 14,
      bot: "amstel_nest",
      input: "non veg allowed hai kya bro",
      description: "Pure veg policy query",
      checkFn: (reply) => reply.toLowerCase().includes("pure veg") || reply.toLowerCase().includes("non-veg")
    },
    {
      id: 15,
      bot: "amstel_nest",
      input: "deposit kitna dena hai",
      description: "Security deposit query",
      checkFn: (reply) => reply.includes("2,000") && reply.toLowerCase().includes("refundable")
    },
    {
      id: 16,
      bot: "amstel_nest",
      input: "cash me pay kar sakte h full advance?",
      description: "Cash prepayment query",
      checkFn: (reply) => reply.toLowerCase().includes("wadala") || reply.toLowerCase().includes("office") || reply.includes("80%")
    },
    {
      id: 17,
      bot: "amstel_nest",
      input: "reviews me kuch log ganda bol rhe h",
      description: "Objection handling for bad Google reviews",
      checkFn: (reply) => reply.toLowerCase().includes("review") || reply.toLowerCase().includes("fake") || reply.includes("10,000")
    },
    {
      id: 18,
      bot: "amstel_nest",
      input: "pool clean h na?",
      description: "Pool cleanliness query",
      checkFn: (reply) => reply.toLowerCase().includes("clean") || reply.toLowerCase().includes("filter")
    },
    {
      id: 19,
      bot: "amstel_nest",
      input: "chekin kitne baje h",
      description: "Check-in time query with typo",
      checkFn: (reply) => reply.includes("1:00") || reply.includes("10:00")
    },
    {
      id: 20,
      bot: "amstel_nest",
      input: "late checkout kar skte kya 2pm tak",
      description: "Late checkout query",
      checkFn: (reply) => reply.includes("1,500") || reply.includes("2,500")
    },
    {
      id: 21,
      bot: "amstel_nest",
      input: "and if we are group of 15 adults then?",
      description: "Large group calculation non-truncation test",
      checkFn: (reply) => (reply.includes("Option") || reply.includes("Standard") || reply.includes("Cottage")) && !reply.trim().endsWith(":")
    },
    {
      id: 22,
      bot: "amstel_nest",
      input: "light chali gayi toh?",
      description: "Power backup query",
      checkFn: (reply) => reply.toLowerCase().includes("generator") || reply.toLowerCase().includes("power")
    },
    {
      id: 23,
      bot: "amstel_nest",
      input: "waterfall h aas paas?",
      description: "Monsoon waterfall query",
      checkFn: (reply) => reply.toLowerCase().includes("waterfall") || reply.toLowerCase().includes("instagram") || reply.includes("5 mins")
    },
    {
      id: 24,
      bot: "amstel_nest",
      input: "toothbrush milega vahan?",
      description: "Toiletries query",
      checkFn: (reply) => reply.toLowerCase().includes("toothbrush")
    },
    {
      id: 25,
      bot: "staycation",
      input: "santorini villa available hai kya friday pe?",
      description: "Ambrose Santorini Villa query on Bot 3",
      checkFn: (reply) => reply.toLowerCase().includes("santorini") || reply.toLowerCase().includes("ambrose")
    }
  ];

  let passedCount = 0;
  const results = [];

  for (const tc of testCases) {
    const sessionId = `sim_25_${tc.id}_${Date.now()}`;
    const startTime = Date.now();
    let res;
    let error = null;

    try {
      res = await chatbotService.processMessage(sessionId, tc.input, null, null, tc.bot);
    } catch (err) {
      error = err.message;
    }

    const reply = res?.reply || "";
    const hasDoubleAsterisks = /\*\*[^*]+\*\*/.test(reply);
    const passedCheck = !error && !hasDoubleAsterisks && tc.checkFn(reply);

    if (passedCheck) {
      passedCount++;
    }

    console.log(`\n[CASE ${tc.id}/25] ${tc.description} | Bot: ${tc.bot}`);
    console.log(`Input: "${tc.input}"`);
    console.log(`Response Snippet: ${reply.substring(0, 180).replace(/\n/g, ' ')}...`);
    console.log(`Status: ${passedCheck ? "✅ PASSED" : "❌ FAILED"}`);

    results.push({
      id: tc.id,
      description: tc.description,
      input: tc.input,
      bot: tc.bot,
      reply: reply,
      passed: passedCheck,
      hasDoubleAsterisks: hasDoubleAsterisks,
      error: error
    });
  }

  const passRate = ((passedCount / testCases.length) * 100).toFixed(1);
  console.log(`\n==================================================`);
  console.log(`25 VAGUE SIMULATION SUMMARY: ${passedCount}/${testCases.length} Passed (${passRate}%)`);
  console.log(`==================================================`);

  // Write report artifact
  const reportPath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\62d85265-9d2a-4850-91ed-5e268eb6172c\\REPORT_25_VAGUE_SIMULATIONS.md';
  let mdContent = `# Report: 25 Vague & Slang Customer Test Simulations\n\n`;
  mdContent += `**Overall Result**: ${passedCount}/25 Passed (**${passRate}% Pass Rate**)\n`;
  mdContent += `**Execution Time**: ${new Date().toISOString()}\n\n`;
  mdContent += `| ID | Query / Input | Bot | Description | Single Asterisks | Pass/Fail |\n`;
  mdContent += `|---|---|---|---|---|---|\n`;

  for (const r of results) {
    mdContent += `| ${r.id} | \`${r.input}\` | ${r.bot} | ${r.description} | ${r.hasDoubleAsterisks ? "❌ Double" : "✅ Single"} | ${r.passed ? "✅ PASS" : "❌ FAIL"} |\n`;
  }

  mdContent += `\n\n## Detailed Responses\n\n`;
  for (const r of results) {
    mdContent += `### Case ${r.id}: "${r.input}" (${r.bot})\n`;
    mdContent += `**Status**: ${r.passed ? "✅ PASS" : "❌ FAIL"}\n\n`;
    mdContent += `**Response**:\n\`\`\`text\n${r.reply}\n\`\`\`\n\n---\n\n`;
  }

  fs.writeFileSync(reportPath, mdContent, 'utf8');
  console.log(`Report written to REPORT_25_VAGUE_SIMULATIONS.md`);
  process.exit(0);
}

run25VagueSimulations();
