import prisma from "../lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Reading current menu items...");
    const MENU_FILE_PATH = path.join(__dirname, "../../../menu_items.json");
    let currentMenu: any[] = [];
    if (fs.existsSync(MENU_FILE_PATH)) {
        currentMenu = JSON.parse(fs.readFileSync(MENU_FILE_PATH, "utf8"));
    }
    const currentMenuIds = new Set(currentMenu.map(item => item.id));
    const currentMenuNames = new Set(currentMenu.map(item => item.name.toLowerCase()));

    console.log(`Current menu has ${currentMenu.length} items.`);

    console.log("Fetching hospitality requests...");
    const requests = await prisma.hospitalityRequest.findMany({
        orderBy: { createdAt: "desc" }
    });

    console.log(`Found ${requests.length} requests in total.`);

    const deletedItemsMap = new Map<string, any>();
    const ordersWithDeletedItems: any[] = [];

    for (const req of requests) {
        let items: any[] = [];
        if (typeof req.items === "string") {
            try {
                items = JSON.parse(req.items);
            } catch (e) {
                continue;
            }
        } else if (Array.isArray(req.items)) {
            items = req.items as any[];
        }

        for (const item of items) {
            const nameLower = item.name.toLowerCase();
            const existsInCurrent = currentMenuIds.has(item.id) || currentMenuNames.has(nameLower);
            if (!existsInCurrent) {
                if (!deletedItemsMap.has(nameLower)) {
                    deletedItemsMap.set(nameLower, {
                        id: item.id || nameLower.replace(/\s+/g, "_"),
                        name: item.name,
                        price: item.price,
                        category: req.itemCategory || item.category || "Normal",
                        costPrice: item.costPrice || Math.round(item.price * 0.45)
                    });
                }
                ordersWithDeletedItems.push({
                    villaName: req.villaName,
                    itemCategory: req.itemCategory,
                    itemName: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    createdAt: req.createdAt,
                    requestId: req.id
                });
            }
        }
    }

    console.log("\n=== DELETED ITEMS FOUND IN PAST ORDERS ===");
    console.log(Array.from(deletedItemsMap.values()));

    console.log("\n=== ORDERS CONTAINING DELETED ITEMS ===");
    for (const order of ordersWithDeletedItems) {
        console.log(`Request #${order.requestId} at ${order.createdAt.toISOString()} - Villa: ${order.villaName}, Category: ${order.itemCategory}, Item: ${order.itemName} x${order.quantity} (Price: ${order.price})`);
    }

    // Let's also search AuditLog for any menu operations
    console.log("\nSearching Audit logs for menu actions...");
    const auditLogs = await prisma.auditLog.findMany({
        where: {
            OR: [
                { action: { contains: "menu" } },
                { entityType: { contains: "menu" } }
            ]
        },
        orderBy: { createdAt: "desc" }
    });
    console.log(`Found ${auditLogs.length} audit log entries for menu actions:`);
    for (const log of auditLogs) {
        console.log(`[AuditLog #${log.id}] Action: ${log.action}, Entity: ${log.entityType}, Date: ${log.createdAt.toISOString()}, Details:`, JSON.stringify(log.details));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
