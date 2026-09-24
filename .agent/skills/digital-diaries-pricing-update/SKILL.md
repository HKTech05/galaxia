---
name: digital-diaries-pricing-update
description: >-
  Use this skill when the user asks to update, change, or modify pricing for
  Digital Diaries (private cinema screenings). Covers package pricing (Movie Time,
  Celebration), add-on pricing, extra person charges, overtime rates, date-specific
  overrides, and transfer fees. This skill ensures all layers of the DD pricing
  system are updated consistently across static config, database, customer booking
  flow, admin walk-in booking, backend fallback, and properties management.
---

# Digital Diaries Pricing Update — Complete Workflow

This skill covers how to change prices for **Digital Diaries website only** (NOT chatbots).

> **CRITICAL**: DD pricing is **more complex than staycations** because it's
> hourly-tiered, has separate weekday/weekend variants per tier, live DB pricing
> with admin-editable overrides, add-on JSON pricing, and hardcoded server-side
> fallbacks. Missing any layer causes price mismatches.

---

## Architecture Overview

```
Layer 1: Static Config (celebrations.ts)           ← Package pages, fallback pricing
Layer 2: Database (DdPackagePricing table)           ← Live pricing, admin-editable
Layer 3: Database (DdPricingOverride table)           ← Date-specific overrides
Layer 4: Customer Booking (CelebrationBookingClient) ← Reads DB live → static fallback
Layer 5: Admin Walk-in (admin3/digital-diaries)      ← Hardcoded pricing calculator
Layer 6: Backend Fallback (ddBookings.ts)             ← Server-side price if frontend omits
Layer 7: Admin Properties Mgmt (properties-mgmt)     ← Live price editor (reads/writes DB)
Layer 8: FloatingChatbot.tsx                          ← Chatbot knowledge (NOT website, skip)
```

### How Each Layer Gets Its Price

| Layer | Primary Source | Fallback |
|:---|:---|:---|
| Package detail page | `celebrations.ts` static tiers | — |
| Customer booking checkout | `livePricing` from API (`GET /api/dd/packages`) | `celebrations.ts` static |
| Admin walk-in booking | **Hardcoded** in `admin3/digital-diaries/page.tsx` | — |
| Backend booking creation | `basePrice` from `req.body` (trusted from frontend) | **Hardcoded fallback** in `ddBookings.ts` |
| Properties management | Reads/writes DB `DdPackagePricing` directly | — |
| Date overrides | DB `DdPricingOverride` via admin UI | No fallback |

> **KEY DIFFERENCE FROM STAYCATIONS**: DD has a proper admin pricing editor in
> Properties Management that reads/writes DB directly. But the admin walk-in
> booking page and backend fallback use **separate hardcoded prices**.

---

## DD Pricing Structure

### Products

| Package | ID | Min Hours | Inclusions |
|:---|:---|:---|:---|
| **Movie Time** | `movie-time` | 1 hr | Screening, popcorn, snacks, juice, chocolates, privacy |
| **Celebration** | `celebration` | 2 hrs | Screening + cake (250g), LED tag, fog effect, heart path, candles |

### Screens (4 total)

| Screen | Slug | Capacity | Theme |
|:---|:---|:---|:---|
| Sandy Screen | `sandy-screen` | 3 guests | Beach |
| Park N Watch | `park-n-watch` | 3 guests | Drive-In |
| Baywatch | `baywatch` | 3 guests | Greece |
| Cine Love | `cine-love` | 8 guests | Romantic |

### Base Pricing (for 2 guests)

| Package | Duration | Weekday | Weekend (Sat/Sun) |
|:---|:---|:---|:---|
| **Movie Time** | 1 Hour | ₹999 | ₹999 |
| | 2 Hours | ₹1,500 | ₹1,500 |
| | 3 Hours | ₹2,500 | ₹2,500 |
| | 4+ Hours | ₹2,500 + ₹1,000/extra hr | Same |
| **Celebration** | 1 Hour (admin only) | ₹2,200 | ₹2,200 |
| | 2 Hours | ₹2,950 | ₹2,950 |
| | 3 Hours | **₹3,450** | **₹3,950** |
| | 4+ Hours | ₹3,450 + ₹1,000/extra hr | ₹3,950 + ₹1,000/extra hr |

### Extra Charges

| Charge | Amount | Notes |
|:---|:---|:---|
| Extra person (above 2) | ₹300/person | DB-editable via `extraPersonPrice` |
| Overtime (beyond max tier) | ₹1,000/hour | DB-editable via `extraHourRate` |
| Transfer/reschedule fee | ₹400 | Hardcoded in `ddBookings.ts` |
| Food markup (Satkar) | 25% | `satkarAmount * 1.25` |

### Add-on Pricing

| Add-on | Key | Default Price | Notes |
|:---|:---|:---|:---|
| Balloons | `balloons` | ₹400 | DB-editable via `addonPricing` JSON |
| LED Banner | `led_banner` | ₹400 | DB-editable via `addonPricing` JSON |
| Cake (250g) | `cake` | ₹400 | DB-editable via `addonPricing` JSON |

> **IMPORTANT**: For the **Celebration** package, all 3 add-ons are auto-enabled
> and charged at **₹0** (included free). Add-on fees only apply to Movie Time.

### Weekend Definition

DD uses `Saturday + Sunday` as weekend:
```typescript
const isWeekend = d.getDay() === 0 || d.getDay() === 6;  // Sun=0, Sat=6
```
This is **different from staycations** which use Fri/Sat/Sun with Saturday as a separate tier.

---

## Files to Update (Checklist)

For EVERY price change, check these files:

| # | File | Path | What Contains Prices |
|---|:---|:---|:---|
| 1 | **Static Config** | `FRONTEND/galaxia/app/data/celebrations.ts` | `pricing` tiers (weekday/weekend per hours), `extraPerson`, `extraHourRate` |
| 2 | **Customer Booking** | `FRONTEND/galaxia/app/celebration/[package]/[screen]/book/CelebrationBookingClient.tsx` | `livePricing` fallback, discount logic (lines 411-421), add-on default ₹400 (line 388), 50/50 split |
| 3 | **Admin Walk-in** | `FRONTEND/galaxia/app/admin3/digital-diaries/page.tsx` | Hardcoded rates (~line 466-480), extra guest ₹300 (line 479), add-on ₹400 (line 480) |
| 4 | **Backend Fallback** | `backend/src/routes/ddBookings.ts` | Server fallback prices (~line 330-346), pkgId=2 celebration, pkgId=1 movie-time |
| 5 | **Database** | `DdPackagePricing` table (via admin UI or script) | `weekdayPrice`, `weekendPrice`, `weekdayDiscount`, `weekendDiscount` per tier |
| 6 | **Properties Mgmt** | `FRONTEND/galaxia/app/admin3/properties-mgmt/page.tsx` | Live DB editor — reads/writes directly, no hardcoded prices to change |
| 7 | **Package Display** | `FRONTEND/galaxia/app/celebration/[package]/PackageDetailClient.tsx` | Reads from `celebrations.ts` for price cards |

### Optional (if changing extra person/add-ons/transfer fee)

| # | File | What |
|---|:---|:---|
| 8 | `ddBookings.ts` | Transfer fee ₹400 (line ~786, 872) |
| 9 | `foodBills.ts` | Satkar 25% markup |
| 10 | `admin3/digital-diaries/page.tsx` | Transfer fee ₹400 (line ~789), add-on ₹400 (line ~480), extra ₹300 (line ~479) |

---

## Step-by-Step Procedure

### Step 1: Identify What's Changing

DD pricing changes can be one of:

1. **Base tier prices** — e.g., Movie Time 2hr goes from ₹1,500 to ₹1,800
2. **Weekday/weekend differential** — e.g., Celebration 3hr weekend changes
3. **Extra person charge** — ₹300 → some new rate
4. **Overtime rate** — ₹1,000/hr → new rate
5. **Add-on prices** — Balloons/LED/Cake ₹400 → new rate
6. **Date-specific overrides** — Special pricing for specific dates (Valentine's, NYE)
7. **Transfer fee** — ₹400 → new rate

### Step 2: Read Current Prices

```bash
# Static config
view_file celebrations.ts

# Admin walk-in hardcoded prices
grep -n "999\|1500\|2500\|2950\|3450\|3950\|2200" admin3/digital-diaries/page.tsx

# Backend fallback
grep -n "999\|1500\|2500\|2950\|3450\|3950\|2200" backend/src/routes/ddBookings.ts

# Extra person / add-on references
grep -n "300\|400" admin3/digital-diaries/page.tsx  # (filter for extraGuestFee and addOnsCharge)
```

### Step 3: Update `celebrations.ts`

**Location**: `FRONTEND/galaxia/app/data/celebrations.ts`

This is the static source of truth. Update the `pricing` array for the target package:

```typescript
pricing: [
    { hours: 1, label: "1 Hour", weekday: NEW_PRICE, weekend: NEW_PRICE },
    { hours: 2, label: "2 Hours", weekday: NEW_PRICE, weekend: NEW_PRICE },
    { hours: 3, label: "3 Hours", weekday: NEW_PRICE, weekend: NEW_PRICE },
],
extraPerson: NEW_EXTRA_PERSON,  // default 300
extraHourRate: NEW_OVERTIME,     // default 1000
```

**Notes:**
- Prices are **raw numbers** (not comma-formatted strings like staycations)
- Movie Time has 3 tiers (1hr, 2hr, 3hr)
- Celebration has 2 tiers (2hr, 3hr) — 1hr is admin-only and only in backend fallback
- `minHours` on Celebration is `2` — don't add a 1hr tier to celebrations.ts

### Step 4: Update Admin Walk-in Booking

**Location**: `FRONTEND/galaxia/app/admin3/digital-diaries/page.tsx` (~line 466-480)

This has **completely hardcoded** pricing:

```typescript
// Movie Time block (~line 466-470)
if (packageType === "Movie Time") {
    if (durNum === 1) basePrice = 999;
    else if (durNum === 2) basePrice = 1500;
    else if (durNum === 3) basePrice = 2500;
    else basePrice = 2500 + ((durNum - 3) * 1000);
}

// Celebration block (~line 472-476)
else {
    const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6;
    if (durNum === 1) basePrice = 2200;
    else if (durNum === 2) basePrice = 2950;
    else if (durNum === 3) basePrice = isWeekend ? 3950 : 3450;
    else basePrice = (isWeekend ? 3950 : 3450) + ((durNum - 3) * 1000);
}

// Extra charges (~line 479-480)
const extraGuestFee = guestsCount > 2 ? (guestsCount - 2) * 300 : 0;
const addOnsCharge = (addBalloons ? 400 : 0) + (addLedBanner ? 400 : 0) + (addCake ? 400 : 0);
```

**GOTCHA**: This file is ~2400 lines. There may be MULTIPLE places where prices
appear (walk-in creation, edit booking modal, transfer modal). Search the
entire file for each price value you're changing.

### Step 5: Update Backend Fallback

**Location**: `backend/src/routes/ddBookings.ts` (~line 330-346)

This is the **server-side safety net**. If the frontend doesn't send `basePrice`,
the backend computes it:

```typescript
basePrice: basePrice || (() => {
    const dur = parseInt(durationHours || "1");
    const pkgId = parseInt(packageId || "1");
    if (pkgId === 2) { // Celebration
        const isWe = bd.getDay() === 0 || bd.getDay() === 6;
        if (dur === 1) return 2200;
        if (dur === 2) return 2950;
        if (dur === 3) return isWe ? 3950 : 3450;
        return (isWe ? 3950 : 3450) + ((dur - 3) * 1000);
    }
    // Movie Time
    if (dur === 1) return 999;
    if (dur === 2) return 1500;
    if (dur === 3) return 2500;
    return 2500 + ((dur - 3) * 1000);
})(),
```

### Step 6: Update Database

Two options:

**Option A: Use Admin UI** (recommended for simple changes)
- Go to `/admin3/properties-mgmt` → Digital Diaries tab
- Edit weekday/weekend prices per tier inline
- Edit extra person price, extra hour rate, add-on prices inline
- Use date override modal for specific date pricing

**Option B: Direct DB Script** (for bulk/programmatic changes)

```typescript
import prisma from "../src/lib/prisma";

// Find the package
const pkg = await prisma.ddPackage.findFirst({ where: { slug: "movie-time" } });

// Update a pricing tier
await prisma.ddPackagePricing.updateMany({
    where: { packageId: pkg.id, hours: 2 },
    data: { weekdayPrice: NEW_PRICE, weekendPrice: NEW_PRICE },
});

// Update extra person price
await prisma.ddPackage.update({
    where: { id: pkg.id },
    data: { extraPersonPrice: NEW_PRICE },
});

// Add date-specific override
const tier = await prisma.ddPackagePricing.findFirst({
    where: { packageId: pkg.id, hours: 3 },
});
await prisma.ddPricingOverride.upsert({
    where: { pricingId_overrideDate: { pricingId: tier.id, overrideDate: new Date("2026-12-31") } },
    update: { price: NEW_PRICE },
    create: { pricingId: tier.id, overrideDate: new Date("2026-12-31"), price: NEW_PRICE },
});
```

### Step 7: Compile & Deploy

Same as staycation — see [staycation-pricing-update](../staycation-pricing-update/SKILL.md) Step 10-11.

---

## Challenges & Gotchas

### 1. THREE Independent Price Sources — Must Update All Three
Unlike staycations where DB feeds most flows, DD has:
- `celebrations.ts` (static fallback for customer booking + package display)
- `admin3/digital-diaries/page.tsx` (completely independent hardcoded prices)
- `ddBookings.ts` (backend server fallback — also independent)

If you only update one, the other two will show old prices.

### 2. Customer Booking Uses Live DB First, Then Static Fallback
`CelebrationBookingClient.tsx` fetches `livePricing` from `/api/dd/packages` on mount.
If the API returns pricing tiers, it uses those. If not, it falls back to
`celebrations.ts`. So updating the DB covers the customer flow, BUT you must
still update `celebrations.ts` for:
- Package detail page price cards (reads static directly)
- Fallback if API fails

### 3. Admin Walk-in Does NOT Read From DB
The pricing calculator in `admin3/digital-diaries/page.tsx` is **fully hardcoded**.
It does NOT fetch from the API. This means DB changes via Properties Management
**do NOT propagate** to the walk-in booking form. You must manually update the
hardcoded values.

### 4. Celebration 3hr Weekday Discount is Hardcoded as ₹500
In `CelebrationBookingClient.tsx` line 415-416:
```typescript
if (isCelebration && totalHours === 3 && !weekend) {
    discount = 500;
}
```
This assumes Weekend 3hr = Weekday 3hr + ₹500. If you change the price
differential, you must update this discount value too.

### 5. Movie Time 2hr Discount is Computed, Not Hardcoded
```typescript
if (isMovieTime && totalHours === 2) {
    const fullPrice = totalHours * discountHourRate;  // 2 × 1000 = 2000
    discount = Math.max(0, fullPrice - basePrice);     // 2000 - 1500 = 500
}
```
This will auto-adjust if you change the 2hr price or overtime rate. No manual fix needed.

### 6. Add-on Prices Have DB + Hardcoded Default
```typescript
const getAddonPrice = (key: string) => liveAddonPricing?.[key] ?? 400;
```
If DB has `addonPricing` JSON, it uses that. Otherwise defaults to ₹400.
The admin walk-in page always uses hardcoded ₹400 (line 480).

### 7. Extra Person ₹300 is in 3 Places
- `celebrations.ts`: `extraPerson: 300`
- `admin3/digital-diaries/page.tsx`: `(guestsCount - 2) * 300`
- DB: `ddPackage.extraPersonPrice` (editable via admin)

Customer booking reads from DB first (`liveExtraPerson`), falls back to static.
Admin walk-in is hardcoded.

### 8. Package IDs in Backend Fallback
Backend uses `pkgId === 2` for Celebration and `pkgId === 1` for Movie Time.
These are database auto-increment IDs. If packages are ever re-seeded, these
would break. Currently stable.

### 9. The 50-50 Payment Split
```typescript
const payNow = Math.ceil(total / 2);
const payAtVenue = total - payNow;
```
This is automatic — no hardcoded amount. Price changes propagate automatically.

### 10. Date Override Key Format
Date overrides in `CelebrationBookingClient.tsx` use key format:
```
${pricingTierId}-${YYYY-MM-DD}
```
These are fetched from DB and stored in `ddOverrides` state. They supersede
all base weekday/weekend prices. Managed via admin UI only.

### 11. Transfer Fee ₹400 is in Multiple Places
- `ddBookings.ts` line ~786: `amountToCollect: currentCollect + 400`
- `ddBookings.ts` line ~872: `transferFee: 400`
- `admin3/digital-diaries/page.tsx` line ~789: display of ₹400 fee

### 12. Properties Management Admin Reads/Writes DB Directly
The pricing editor in `/admin3/properties-mgmt` → DD tab uses:
- `PATCH /api/properties/dd-package-pricing/:id` to edit tier prices
- `PATCH /api/properties/dd-package/:id` to edit extraPersonPrice, addonPricing, extraHourRate
- `POST /api/properties/dd-override` to set date overrides

Changes here immediately affect the customer booking flow (which reads live DB).
But they do NOT affect admin walk-in or backend fallback.

---

## Price Change Decision Tree

```
Is it a base tier price change? (e.g., Movie Time 2hr: ₹1,500 → ₹1,800)
├── YES → Update celebrations.ts + admin walk-in + backend fallback + DB
│
Is it an extra person charge change? (₹300 → ₹X)
├── YES → Update celebrations.ts + admin walk-in (line 479) + DB (via admin UI or script)
│
Is it an add-on price change? (Balloons/LED/Cake ₹400 → ₹X)
├── YES → Update admin walk-in (line 480) + DB addonPricing JSON (via admin UI)
│         Customer booking auto-reads from DB, falls back to 400
│
Is it an overtime rate change? (₹1,000/hr → ₹X)
├── YES → Update celebrations.ts + admin walk-in overtime calc + backend fallback + DB
│
Is it a date-specific override? (e.g., NYE pricing)
├── YES → Use admin UI at /admin3/properties-mgmt → Date Override modal
│         (No code changes needed — DB-only)
│
Is it a transfer fee change? (₹400 → ₹X)
├── YES → Update ddBookings.ts (2 places) + admin page (1 place)
│
Is it a Satkar food markup change? (25% → X%)
├── YES → Update foodBills.ts + food-billing admin page
```

---

## Quick Verification Checklist (Post-Deploy)

- [ ] `/celebration/movie-time` page shows correct price cards
- [ ] `/celebration/celebration` page shows correct price cards
- [ ] Customer booking: select 1hr/2hr/3hr → correct base price shown
- [ ] Customer booking: weekday vs weekend → correct differential
- [ ] Customer booking: 4+ hours → correct overtime calculation
- [ ] Customer booking: extra guests → correct ₹X/person charge
- [ ] Customer booking: add-ons → correct prices (₹0 for Celebration, ₹X for Movie Time)
- [ ] Customer booking: 50/50 split amounts correct
- [ ] Admin walk-in: create booking → correct price calculation
- [ ] Admin walk-in: extra guests and add-ons → correct charges
- [ ] Properties Management: prices shown match intended values
- [ ] Backend: create booking without basePrice → fallback prices correct
- [ ] Date overrides (if changed): correct price on specific dates
