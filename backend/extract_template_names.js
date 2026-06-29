const fs = require('fs');
const path = require('path');

const subagentDir = 'C:\\Users\\krish\\.gemini\\antigravity\\brain\\2403b294-f270-43f6-a3a2-7bdca3e78dee';

function checkFile(step) {
  const filePath = path.join(subagentDir, '.system_generated', 'steps', String(step), 'output.txt');
  if (fs.existsSync(filePath)) {
    console.log(`=== Matches in Step ${step} ===`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('button') || line.includes('link') || line.includes('StaticText')) {
        if (!line.includes('Meta') && !line.includes('facebook') && !line.includes('navigation') && !line.includes('Breadcrumb')) {
          console.log(line.trim());
        }
      }
    }
  }
}

checkFile(33);
checkFile(48);
checkFile(57);
