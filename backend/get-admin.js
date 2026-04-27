const{PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
p.adminAccount.findFirst({where:{role:"owner"},select:{username:true,plainPassword:true}}).then(a=>{
  console.log(JSON.stringify(a));
  p.$disconnect();
});
