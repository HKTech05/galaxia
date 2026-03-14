import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ─── 1. ADMIN ACCOUNTS ───────────────────────────────────────
    const passwordHash = await bcrypt.hash("galaxia2026", 10);

    const admins = await Promise.all([
        prisma.adminAccount.upsert({
            where: { username: "dd_admin" },
            update: {},
            create: {
                username: "dd_admin",
                email: "dd@galaxia.in",
                passwordHash,
                displayName: "DD Admin",
                role: "dd_admin",
            },
        }),
        prisma.adminAccount.upsert({
            where: { username: "reception" },
            update: {},
            create: {
                username: "reception",
                email: "reception@galaxia.in",
                passwordHash,
                displayName: "Receptionist",
                role: "staycation_admin",
            },
        }),
        prisma.adminAccount.upsert({
            where: { username: "owner" },
            update: {},
            create: {
                username: "owner",
                email: "dipesh@galaxia.in",
                passwordHash,
                displayName: "Admin User",
                role: "owner",
            },
        }),
        prisma.adminAccount.upsert({
            where: { username: "developer" },
            update: {},
            create: {
                username: "developer",
                email: "dev@galaxia.in",
                passwordHash,
                displayName: "Developer",
                role: "developer",
            },
        }),
    ]);
    console.log(`  ✅ ${admins.length} admin accounts`);

    // ─── 2. PROPERTIES ───────────────────────────────────────────
    const propertyData = [
        {
            slug: "hill-view", name: "Hill View", subtitle: "Budget Mountain View Apartment",
            type: "standalone", checkInTime: "1:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 6, securityDeposit: 2000, securityRefund: "Refunded at checkout",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: false, foodDetails: "Society restaurant available (Veg & Non-Veg)",
            foodType: "Veg & Non-Veg", location: "Karjat, Maharashtra, India",
            instagramUrl: "https://www.instagram.com/hill_view101",
            description: "A comfortable apartment with a stunning mountain view balcony.", displayOrder: 6,
        },
        {
            slug: "mount-view", name: "Mount View", subtitle: "Bathtub Mountain Apartment",
            type: "standalone", checkInTime: "2:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 6, securityDeposit: 3000, securityRefund: "Refund within 24 hours",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: false, foodDetails: "Veg & Non-Veg restaurant available nearby",
            foodType: "Veg & Non-Veg", location: "Karjat, Maharashtra, India",
            googleMapUrl: "https://maps.app.goo.gl/1v6azy4nLhHe7Hzq6",
            description: "Premium apartment with a private bathtub and enormous mountain-facing balcony.", displayOrder: 5,
        },
            slug: "heavenly-villa", name: "Heavenly Villa", subtitle: "Heavenly Villa — Private Indoor Pool",
            type: "standalone", checkInTime: "1:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 4, securityDeposit: 3000, securityRefund: "Refund at checkout",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: false, foodDetails: "Restaurant available nearby",
            foodType: "Veg & Non-Veg", location: "Karjat, Maharashtra, India",
            instagramUrl: "https://www.instagram.com/heavenly_villa01",
            description: "A heavenly studio villa with a private indoor swimming pool.", displayOrder: 4,
        },
        {
            slug: "la-paraiso", name: "La Paraiso", subtitle: "Premium Private Pool Villa",
            type: "standalone", checkInTime: "2:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 8, securityDeposit: 3000, securityRefund: "Refund at checkout",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: false, foodDetails: "Restaurant 10 steps away. Veg allowed inside villa.",
            foodType: "Veg in villa, Non-Veg in restaurant", location: "Karjat, Maharashtra, India",
            instagramUrl: "https://instagram.com/la_paraiso001",
            description: "Luxurious villa with a 25x10 ft private pool and 600 sq ft garden.", displayOrder: 3,
        },
        {
            slug: "amstel-nest", name: "Amstel Nest", subtitle: "Mini Amsterdam — Indoor Pool Cottages",
            type: "resort", checkInTime: "1:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 4, securityDeposit: 2000, securityRefund: "Refund at checkout",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: true, foodDetails: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.",
            foodType: "Veg Only (Jain on request)", location: "Karjat, Maharashtra, India",
            description: "14 unique cottages with private indoor pools. Meals included.", displayOrder: 2,
        },
        {
            slug: "ambrose", name: "Ambrose", subtitle: "Themed Villa Resort",
            type: "resort", checkInTime: "2:00 PM", checkOutTime: "10:00 AM",
            maxPersons: 8, securityDeposit: 3000, securityRefund: "Refund within 24 hours",
            bookingPolicy: "80% payable online at booking · 20% payable at the venue",
            foodIncluded: true, foodDetails: "Meals Included — Lunch, Dinner & Breakfast. Only Veg.",
            foodType: "Veg Only", location: "Karjat, Maharashtra, India",
            instagramUrl: "https://instagram.com/ambrose_villas",
            description: "Five themed villas — Bollywood, Rustic, Greek, Bali, Machan.", displayOrder: 1,
        },
    ];

    const properties: any[] = [];
    for (const p of propertyData) {
        const prop = await prisma.property.upsert({
            where: { slug: p.slug },
            update: {},
            create: p as any,
        });
        properties.push(prop);
    }
    console.log(`  ✅ ${properties.length} properties`);

    // ─── 3. SUB-PROPERTIES ───────────────────────────────────────
    const amstel = properties.find((p: any) => p.slug === "amstel-nest");
    const ambrose = properties.find((p: any) => p.slug === "ambrose");

    if (amstel) {
        const amstelSubs = [
            { slug: "standard-cottage", name: "Standard Cottage", theme: "Amsterdam-Inspired", maxPersons: 4, displayOrder: 1 },
            { slug: "family-cottage", name: "Family Cottage", theme: "Amsterdam-Inspired (Larger)", maxPersons: 4, displayOrder: 2 },
        ];
        for (const s of amstelSubs) {
            await prisma.subProperty.upsert({
                where: { propertyId_slug: { propertyId: amstel.id, slug: s.slug } },
                update: {},
                create: { ...s, propertyId: amstel.id },
            });
        }
    }

    if (ambrose) {
        const ambroseSubs = [
            { slug: "take-1", name: "TAKE-1", theme: "Bollywood Theme", maxPersons: 8, displayOrder: 1 },
            { slug: "alta", name: "ALTA", theme: "Rustic Theme", maxPersons: 8, displayOrder: 2 },
            { slug: "santorini", name: "SANTORINI", theme: "Greek Inspired Theme", maxPersons: 8, displayOrder: 3 },
            { slug: "bamboosa", name: "BAMBOOSA", theme: "Bali Theme (Premium)", maxPersons: 12, displayOrder: 4 },
            { slug: "cypress", name: "CYPRESS", theme: "Machan Theme", maxPersons: 4, displayOrder: 5 },
        ];
        for (const s of ambroseSubs) {
            await prisma.subProperty.upsert({
                where: { propertyId_slug: { propertyId: ambrose.id, slug: s.slug } },
                update: {},
                create: { ...s, propertyId: ambrose.id },
            });
        }
    }
    console.log("  ✅ Sub-properties (Ambrose villas + Amstel cottages)");

    // ─── 4. PROPERTY PRICING ─────────────────────────────────────
    const pricingData: { slug: string; entries: any[] }[] = [
        {
            slug: "hill-view",
            entries: [
                { dayType: "weekday", basePrice: 2500, personsLabel: "2 persons", extraAdultPrice: 600, kidsPrice: 400, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 3950, personsLabel: "2 persons", extraAdultPrice: 600, kidsPrice: 400, kidsAgeRange: "5-12 yrs" },
                { dayType: "prime", basePrice: 4450, personsLabel: "2 persons", extraAdultPrice: 600, kidsPrice: 400 },
            ],
        },
        {
            slug: "mount-view",
            entries: [
                { dayType: "weekday", basePrice: 3500, personsLabel: "2 persons", extraAdultPrice: 800, kidsPrice: 500, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 4950, personsLabel: "2 persons", extraAdultPrice: 800, kidsPrice: 500, kidsAgeRange: "5-12 yrs" },
                { dayType: "prime", basePrice: 5950, personsLabel: "2 persons", extraAdultPrice: 800, kidsPrice: 500 },
                { dayType: "special", basePrice: 5450, specialLabel: "30 Dec" },
                { dayType: "special", basePrice: 10000, specialLabel: "31 Dec" },
            ],
        },
        {
            slug: "euphoria",
            entries: [
                { dayType: "weekday", basePrice: 3950, personsLabel: "2 persons", extraAdultPrice: 800, kidsPrice: 500, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 4950, personsLabel: "2 persons", extraAdultPrice: 800, kidsPrice: 500, kidsAgeRange: "5-12 yrs" },
            ],
        },
        {
            slug: "la-paraiso",
            entries: [
                { dayType: "weekday", basePrice: 4950, personsLabel: "2 persons", extraAdultPrice: 1200, kidsPrice: 800, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 7500, personsLabel: "Up to 4 persons", extraAdultPrice: 1200, kidsPrice: 800, kidsAgeRange: "5-12 yrs" },
                { dayType: "prime", basePrice: 8500, personsLabel: "Up to 4 persons", extraAdultPrice: 1200, kidsPrice: 800 },
                { dayType: "special", basePrice: 6500, specialLabel: "Mon-Thu (4 persons)" },
            ],
        },
        {
            slug: "amstel-nest",
            entries: [
                { dayType: "weekday", basePrice: 4950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 6950, personsLabel: "2 persons with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            ],
        },
        {
            slug: "ambrose",
            entries: [
                { dayType: "weekday", basePrice: 5500, personsLabel: "2 with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
                { dayType: "weekend", basePrice: 6500, personsLabel: "2 with meals", extraAdultPrice: 2000, kidsPrice: 1000, kidsAgeRange: "5-12 yrs" },
            ],
        },
    ];

    for (const pGroup of pricingData) {
        const prop = properties.find((p: any) => p.slug === pGroup.slug);
        if (!prop) continue;
        for (const entry of pGroup.entries) {
            await prisma.propertyPricing.create({
                data: { propertyId: prop.id, ...entry },
            });
        }
    }
    console.log("  ✅ Property pricing");

    // ─── 5. DD SCREENS ───────────────────────────────────────────
    const screensData = [
        { slug: "sandy-screen", name: "Sandy Screen (15 x 8 sq ft)", theme: "Beach Theme", tagline: "Feel the sand between your toes", capacity: "Up to 3 guests", displayOrder: 1 },
        { slug: "cine-love", name: "Cine Love (15 x 8 sq ft)", theme: "Romantic Theme", tagline: "The perfect date night screen", capacity: "Up to 8 guests", displayOrder: 2 },
        { slug: "park-n-watch", name: "Park N Watch (15 x 8 sq ft)", theme: "Car / Drive-In Theme", tagline: "Your own drive-in cinema", capacity: "Up to 3 guests", displayOrder: 3 },
        { slug: "baywatch", name: "Baywatch (15 x 8 sq ft)", theme: "Greece Theme", tagline: "Mediterranean cinema under the stars", capacity: "Up to 3 guests", displayOrder: 4 },
    ];
    for (const s of screensData) {
        await prisma.ddScreen.upsert({
            where: { slug: s.slug },
            update: {},
            create: s,
        });
    }
    console.log("  ✅ 4 DD screens");

    // ─── 6. DD PACKAGES ──────────────────────────────────────────
    const movieTime = await prisma.ddPackage.upsert({
        where: { slug: "movie-time" },
        update: {},
        create: {
            slug: "movie-time", name: "Movie Time", tagline: "Private Screening Experience",
            extraPersonPrice: 300, extraHourRate: 1000, minHours: 1,
            inclusions: [
                { icon: "film", label: "Private Movie Screening" },
                { icon: "gift", label: "Complimentary Hamper" },
                { icon: "popcorn", label: "Popcorn & Dry Snacks" },
                { icon: "drink", label: "Juice & Mineral Water" },
                { icon: "chocolate", label: "Chocolates" },
                { icon: "privacy", label: "No CCTV — Complete Privacy" },
            ],
        },
    });

    const celebration = await prisma.ddPackage.upsert({
        where: { slug: "celebration" },
        update: {},
        create: {
            slug: "celebration", name: "Celebration", tagline: "Movie Time + Decoration",
            extraPersonPrice: 300, extraHourRate: 1000, minHours: 2,
            inclusions: [
                { icon: "film", label: "Private Movie Screening" },
                { icon: "gift", label: "Complimentary Hamper" },
                { icon: "cake", label: "Celebration Cake (250g)" },
                { icon: "led", label: "LED Message Tag" },
                { icon: "fog", label: "Walking on Cloud (Fog Effect)" },
                { icon: "heart", label: "Heart-Lit Pathway" },
                { icon: "candle", label: "Candle Setup" },
                { icon: "privacy", label: "No CCTV — Complete Privacy" },
            ],
        },
    });

    // DD package pricing
    const ddPricing = [
        { packageId: movieTime.id, hours: 1, label: "1 Hour", weekdayPrice: 999, weekendPrice: 999 },
        { packageId: movieTime.id, hours: 2, label: "2 Hours", weekdayPrice: 1500, weekendPrice: 1500 },
        { packageId: movieTime.id, hours: 3, label: "3 Hours", weekdayPrice: 1950, weekendPrice: 1950 },
        { packageId: celebration.id, hours: 2, label: "2 Hours", weekdayPrice: 2950, weekendPrice: 2950 },
        { packageId: celebration.id, hours: 3, label: "3 Hours", weekdayPrice: 3450, weekendPrice: 3950 },
    ];
    for (const p of ddPricing) {
        await prisma.ddPackagePricing.create({ data: p });
    }
    console.log("  ✅ 2 DD packages with pricing");

    // ─── 7. EMPLOYEES ────────────────────────────────────────────
    // Map property slug → property ID for employee assignment
    const propMap: Record<string, number> = {};
    for (const p of properties) {
        propMap[p.slug] = p.id;
    }

    // We also need a "Digital Diaries" property concept. Since DD is not a physical property
    // in the properties table, we'll assign DD employees to "hill-view" as a placeholder
    // or create a virtual property. For simplicity, we'll use the first property.
    const employeesData = [
        { name: "Priya Singh", role: "Manager", propertySlug: "hill-view", phone: "+91 98765 43210" },
        { name: "Amit Kumar", role: "Front Desk", propertySlug: "ambrose", phone: "+91 87654 32109" },
        { name: "Suresh Pillai", role: "Reception", propertySlug: "amstel-nest", phone: "+91 91234 56780" },
        { name: "Neha Desai", role: "Host", propertySlug: "la-paraiso", phone: "+91 99887 76655" },
        { name: "Ravi Shankar", role: "Caretaker", propertySlug: "mount-view", phone: "+91 88776 65544" },
        { name: "Rahul Sharma", role: "Reception", propertySlug: "euphoria", phone: "+91 93456 78901" },
    ];

    for (const e of employeesData) {
        const propId = propMap[e.propertySlug];
        if (!propId) continue;
        await prisma.employee.create({
            data: {
                name: e.name,
                role: e.role,
                propertyId: propId,
                phone: e.phone,
            },
        });
    }
    console.log("  ✅ 6 employees");

    console.log("\n🎉 Seed complete!");
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
