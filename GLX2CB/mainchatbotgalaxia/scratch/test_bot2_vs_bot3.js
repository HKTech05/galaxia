require('dotenv').config();
const chatbotService = require('../services/ai/ChatbotService');

async function testAmbiguousQueries() {
  console.log('--- QUERY A: "is it available on 26th July?" on Bot 2 ---');
  const rA = await chatbotService.processMessage('ambig_a_' + Date.now(), 'is it available on 26th July?', null, null, 'amstel_nest');
  console.log('REPLY A:\n', rA.reply);

  console.log('\n--- QUERY B: "is standard cottage available on 26th July?" on Bot 2 ---');
  const rB = await chatbotService.processMessage('ambig_b_' + Date.now(), 'is standard cottage available on 26th July?', null, null, 'amstel_nest');
  console.log('REPLY B:\n', rB.reply);

  console.log('\n--- QUERY C: "is santorini cottage available on 26th July?" on Bot 2 ---');
  const rC = await chatbotService.processMessage('ambig_c_' + Date.now(), 'is santorini cottage available on 26th July?', null, null, 'amstel_nest');
  console.log('REPLY C:\n', rC.reply);

  process.exit(0);
}

testAmbiguousQueries();
