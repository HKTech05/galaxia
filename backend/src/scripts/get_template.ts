import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main() {
    const token = process.env.WHATSAPP_TOKEN;
    const wabaId = '1498006532042145';
    
    if (!token) {
        console.error("WHATSAPP_TOKEN is not defined in .env");
        return;
    }

    const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=hospitality_checkin_notification`;
    console.log(`Fetching template from ${url}...`);
    
    try {
        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await res.json();
        console.log("Template Data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error fetching template:", err);
    }
}

main();
