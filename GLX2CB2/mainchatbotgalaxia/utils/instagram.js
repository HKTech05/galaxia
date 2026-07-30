const axios = require("axios");

async function sendInstagramReply(recipientId, response, botType, accessToken) {
  try {
    if (!accessToken) {
      console.warn(`[Instagram] Missing access token for botType: ${botType}`);
      return;
    }
    const messageText = typeof response === "string" ? response : (response.message || "Thank you for contacting Galaxia!");
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
      }
    );
    console.log(`[Instagram] Reply sent to ${recipientId}`);
  } catch (err) {
    console.error("[Instagram] Error sending reply:", err.response?.data || err.message);
  }
}

module.exports = { sendInstagramReply };
