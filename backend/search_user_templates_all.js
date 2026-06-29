const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\krish\\.gemini\\antigravity\\brain';
const outputFile = 'c:\\Users\\krish\\OneDrive\\Desktop\\FINAL PROJ\\GLX2\\backend\\template_chat_history_all.txt';
const writer = fs.createWriteStream(outputFile, { encoding: 'utf8' });

async function searchFile(filePath, folderName) {
  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'USER_INPUT') {
          const contentLower = obj.content.toLowerCase();
          if (contentLower.includes('template') || contentLower.includes('marathi') || contentLower.includes('chef') || contentLower.includes('kitchen') || contentLower.includes('supplier')) {
            writer.write(`[Folder: ${folderName}] [Step: ${obj.step_index}]\n`);
            writer.write(`${obj.content}\n`);
            writer.write("--------------------------------------------------\n");
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
}

async function run() {
  console.log("Scanning all folders...");
  let items = [];
  try {
    items = fs.readdirSync(brainDir);
  } catch (err) {
    console.error("Cannot read brain dir:", err);
    return;
  }

  for (const item of items) {
    if (item === 'tempmediaStorage') continue;
    const fullPath = path.join(brainDir, item);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const transcriptPath = path.join(fullPath, '.system_generated', 'logs', 'transcript_full.jsonl');
        if (fs.existsSync(transcriptPath)) {
          await searchFile(transcriptPath, item);
        }
      }
    } catch (e) {}
  }
  writer.end();
  console.log("All scans completed.");
}

run();
