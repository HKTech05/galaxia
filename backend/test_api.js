async function test() {
  const req = await fetch('http://localhost:4000/api/bookings/staycation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: "Test Guest",
      customerPhone: "0000000000",
      propertyId: 1,
      numGuests: 2,
      checkInDate: "2026-03-22",
      checkOutDate: "2026-03-24",
      totalAmount: 5000,
      advanceAmount: 5000,
      balanceAmount: 0,
      securityDeposit: 3000,
      basePrice: 4800,
      gstAmount: 200,
      advancePaid: true,
      advanceMethod: "cash",
      source: "reception"
    })
  });
  console.log(await req.json());
}
test();
