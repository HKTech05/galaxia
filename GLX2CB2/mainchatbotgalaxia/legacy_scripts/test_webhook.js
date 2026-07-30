const http = require("http");
const data = JSON.stringify({
  entry: [{
    changes: [{
      value: {
        messages: [{
          from: "918237309564",
          type: "text",
          text: { body: "hi" }
        }],
        metadata: { phone_number_id: "1117204771469353" }
      }
    }]
  }]
});

const req = http.request({
  hostname: "localhost",
  port: 4001,
  path: "/webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let body = "";
  res.on("data", (c) => body += c);
  res.on("end", () => console.log("Status:", res.statusCode, "Body:", body));
});
req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
