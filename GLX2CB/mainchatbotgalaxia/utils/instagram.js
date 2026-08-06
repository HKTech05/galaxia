const axios = require("axios");

async function sendInstagramReply(recipientId, response, botType, accessToken) {
  try {
    if (!accessToken) {
      console.warn(`[Instagram] Missing access token for botType: ${botType}`);
      return;
    }
    const messageText = typeof response === "string" ? response : (response.message || "Thank you for contacting Galaxia!");
    const options = (typeof response === "object" && response.options) ? response.options : [];
    const host = accessToken.startsWith("IGAA") ? "https://graph.instagram.com" : "https://graph.facebook.com";

    // Build message payload with quick replies if options exist
    const messagePayload = { text: messageText };

    if (options.length > 0 && options.length <= 13) {
      // Instagram supports up to 13 quick replies, each title max 20 chars
      messagePayload.quick_replies = options.map(opt => ({
        content_type: "text",
        title: (opt.label || opt.value || "Option").substring(0, 20),
        payload: opt.value || opt.label || "unknown",
      }));
    }

    await axios.post(
      `${host}/v21.0/me/messages?access_token=${accessToken}`,
      {
        recipient: { id: recipientId },
        message: messagePayload,
      }
    );
    console.log(`[Instagram] Reply sent to ${recipientId} via ${host} (${options.length} quick replies)`);
  } catch (err) {
    console.error("[Instagram] Error sending reply:", err.response?.data || err.message);
  }
}

async function sendInstagramText(recipientId, text, accessToken) {
  return sendInstagramReply(recipientId, { message: text, options: [] }, "custom", accessToken);
}

module.exports = { sendInstagramReply, sendInstagramText };
