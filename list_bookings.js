
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listBookings() {
  try {
    const bookings = await prisma.staycationBooking.findMany({
      include: { property: { select: { name: true } } },
      orderBy: { checkInDate: 'asc' }
    });
    console.log(JSON.stringify(bookings.map(b => ({
      id: b.id,
      property: b.property.name,
      checkIn: b.checkInDate,
      checkOut: b.checkOutDate,
      status: b.status
    })), null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

listBookings();
