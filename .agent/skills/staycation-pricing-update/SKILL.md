---
name: staycation-pricing-update
description: >-
  Use this skill when the user asks to update, change, or modify pricing for any
  staycation property (Ambrose, Amstel Nest, La Paraiso, Hill View, Mount View,
  Heavenly Villa). Covers regular pricing, weekend/saturday pricing, prime date
  overrides, and per-person base guest changes. This skill ensures all 7+ layers
  of the pricing system are updated consistently without breaking anything.
---

# Staycation Pricing Update — Complete Workflow

This skill covers how to change prices for **website staycation properties only** (NOT chatbots).

> **CRITICAL**: Pricing lives in **7 layers**. Missing even ONE causes price mismatches between what the user sees and what gets charged. Follow every step.

---

## Architecture Overview

```
Layer 1: Static Config (properties.ts)          ← Calendar display, property pages
Layer 2: Database (PropertyPricing table)        ← Single booking, API responses
Layer 3: Single Booking (BookingClient.tsx)       ← User booking flow (reads from DB + static)
Layer 4: Multi-Cart (book-multi/page.tsx)         ← Ambrose multi-villa booking only
Layer 5: Admin Manual Booking (ManualBookingModal.tsx) ← Admin creates bookings
Layer 6: Quotation Pages (3 files)               ← Admin + customer quotation generation
Layer 7: Backend Quotation (quotations.ts)        ← Server-side quote calculation
```

### How Each Layer Gets Its Price

| Layer | Primary Source | Fallback |
|:---|:---|:---|
| Calendar/Property Page | `properties.ts` static data | — |
| Single Booking | DB via API (`/properties/{slug}/availability`) | `properties.ts` static |
| Multi-Cart | DB via API + hardcoded `ambOverridesMap` | Static pricing |
| Admin Manual Booking | `livePricing` from DB | Hardcoded fallback in code |
| Quotation Pages | `livePricing` from DB | Hardcoded fallback in code |
| Backend Quotation | DB query | Hardcoded fallback in code |

---

## Files to Update (Checklist)

For EVERY price change, update these files. Check each one off:

### Always Update (All Properties)

| # | File | Path | What to Change |
|---|:---|:---|:---|
| 1 | **Static Config** | `FRONTEND/galaxia/app/data/properties.ts` | `weekday`, `weekend`, `saturday`, `dateOverrides`, `primeDates` |
| 2 | **Admin Manual Booking** | `FRONTEND/galaxia/app/components/ManualBookingModal.tsx` | Prime date fallback block + non-prime fallback block |
| 3 | **Admin Quotation** | `FRONTEND/galaxia/app/admin3/quotation/page.tsx` | Prime date fallback + non-prime fallback |
| 4 | **Customer Quotation** | `FRONTEND/galaxia/app/customerquote/page.tsx` | Prime date fallback + non-prime fallback |
| 5 | **Backend Quotation** | `backend/src/routes/quotations.ts` | Prime date fallback + non-prime fallback |
| 6 | **Database** | Via script on EC2 | `PropertyPricing` rows |

### Ambrose-Only (When Changing Ambrose Villa Prices)

| # | File | Path | What to Change |
|---|:---|:---|:---|
| 7 | **Multi-Cart** | `FRONTEND/galaxia/app/staycation/ambrose/book-multi/page.tsx` | `ambOverridesMap` for prime dates, discount logic |
| 8 | **BookingClient** | `FRONTEND/galaxia/app/staycation/[property]/book/BookingClient.tsx` | `specialDiscount` logic (if changing base guests) |

### Amstel-Only (When Changing Amstel Nest Prices)

| # | File | Path | What to Change |
|---|:---|:---|:---|
| 9 | **BulkBookingsTab** | `FRONTEND/galaxia/app/components/BulkBookingsTab.tsx` | Prime date prices for standard/family cottage |

---

## Step-by-Step Procedure

### Step 1: Understand the Price Structure

Before making changes, identify exactly what's changing:

1. **Which property?** (Ambrose/Amstel/La Paraiso/Hill View/Mount View/Heavenly)
2. **Which villa/sub-property?** (e.g., Take-1 vs Bamboosa vs all)
3. **Which day types?** (weekday/weekend/saturday/prime dates)
4. **Base price AND base guests** — How many people does the base price include?
5. **Extra person charges** — Are they changing too?
6. **Prime date overrides** — Do they need recalculating?

**Day type definitions:**
- **Weekday**: Monday, Tuesday, Wednesday, Thursday (day 1-4)
- **Weekend (Fri/Sun)**: Friday (day 5), Sunday (day 0)
- **Saturday**: Saturday only (day 6)
- **Prime dates**: Specific override dates (currently Aug 14-15, Oct 2-3)

### Step 2: Read Current Prices

Always read the current state FIRST before changing:

```
# Read properties.ts for the target property
view_file properties.ts → find the property's pricing block

# Find all hardcoded fallbacks
findstr /n "Hill View\|Mount View\|<property>" ManualBookingModal.tsx
findstr /n "Hill View\|Mount View\|<property>" admin3/quotation/page.tsx
findstr /n "Hill View\|Mount View\|<property>" customerquote/page.tsx
findstr /n "Hill View\|Mount View\|<property>" backend/quotations.ts
```

### Step 3: Update `properties.ts`

**Location**: `FRONTEND/galaxia/app/data/properties.ts`

Find the property's `pricing` block and update:

```typescript
pricing: {
    weekday: { price: "NEW_PRICE", persons: "2 persons" },      // ← Base price string
    weekend: { price: "NEW_PRICE", persons: "2 persons" },      // ← Fri/Sat/Sun or Fri/Sun
    saturday: { price: "NEW_PRICE", persons: "X with meals" },  // ← Saturday (Ambrose only if different)
    primeDates: "NEW_PRIME",                                     // ← Display label only
    dateOverrides: {                                              // ← Actual override prices (numbers, not strings)
        "2026-08-14": PRICE, "2026-08-15": PRICE,
        "2026-10-02": PRICE, "2026-10-03": PRICE
    },
}
```

**Important notes:**
- `price` values are **comma-formatted strings** (e.g., `"12,000"`)
- `dateOverrides` values are **raw numbers** (e.g., `13000`)
- `persons` is a **label string** (e.g., `"2 with meals"`, `"4 with meals"`, `"2 persons"`)
- For Ambrose sub-properties, each villa has its OWN pricing block inside `subProperties`
- Aug 14-15 overrides should generally NOT be changed unless explicitly asked

### Step 4: Update `ManualBookingModal.tsx`

**Location**: `FRONTEND/galaxia/app/components/ManualBookingModal.tsx`

**TWO blocks** need updating per property:

#### Block A: Prime Date Fallback (~line 196-225)
Inside `if (is14Aug || is15Aug || is2Oct || is3Oct)`:
```typescript
} else if (propName.includes("Hill View")) {
    basePrice = NEW_PRIME_PRICE; extraAdultPrice = 600; kidsPrice = 400; baseGuests = 2;
}
```

#### Block B: Non-Prime Fallback (~line 231-240)
Inside `else { ... }` after the `livePricing` block:
```typescript
if (propName.includes("Hill View")) { basePrice = isWeekend ? NEW_WEEKEND : NEW_WEEKDAY; extraAdultPrice = 600; kidsPrice = 400; }
```

**Ambrose-specific**: For Ambrose villas, the prime date block has sub-branching by villa name (`vName.includes("BAMBOOSA")`, `vName.includes("CYPRESS")`, etc.). The `else` branch handles Take-1/Alta/Santorini.

**GOTCHA**: ManualBookingModal has a SECOND discount/submit handler section (~line 880-930) that may also have hardcoded prices. Search for the property name in the entire file.

### Step 5: Update Admin Quotation Page

**Location**: `FRONTEND/galaxia/app/admin3/quotation/page.tsx`

Same TWO blocks as ManualBookingModal:
- Prime date fallback: Search for `propName.includes("Hill View")` inside the `is14Aug || is15Aug` block
- Non-prime fallback: Search in the `else` block after `livePricing`

Variables use `isWe` (weekend) and `isSat` (saturday) instead of `isWeekend`/`isSaturday`.

### Step 6: Update Customer Quotation Page

**Location**: `FRONTEND/galaxia/app/customerquote/page.tsx`

Same pattern. Uses `resolvedProperty.includes("Hill View")` instead of `propName`.

### Step 7: Update Backend Quotation

**Location**: `backend/src/routes/quotations.ts`

Same pattern as customer quotation. Uses `resolvedProperty.includes("Hill View")`.

### Step 8: Update Multi-Cart (Ambrose Only)

**Location**: `FRONTEND/galaxia/app/staycation/ambrose/book-multi/page.tsx`

Only needed for Ambrose villa price changes. Update:
- `ambOverridesMap` (~line 293-298): Hardcoded prime date overrides per villa
- Discount logic (~line 728): If base guests changed, the `specialDiscount` may need removal

### Step 9: Update Database

Create a script in `backend/scripts/` and run on EC2:

```typescript
import dotenv from "dotenv";
dotenv.config();
import prisma from "../src/lib/prisma";

async function updatePricing() {
    const prop = await prisma.property.findFirst({ where: { slug: "SLUG" } });
    if (!prop) return;

    // For properties WITH sub-properties (Ambrose, Amstel):
    // Must filter by subPropertyId too
    
    // For standalone properties (Hill View, Mount View, etc.):
    await prisma.propertyPricing.updateMany({
        where: { propertyId: prop.id, dayType: "weekday", overrideDate: null },
        data: { basePrice: NEW_PRICE },
    });
    // Repeat for weekend, saturday, and each overrideDate
}
```

**DB Schema — `PropertyPricing` table:**
| Column | Description |
|:---|:---|
| `propertyId` | FK to Property |
| `subPropertyId` | FK to SubProperty (null for standalone) |
| `dayType` | `"weekday"`, `"weekend"`, `"saturday"`, `"prime"`, `"special"` |
| `basePrice` | Number (e.g., `6500`) |
| `personsLabel` | String (e.g., `"2 with meals"`) |
| `overrideDate` | Date for prime date overrides, null for regular pricing |
| `extraAdultPrice` | Number |
| `kidsPrice` | Number |

### Step 10: Compile & Verify

```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Users\K\AppData\Local\Programs\Git\cmd;$env:PATH"

# Frontend
cd FRONTEND/galaxia && npx tsc --noEmit

# Backend
cd backend && npx tsc --noEmit
```

**MUST be 0 errors before committing.**

### Step 11: Deploy

```powershell
# Commit & Push (frontend auto-deploys on Vercel)
git add -A
git commit -m "fix: update <property> pricing - weekday=X, weekend=Y, prime=Z"
git push origin main

# Deploy backend
ssh -i "backend/galaxia-deploy-key.pem" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "cd ~/galaxia/backend && git pull && npm run build && pm2 restart all --update-env"

# Run DB script on EC2
ssh -i "backend/galaxia-deploy-key.pem" -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "cd ~/galaxia/backend && npx ts-node scripts/<script_name>.ts"
```

---

## Challenges & Gotchas (Learned from Experience)

### 1. Saturday vs Weekend Distinction (Ambrose)
Ambrose villas have THREE tiers: weekday, weekend (Fri/Sun), saturday. Most other properties only have weekday + weekend (Fri/Sat/Sun combined). When changing Ambrose prices, always handle saturday separately.

### 2. Base Guests per Day Type
Ambrose Take-1/Alta/Santorini have **different base guests per day type**:
- Weekday/Fri-Sun: 2 people
- Saturday: 4 people

This means `baseGuests` must be set conditionally: `baseGuests = isSaturday ? 4 : 2`. DO NOT set `baseGuests = 4` for all weekend days.

### 3. The `specialDiscount` Trap
There WAS a `specialDiscount` of ₹500 for Ambrose villas when 4 guests booked on Saturday. After changing Saturday to include 4 guests in the base rate, this discount became WRONG (it was double-counting). The discount code exists in THREE files:
- `BookingClient.tsx` (~line 559)
- `book-multi/page.tsx` (~line 728)
- `ManualBookingModal.tsx` (~line 374 and ~line 901)

**Rule**: If you change the base guests for a day type, check if any discount logic references that guest count and remove/update it.

### 4. Per-Night Breakdown Display
The booking summary shows per-night prices (e.g., "Sat ₹12,000"). This code (~line 1137 and ~1665 in BookingClient.tsx, ~line 1437 in book-multi) originally used only day-type prices and IGNORED `dateOverrides`. It was fixed to check `dateOverrides` first:

```typescript
const p = roomOverrides[dateStr] ? roomOverrides[dateStr] : (dw === 6 ? saP : (dw === 0 || dw === 5) ? weP : wdP);
```

If you add new prime dates, this will auto-work. But if you see the wrong price in the per-night breakdown, this is where to look.

### 5. DB Scripts Must Run on EC2
The database is on the EC2 server. Running Prisma scripts locally will fail with `PrismaClientInitializationError`. Always push the script to git, pull on EC2, and run there.

### 6. `ts-node` Strict Mode on EC2
EC2's `ts-node` is stricter than local `tsc`. Common issue: `p.property.slug` fails because `property` relation can be null. Always use `p.property?.slug || "?"`.

### 7. PATH Issues in PowerShell
`npx`, `git`, `node` are NOT on the default PATH. Always prepend:
```powershell
$env:PATH = "C:\Program Files\nodejs;C:\Users\K\AppData\Local\Programs\Git\cmd;$env:PATH"
```

### 8. Comma-Formatted Strings vs Raw Numbers
- `properties.ts` `price` fields: `"12,000"` (string with comma)
- `properties.ts` `dateOverrides`: `13000` (raw number, no comma)
- `ManualBookingModal` fallbacks: `12000` (raw number)
- Database `basePrice`: `12000` (raw number)

Mixing these up will cause NaN or wrong calculations.

### 9. Ambrose `ambOverridesMap` in Multi-Cart
The multi-cart has a SEPARATE hardcoded override map (`ambOverridesMap`) for prime dates. This is NOT read from the database. If you change prime date prices for Ambrose villas, you MUST update this map too (~line 293 in book-multi/page.tsx).

### 10. Heavenly Villa = Mount View Prices (Usually)
Heavenly Villa and Mount View historically had the same prices. They are in SEPARATE code branches. Changing one does NOT change the other. Always verify which properties the user wants changed.

---

## Property-Specific Reference

### Ambrose Villas (5 sub-properties)
- **Take-1, Alta, Santorini**: Same pricing. 3-tier (weekday/Fri-Sun/Saturday). Saturday has 4ppl base.
- **Bamboosa**: Premium. Always 4ppl base. Higher prices.
- **Cypress**: Budget. Always 2ppl base. No saturday distinction.
- Has multi-cart flow, specialDiscount logic, ambOverridesMap.
- Extra: ₹2,000/adult, ₹1,000/kid for all villas.

### Amstel Nest (2 sub-properties)
- **Standard Cottage** (14 units): 2ppl base.
- **Family Cottage** (1 unit): 4ppl base.
- Has BulkBookingsTab with its own prime date block.
- Extra: ₹2,000/adult, ₹1,000/kid.

### La Paraiso (standalone)
- Weekday: 2ppl base. Weekend: 4ppl base. Complex discount logic for 4 guests on weekdays.
- Extra: ₹1,200/adult, ₹800/kid.

### Hill View (standalone)
- Always 2ppl base. Simple pricing.
- Extra: ₹600/adult, ₹400/kid.

### Mount View (standalone)
- Always 2ppl base. Has 30 Dec / 31 Dec special pricing.
- Extra: ₹800/adult, ₹500/kid.

### Heavenly Villa (standalone)
- Always 2ppl base. Simple pricing.
- Extra: ₹800/adult, ₹500/kid.

---

## Quick Verification Checklist (Post-Deploy)

After deploying, verify these:

- [ ] Property page shows correct weekday/weekend/saturday prices
- [ ] Calendar shows correct prices for each day
- [ ] Single booking flow: select dates → correct per-night prices shown
- [ ] Single booking flow: correct base price, extra charges, taxes, grand total
- [ ] Multi-cart (Ambrose): correct per-villa per-night prices
- [ ] Prime dates: correct override price shown (no regular day-type price leaking)
- [ ] Admin manual booking: create test booking → correct price calculation
- [ ] Admin quotation: generate quote → correct prices per night
- [ ] No spurious discounts appearing (specialDiscount)
- [ ] DB verification: run query on EC2 to confirm rows
