/**
 * clean_test_data.js
 * 
 * PURPOSE: Clear all test bookings and related financial logs from the
 *          production database. Preserves ALL property data, images,
 *          admin accounts, pricing, reviews, site images, etc.
 * 
 * DELETES (in FK-safe order):
 *   1. dd_booking_addons
 *   2. guest_ids
 *   3. extra_guests
 *   4. booking_payments
 *   5. coupon_usage
 *   6. booking_holds
 *   7. dd_bookings
 *   8. staycation_bookings
 *   9. cash_transactions
 *  10. upi_payments
 * 
 * RESETS:
 *   - employee.cashCollected → 0
 *   - coupon.currentUses → 0
 * 
 * DOES NOT TOUCH:
 *   - properties, sub_properties, property_pricing, property_amenities
 *   - dd_screens, dd_packages, dd_package_pricing, dd_pricing_overrides
 *   - admin_accounts, users, employees (structure)
 *   - reviews, site_images, blocked_dates, notifications
 *   - audit_log, chat_memory, resort_knowledge
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSnapshot() {
  const [
    ddBookingAddons, guestIds, extraGuests, bookingPayments,
    couponUsage, bookingHolds, ddBookings, staycationBookings,
    cashTransactions, upiPayments,
    // Preserved tables — we count these to ensure they don't change
    properties, subProperties, adminAccounts, users, employees,
    propertyPricing, propertyAmenities, ddScreens, ddPackages,
    ddPackagePricing, reviews, siteImages, blockedDates,
    notifications, auditLogs, coupons
  ] = await Promise.all([
    prisma.ddBookingAddon.count(),
    prisma.guestId.count(),
    prisma.extraGuest.count(),
    prisma.bookingPayment.count(),
    prisma.couponUsage.count(),
    prisma.bookingHold.count(),
    prisma.ddBooking.count(),
    prisma.staycationBooking.count(),
    prisma.cashTransaction.count(),
    prisma.upiPayment.count(),
    // Preserved
    prisma.property.count(),
    prisma.subProperty.count(),
    prisma.adminAccount.count(),
    prisma.user.count(),
    prisma.employee.count(),
    prisma.propertyPricing.count(),
    prisma.propertyAmenity.count(),
    prisma.ddScreen.count(),
    prisma.ddPackage.count(),
    prisma.ddPackagePricing.count(),
    prisma.review.count(),
    prisma.siteImage.count(),
    prisma.blockedDate.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.coupon.count(),
  ]);

  return {
    // Tables to clear
    ddBookingAddons, guestIds, extraGuests, bookingPayments,
    couponUsage, bookingHolds, ddBookings, staycationBookings,
    cashTransactions, upiPayments,
    // Tables to preserve
    properties, subProperties, adminAccounts, users, employees,
    propertyPricing, propertyAmenities, ddScreens, ddPackages,
    ddPackagePricing, reviews, siteImages, blockedDates,
    notifications, auditLogs, coupons,
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   GALAXIA — TEST DATA CLEANUP SCRIPT            ║');
  console.log('║   Target: Production RDS (ap-south-1)           ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── Step 1: Pre-cleanup snapshot ─────────────────────────────
  console.log('━━━ STEP 1: Pre-cleanup snapshot ━━━');
  const before = await getSnapshot();
  console.log('\n  TABLES TO CLEAR:');
  console.log(`    dd_booking_addons:   ${before.ddBookingAddons}`);
  console.log(`    guest_ids:           ${before.guestIds}`);
  console.log(`    extra_guests:        ${before.extraGuests}`);
  console.log(`    booking_payments:    ${before.bookingPayments}`);
  console.log(`    coupon_usage:        ${before.couponUsage}`);
  console.log(`    booking_holds:       ${before.bookingHolds}`);
  console.log(`    dd_bookings:         ${before.ddBookings}`);
  console.log(`    staycation_bookings: ${before.staycationBookings}`);
  console.log(`    cash_transactions:   ${before.cashTransactions}`);
  console.log(`    upi_payments:        ${before.upiPayments}`);
  console.log('\n  TABLES TO PRESERVE (must remain unchanged):');
  console.log(`    properties:          ${before.properties}`);
  console.log(`    sub_properties:      ${before.subProperties}`);
  console.log(`    admin_accounts:      ${before.adminAccounts}`);
  console.log(`    users:               ${before.users}`);
  console.log(`    employees:           ${before.employees}`);
  console.log(`    property_pricing:    ${before.propertyPricing}`);
  console.log(`    property_amenities:  ${before.propertyAmenities}`);
  console.log(`    dd_screens:          ${before.ddScreens}`);
  console.log(`    dd_packages:         ${before.ddPackages}`);
  console.log(`    dd_package_pricing:  ${before.ddPackagePricing}`);
  console.log(`    reviews:             ${before.reviews}`);
  console.log(`    site_images:         ${before.siteImages}`);
  console.log(`    blocked_dates:       ${before.blockedDates}`);
  console.log(`    notifications:       ${before.notifications}`);
  console.log(`    audit_logs:          ${before.auditLogs}`);
  console.log(`    coupons:             ${before.coupons}`);

  // ── Step 2: Delete in FK-safe order (inside transaction) ─────
  console.log('\n━━━ STEP 2: Deleting test data (transactional) ━━━');

  const results = await prisma.$transaction(async (tx) => {
    // 1) Child tables first
    const r1 = await tx.ddBookingAddon.deleteMany({});
    console.log(`  ✓ dd_booking_addons:   deleted ${r1.count}`);

    const r2 = await tx.guestId.deleteMany({});
    console.log(`  ✓ guest_ids:           deleted ${r2.count}`);

    const r3 = await tx.extraGuest.deleteMany({});
    console.log(`  ✓ extra_guests:        deleted ${r3.count}`);

    const r4 = await tx.bookingPayment.deleteMany({});
    console.log(`  ✓ booking_payments:    deleted ${r4.count}`);

    const r5 = await tx.couponUsage.deleteMany({});
    console.log(`  ✓ coupon_usage:        deleted ${r5.count}`);

    const r6 = await tx.bookingHold.deleteMany({});
    console.log(`  ✓ booking_holds:       deleted ${r6.count}`);

    // 2) Parent booking tables
    const r7 = await tx.ddBooking.deleteMany({});
    console.log(`  ✓ dd_bookings:         deleted ${r7.count}`);

    const r8 = await tx.staycationBooking.deleteMany({});
    console.log(`  ✓ staycation_bookings: deleted ${r8.count}`);

    // 3) Financial logs
    const r9 = await tx.cashTransaction.deleteMany({});
    console.log(`  ✓ cash_transactions:   deleted ${r9.count}`);

    const r10 = await tx.upiPayment.deleteMany({});
    console.log(`  ✓ upi_payments:        deleted ${r10.count}`);

    // 4) Reset employee cash counters
    const r11 = await tx.employee.updateMany({
      data: { cashCollected: 0 }
    });
    console.log(`  ✓ employees:           reset cashCollected on ${r11.count} rows`);

    // 5) Reset coupon usage counters
    const r12 = await tx.coupon.updateMany({
      data: { currentUses: 0 }
    });
    console.log(`  ✓ coupons:             reset currentUses on ${r12.count} rows`);

    return { r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12 };
  });

  console.log('\n  ✅ Transaction committed successfully.');

  // ── Step 3: Post-cleanup verification ────────────────────────
  console.log('\n━━━ STEP 3: Post-cleanup verification ━━━');
  const after = await getSnapshot();

  let allGood = true;

  // Verify cleared tables are at 0
  const clearedTables = [
    ['dd_booking_addons', after.ddBookingAddons],
    ['guest_ids', after.guestIds],
    ['extra_guests', after.extraGuests],
    ['booking_payments', after.bookingPayments],
    ['coupon_usage', after.couponUsage],
    ['booking_holds', after.bookingHolds],
    ['dd_bookings', after.ddBookings],
    ['staycation_bookings', after.staycationBookings],
    ['cash_transactions', after.cashTransactions],
    ['upi_payments', after.upiPayments],
  ];
  console.log('\n  Cleared tables (should all be 0):');
  for (const [name, count] of clearedTables) {
    const ok = count === 0;
    if (!ok) allGood = false;
    console.log(`    ${ok ? '✅' : '❌'} ${name.padEnd(22)} ${count}`);
  }

  // Verify preserved tables are unchanged
  const preservedTables = [
    ['properties', before.properties, after.properties],
    ['sub_properties', before.subProperties, after.subProperties],
    ['admin_accounts', before.adminAccounts, after.adminAccounts],
    ['users', before.users, after.users],
    ['employees', before.employees, after.employees],
    ['property_pricing', before.propertyPricing, after.propertyPricing],
    ['property_amenities', before.propertyAmenities, after.propertyAmenities],
    ['dd_screens', before.ddScreens, after.ddScreens],
    ['dd_packages', before.ddPackages, after.ddPackages],
    ['dd_package_pricing', before.ddPackagePricing, after.ddPackagePricing],
    ['reviews', before.reviews, after.reviews],
    ['site_images', before.siteImages, after.siteImages],
    ['blocked_dates', before.blockedDates, after.blockedDates],
    ['notifications', before.notifications, after.notifications],
    ['audit_logs', before.auditLogs, after.auditLogs],
    ['coupons', before.coupons, after.coupons],
  ];
  console.log('\n  Preserved tables (should be unchanged):');
  for (const [name, bef, aft] of preservedTables) {
    const ok = bef === aft;
    if (!ok) allGood = false;
    console.log(`    ${ok ? '✅' : '❌'} ${name.padEnd(22)} ${bef} → ${aft}`);
  }

  console.log('\n' + (allGood
    ? '🎉 ALL VERIFICATIONS PASSED — Cleanup complete!'
    : '⚠️  SOME VERIFICATIONS FAILED — Please inspect manually!'));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('\n❌ FATAL ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
