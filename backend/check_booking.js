const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Check if this user's booking exists (phone is encrypted, so search by name)
  const existing = await prisma.ddBooking.findFirst({
    where: { customerName: { contains: 'Ansari' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, bookingRef: true, customerName: true, bookingDate: true, startHour: true, status: true, paymentDetails: true, createdAt: true }
  });
  console.log('Existing booking for Ansari:', JSON.stringify(existing, null, 2));
  
  // Also check latest DD bookings today
  const today = new Date();
  today.setHours(0,0,0,0);
  const recent = await prisma.ddBooking.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, bookingRef: true, customerName: true, bookingDate: true, startHour: true, status: true, paymentDetails: true, createdAt: true }
  });
  console.log('Recent DD bookings today:', JSON.stringify(recent, null, 2));
  
  await prisma.$disconnect();
})();
