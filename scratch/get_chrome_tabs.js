const http = require("http");

http.get("http://127.0.0.1:9222/json", (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    try {
      const tabs = JSON.parse(body);
      console.log("=== Open Chrome Tabs ===");
      tabs.forEach((t, i) => {
        console.log(`[${i}] ${t.title}`);
        console.log(`    URL: ${t.url}`);
        console.log(`    WebSocket: ${t.webSocketDebuggerUrl}\n`);
      });
    } catch (e) {
      console.error("Error parsing JSON:", e.message);
    }
  });
}).on("error", (e) => {
  console.error("HTTP error:", e.message);
});
