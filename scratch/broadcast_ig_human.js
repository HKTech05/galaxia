const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const https = require("https");
const prisma = new PrismaClient();

const tokens = {
  ambrose_ig: "EAAazkOMLfJQBResB5i7axERZBJig9Xdz6wLojnTQxX6zAEXEkUYmFxkpYcz8Vwfo28zylUNStNkCeZAGT4fV7aVc8jvPWiYWn5rxYiWy7MrkOSfObf47NKW32EkZCYPXeMeIHJwMIu38vNLcnB4WTKAGU5lbyotz7QcOUwGzKjb4NKH5Lo7Xpn4Tpz8PjpRhQlJvFeM2ILAWwFnhzr6EAZDZD",
  amstelnest_ig: "EAAazkOMLfJQBRWC0pXvjpvZA4Pj57YiINMRlGuPS16wveUoZCkBVyZCRgrQ4pWNsSFaLRWDXBAvDYJByKw49HR6XzXdxNwiMiaHwGe8qZAcZCYHcZBsHS95FT8EKB0IBFl8ZBUpmleEHo1lxSsHbgfKdQGF5COVFLw7USI9YYg9AP2g0wUXZCbSyCxtQP8lTYMqYqfoveZBPzZCsPZBlGHjhRtuGQZDZD",
  heavenlyvilla_ig: "EAAazkOMLfJQBRYL1laSektLjrDidK6cZAHatTdEQ3CufXkLEZBHmDBVh56nkbKTUfltR79LeZAPUlFNEOP1iLQNvuHrWZCtJORxboeReH7Xr64C5EhAYToLOZA9BZCSPOMIlaiOXc4766LNIaYahSZAO5Ua4WNklKU4ES7dWlUhakhsZBggvgHr7507wKWXAjov2lSE2UfRH0WspPAU5ec0cwgZDZD",
  hillview_ig: "EAAazkOMLfJQBRfvpiM7EKuVfmZBbu3FXGx10Vzf7yJ2CZAoazmbNM3AkOVOdwQX5Fht6lgS1y7B7NTqzt7bIVqZClowfKfqGXABr4iMbMhBLBlJBSHQVvB1DudunabVGvdhrRyr4bUbFa8CVQlwOB21ncDbp8tz5uNk7nJyZBWqGBfdVpRBlSu76CVxtHJeT6ftl0bUmBdYp5J4BnWJWqQZDZD",
  laparaiso_ig: "EAAazkOMLfJQBRQTFM6cBualUgR1dQi2x0PNAtH8XirZB5TizQjW5ZBJyG0v3rbKTBWXtjWl5it8hVd8dGVlr8KY3HUApldIdY4jjxbt7zFfaX34wL7G1vRubXIAKQyAqtnKLlt9TD3an3HFGDGa0L7x0bZBdlZBG4NAghwWlgzplL6YbF2IV7aeUB4toxTYc9lRGxLf4JDVx4zTSdIAXJQZDZD",
  mountview_ig: "EAAazkOMLfJQBRTKSoZBo99mofixAal8XGIkZBcZCNvraoy9shLaZCNAKzNYoHrOf3h7j2uvRbQ0ZCmSBfRjQCPZATTFMpRKAACWXZAz5cRR4ZARRQ2IJAjmmwhWKBGs3JkpKFBBzkP6rOSUWRLF9LSQ8GZAMYRWFGk110GZBmxHRY3i4WooOWBhdZBBpB0avTsQzlJ36YKp6MbENTgUDygiVHAT8wZDZD"
};

const MSG_AMSTEL = `Hello! 👋

Thank you for reaching out to Amstel Nest. If you have any queries or need further assistance, please WhatsApp us at +91 99877 34458.

You can also visit our website for details and instant bookings:
https://www.galaxiaresorts.com/staycation

We look forward to hosting you!`;

const MSG_OTHER = `Hello! 👋

Thank you for reaching out to us. If you have any queries or need further assistance, please WhatsApp us at +91 8169519564.

You can also visit our website for details and instant bookings:
https://www.galaxiaresorts.com/staycation

We look forward to hosting you!`;

function sendInstagramDM(recipientId, text, token) {
  return new Promise((resolve) => {
    if (!token) return resolve({ success: false, error: "No token provided" });
    
    const postData = JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text }
    });

    const options = {
      hostname: "graph.facebook.com",
      path: "/v21.0/me/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "Authorization": `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            resolve({ success: false, error: json.error.message });
          } else {
            resolve({ success: true, response: json });
          }
        } catch (e) {
          resolve({ success: false, error: "Invalid JSON" });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function processSession(s) {
  const messageToSend = (s.botType === "amstelnest_ig") ? MSG_AMSTEL : MSG_OTHER;
  const token = tokens[s.botType];
  const igsid = s.customerPhone;

  const apiRes = await sendInstagramDM(igsid, messageToSend, token);

  await prisma.chatMessage.create({
    data: {
      sessionId: s.sessionId,
      role: "assistant",
      message: messageToSend,
      isHuman: true
    }
  });

  await prisma.chatSession.update({
    where: { sessionId: s.sessionId },
    data: {
      lastMessage: messageToSend.substring(0, 500),
      lastMessageAt: new Date(),
      updatedAt: new Date()
    }
  });

  return { botType: s.botType, apiSuccess: apiRes.success, error: apiRes.error };
}

async function main() {
  console.log("Starting fast concurrent broadcast...\n");

  const sessions = await prisma.chatSession.findMany({
    where: {
      isHumanActive: true,
      platform: "instagram",
      botType: {
        in: ["amstelnest_ig", "ambrose_ig", "laparaiso_ig", "mountview_ig", "heavenlyvilla_ig", "hillview_ig"]
      }
    },
    orderBy: { botType: "asc" }
  });

  console.log(`Found ${sessions.length} target sessions.`);

  const summary = {
    amstelnest_ig: { total: 0, apiSuccess: 0, apiFail: 0 },
    ambrose_ig: { total: 0, apiSuccess: 0, apiFail: 0 },
    laparaiso_ig: { total: 0, apiSuccess: 0, apiFail: 0 },
    mountview_ig: { total: 0, apiSuccess: 0, apiFail: 0 },
    heavenlyvilla_ig: { total: 0, apiSuccess: 0, apiFail: 0 },
    hillview_ig: { total: 0, apiSuccess: 0, apiFail: 0 }
  };

  sessions.forEach(s => {
    if (summary[s.botType]) summary[s.botType].total++;
  });

  const chunkSize = 25;
  let totalProcessed = 0;

  for (let i = 0; i < sessions.length; i += chunkSize) {
    const chunk = sessions.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(s => processSession(s)));

    results.forEach(r => {
      totalProcessed++;
      if (r.apiSuccess) {
        if (summary[r.botType]) summary[r.botType].apiSuccess++;
      } else {
        if (summary[r.botType]) summary[r.botType].apiFail++;
      }
    });

    console.log(`Progress: ${totalProcessed}/${sessions.length} sessions processed.`);
  }

  console.log("\n==============================================");
  console.log("BROADCAST COMPLETED SUCCESSFULLY");
  console.log("==============================================");
  console.log(`Total Staycation Human Conversations Processed: ${sessions.length}`);
  console.log(`Database Records Updated & Saved: ${totalProcessed}`);
  console.log("\nBreakdown by Property:");
  console.log(JSON.stringify(summary, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal Error during broadcast:", err);
  await prisma.$disconnect();
});
