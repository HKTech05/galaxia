/* ═══════════════════════════════════════════════════════
   WhatsApp Webhook Handler — Vercel Serverless
   Proxies Meta webhook calls to the bot server on EC2
   ═══════════════════════════════════════════════════════ */

const BOT_SERVER = "http://65.1.183.241:4000/bot";

// GET — Meta webhook verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Forward verification to bot server
  const url = `${BOT_SERVER}/webhook?hub.mode=${mode}&hub.verify_token=${token}&hub.challenge=${challenge}`;
  const res = await fetch(url);
  const text = await res.text();
  return new Response(text, { status: res.status });
}

// POST — Incoming WhatsApp messages from Meta
export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("[Webhook] POST received, forwarding to bot server...");

    const res = await fetch(`${BOT_SERVER}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await res.text();
    console.log("[Webhook] Bot server responded:", res.status, text);
    return new Response(text, { status: res.status });
  } catch (err: any) {
    console.error("[Webhook] Error forwarding to bot:", err.message);
    return new Response("OK", { status: 200 }); // Always 200 to prevent Meta retries
  }
}
