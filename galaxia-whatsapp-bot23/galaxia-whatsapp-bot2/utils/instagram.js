/**
 * Instagram DM message sender helpers
 * Uses Instagram Graph API to send text messages with optional quick replies.
 * 
 * Supports both:
 * 1. EAA... tokens (Facebook Page Access Tokens) via graph.facebook.com
 * 2. IGAA... tokens (Instagram User Access Tokens) via graph.instagram.com
 */

const axios = require("axios");

const IG_API_VERSION = "v21.0";

function getApiHost(token) {
  if (token && token.startsWith("EAA")) {
    return "https://graph.facebook.com";
  }
  return "https://graph.instagram.com";
}

/**
 * Send an Instagram DM reply based on the menu engine response.
 *
 * @param {string} recipientId  – Instagram-scoped user ID (IGSID)
 * @param {object} response     – Menu engine response { message, options, link?, image? }
 * @param {string} botType      – "celebration" or "staycation"
 * @param {string} customToken  – Property-specific token override
 */
async function sendInstagramReply(recipientId, response, botType = "celebration", customToken = null) {
  const token = customToken || process.env.INSTAGRAM_TOKEN;
  if (!token) {
    console.error("[Instagram] INSTAGRAM_TOKEN not set — cannot send reply.");
    return;
  }

  const host = getApiHost(token);
  const opts = response.options || [];

  // Build message text
  let msgText = response.message || "";
  if (response.link) {
    msgText += `\n\n🔗 ${response.link}`;
  }

  // Instagram quick replies (max 13 items, label max 20 chars)
  const quickReplies = opts.slice(0, 13).map(opt => ({
    content_type: "text",
    title: opt.label.substring(0, 20),
    payload: opt.value
  }));

  if (quickReplies.length > 0) {
    msgText += "\n\n👇 Please select one of the options below to proceed:";
  }

  const messagePayload = {
    text: msgText,
    ...(quickReplies.length > 0 && { quick_replies: quickReplies })
  };

  try {
    await axios.post(
      `${host}/${IG_API_VERSION}/me/messages`,
      {
        recipient: { id: recipientId },
        message: messagePayload
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`[Instagram] ✅ Reply sent to ${recipientId} via ${host}`);
  } catch (err) {
    console.error(
      `[Instagram] ❌ Failed to send reply to ${recipientId} via ${host}:`,
      err.response?.status,
      err.response?.data || err.message
    );
  }
}

/**
 * Send a plain text Instagram DM (for admin/human replies from dashboard).
 *
 * @param {string} recipientId  – Instagram-scoped user ID (IGSID)
 * @param {string} text         – Plain text message
 * @param {string} customToken  – Property-specific token override
 */
async function sendInstagramText(recipientId, text, customToken = null) {
  const token = customToken || process.env.INSTAGRAM_TOKEN;
  if (!token) {
    console.error("[Instagram] INSTAGRAM_TOKEN not set — cannot send reply.");
    return;
  }

  const host = getApiHost(token);

  try {
    await axios.post(
      `${host}/${IG_API_VERSION}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`[Instagram] ✅ Text sent to ${recipientId} via ${host}`);
  } catch (err) {
    console.error(
      `[Instagram] ❌ Failed to send text to ${recipientId} via ${host}:`,
      err.response?.status,
      err.response?.data || err.message
    );
  }
}

module.exports = { sendInstagramReply, sendInstagramText };
