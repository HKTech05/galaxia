import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const properties = await prisma.property.findMany();
    console.log(JSON.stringify(properties, null, 2));
}
main().finally(() => prisma.$disconnect());
