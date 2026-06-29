const fs = require('fs');
const path = require('path');

function loadEnv() {
    const p = path.join(__dirname, '.env');
    if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const idx = trimmed.indexOf('=');
            if (idx > 0) {
                const key = trimmed.slice(0, idx).trim();
                let val = trimmed.slice(idx + 1).trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                process.env[key] = val;
            }
        }
    }
}

loadEnv();

async function main() {
    const token = process.env.WHATSAPP_TOKEN;
    const wabaId = '1498006532042145';

    const payload = {
        name: "kitchen_checklist_ready_v2",
        language: "en",
        category: "UTILITY",
        components: [
            {
                type: "BODY",
                text: "*Galaxia Resorts — Kitchen Requirements*\nDaily ingredients checklist for *{{1}}*:\n{{2}}\n\n-- Galaxia Resorts",
                example: {
                    body_text: [
                        [
                            "27 Jun 2026 (Dairy)",
                            "Milk (दूध) - 10 Litres\nPaneer (पनीर) - 5 kg"
                        ]
                    ]
                }
            }
        ]
    };

    console.log(`Sending POST to https://graph.facebook.com/v21.0/${wabaId}/message_templates...`);
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
