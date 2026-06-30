#!/bin/bash
curl -s http://localhost:3001/api/hospitality/insights -H "Authorization: Bearer test" | node -e '
let d = "";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  const j = JSON.parse(d);
  j.items.forEach(i => console.log(i.id + " | " + i.name + " | price:" + i.price + " | ordered:" + i.totalOrdered));
});
'
