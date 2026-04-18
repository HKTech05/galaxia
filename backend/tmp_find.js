const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Delete booking ID 181 and all related records
  const bookingId = 181;
  
  // Delete related addons
  const addons = await p.ddBookingAddon.deleteMany({ where: { bookingId } });
  console.log('Deleted addons:', addons.count);
  
  // Delete related payments
  const payments = await p.bookingPayment.deleteMany({ where: { ddBookingId: bookingId } });
  console.log('Deleted payments:', payments.count);
  
  // Delete related cash transactions
  const cash = await p.cashTransaction.deleteMany({ where: { bookingRef: 'DD-20260418-014' } });
  console.log('Deleted cash txns:', cash.count);
  
  // Delete related UPI payments  
  const upi = await p.upiPayment.deleteMany({ where: { bookingRef: 'DD-20260418-014' } });
  console.log('Deleted UPI txns:', upi.count);
  
  // Delete booking
  const booking = await p.ddBooking.delete({ where: { id: bookingId } });
  console.log('Deleted booking:', booking.bookingRef, booking.customerName);
  
  await p.$disconnect();
})();
