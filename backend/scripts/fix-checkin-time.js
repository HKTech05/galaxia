const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Update all properties checkInTime from 2:00 PM to 1:00 PM
    const result = await p.$executeRawUnsafe(`UPDATE "Property" SET "checkInTime" = '1:00 PM' WHERE "checkInTime" = '2:00 PM'`);
    console.log('Updated', result, 'properties checkInTime to 1:00 PM');
    
    // List all properties and their checkInTime
    const props = await p.property.findMany({ select: { id: true, name: true, checkInTime: true } });
    console.log('Current checkInTimes:', JSON.stringify(props, null, 2));
    
    await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
