const fs = require("fs");
const path = require("path");

const VAULT_PATH = path.resolve(__dirname, "../../GALAXIA1");

// Helper to ensure directories exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper to write file
function writeFile(subPath, content) {
  const fullPath = path.join(VAULT_PATH, subPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content.trim() + "\n", "utf8");
  console.log(`Created: ${subPath}`);
}

// ─── 1. DIGITAL DIARIES ASSISTANT KNOWLEDGE ───
const ddPath = "Digital Diaries";

writeFile(`${ddPath}/Pricing.md`, `
# Digital Diaries Private Movie Screening Pricing

We offer private movie screenings on themed screens in Wadala, Mumbai.

## Screens Available
- **Park N Watch** (Car Theme)
- **Cine Love** (Romantic Theme)
- **Sandy Screen** (Beach Theme)
- **Baywatch** (Greece Theme)

## Packages

### 1. Movie Time Only (for 2 people)
Includes private screening and a complimentary snacks hamper (dry snacks, popcorn, juice, chocolates, mineral water).
- **1 Hour:** ₹999
- **2 Hours:** ₹1,500
- **3 Hours:** ₹1,950 (also listed as ₹2,500)
- **Extra Person (above 2):** ₹300 per head

### 2. Celebration Package (for 2 people)
Includes private screening, complimentary hamper, 250g Celebration Cake, LED message tag (Birthday / Anniversary / Proposal / Bride to be / Bachelors / Better Together), Walking on Cloud (fog effect), Heart-lit pathway, and candles setup.
- **2 Hours:** ₹2,950
- **3 Hours (Weekday - Mon-Thu):** ₹3,450
- **3 Hours (Weekend - Fri-Sun):** ₹3,950
- **Extra Person (above 2):** ₹300 per head
`);

writeFile(`${ddPath}/Food.md`, `
# Digital Diaries Food and Beverage Policy

## Included Hamper
Both Movie Time and Celebration packages include a complimentary hamper:
- Dry snacks
- Popcorn
- Juice
- Chocolates
- Mineral water

## Additional Food
We offer a variety of snacks and beverages at the venue.
- **Outside food is NOT allowed.**
- You can download our full food menu here: https://galaxiaresorts.com/menus/DigitalDiariesMenu.pdf
`);

writeFile(`${ddPath}/Activities.md`, `
# Digital Diaries Activities & Celebrations

We curate private experiences for:
- Birthdays
- Anniversaries
- Proposals
- Bride to Be / Bachelors
- Movie screenings / Private escapes
`);

writeFile(`${ddPath}/Booking.md`, `
# Digital Diaries Booking Guidelines

All bookings must be made online through the official website.
- **Movie Time Booking:** https://galaxiaresorts.com/celebration/movie-time
- **Celebration Package Booking:** https://galaxiaresorts.com/celebration/celebration

## Payment and ID Proof
- **Payments:** Must be made securely on the website. No manual transfers or other accounts are valid.
- **ID Verification:** A valid government ID proof is mandatory for all guests upon arrival. Unmarried couples are welcome (must be 18+).
`);

writeFile(`${ddPath}/Cancellation.md`, `
# Digital Diaries Cancellation Policy

All bookings made for Digital Diaries are strictly **non-refundable** and **non-transferable**. Once confirmed, bookings cannot be cancelled or rescheduled.
`);

writeFile(`${ddPath}/Refund.md`, `
# Digital Diaries Refund Policy

No refunds are applicable for cancellations or modifications of Digital Diaries private screenings.
`);

writeFile(`${ddPath}/Decorations.md`, `
# Digital Diaries Celebration Decorations

Our packages include curated romantic and festive decoration setups:
- **LED message tags:** options include "Happy Birthday", "Happy Anniversary", "Will You Marry Me?", "Bride to Be", "Bachelors", "Better Together".
- **Lighting:** Candles setup and a beautiful Heart-lit pathway.
- **Fog Effect:** "Walking on cloud" special fog effect.
- **Optional Add-ons (₹400 each for Movie Time):**
  - Celebration Cake (250g)
  - Balloons Decoration
  - LED Message Tag
`);

writeFile(`${ddPath}/Birthday.md`, `
# Digital Diaries Birthday Celebrations

Celebrate birthdays with private screenings and premium balloon, cake, and light setups. Select the Celebration Package (₹2,950 for 2 Hours, ₹3,450 Weekdays, ₹3,950 Weekends). Includes a 250g cake, LED message tags, candles setup, and a fog effect.
`);

writeFile(`${ddPath}/Anniversary.md`, `
# Digital Diaries Anniversary Celebrations

Special romantic setups for anniversaries including heart-lit pathways, candles, fog effect, cake, and customized LED anniversary tags. Select the Celebration Package (₹2,950 for 2 Hours, ₹3,450 Weekdays, ₹3,950 Weekends).
`);

writeFile(`${ddPath}/Policies.md`, `
# Digital Diaries General Policies

- **Privacy:** Strict **NO CCTV** policy inside the screening rooms to ensure complete privacy for guests.
- **Age limit:** Guests must be 18+ (valid government ID required).
- **Outside Food:** Strictly prohibited. In-house menu is available.
- **Booking Policy:** All bookings are non-refundable and non-transferable.
`);

writeFile(`${ddPath}/FAQ.md`, `
# Digital Diaries Frequently Asked Questions

### Where is Digital Diaries located?
We are located in Wadala, Mumbai.
Google Maps location link: https://maps.app.goo.gl/ghU28kHARPrpa4a89

### Is there CCTV?
No, we have a strict no CCTV policy inside the private screening rooms.

### Can we bring outside food?
No, outside food is not allowed. We provide a complimentary hamper and have an in-house food menu.

### Can unmarried couples book?
Yes, unmarried couples are welcome with valid government IDs (18+).

### What is the extra person charge?
₹300 per head above 2 people.
`);


// ─── 2. STAYCATION PROPERTIES ───
const stayPath = "Staycation";

// 2.1 Amstel Nest
writeFile(`${stayPath}/Amstel Nest/Pricing.md`, `
# Amstel Nest Pricing

Amstel Nest features 13 Standard Cottages and 1 Family Cottage with private indoor pools. Meals are included in the price.

## Rates (Excl. 5% GST)

### Standard Unit (2 persons with meals)
- **Mon–Thu:** ₹4,950
- **Fri & Sun:** ₹5,950
- **Saturday:** ₹6,950

### Family Unit (4 persons with meals)
- **Mon–Thu:** ₹9,000
- **Fri & Sun:** ₹10,000
- **Saturday:** ₹12,000

### Prime Dates (e.g. 14 & 15 August)
- **14 Aug:** ₹7,950 (Standard) | ₹11,000 (Family)
- **15 Aug:** ₹8,500 (Standard) | ₹13,500 (Family)

### Extra Charges
- **Extra Person:** ₹2,000 (Meals included)
- **Child (5-12 yrs):** ₹1,000 (Meals included)
`);

writeFile(`${stayPath}/Amstel Nest/Amenities.md`, `
# Amstel Nest Amenities

Each cottage at Amstel Nest is equipped with:
- Double Bed (Family Cottage has 2 Double Beds)
- Private Indoor Pool
- Smart TV
- Air Conditioner (AC)
- Private Washroom
- Garden Sitting Area
- Gaming Zone (includes Pool Table, Table Tennis, Table Soccer, Foosball)
- High-speed WiFi
- Boating on the resort grounds
`);

writeFile(`${stayPath}/Amstel Nest/Food.md`, `
# Amstel Nest Food & Dining

- **Included:** Lunch, Dinner, and Breakfast are included in the tariff.
- **Dining Policy:** Vegetarian meals ONLY. Jain food is available upon prior notice.
- **Driver Accommodation & Meals:** ₹1,000 (or ₹1,500) per driver. Includes mattress, basic accommodation in the reception/common area, and meals.
`);

writeFile(`${stayPath}/Amstel Nest/Policies.md`, `
# Amstel Nest Policies

- **Check-in:** 1:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹2,000 (refundable at check-out after property inspection).
- **Pets:** Strictly NOT allowed (❌).
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/RuZGUE9qZTcz7w3S7
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);

writeFile(`${stayPath}/Amstel Nest/FAQ.md`, `
# Amstel Nest FAQs

### Are pets allowed?
No, pets are not allowed at Amstel Nest.

### Is non-veg food allowed?
No, Amstel Nest is a strict vegetarian-only property. Jain food can be served on prior notice.

### What are the check-in and check-out timings?
Check-in is at 1:00 PM and check-out is at 10:00 AM.
`);


// 2.2 Hill View
writeFile(`${stayPath}/Hill View/Pricing.md`, `
# Hill View Apartment Pricing

Hill View is a budget-friendly Mountain View Apartment.

## Rates (Excl. 5% GST)
- **Mon–Thu:** ₹2,000 (or ₹2,500) for 2 persons
- **Fri–Sun & Public Holidays:** ₹3,000 (or ₹3,950) for 2 persons
- **Prime Dates:** ₹3,000 (or ₹4,450)
- **Extra Adult:** ₹600 (or ₹800) per person
- **Child (5-12 yrs):** ₹400 per child
`);

writeFile(`${stayPath}/Hill View/Amenities.md`, `
# Hill View Apartment Amenities

- 1 Bedroom with Queen Size Bed
- 1 Living Room with 3-Seater Sofa
- Huge Open Balcony with Mountain View
- Small Kitchen with basic utensils
- 2 Washrooms
- Smart TV
- Induction cooktop
- 2 Air Conditioners
- Battery Backup Inverter
- Free WiFi
- Free Parking
- Access to Society Swimming Pool
`);

writeFile(`${stayPath}/Hill View/Food.md`, `
# Hill View Apartment Food Options

- **Meals:** Food is NOT included in the stay package.
- **Options:** A society restaurant is available nearby serving both Veg & Non-Veg options.
`);

writeFile(`${stayPath}/Hill View/Policies.md`, `
# Hill View Apartment Policies

- **Check-in:** 1:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹2,000 (Refunded at checkout).
- **Pets:** Allowed (✅) with an extra charge of ₹600 per pet.
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/yYBcjkewtYMNXPmY9 (Hill View and Mount View share the same location and map embed link).
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);


// 2.3 Mount View
writeFile(`${stayPath}/Mount View/Pricing.md`, `
# Mount View Apartment Pricing

Mount View is a mountain apartment featuring a private bathtub in the balcony.

## Rates (Excl. 5% GST)
- **Mon–Thu:** ₹3,000 (or ₹3,500) for 2 persons
- **Fri–Sun & Public Holidays:** ₹4,000 (or ₹4,950) for 2 persons
- **Prime Dates:** ₹4,000 (or ₹5,950)
- **Special Dates (30 Dec):** ₹5,450
- **Special Dates (31 Dec):** ₹10,000
- **Extra Adult:** ₹800 per person (₹2,500 on 31 Dec)
- **Child (5-12 yrs):** ₹500 per child
`);

writeFile(`${stayPath}/Mount View/Amenities.md`, `
# Mount View Apartment Amenities

- 1 Bedroom with Queen Size Bed
- 1 Sofa Cum Bed
- Private Bathtub in Balcony
- Huge Mountain View Balcony
- Small Kitchen with basic utensils
- 2 Washrooms
- Smart TV
- Music Player
- 2 Air Conditioners (AC)
- Battery Backup Inverter
- Free WiFi
- Free Parking
`);

writeFile(`${stayPath}/Mount View/Food.md`, `
# Mount View Apartment Food Options

- **Meals:** Food is NOT included.
- **Options:** Veg & Non-Veg restaurants are available nearby.
`);

writeFile(`${stayPath}/Mount View/Policies.md`, `
# Mount View Apartment Policies

- **Check-in:** 2:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹3,000 (refunded within 24 hours).
- **Pets:** Allowed (✅) with an extra charge of ₹600 per pet.
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/yYBcjkewtYMNXPmY9 (Hill View and Mount View share the same location and map embed link).
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);


// 2.4 Heavenly Villa
writeFile(`${stayPath}/Heavenly Villa/Pricing.md`, `
# Heavenly Villa Pricing

Heavenly Villa is a private indoor swimming pool villa.

## Rates (Excl. 5% GST)
- **Mon–Thu:** ₹3,950 for 2 persons
- **Fri–Sun & Public Holidays:** ₹4,950 for 2 persons
- **Extra Adult:** ₹800 per person
- **Child (5-12 yrs):** ₹500 per child
`);

writeFile(`${stayPath}/Heavenly Villa/Amenities.md`, `
# Heavenly Villa Amenities

- Studio Room with Queen Bed
- Sofa Cum Bed
- Private Indoor Swimming Pool
- Swing near the Pool
- Kitchen with basic utensils
- Smart TV
- Music Player
- 1 Air Conditioner (AC)
- Inverter Backup
- Free WiFi
- Free Parking
`);

writeFile(`${stayPath}/Heavenly Villa/Food.md`, `
# Heavenly Villa Food Options

- **Meals:** Food is NOT included in the stay price.
- **Options:** Restaurant available nearby.
`);

writeFile(`${stayPath}/Heavenly Villa/Policies.md`, `
# Heavenly Villa Policies

- **Check-in:** 2:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹3,000 (refunded at checkout).
- **Pets:** Allowed (✅) with an extra charge of ₹600 per pet.
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/yYBcjkewtYMNXPmY9 (shares location with Hill View and Mount View).
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);


// 2.5 La Paraiso
writeFile(`${stayPath}/La Paraiso/Pricing.md`, `
# La Paraiso Pricing

La Paraiso is a premium private pool villa.

## Rates (Excl. 5% GST)
- **Mon–Thu:**
  - ₹4,950 for 2 persons
  - ₹6,500 for 4 persons
- **Fri & Sun & Public Holidays:** ₹7,500 (up to 4 persons)
- **Saturday / Prime Dates:** ₹8,500 (up to 4 persons)
- **Extra Person:** ₹1,200 per person
- **Child (5-12 yrs):** ₹800 per child
`);

writeFile(`${stayPath}/La Paraiso/Amenities.md`, `
# La Paraiso Amenities

- 1 Bedroom with Queen Size Bed
- 1 Sofa Cum Bed Room
- 2 Washrooms
- Kitchen
- Smart TV
- Sony Music Player
- 2 Air Conditioners (AC)
- Private Swimming Pool (25x10 ft)
- 600 sq ft Private Garden
- Private Gazebo
- Self Check-in Lock
- Inverter Backup
- Free WiFi
- Free Parking
`);

writeFile(`${stayPath}/La Paraiso/Food.md`, `
# La Paraiso Food Options

- **Meals:** Not included.
- **Options:** Restaurant is located just 10 steps away.
- **Food consumption rules:** Vegetarian food is allowed inside the villa. Non-Vegetarian food must be consumed in the restaurant only.
`);

writeFile(`${stayPath}/La Paraiso/Policies.md`, `
# La Paraiso Policies

- **Check-in:** 2:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹3,000 (refunded at checkout).
- **Pets:** Allowed (✅) with an extra charge of ₹600 per pet.
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/EsM9k4zGxDTbSufMA
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);


// 2.6 Ambrose Themed Villas
writeFile(`${stayPath}/Ambrose/Pricing.md`, `
# Ambrose Villas Pricing

Ambrose is a themed private pool villa resort containing:
- **Take-1** (Bollywood Theme)
- **Alta** (Rustic Countryside Theme)
- **Santorini** (Greek Theme)
- **Bamboosa** (Bali Premium Theme)
- **Cypress** (Machan Theme)

Meals (Breakfast, Lunch, Dinner - Veg Only) are included in all Ambrose bookings.

## Standard Theme Villa Rates (Take-1 / Alta / Santorini)
- **Mon–Thu:**
  - ₹5,500 (2 persons with meals)
  - ₹9,500 (4 persons with meals)
- **Fri & Sun:**
  - ₹6,500 (2 persons with meals)
  - ₹10,500 (4 persons with meals)
- **Saturday:** ₹12,000 (up to 4 persons with meals)
- **Prime Dates:** ₹8,500 (standard theme) or ₹12,000
- **Extra Person:** ₹2,000
- **Child (5-12 yrs):** ₹1,000

## Bamboosa Rates (Premium Bali 2 BHK)
- **Mon–Thu:** ₹10,500 (4 persons with meals)
- **Fri & Sun:** ₹11,500 (4 persons with meals)
- **Saturday:** ₹13,000 (4 persons with meals)
- **Extra Person:** ₹2,000
- **Child (5-12 yrs):** ₹1,000

## Cypress Rates (Machan Theme)
- **Mon–Thu:** ₹5,500 (2 persons with meals)
- **Fri–Sun:** ₹6,500 (2 persons with meals)
`);

writeFile(`${stayPath}/Ambrose/Amenities.md`, `
# Ambrose Villas Amenities

## Standard Theme Villa Configuration (Take-1 / Alta / Santorini)
- 1 King Bedroom
- 1 Sofa Cum Bed Room
- 2 Washrooms
- Private Pool
- Garden Seating
- 2 Air Conditioners (AC)
- Smart TV

## Bamboosa (Bali Theme) Configuration
- 2 King Bedrooms
- Spacious Living Room
- 4 Bathrooms
- 4 Air Conditioners (AC)
- Private Pool
- Garden Seating

## Cypress (Machan Theme) Configuration
- 1 Queen Bedroom
- Glass Bottom Pool View
- Private Pool
- Kids Sleeping Area
- Mountain Deck
`);

writeFile(`${stayPath}/Ambrose/Food.md`, `
# Ambrose Villas Food & Dining

- **Included:** Breakfast, Lunch, and Dinner are included in the booking tariff.
- **Dining Policy:** Vegetarian ONLY (Veg).
- **Driver Accommodation & Meals:** ₹1,000 (or ₹1,500) per driver. Includes mattress, basic accommodation in the reception/common area, and meals.
`);

writeFile(`${stayPath}/Ambrose/Policies.md`, `
# Ambrose Villas Policies

- **Check-in:** 2:00 PM
- **Check-out:** 10:00 AM
- **Security Deposit:** ₹3,000 (refunded within 24 hours).
- **Pets:** Allowed (✅) with an extra charge of ₹600 per pet.
- **Booking:** Non-refundable and non-transferable.
- **Location:** https://maps.app.goo.gl/2NEib4Vz9raNqLY5A
- **Travel Info:** Auto/cab available from Karjat station for ₹400-500. Travel time is 30-40 minutes.
`);


// 2.7 General Policies
const genPath = `${stayPath}/General`;

writeFile(`${genPath}/Refund Policy.md`, `
# Staycation Refund Policy

All bookings made for staycation villas are strictly **non-refundable**. Once a booking is confirmed, no cancellations, refunds, or credits will be issued under any circumstances.
`);

writeFile(`${genPath}/Cancellation.md`, `
# Staycation Cancellation Policy

- Bookings are strictly non-transferable and non-refundable.
- For website bookings, cancellations are not eligible for a refund.
- High-season, festival dates, and long weekends are 100% non-refundable and cannot be modified.
- (Standard legacy cancellation, if applicable: 21+ days before: 10% deduction; 11-20 days: 50% retained; within 10 days: no refund. However, all bookings are currently sold as non-refundable and non-transferable, which is the primary policy to communicate).
`);

writeFile(`${genPath}/Payment Policy.md`, `
# Staycation Payment & Safety Policy

- **Official Booking:** All reservations and payments must be processed directly on the official website: https://galaxiaresorts.com
- **Booking Notice:** Payments can only be made securely through our website. We do not accept direct transfers to unverified accounts.
- **Security Deposit:** A refundable security deposit is mandatory at check-in (₹2,000 for Hill View and Amstel Nest, ₹3,000 for Mount View, Heavenly Villa, La Paraiso, and Ambrose).
`);

writeFile(`${genPath}/Resort Rules.md`, `
# General Resort Rules & Information

- **Check-in/out Timings:** Standard check-in is 1:00 PM or 2:00 PM (varies by property). Check-out is strictly at 10:00 AM. Early check-in or late check-out is subject to availability and chargeable.
- **Parking:** Complimentary parking is available for all in-house guests.
- **Government ID:** A valid government ID card is required for all guests checking in.
- **Power Backup:** Inverters are available at our properties. Due to local area conditions, occasional and unpredictable power interruptions may occur.
- **Property Care:** Guests must maintain cleanliness. Shifting furniture or appliances is prohibited. Any damage will be charged.
- **Music & Parties:** Moderate volume is allowed during the day. Loud music after 10:00 PM must be avoided.
- **Alcohol:** Allowed inside private villas. Please maintain a peaceful environment.
- **Insects & Comfort:** Keep doors and windows closed between 5:00 PM and 7:00 PM to avoid insects entering the villa.
`);

writeFile(`${genPath}/Nearby Attractions.md`, `
# Nearby Attractions & Sightseeing in Karjat

Discover the beauty and adventure around Karjat:
- **Kondana Caves & Fort:** 28.4 km (58 mins drive). Historic 1st Century BC Buddhist caves.
- **Kothaligad (Peth Fort):** 11.4 km (25 mins drive). Scenic views and cave temple at 3,100 ft.
- **Solanpada Waterfalls:** 12.4 km (26 mins drive). Popular monsoon retreat.
- **Matheran:** 25 km (40 mins drive to Neral). Vehicle-free hill station.
- **ND Studio:** 29.2 km (58 mins drive). Famous Bollywood movie sets.
- **Shri Bal Digambar Ganesh Mandir:** 9 km (15 mins drive). Large Ganesha idol carved from a single marble.
`);

console.log("Migration complete!");
