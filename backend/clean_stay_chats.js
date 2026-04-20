const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// Delete ONLY staycation booking confirmation chats.
// Staycation uses STAY1 phone number ID, which falls back to the global WHATSAPP_PHONE_NUMBER_ID (1015208551685641).
// DD uses DD_WHATSAPP_PHONE_NUMBER_ID (1117204771469353) — do NOT touch those.
// Also, the logConfirmationToChat function stores 'celebration' as bot_type for all confirmations.
// So we identify staycation chats by: phone_number_id = STAY1 (which is global 1015208551685641) AND messages contain booking confirmation text.

async function cleanStaycationChats() {
    // The STAY1 phone number ID falls back to WHATSAPP_PHONE_NUMBER_ID since STAY1 specific env is not set
    const stay1PhoneNumberId = "1015208551685641";
    const ddPhoneNumberId = "1117204771469353";
    
    // Find sessions that used the stay1 phone number AND have booking confirmation messages
    // These are sessions created by sendStaycationBookingConfirmation
    const sessions = await p.$queryRawUnsafe(
        `SELECT session_id, customer_phone, display_name, phone_number_id, last_message 
         FROM chat_sessions 
         WHERE phone_number_id = $1 
         AND last_message LIKE '%Booking Confirmed%'`,
        stay1PhoneNumberId
    );
    
    console.log(`Found ${sessions.length} staycation confirmation chat sessions to delete:`);
    for (const s of sessions) {
        console.log(`  - ${s.session_id} (${s.display_name || s.customer_phone})`);
    }
    
    if (sessions.length === 0) {
        console.log("No staycation confirmation chats found. Nothing to delete.");
        await p.$disconnect();
        return;
    }
    
    const sessionIds = sessions.map(s => s.session_id);
    
    // Delete messages first
    for (const sid of sessionIds) {
        const delMsgs = await p.$queryRawUnsafe(
            `DELETE FROM chat_messages WHERE session_id = $1`, sid
        );
        console.log(`Deleted messages for session ${sid}`);
    }
    
    // Delete sessions
    for (const sid of sessionIds) {
        await p.$queryRawUnsafe(
            `DELETE FROM chat_sessions WHERE session_id = $1`, sid
        );
        console.log(`Deleted session ${sid}`);
    }
    
    console.log(`\n✅ Cleaned up ${sessions.length} staycation confirmation chat sessions.`);
    console.log(`DD chats (phone_number_id=${ddPhoneNumberId}) were NOT touched.`);
    
    // Verify DD chats are intact
    const ddCount = await p.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM chat_sessions WHERE phone_number_id = $1`, ddPhoneNumberId
    );
    console.log(`DD chat sessions remaining: ${ddCount[0]?.cnt || 0}`);
    
    await p.$disconnect();
}

cleanStaycationChats().catch(e => { console.error(e); process.exit(1); });
