const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  try {
    await p.$executeRawUnsafe('ALTER TABLE staycation_bookings ADD COLUMN IF NOT EXISTS num_pets INTEGER DEFAULT 0');
    console.log('Added num_pets column successfully');
  } catch(e) {
    console.error('Error:', e.message);
  }
  await p.$disconnect();
})();
