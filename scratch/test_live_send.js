require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const { sendInstagramText, sendInstagramReply } = require("/home/ec2-user/galaxia/galaxia-whatsapp-bot23/galaxia-whatsapp-bot2/utils/instagram.js");

async function main() {
  console.log("=== Testing Amstel Nest Send with new IGAA Token ===");
  const tokenAmstel = process.env.IG_TOKEN_AMSTELNEST;
  console.log("Token preview:", tokenAmstel ? tokenAmstel.substring(0, 20) + "..." : "missing");
  
  // Test sending to dinesh.chhabriya (IGSID 1566594468410630)
  await sendInstagramText("1566594468410630", "Test message from Amstel Nest Bot with new token!", tokenAmstel);

  console.log("\n=== Testing Digital Diaries Send with new IGAA Token ===");
  const tokenDD = process.env.INSTAGRAM_TOKEN;
  console.log("Token preview:", tokenDD ? tokenDD.substring(0, 20) + "..." : "missing");
  await sendInstagramText("1339347205034262", "Test message from Digital Diaries Bot with new token!", tokenDD);
}

main();
