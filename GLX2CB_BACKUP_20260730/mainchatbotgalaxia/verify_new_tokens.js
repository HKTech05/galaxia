require('dotenv').config({ path: '/home/ec2-user/galaxia/wa-chatbot/.env' });
const https = require('https');

const tokens = [
  { name: "Digital Diaries", token: process.env.INSTAGRAM_TOKEN },
  { name: "Mount View", token: process.env.IG_TOKEN_MOUNTVIEW },
  { name: "Hill View", token: process.env.IG_TOKEN_HILLVIEW },
  { name: "Heavenly Villa", token: process.env.IG_TOKEN_HEAVENLYVILLA },
  { name: "Ambrose", token: process.env.IG_TOKEN_AMBROSE },
  { name: "La Paraiso", token: process.env.IG_TOKEN_LAPARAISO },
  { name: "Amstel Nest", token: process.env.IG_TOKEN_AMSTELNEST }
];

async function verifyToken(item) {
  return new Promise((resolve) => {
    if (!item.token) {
      console.log(`❌ ${item.name}: No token found in .env`);
      return resolve();
    }
    const host = item.token.startsWith("IGAA") ? "https://graph.instagram.com" : "https://graph.facebook.com";
    const url = `${host}/v21.0/me?fields=id,username,name&access_token=${item.token}`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            console.log(`❌ ${item.name}: ${data.error.message}`);
          } else {
            console.log(`✅ ${item.name}: ID=${data.id} Username=@${data.username || 'N/A'} Name="${data.name || 'N/A'}"`);
          }
        } catch (e) {
          console.log(`❌ ${item.name}: Parse error - ${body}`);
        }
        resolve();
      });
    }).on('error', (e) => {
      console.log(`❌ ${item.name}: HTTP error - ${e.message}`);
      resolve();
    });
  });
}

(async () => {
  console.log('=== VERIFYING ALL 7 NEW IGAA TOKENS WITH GRAPH INSTAGRAM API ===\n');
  for (const item of tokens) {
    await verifyToken(item);
  }
  console.log('\nVerification complete.');
})();
