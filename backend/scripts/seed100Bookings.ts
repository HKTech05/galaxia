import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Seed 100 realistic bookings spread over the last 12 months
 * Mix of confirmed, checked_in, checked_out, and cancelled
 */
async function seed() {
    console.log("🌱 Seeding 100 realistic bookings...");

    // Dynamically fetch all properties + sub-properties
    const allProperties = await prisma.property.findMany({
        include: { subProperties: true },
    });

    const propMap: Record<string, number> = {};
    const subPropMap: Record<string, number> = {};
    for (const p of allProperties) {
        propMap[p.slug] = p.id;
        for (const sp of p.subProperties) {
            subPropMap[sp.slug || sp.name] = sp.id;
        }
    }

    const HEAVENLY = propMap["heavenly-villa"];
    const AMBROSE = propMap["ambrose"];
    const AMSTEL = propMap["amstel-nest"];
    const LA_PARAISO = propMap["la-paraiso"];
    const HILL = propMap["hill-view"];
    const MOUNT = propMap["mount-view"];

    // Ambrose sub-properties
    const TAKE1 = subPropMap["TAKE-1"] || subPropMap["take-1"];
    const ALTA = subPropMap["ALTA"] || subPropMap["alta"];
    const SANTORINI = subPropMap["SANTORINI"] || subPropMap["santorini"];
    const BAMBOOSA = subPropMap["BAMBOOSA"] || subPropMap["bamboosa"];
    const CYPRESS = subPropMap["CYPRESS"] || subPropMap["cypress"];

    // Amstel sub-properties  
    const STANDARD = subPropMap["Standard Cottage"] || subPropMap["standard-cottage"];
    const FAMILY = subPropMap["Family Cottage"] || subPropMap["family-cottage"];

    const ambroseVillas = [TAKE1, ALTA, SANTORINI, BAMBOOSA, CYPRESS].filter(Boolean);
    const amstelCottages = [STANDARD, FAMILY].filter(Boolean);

    // Property configs for pricing
    const configs = [
        { propId: HILL, subPropId: null, weekday: 2500, weekend: 3950, deposit: 2000, extraAdult: 600 },
        { propId: MOUNT, subPropId: null, weekday: 3500, weekend: 4950, deposit: 3000, extraAdult: 800 },
        { propId: HEAVENLY, subPropId: null, weekday: 3950, weekend: 4950, deposit: 3000, extraAdult: 800 },
        { propId: LA_PARAISO, subPropId: null, weekday: 4950, weekend: 7500, deposit: 5000, extraAdult: 1200 },
        ...ambroseVillas.map(spId => ({ propId: AMBROSE, subPropId: spId, weekday: 8500, weekend: 12000, deposit: 5000, extraAdult: 2000 })),
        ...amstelCottages.map(spId => ({ propId: AMSTEL, subPropId: spId, weekday: 4500, weekend: 6500, deposit: 3000, extraAdult: 1000 })),
    ];

    // Indian names pool
    const firstNames = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Sai", "Arnav", "Krish", "Dhruv",
        "Saanvi", "Ananya", "Ishita", "Myra", "Kavya", "Priya", "Aadhya", "Riya", "Neha", "Pooja",
        "Rohan", "Karan", "Rahul", "Amit", "Varun", "Nisha", "Divya", "Meera", "Shreya", "Tanvi",
        "Vikram", "Suresh", "Rajesh", "Deepak", "Sanjay", "Ravi", "Nikhil", "Aakash", "Gaurav", "Manish",
        "Aditi", "Sneha", "Anjali", "Swati", "Preeti", "Komal", "Simran", "Ritika", "Jyoti", "Madhuri"
    ];
    const lastNames = [
        "Sharma", "Singh", "Patel", "Desai", "Joshi", "Mehta", "Kulkarni", "Iyer", "Nair", "Reddy",
        "Kumar", "Gupta", "Verma", "Chopra", "Malhotra", "Shah", "Kapoor", "Agarwal", "Mishra", "Pandey",
        "Pillai", "Menon", "Thakur", "Rao", "Das", "Bose", "Ghosh", "Chatterjee", "Banerjee", "Sen"
    ];

    const randomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const randomPhone = () => `+91${Math.floor(7000000000 + Math.random() * 3000000000)}`;
    const randomEmail = (name: string) => `${name.toLowerCase().replace(/\s+/g, '.')}${Math.floor(Math.random() * 99)}@gmail.com`;

    const now = new Date();
    const bookings: any[] = [];

    for (let i = 0; i < 100; i++) {
        // Random date in last 365 days
        const daysAgo = Math.floor(Math.random() * 365);
        const checkIn = new Date(now);
        checkIn.setDate(checkIn.getDate() - daysAgo);
        checkIn.setHours(13, 0, 0, 0);

        // 1-3 night stay
        const nights = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3;
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + nights);
        checkOut.setHours(10, 0, 0, 0);

        // Random property config
        const config = configs[Math.floor(Math.random() * configs.length)];

        // Calculate pricing
        const dayOfWeek = checkIn.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const basePerNight = isWeekend ? config.weekend : config.weekday;

        const guests = Math.random() < 0.5 ? 2 : Math.floor(Math.random() * 3) + 2;
        const extraGuests = Math.max(0, guests - 2);
        const baseCost = basePerNight * nights;
        const extraCost = config.extraAdult * extraGuests * nights;
        const subtotal = baseCost + extraCost;
        const gst = Math.round(subtotal * 0.05);
        const total = subtotal + gst;
        const advance = Math.round(total * 0.8);
        const balance = total - advance;

        // Celebration addon: ~15% chance
        const hasCelebration = Math.random() < 0.15;
        const addons = hasCelebration ? {
            celebrationAddon: true,
            cakeMessage: ["Happy Birthday!", "Happy Anniversary!", "Congratulations!", "Best Wishes!"][Math.floor(Math.random() * 4)],
            bannerOccasion: ["Birthday", "Anniversary", "Celebration"][Math.floor(Math.random() * 3)]
        } : null;

        const celebrationCharge = hasCelebration ? 1200 : 0;
        const totalWithAddons = total + celebrationCharge;

        // Determine status based on date
        let status: string;
        if (daysAgo > 7) {
            // Past: mostly completed, some cancelled
            status = Math.random() < 0.92 ? "checked_out" : "cancelled";
        } else if (daysAgo <= 2) {
            // Recent: mix
            const r = Math.random();
            if (r < 0.4) status = "confirmed";
            else if (r < 0.7) status = "checked_in";
            else status = "checked_out";
        } else {
            status = Math.random() < 0.85 ? "checked_out" : "checked_in";
        }

        const customerName = randomName();
        const phone = randomPhone();
        const email = randomEmail(customerName);

        // Generate booking ref
        const dateStr = checkIn.toISOString().slice(0, 10).replace(/-/g, '');
        const seqStr = String(i + 1).padStart(3, '0');
        const bookingRef = `ST-${dateStr}-${seqStr}`;

        const booked = new Date(checkIn);
        booked.setDate(booked.getDate() - Math.floor(Math.random() * 14) - 1);

        bookings.push({
            bookingRef,
            customerName,
            customerEmail: email,
            customerPhone: phone,
            propertyId: config.propId,
            subPropertyId: config.subPropId,
            numGuests: guests,
            numNights: nights,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalAmount: totalWithAddons,
            basePrice: baseCost,
            nightlyRate: basePerNight,
            extraPersonCharge: extraCost,
            gstAmount: gst,
            advanceAmount: advance,
            balanceAmount: balance,
            securityDeposit: config.deposit,
            advancePaid: true,
            advanceMethod: Math.random() < 0.6 ? "UPI" : "Cash",
            status,
            source: Math.random() < 0.7 ? "website" : "reception",
            addons: addons ? JSON.stringify(addons) : null,
            bookedAt: booked,
        });
    }

    // Sort by date for sequential insertion
    bookings.sort((a, b) => a.bookedAt.getTime() - b.bookedAt.getTime());

    // Insert all bookings
    let created = 0;
    for (const b of bookings) {
        try {
            await prisma.staycationBooking.create({ data: b });
            created++;
        } catch (err: any) {
            console.error(`  ✗ Failed: ${b.bookingRef} — ${err.message}`);
        }
    }

    console.log(`✅ Created ${created}/100 bookings`);

    // Summary by status
    const summary = bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    console.log("Status breakdown:", summary);

    // Summary by property
    const propSummary = bookings.reduce((acc, b) => {
        const prop = allProperties.find(p => p.id === b.propertyId);
        const name = prop?.name || "Unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    console.log("Property breakdown:", propSummary);
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
