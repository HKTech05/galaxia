const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const b=await p.ddBooking.findMany({
    where:{status:{notIn:['cancelled','no_show']}},
    select:{id:true,bookingRef:true,customerName:true,totalAmount:true,amountPaid:true,amountToCollect:true,status:true}
  });
  console.log('COUNT:',b.length);
  console.log('SUM totalAmount:',b.reduce((s,x)=>s+x.totalAmount,0));
  console.log('SUM amountPaid:',b.reduce((s,x)=>s+x.amountPaid,0));
  b.forEach(x=>console.log(x.bookingRef,x.customerName,'total='+x.totalAmount,'paid='+x.amountPaid,'collect='+x.amountToCollect));
  await p.$disconnect();
})();
