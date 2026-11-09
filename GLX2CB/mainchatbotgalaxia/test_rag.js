require('dotenv').config();
const ks = require('./services/ai/KnowledgeService');

async function test() {
  console.log('=== TESTING RAG SEARCH FOR "love nest" ===\n');
  
  const result = await ks.searchContext('love nest screen', 4, ['Digital Diaries', 'General']);
  
  console.log('Number of matches:', result.matches.length);
  console.log('Search method:', result.searchMethod || 'unknown');
  console.log('\n--- MATCHES ---');
  result.matches.forEach((m, i) => {
    console.log(`\nMatch ${i+1}: [${m.filePath}] score=${m.score}`);
    console.log('Content preview:', m.content.substring(0, 300));
    console.log('---');
  });
  
  // Check if any match contains renovation/unavailable
  const hasRenovation = result.matches.some(m => 
    m.content.toLowerCase().includes('renovation') || 
    m.content.toLowerCase().includes('unavailable')
  );
  console.log('\n=== CONTAINS RENOVATION/UNAVAILABLE TEXT:', hasRenovation, '===');
  
  // Also check the full context
  if (result.context.toLowerCase().includes('renovation')) {
    console.log('WARNING: Full context contains "renovation"!');
  }
  if (result.context.toLowerCase().includes('unavailable')) {
    console.log('WARNING: Full context contains "unavailable"!');
  }
  
  // Also check session summaries file
  const fs = require('fs');
  const summFile = './data/session_summaries.json';
  if (fs.existsSync(summFile)) {
    const summ = fs.readFileSync(summFile, 'utf8');
    console.log('\n=== SESSION SUMMARIES ===');
    console.log(summ.substring(0, 500));
    if (summ.includes('renovation') || summ.includes('unavailable')) {
      console.log('WARNING: Summaries contain renovation/unavailable!');
    }
  }
  
  // Check file_indices.json
  const idxFile = './data/file_indices.json';
  if (fs.existsSync(idxFile)) {
    const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
    console.log('\n=== FILE INDEX ENTRIES (DD related) ===');
    Object.keys(idx).filter(k => k.includes('Digital') || k.includes('Baywatch') || k.includes('backup')).forEach(k => {
      console.log(k, '->', JSON.stringify(idx[k]));
    });
  } else {
    console.log('\n=== file_indices.json DOES NOT EXIST ===');
  }
}

test().catch(e => console.error('ERROR:', e.message)).finally(() => process.exit(0));
