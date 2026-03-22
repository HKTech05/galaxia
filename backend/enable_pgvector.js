require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('OK: pgvector extension created');
    } catch (e) {
        console.error('ERR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
