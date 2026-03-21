const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.staycationBooking.findMany({ 
  take: 5, 
  orderBy: { id: 'desc' },
  select: { id: true, source: true, securityDeposit: true, depositCollected: true, depositRefunded: true } 
})
  .then(r => console.log(JSON.stringify(r)))
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
