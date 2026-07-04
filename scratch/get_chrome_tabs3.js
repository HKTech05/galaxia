const http = require("http");

const req = http.request("http://127.0.0.1:9222/json", {
  headers: {
    "Host": "localhost:9222"
  }
}, (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Raw body:", body.substring(0, 2000));
  });
});

req.on("error", (e) => console.error("HTTP error:", e.message));
req.end();
