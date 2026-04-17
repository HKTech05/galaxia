const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const r=await p.ddBooking.updateMany({where:{bookingRef:'DD-20260417-027'},data:{totalAmount:2100}});
  console.log('Updated shaaib totalAmount to 2100:',r);
  await p.$disconnect();
})();
