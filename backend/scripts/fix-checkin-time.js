const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const result = await p.property.updateMany({
        where: { checkInTime: '2:00 PM' },
        data: { checkInTime: '1:00 PM' }
    });
    console.log('Updated', result.count, 'properties checkInTime to 1:00 PM');
    
    const props = await p.property.findMany({ select: { id: true, name: true, checkInTime: true } });
    console.log('Current checkInTimes:', JSON.stringify(props, null, 2));
    
    await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
