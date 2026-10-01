import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const chatbotUsers = [
    { username: "owner",       password: "owner123", role: "owner",                    displayName: "Owner",                   assignedNumbers: ["digital_diaries", "dd_instagram", "wa_staycation", "wa_amstelnest", "website", "ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
    { username: "test",        password: "test@123", role: "test_viewer",              displayName: "Test Account",            assignedNumbers: ["digital_diaries", "dd_instagram", "wa_staycation", "wa_amstelnest", "website", "ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
    { username: "stay123",     password: "stay123",  role: "staycation_call_manager",  displayName: "Staycation Call Manager", assignedNumbers: ["wa_staycation", "wa_amstelnest", "website", "ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
    { username: "staycation1", password: "stay123",  role: "chatbot_admin",            displayName: "Staycation 1 Admin",      assignedNumbers: ["wa_staycation", "wa_amstelnest", "website", "ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
    { username: "staycation2", password: "stay123",  role: "chatbot_admin",            displayName: "Staycation 2 Admin",      assignedNumbers: ["wa_staycation"] },
    { username: "ddadmin",     password: "dd123",    role: "chatbot_admin",            displayName: "Digital Diaries Admin",   assignedNumbers: ["digital_diaries", "dd_instagram", "website"] },
    { username: "igadmin",     password: "ig123",    role: "chatbot_admin",            displayName: "IG Admin",                assignedNumbers: ["ig_ambrose", "ig_amstelnest", "ig_laparaiso", "ig_mountview", "ig_heavenlyvilla", "ig_hillview"] },
];

async function main() {
    console.log("Seeding chatbot users...");
    for (const u of chatbotUsers) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await prisma.chatbotUser.upsert({
            where: { username: u.username },
            update: {
                passwordHash,
                plainPassword: u.password,
                role: u.role,
                displayName: u.displayName,
                assignedNumbers: u.assignedNumbers,
                isActive: true,
            },
            create: {
                username: u.username,
                passwordHash,
                plainPassword: u.password,
                role: u.role,
                displayName: u.displayName,
                assignedNumbers: u.assignedNumbers,
                isActive: true,
            },
        });
        console.log(`  ✓ Upserted ${u.username} (${u.role})`);
    }
    console.log("Chatbot users seeded successfully.");
}

main()
    .catch((e) => {
        console.error("Chatbot user seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
