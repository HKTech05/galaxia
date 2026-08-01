const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.pendingDdPayment.findMany({where:{module:'stay'},orderBy:{createdAt:'desc'},take:3}).then(r=>{
  r.forEach(x=>{
    console.log('ID:',x.id,'status:',x.status,'ref:',x.createdBookingRef);
    var pl=x.bookingPayload;
    if(pl&&pl.items){
      console.log('isMulti:',pl.isMulti,'itemCount:',pl.items.length);
      pl.items.forEach(function(i){console.log('  item:',i.villaId,'propId:',i.propertyId,'base:',i.basePrice)});
    }else{
      console.log('keys:',Object.keys(pl||{}));
    }
    console.log('---');
  });
}).finally(function(){p['$disconnect']()});
