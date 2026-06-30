const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const r = await p.hospitalityRequest.findMany({ where: { status: "fulfilled" }, select: { items: true } });
  const all = {};
  r.forEach(req => {
    let items = req.items;
    if (typeof items === "string") try { items = JSON.parse(items); } catch { return; }
    if (!Array.isArray(items)) return;
    items.forEach(i => {
      const id = i.id || i.name;
      if (!all[id]) all[id] = { name: i.name, price: i.price, qty: 0 };
      all[id].qty += i.quantity || 1;
    });
  });
  Object.values(all).forEach(i => console.log(i.name + " | price:" + i.price + " | qty:" + i.qty));
  await p.$disconnect();
})();
