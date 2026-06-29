const fs = require('fs');
const path = require('path');

const steps = [15, 18, 21, 33, 48, 57];
const subagentDir = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\2403b294-f270-43f6-a3a2-7bdca3e78dee';

for (const step of steps) {
  const file = path.join(subagentDir, '.system_generated', 'steps', String(step), 'output.txt');
  if (fs.existsSync(file)) {
    console.log(`=== STEP ${step} ===`);
    console.log(fs.readFileSync(file, 'utf8').substring(0, 1500));
    console.log("------------------------------------------");
  }
}
