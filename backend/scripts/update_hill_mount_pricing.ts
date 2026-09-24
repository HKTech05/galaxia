import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

/**
 * Update Hill View and Mount View pricing:
 * Hill View: weekday=2000, weekend/saturday=3000, Oct 2-3=4000
 * Mount View: weekday=3000, weekend/saturday=4000, Oct 2-3=5000
 */
async function updateHillMountPricing() {
    const updates = [
        {
            slug: "hill-view",
            weekday: 2000,
            weekend: 3000,
            saturday: 3000,
            oct2: 4000,
            oct3: 4000,
        },
        {
            slug: "mount-view",
            weekday: 3000,
            weekend: 4000,
            saturday: 4000,
            oct2: 5000,
            oct3: 5000,
        },
    ];

    for (const u of updates) {
        console.log(`\nUpdating ${u.slug}...`);
        const prop = await prisma.property.findFirst({ where: { slug: u.slug } });
        if (!prop) { console.error(`  Property ${u.slug} not found!`); continue; }

        // Weekday
        const wd = await prisma.propertyPricing.updateMany({
            where: { propertyId: prop.id, dayType: "weekday", overrideDate: null },
            data: { basePrice: u.weekday },
        });
        console.log(`  weekday rows: ${wd.count} → Rs ${u.weekday}`);

        // Weekend
        const we = await prisma.propertyPricing.updateMany({
            where: { propertyId: prop.id, dayType: "weekend", overrideDate: null },
            data: { basePrice: u.weekend },
        });
        console.log(`  weekend rows: ${we.count} → Rs ${u.weekend}`);

        // Saturday
        const sa = await prisma.propertyPricing.updateMany({
            where: { propertyId: prop.id, dayType: "saturday", overrideDate: null },
            data: { basePrice: u.saturday },
        });
        console.log(`  saturday rows: ${sa.count} → Rs ${u.saturday}`);

        // Oct 2
        const o2 = await prisma.propertyPricing.updateMany({
            where: { propertyId: prop.id, overrideDate: new Date("2026-10-02") },
            data: { basePrice: u.oct2 },
        });
        console.log(`  Oct 2 rows: ${o2.count} → Rs ${u.oct2}`);

        // Oct 3
        const o3 = await prisma.propertyPricing.updateMany({
            where: { propertyId: prop.id, overrideDate: new Date("2026-10-03") },
            data: { basePrice: u.oct3 },
        });
        console.log(`  Oct 3 rows: ${o3.count} → Rs ${u.oct3}`);
    }

    // Verify
    console.log("\n--- Verification ---");
    const allPricing = await prisma.propertyPricing.findMany({
        where: {
            property: { slug: { in: ["hill-view", "mount-view"] } },
        },
        include: { property: { select: { slug: true } } },
        orderBy: [{ propertyId: "asc" }, { dayType: "asc" }, { overrideDate: "asc" }],
    });

    for (const p of allPricing) {
        const dateStr = p.overrideDate ? p.overrideDate.toISOString().split("T")[0] : "—";
        console.log(
            `${(p.property.slug).padEnd(12)} | ${(p.dayType || "prime").padEnd(10)} | ${dateStr.padEnd(12)} | Rs ${Number(p.basePrice).toString().padStart(5)} | ${p.personsLabel}`
        );
    }

    console.log("\nDone!");
}

updateHillMountPricing().catch(console.error).finally(() => prisma.$disconnect());
