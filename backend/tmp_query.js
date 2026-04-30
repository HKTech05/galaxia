const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.propertyPricing.updateMany({
    where: { subProperty: { name: "Family Cottage" } },
    data: { personsLabel: "upto 4 with meals" }
}).then(r => {
    console.log("Updated:", JSON.stringify(r));
    return p.$disconnect();
});
