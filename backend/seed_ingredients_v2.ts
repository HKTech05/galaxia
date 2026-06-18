import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultIngredients = [
    // Category 1 - Dairy
    { nameEn: "Milk", nameHi: "दूध", category: "Dairy", unit: "L" },
    { nameEn: "Paneer", nameHi: "पनीर", category: "Dairy", unit: "kg" },
    { nameEn: "Butter", nameHi: "मक्खन", category: "Dairy", unit: "kg" },
    { nameEn: "Fresh Cream", nameHi: "फ्रेश क्रीम", category: "Dairy", unit: "kg" },
    { nameEn: "Ice cream", nameHi: "आइसक्रीम", category: "Dairy", unit: "kg" },
    { nameEn: "Green peas (frozen)", nameHi: "मटर (फ्रोजन)", category: "Dairy", unit: "kg" },
    { nameEn: "French fries", nameHi: "फ्रेंच फ्राइज़", category: "Dairy", unit: "kg" },
    { nameEn: "Gulab Jamun", nameHi: "गुलाब जामुन", category: "Dairy", unit: "kg" },
    { nameEn: "Pav", nameHi: "पाव", category: "Dairy", unit: "piece" },
    { nameEn: "Bread", nameHi: "ब्रेड", category: "Dairy", unit: "packet" },
    { nameEn: "Curd", nameHi: "दही", category: "Dairy", unit: "kg" },
    { nameEn: "Cheese cubes", nameHi: "चीज़ क्यूब्स", category: "Dairy", unit: "piece" },
    { nameEn: "Jam", nameHi: "जैम", category: "Dairy", unit: "kg" },
    { nameEn: "Glass disposable", nameHi: "डिस्पोजेबल ग्लास", category: "Dairy", unit: "disposable_glass" },
    { nameEn: "Cold drink (Thumps up, Pepsi, Soda, Sprite)", nameHi: "कोल्ड ड्रिंक", category: "Dairy", unit: "cold_drink" },

    // Category 2 - Kirayana
    { nameEn: "Tur dal", nameHi: "तूर दाल", category: "Kirayana", unit: "kg" },
    { nameEn: "Yellow dal", nameHi: "मूंग दाल (पीली दाल)", category: "Kirayana", unit: "kg" },
    { nameEn: "rice", nameHi: "चावल", category: "Kirayana", unit: "kg" },
    { nameEn: "sugar", nameHi: "चीनी", category: "Kirayana", unit: "kg" },
    { nameEn: "Tea Leaves", nameHi: "चाय पत्ती", category: "Kirayana", unit: "kg" },
    { nameEn: "Staff rice", nameHi: "स्टाफ चावल", category: "Kirayana", unit: "kg" },
    { nameEn: "Sunflower oil", nameHi: "सूरजमुखी तेल", category: "Kirayana", unit: "L" },

    // Category 3 - Shak Shabji
    { nameEn: "Ginger", nameHi: "अदरक", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Green chilli", nameHi: "हरी मिर्च", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Garlic", nameHi: "लहसुन", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Koriander", nameHi: "धनिया", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Fansi", nameHi: "फरसबी (फ्रेंच बीन्स)", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Carrot", nameHi: "गाजर", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Cucumber", nameHi: "खीरा", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Capsicum", nameHi: "शिमला मिर्च", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Cabbage", nameHi: "पत्ता गोभी", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Flower", nameHi: "फूलगोभी", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Potato", nameHi: "आलू", category: "Shak Shabji", unit: "kg" },
    { nameEn: "Tomato", nameHi: "टमाटर", category: "Shak Shabji", unit: "kg" },
];

async function main() {
    console.log("Cleaning up ingredients and chef audit logs...");
    await prisma.ingredient.deleteMany({});
    await prisma.chefLog.deleteMany({});
    console.log("Cleanup completed!");

    console.log("Seeding new categorized ingredients...");
    for (const ing of defaultIngredients) {
        await prisma.ingredient.create({
            data: {
                nameEn: ing.nameEn,
                nameHi: ing.nameHi,
                category: ing.category,
                unit: ing.unit,
            },
        });
    }
    console.log("Seeding ingredients completed successfully!");
}

main()
    .catch((e) => {
        console.error("Error seeding ingredients:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
