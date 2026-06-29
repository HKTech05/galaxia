const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
    console.error(".env file not found!");
    process.exit(1);
}

let content = fs.readFileSync(envPath, "utf8");
// Remove any existing CHEF_ variables or malformed lines we just added
content = content.replace(/CHEF_[A-Z_]+="?[^\n]*"?\n?/g, "");
content = content.trim() + "\n\n# Chef Supplier WhatsApp Configurations\nCHEF_DAIRY_PHONE=\"8237309564\"\nCHEF_KIRAYANA_PHONE=\"8237309564\"\nCHEF_SHAK_SHABJI_PHONE=\"8237309564\"\n";

fs.writeFileSync(envPath, content, "utf8");
console.log("Successfully fixed .env file");
