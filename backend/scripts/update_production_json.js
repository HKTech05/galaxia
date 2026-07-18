const fs = require('fs');
const file = '/home/ec2-user/menu_items.json';
if (fs.existsSync(file)) {
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  const updated = items.map(item => {
    if (item.category === "Timepass") {
      item.category = "High Tea";
      count++;
    }
    return item;
  });
  fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`Updated ${count} production menu items to High Tea category!`);
} else {
  console.log('Production menu items file not found!');
}
