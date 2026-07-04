require("dotenv").config({ path: "/home/ec2-user/galaxia/wa-chatbot/.env" });
const https = require("https");

const token = process.env.IG_TOKEN_AMBROSE;
const pageId = "1083649331499475"; // Ambrose

function subscribePage() {
  const url = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`;
  const postData = `subscribed_fields=messages&access_token=${encodeURIComponent(token)}`;

  const req = https.request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData)
    }
  }, res => {
    let body = "";
    res.on("data", chunk => body += chunk);
    res.on("end", () => console.log("Subscribe Ambrose Result:", body));
  });

  req.on("error", err => console.error("Subscribe Error:", err));
  req.write(postData);
  req.end();
}

subscribePage();
