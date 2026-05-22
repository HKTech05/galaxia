import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultIngredients = [
    { nameEn: "Potato", nameHi: "आलू" },
    { nameEn: "Tomato", nameHi: "टमाटर" },
    { nameEn: "Onion", nameHi: "प्याज" },
    { nameEn: "Garlic", nameHi: "लहसुन" },
    { nameEn: "Ginger", nameHi: "अदरक" },
    { nameEn: "Rice", nameHi: "चावल" },
    { nameEn: "Wheat Flour", nameHi: "गेहूं का आटा" },
    { nameEn: "Sugar", nameHi: "चीनी" },
    { nameEn: "Salt", nameHi: "नमक" },
    { nameEn: "Milk", nameHi: "दूध" },
    { nameEn: "Butter", nameHi: "मक्खन" },
    { nameEn: "Coriander", nameHi: "धनिया" },
    { nameEn: "Cooking Oil", nameHi: "तेल" },
    { nameEn: "Green Chillies", nameHi: "हरी मिर्च" },
    { nameEn: "Paneer", nameHi: "पनीर" },
];

async function main() {
    console.log("Seeding default ingredients...");
    for (const ing of defaultIngredients) {
        // Upsert to prevent duplication
        const existing = await prisma.ingredient.findFirst({
            where: { nameEn: ing.nameEn },
        });
        if (!existing) {
            await prisma.ingredient.create({
                data: {
                    nameEn: ing.nameEn,
                    nameHi: ing.nameHi,
                },
            });
        }
    }
    console.log("Seeding default ingredients completed!");
}

main()
    .catch((e) => {
        console.error("Error seeding ingredients:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
