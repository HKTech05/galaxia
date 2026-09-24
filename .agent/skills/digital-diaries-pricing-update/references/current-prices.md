# Current Digital Diaries Pricing Reference (as of Sep 24, 2026)

## Package Pricing (Base = 2 Guests)

### Movie Time (Private Screening Only)

| Duration | Weekday | Weekend (Sat/Sun) |
|:---|:---|:---|
| 1 Hour | ₹999 | ₹999 |
| 2 Hours | ₹1,500 | ₹1,500 |
| 3 Hours | ₹2,500 | ₹2,500 |
| 4+ Hours | ₹2,500 + ₹1,000/extra hr | Same |

### Celebration (Decoration + Movie Time)

| Duration | Weekday (Mon–Fri) | Weekend (Sat/Sun) |
|:---|:---|:---|
| 1 Hour (admin only) | ₹2,200 | ₹2,200 |
| 2 Hours | ₹2,950 | ₹2,950 |
| 3 Hours | ₹3,450 | ₹3,950 |
| 4+ Hours | ₹3,450 + ₹1,000/extra hr | ₹3,950 + ₹1,000/extra hr |

> Celebration 3hr weekday = ₹3,950 - ₹500 discount = ₹3,450

## Extra Charges

| Charge | Amount |
|:---|:---|
| Extra person (above 2 guests) | ₹300/person |
| Overtime (beyond max tier) | ₹1,000/hour |

## Add-ons (Movie Time ONLY — free with Celebration)

| Add-on | Price |
|:---|:---|
| Balloons | ₹400 |
| LED Banner | ₹400 |
| Cake (250g) | ₹400 |

## Administrative Fees

| Fee | Amount |
|:---|:---|
| Booking transfer/reschedule | ₹400 |
| Satkar food markup | 25% |

## Screens

| Screen | Capacity | Theme |
|:---|:---|:---|
| Sandy Screen | 3 guests | Beach |
| Park N Watch | 3 guests | Drive-In |
| Baywatch | 3 guests | Greece |
| Cine Love | 8 guests | Romantic |

## Payment Policy

- **50% advance online** (Razorpay — DD account)
- **50% cash at venue** (mandatory cash)

## Where Prices Are Hardcoded

| File | Line(s) | What |
|:---|:---|:---|
| `celebrations.ts` | 69-71, 93-94 | Static tier prices |
| `celebrations.ts` | 73, 96 | extraPerson (300) |
| `celebrations.ts` | 74, 97 | extraHourRate (1000) |
| `CelebrationBookingClient.tsx` | 388 | Add-on default ₹400 |
| `CelebrationBookingClient.tsx` | 416 | Celebration weekday discount ₹500 |
| `admin3/digital-diaries/page.tsx` | 467-476 | All base prices |
| `admin3/digital-diaries/page.tsx` | 479 | Extra guest ₹300 |
| `admin3/digital-diaries/page.tsx` | 480 | Add-on ₹400 |
| `ddBookings.ts` | 337-346 | Backend fallback all prices |
| `ddBookings.ts` | ~786, ~872 | Transfer fee ₹400 |
| `foodBills.ts` | ~24 | Satkar 25% markup |
