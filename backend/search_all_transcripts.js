const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\krish\\.gemini\\antigravity\\brain';
const outputStream = fs.createWriteStream('c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\search_results.txt');

async function searchFile(filePath) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
      lineNum++;
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('marathi') || lowerLine.includes('kitchen') || lowerLine.includes('chef') || lowerLine.includes('checklist')) {
        if (lowerLine.includes('template')) {
          outputStream.write(`Match in ${filePath}:${lineNum}\n`);
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'USER_INPUT') {
              outputStream.write(`[Step ${parsed.step_index}] USER_INPUT\n`);
              outputStream.write(`${parsed.content}\n`);
              outputStream.write("==================================================\n");
            } else if (parsed.type === 'PLANNER_RESPONSE') {
              const contentStr = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
              outputStream.write(`[Step ${parsed.step_index}] PLANNER_RESPONSE\n`);
              outputStream.write(`${contentStr.substring(0, 2000)}\n`);
              outputStream.write("==================================================\n");
            }
          } catch (e) {
            outputStream.write(`${line.substring(0, 500)}...\n`);
            outputStream.write("==================================================\n");
          }
        }
      }
    }
  } catch (err) {
    // Skip
  }
}

async function scanDir(dir) {
  let items = [];
  try {
    items = fs.readdirSync(dir);
  } catch (err) {
    return;
  }

  for (const item of items) {
    const fullPath = path.join(dir, item);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        await scanDir(fullPath);
      } else if (item.endsWith('.jsonl')) {
        await searchFile(fullPath);
      }
    } catch (err) {
      // Skip
    }
  }
}

async function run() {
  outputStream.write("Scanning brain directory for chat history...\n");
  await scanDir(brainDir);
  outputStream.write("Scan complete.\n");
  outputStream.end();
  console.log("Written results to search_results.txt");
}

run();
