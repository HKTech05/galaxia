const axios = require("axios");

async function sendInstagramReply(recipientId, response, botType, accessToken) {
  try {
    if (!accessToken) {
      console.warn(`[Instagram] Missing access token for botType: ${botType}`);
      return;
    }
    const messageText = typeof response === "string" ? response : (response.message || "Thank you for contacting Galaxia!");
    const host = accessToken.startsWith("IGAA") ? "https://graph.instagram.com" : "https://graph.facebook.com";
    await axios.post(
      `${host}/v21.0/me/messages?access_token=${accessToken}`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
      }
    );
    console.log(`[Instagram] Reply sent to ${recipientId} via ${host}`);
  } catch (err) {
    console.error("[Instagram] Error sending reply:", err.response?.data || err.message);
  }
}

async function sendInstagramText(recipientId, text, accessToken) {
  return sendInstagramReply(recipientId, { message: text }, "custom", accessToken);
}

module.exports = { sendInstagramReply, sendInstagramText };

