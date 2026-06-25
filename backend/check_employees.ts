import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Fetching all admin accounts...");
        const admins = await prisma.adminAccount.findMany();
        console.log(JSON.stringify(admins.map(a => ({ id: a.id, username: a.username, email: a.email, role: a.role, displayName: a.displayName, assignedProperties: a.assignedProperties })), null, 2));
    } catch (e) {
        console.error("Error querying db:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
