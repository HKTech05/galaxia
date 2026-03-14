
const { PrismaClient } = require('@prisma/client');

const OLD_DB_URL = 'postgresql://galaxia_admin:Hani9869%21@galaxia-db.cbgq4u2ay9ol.eu-north-1.rds.amazonaws.com/postgres?schema=public';
const NEW_DB_URL = 'postgresql://galaxia_admin:Hani9869%21@galaxia-db-india.czs40kyowwxy.ap-south-1.rds.amazonaws.com/postgres?schema=public';

const oldPrisma = new PrismaClient({ datasources: { db: { url: OLD_DB_URL } } });
const newPrisma = new PrismaClient({ datasources: { db: { url: NEW_DB_URL } } });

async function migrateData() {
  try {
    const models = [
      { name: 'adminAccount', label: 'Admins' },
      { name: 'property', label: 'Properties' },
      { name: 'subProperty', label: 'Sub-Properties' },
      { name: 'user', label: 'Users' },
      { name: 'staycationBooking', label: 'Staycation Bookings' },
      { name: 'ddBooking', label: 'DD Bookings' },
      { name: 'review', label: 'Reviews' },
      { name: 'employee', label: 'Employees' },
      { name: 'coupon', label: 'Coupons' }
    ];

    for (const model of models) {
      console.log(`Fetching ${model.label} from old DB...`);
      const data = await oldPrisma[model.name].findMany();
      console.log(`Found ${data.length} ${model.label}. Migrating...`);

      for (const item of data) {
        await newPrisma[model.name].upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }
}

migrateData();
