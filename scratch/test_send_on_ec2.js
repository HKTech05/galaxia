require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const axios = require("axios");

const token = process.env.IG_TOKEN_AMSTELNEST;
const recipientId = "1566594468410630"; // dinesh.chhabriya

async function testInstagramHost() {
  console.log("=== Testing graph.instagram.com/me/messages ===");
  try {
    const res = await axios.post(
      `https://graph.instagram.com/v21.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: "Test message via graph.instagram.com" }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("SUCCESS:", res.status, res.data);
  } catch (err) {
    console.error("FAILED:", err.response?.status, JSON.stringify(err.response?.data || err.message));
  }
}

async function testFacebookHost() {
  console.log("\n=== Testing graph.facebook.com/me/messages ===");
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: "Test message via graph.facebook.com" }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("SUCCESS:", res.status, res.data);
  } catch (err) {
    console.error("FAILED:", err.response?.status, JSON.stringify(err.response?.data || err.message));
  }
}

async function main() {
  console.log("Token preview:", token ? token.substring(0, 15) + "..." : "undefined");
  await testInstagramHost();
  await testFacebookHost();
}

main();
