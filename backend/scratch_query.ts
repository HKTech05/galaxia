import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const booking = await prisma.staycationBooking.findFirst({
    where: { bookingRef: "ST-20260521-015rr" },
    include: {
      property: true,
      subProperty: true
    }
  });
  console.log(JSON.stringify(booking, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
