/**
 * WhatsApp message sender helpers
 * Uses WhatsApp Cloud API to send text, interactive buttons, and list messages.
 */

const axios = require("axios");

function getCreds(botType, fallbackPhoneId) {
  let phoneId = fallbackPhoneId;
  let token = process.env.WHATSAPP_TOKEN;

  if (botType === "celebration") {
    phoneId = phoneId || process.env.WHATSAPP_CELEBRATION_PHONE_ID;
    token = process.env.WHATSAPP_CELEBRATION_TOKEN || token;
  } else {
    phoneId = phoneId || process.env.WHATSAPP_STAYCATION_PHONE_ID || process.env.WHATSAPP_PHONE_ID;
    token = process.env.WHATSAPP_STAYCATION_TOKEN || token;
  }

  return {
    url: `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
}

/**
 * Send a plain text message.
 */
async function sendText(to, text, creds) {
  await axios.post(creds.url, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  }, { headers: creds.headers });
}

/**
 * Send interactive button message (max 3 buttons).
 * Falls back to text-only if image header fails.
 */
async function sendButtons(to, bodyText, buttons, creds, imageUrl = null) {
  const rows = buttons.slice(0, 3).map((btn, i) => ({
    type: "reply",
    reply: { id: btn.value, title: btn.label.substring(0, 20) }
  }));

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: rows }
    }
  };

  if (imageUrl) {
    payload.interactive.header = {
      type: "image",
      image: { link: imageUrl }
    };
  }

  try {
    await axios.post(creds.url, payload, { headers: creds.headers });
  } catch (err) {
    if (imageUrl) {
      console.error("[WhatsApp] Image header failed, falling back to text-only:", err.response?.data || err.message);
      delete payload.interactive.header;
      await axios.post(creds.url, payload, { headers: creds.headers });
    } else {
      throw err;
    }
  }
}

/**
 * Send interactive list message (for 4+ options, max 10).
 */
async function sendList(to, bodyText, buttonLabel, options, creds) {
  const rows = options.slice(0, 10).map(opt => ({
    id: opt.value,
    title: opt.label.substring(0, 24),
    description: opt.description ? opt.description.substring(0, 72) : ""
  }));

  await axios.post(creds.url, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.substring(0, 20),
        sections: [{ title: "Options", rows }]
      }
    }
  }, { headers: creds.headers });
}

/**
 * Send an image message.
 * Falls back to text if sending image fails.
 */
async function sendImage(to, imageUrl, caption, creds) {
  try {
    await axios.post(creds.url, {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: imageUrl, caption: caption || "" }
    }, { headers: creds.headers });
  } catch (err) {
    console.error("[WhatsApp] sendImage failed, falling back to text:", err.response?.data || err.message);
    if (caption) {
      await sendText(to, caption, creds);
    }
  }
}

/**
 * Send the full chatbot response via WhatsApp.
 */
async function sendChatResponse(to, response, botType = "staycation", phoneId = "") {
  const creds = getCreds(botType, phoneId);
  const opts = response.options || [];
  const imageUrl = response.image;
  let msgText = response.message || "";

  if (response.link) {
    msgText += `\n\n🔗 ${response.link}`;
  }

  if (opts.length === 0) {
    // No options: Just image (if any) and text
    if (imageUrl) {
      await sendImage(to, imageUrl, msgText, creds);
    } else {
      await sendText(to, msgText, creds);
    }
  } else if (opts.length <= 3) {
    // 1-3 options: Buttons. Use image in header if present.
    await sendButtons(to, msgText, opts, creds, imageUrl);
  } else {
    // 4+ options: List. Image must be separate (Headers don't support image in List messages)
    if (imageUrl) {
      await sendImage(to, imageUrl, "", creds);
    }
    await sendList(to, msgText, "Choose an option", opts, creds);
  }
}

module.exports = { sendChatResponse };
