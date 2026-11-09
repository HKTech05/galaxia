require('dotenv').config();
const fs = require('fs');
const debugFile = './data/last_request_debug.json';

if (!fs.existsSync(debugFile)) {
  console.log('No debug file found');
  process.exit(0);
}

const d = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
console.log('BOT TYPE:', d.botType);
console.log('USER MSG:', d.userMessage);
console.log('TIMESTAMP:', d.timestamp);
console.log('CACHED:', d.cached);
console.log('\n=== RETRIEVED KNOWLEDGE ===');
console.log((d.retrievedKnowledge || '').substring(0, 3000));
console.log('\n=== SYSTEM PROMPT (search for renovation/unavailable) ===');
const msgs = d.messages || [];
const sysMsg = msgs.find(m => m.role === 'system');
if (sysMsg) {
  const content = sysMsg.content;
  // Search for renovation/unavailable
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('renovation') || 
        line.toLowerCase().includes('unavailable') ||
        line.toLowerCase().includes('love nest') ||
        line.toLowerCase().includes('baywatch')) {
      console.log(`Line ${i}: ${line.substring(0, 200)}`);
    }
  });
}

console.log('\n=== CONVERSATION HISTORY (last 6 msgs) ===');
const nonSys = msgs.filter(m => m.role !== 'system');
nonSys.slice(-6).forEach(m => {
  console.log(`${m.role}: ${(m.content || '').substring(0, 400)}`);
  console.log('---');
});

console.log('\n=== AI REPLY ===');
console.log(d.reply);

// Check FAQ cache size
const cacheFile = './data/faq_cache.json';
if (fs.existsSync(cacheFile)) {
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const keys = Object.keys(cache);
  console.log('\n=== FAQ CACHE: ' + keys.length + ' entries ===');
  // Check for any DD love nest entries
  keys.filter(k => k.includes('love') || k.includes('nest') || k.includes('baywatch')).forEach(k => {
    console.log('CACHED KEY:', k, '-> VALUE:', cache[k].substring(0, 200));
  });
}
