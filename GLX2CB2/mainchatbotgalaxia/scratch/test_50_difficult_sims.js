require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chatbotService = require('../services/ai/ChatbotService');

// 50 Vague, Contextless, Slang-Heavy, Difficult Customer Queries (BOT 2 & BOT 3 ONLY)
const testCases = [
  { id: 1, name: "Date only '29'", bot: "amstel_nest", input: "29" },
  { id: 2, name: "Vague 'kitna padega'", bot: "amstel_nest", input: "kitna padega" },
  { id: 3, name: "Slang 'bhai room chahiye'", bot: "amstel_nest", input: "bhai room chahiye" },
  { id: 4, name: "Date only '14th'", bot: "staycation", input: "14th" },
  { id: 5, name: "Vague 'sab full hai kya?'", bot: "amstel_nest", input: "sab full hai kya?" },
  { id: 6, name: "Slang discount 'disc do na thoda'", bot: "amstel_nest", input: "disc do na thoda" },
  { id: 7, name: "Slang 'khana free hai?'", bot: "amstel_nest", input: "khana free hai?" },
  { id: 8, name: "Fragment '2 adults 10th'", bot: "amstel_nest", input: "2 adults 10th" },
  { id: 9, name: "Slang date 'sunday ko kya scene hai'", bot: "staycation", input: "sunday ko kya scene hai" },
  { id: 10, name: "Impatient 'batao na'", bot: "amstel_nest", input: "batao na" },
  { id: 11, name: "Hookah slang 'hookah milega kya waha?'", bot: "amstel_nest", input: "hookah milega kya waha?" },
  { id: 12, name: "Alcohol slang 'daaru peena hai'", bot: "staycation", input: "daaru peena hai" },
  { id: 13, name: "Complaint 'review me toh ganda bol rahe log'", bot: "staycation", input: "review me toh ganda bol rahe log" },
  { id: 14, name: "Waterfall vague 'waterfall kitna door hai'", bot: "amstel_nest", input: "waterfall kitna door hai" },
  { id: 15, name: "Checkout slang '12 baje ke baad nikle toh?'", bot: "amstel_nest", input: "12 baje ke baad nikle toh?" },
  { id: 16, name: "Power query 'light jaati hai kya karjat me'", bot: "staycation", input: "light jaati hai kya karjat me" },
  { id: 17, name: "Cash slang 'cash dunga waha aake'", bot: "amstel_nest", input: "cash dunga waha aake" },
  { id: 18, name: "Advance query 'advance kitna bharna padega'", bot: "staycation", input: "advance kitna bharna padega" },
  { id: 19, name: "Cancellation slang 'cancel karna hai'", bot: "amstel_nest", input: "cancel karna hai" },
  { id: 20, name: "Transfer slang 'shift kar do date mere'", bot: "staycation", input: "shift kar do date mere" },
  { id: 21, name: "Screenshot slang 'booking kar di maine screenshot dekho'", bot: "amstel_nest", input: "booking kar di maine screenshot dekho" },
  { id: 22, name: "Caretaker slang 'caretaker ka no de'", bot: "amstel_nest", input: "caretaker ka no de" },
  { id: 23, name: "Arriving slang '15 min me poch rahe hai'", bot: "staycation", input: "15 min me poch rahe hai" },
  { id: 24, name: "Existing booking slang 'booking h meri baat karni hai'", bot: "staycation", input: "booking h meri baat karni hai" },
  { id: 25, name: "Weekday flexi slang '5 baje aayenge sham ko monday'", bot: "amstel_nest", input: "5 baje aayenge sham ko monday" },
  { id: 26, name: "Pool slang 'pool clean hai na?'", bot: "staycation", input: "pool clean hai na?" },
  { id: 27, name: "Toiletries slang 'brush milega kya?'", bot: "amstel_nest", input: "brush milega kya?" },
  { id: 28, name: "Deposit slang 'deposit wapas kab milega'", bot: "staycation", input: "deposit wapas kab milega" },
  { id: 29, name: "Food slang 'non veg mangwa sakte hai?'", bot: "amstel_nest", input: "non veg mangwa sakte hai?" },
  { id: 30, name: "Jain food query 'jain khana milega?'", bot: "amstel_nest", input: "jain khana milega?" },
  { id: 31, name: "Group count '8 log aa rahe hai'", bot: "amstel_nest", input: "8 log aa rahe hai" },
  { id: 32, name: "Menu change 15+ group '15 log hai khana change karoge?'", bot: "amstel_nest", input: "15 log hai khana change karoge?" },
  { id: 33, name: "Baby food query 'bacche ka khana?'", bot: "staycation", input: "bacche ka khana?" },
  { id: 34, name: "Late lunch query 'khana late ho gaya toh?'", bot: "amstel_nest", input: "khana late ho gaya toh?" },
  { id: 35, name: "Greeting single word 'hi'", bot: "amstel_nest", input: "hi" },
  { id: 36, name: "Call request Bot 2 'call karu kispe'", bot: "amstel_nest", input: "call karu kispe" },
  { id: 37, name: "Call request Bot 3 'call karu kispe'", bot: "staycation", input: "call karu kispe" },
  { id: 38, name: "Collab slang 'collab karna hai instagram pe'", bot: "staycation", input: "collab karna hai instagram pe" },
  { id: 39, name: "Human escalation slang 'admin se baat karao'", bot: "amstel_nest", input: "admin se baat karao" },
  { id: 40, name: "Date only '25th'", bot: "staycation", input: "25th" },
  { id: 41, name: "Cheapest query 'sabse sasta wala batao'", bot: "staycation", input: "sabse sasta wala batao" },
  { id: 42, name: "Family query 'family ke liye konsa accha hai'", bot: "amstel_nest", input: "family ke liye konsa accha hai" },
  { id: 43, name: "Station transport 'station se kaise aaye'", bot: "staycation", input: "station se kaise aaye" },
  { id: 44, name: "Decoration query 'cake decoration karoge?'", bot: "amstel_nest", input: "cake decoration karoge?" },
  { id: 45, name: "High tea query 'high tea me kya milega'", bot: "amstel_nest", input: "high tea me kya milega" },
  { id: 46, name: "Canal swimming 'boating canal me tair sakte hai?'", bot: "amstel_nest", input: "boating canal me tair sakte hai?" },
  { id: 47, name: "Monsoon query 'monsoon me kaisa hai'", bot: "staycation", input: "monsoon me kaisa hai" },
  { id: 48, name: "Early checkin slang '6 baje subah checkin kar sakte hai?'", bot: "amstel_nest", input: "6 baje subah checkin kar sakte hai?" },
  { id: 49, name: "GST query 'gst extra hai kya'", bot: "staycation", input: "gst extra hai kya" },
  { id: 50, name: "Fragment '2 adults 1 night fri'", bot: "amstel_nest", input: "2 adults 1 night fri" }
];

async function run50DifficultSimulations() {
  console.log("=== STARTING 50 VAGUE & DIFFICULT CUSTOMER SIMULATIONS (BOT 2 & BOT 3 ONLY) ===");
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    const startTime = Date.now();
    console.log(`\n--------------------------------------------------`);
    console.log(`[SIM ${tc.id}/50] ${tc.name} | Bot: ${tc.bot}`);
    console.log(`Customer Input: "${tc.input}"`);

    try {
      const sessionId = `diff_sim_${tc.id}_${Date.now()}`;
      const res = await chatbotService.processMessage(sessionId, tc.input, null, null, tc.bot);
      const reply = res.reply || "";
      const latency = Date.now() - startTime;

      // Quality Checks:
      const hasDoubleAsterisks = reply.includes("**");
      const isNotEmpty = reply.trim().length > 10;
      const isSuccess = isNotEmpty && !hasDoubleAsterisks;

      if (isSuccess) {
        passedCount++;
      } else {
        failedCount++;
      }

      console.log(`Response Snippet:\n${reply.substring(0, 220)}...`);
      console.log(`Latency: ${latency}ms | Clean Formatting: ${!hasDoubleAsterisks ? "PASS" : "FAIL"}`);

      results.push({
        id: tc.id,
        name: tc.name,
        bot: tc.bot,
        input: tc.input,
        reply: reply,
        latency: latency,
        cleanFormatting: !hasDoubleAsterisks,
        status: isSuccess ? "PASS" : "FAIL"
      });
    } catch (err) {
      console.error(`[SIM ${tc.id}] ERROR:`, err.message);
      failedCount++;
      results.push({
        id: tc.id,
        name: tc.name,
        bot: tc.bot,
        input: tc.input,
        error: err.message,
        status: "FAIL"
      });
    }
  }

  console.log(`\n==================================================`);
  console.log(`=== 50 DIFFICULT SIMULATIONS SUMMARY ===`);
  console.log(`TOTAL SIMULATIONS: ${testCases.length}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log(`SUCCESS RATE: ${((passedCount / testCases.length) * 100).toFixed(1)}%`);
  console.log(`==================================================`);

  // Write full summary report artifact
  const reportPath = path.resolve(__dirname, "../../REPORT_50_DIFFICULT_SIMULATIONS.md");
  let markdown = `# 50 Difficult & Vague Customer Simulations Report (Bot 2 & Bot 3)\n\n`;
  markdown += `**Execution Timestamp**: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
  markdown += `**Total Simulations**: 50\n`;
  markdown += `**Passed**: ${passedCount}\n`;
  markdown += `**Failed**: ${failedCount}\n`;
  markdown += `**Success Rate**: ${((passedCount / testCases.length) * 100).toFixed(1)}%\n\n`;
  markdown += `| Sim ID | Scenario / Slang Type | Bot Target | Customer Query | Status | Formatting |\n`;
  markdown += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  results.forEach(r => {
    markdown += `| #${r.id} | ${r.name} | \`${r.bot}\` | "${r.input}" | **${r.status}** | ${r.cleanFormatting ? "Clean" : "Issues"} |\n`;
  });

  markdown += `\n\n## Detailed Responses Per Simulation\n\n`;
  results.forEach(r => {
    markdown += `### Simulation #${r.id}: ${r.name}\n`;
    markdown += `- **Bot Target**: \`${r.bot}\`\n`;
    markdown += `- **Customer Query**: "${r.input}"\n`;
    markdown += `- **Response**:\n\n${r.reply}\n\n---\n\n`;
  });

  fs.writeFileSync(reportPath, markdown, "utf8");
  console.log(`Saved detailed report to: ${reportPath}`);

  // Write JSON artifact
  fs.writeFileSync(
    path.resolve(__dirname, "test_50_diff_results.json"),
    JSON.stringify(results, null, 2),
    "utf8"
  );

  process.exit(0);
}

run50DifficultSimulations();
