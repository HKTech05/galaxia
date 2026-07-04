const http = require("http");

http.get("http://127.0.0.1:9222/json/list", (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Raw body length:", body.length);
    console.log("Raw body:", body.substring(0, 1000));
  });
}).on("error", (e) => {
  console.error("HTTP error:", e.message);
});
