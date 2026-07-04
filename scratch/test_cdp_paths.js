const http = require("http");

const paths = ["/", "/json", "/json/version", "/json/list", "/devtools/browser"];

paths.forEach(p => {
  const req = http.request(`http://127.0.0.1:9222${p}`, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => console.log(`${p} -> status: ${res.statusCode}, length: ${body.length}, content: ${body.substring(0, 100)}`));
  });
  req.on("error", e => console.log(`${p} -> error: ${e.message}`));
  req.end();
});
