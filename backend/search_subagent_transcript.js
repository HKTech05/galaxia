const fs = require('fs');

try {
  const filePath = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\2403b294-f270-43f6-a3a2-7bdca3e78dee\\.system_generated\\logs\\transcript.jsonl';
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      const obj = JSON.parse(line);
      if (obj.type === 'PLANNER_RESPONSE' || obj.type === 'USER_INPUT') {
        console.log(`[${obj.type}]`);
        console.log(obj.content);
        console.log("------------------------------------------");
      }
    }
  } else {
    console.log("Subagent transcript file not found.");
  }
} catch (err) {
  console.error("Error:", err);
}
