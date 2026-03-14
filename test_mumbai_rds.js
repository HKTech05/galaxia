
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://galaxia_admin:Hani9869%21@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com/postgres?schema=public'
    }
  }
});

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Successfully connected to Mumbai RDS:', result);
  } catch (error) {
    console.error('Failed to connect to Mumbai RDS:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
