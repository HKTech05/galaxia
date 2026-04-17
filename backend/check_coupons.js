const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  // Fix DD-20260417-032 shaaib: totalAmount should be 2100 (basePrice 2100, discount 100 = 2000 stored)
  const r=await p.ddBooking.updateMany({where:{bookingRef:'DD-20260417-032'},data:{totalAmount:2000}});
  console.log('Fixed DD-20260417-032:',r);
  await p.$disconnect();
})();
