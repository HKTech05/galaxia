
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addManualBooking() {
  try {
    // 1. Find the User by email
    const user = await prisma.user.findUnique({
      where: { email: 'dasavagebeast.22@gmail.com' }
    });
    
    if (!user) {
      console.error('User not found: dasavagebeast.22@gmail.com');
      process.exit(1);
    }
    
    // 2. Find the Property (using Ambrose as an example, or any active property)
    const property = await prisma.property.findFirst({
      where: { slug: 'ambrose', isActive: true }
    });
    
    if (!property) {
      console.error('Property not found: ambrose');
      process.exit(1);
    }
    
    // 3. Create a unique booking reference
    const bookingRef = 'TEST' + Date.now().toString().slice(-6);
    
    // 4. Create the Historical Booking
    const booking = await prisma.staycationBooking.create({
      data: {
        bookingRef: bookingRef,
        userId: user.id,
        propertyId: property.id,
        customerName: user.fullName || 'Savage Beast (Test)',
        customerPhone: user.phone || '9876543210',
        customerEmail: user.email,
        numGuests: 2,
        checkInDate: new Date('2026-03-04T00:00:00Z'),
        checkOutDate: new Date('2026-03-06T00:00:00Z'),
        numNights: 2,
        nightlyRate: 2500,
        basePrice: 5000,
        totalAmount: 5250, // 5% GST
        gstAmount: 250,
        advanceAmount: 5250,
        balanceAmount: 0,
        status: 'confirmed',
        source: 'manual_fix',
        advancePaid: true,
        advanceMethod: 'manual',
      }
    });
    
    console.log('Successfully created historical booking:', JSON.stringify(booking, null, 2));
  } catch (error) {
    console.error('Error creating booking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addManualBooking();
