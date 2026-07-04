const https = require("https");

const token = "EAAazkOMLfJQBRWC0pXvjpvZA4Pj57YiINMRlGuPS16wveUoZCkBVyZCRgrQ4pWNsSFaLRWDXBAvDYJByKw49HR6XzXdxNwiMiaHwGe8qZAcZCYHcZBsHS95FT8EKB0IBFl8ZBUpmleEHo1lxSsHbgfKdQGF5COVFLw7USI9YYg9AP2g0wUXZCbSyCxtQP8lTYMqYqfoveZBPzZCsPZBlGHjhRtuGQZDZD";
const recipientId = "1566594468410630"; // dinesh.chhabriya

function postMessage(host, path, bodyData) {
  return new Promise((resolve) => {
    const data = JSON.stringify(bodyData);
    const req = https.request({
      hostname: host,
      path: path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Authorization": `Bearer ${token}`
      }
    }, (res) => {
      let resData = "";
      res.on("data", c => resData += c);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(resData) }));
    });
    req.on("error", e => resolve({ status: 500, body: e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Testing graph.facebook.com /me/messages...");
  const resFB = await postMessage("graph.facebook.com", "/v21.0/me/messages", {
    recipient: { id: recipientId },
    message: { text: "test" }
  });
  console.log("FB Graph /me/messages result:", resFB);

  console.log("Testing graph.instagram.com /v21.0/me/messages...");
  const resIG = await postMessage("graph.instagram.com", "/v21.0/me/messages", {
    recipient: { id: recipientId },
    message: { text: "test" }
  });
  console.log("IG Graph /me/messages result:", resIG);
}

main();
