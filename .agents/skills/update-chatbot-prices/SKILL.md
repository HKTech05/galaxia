---
name: update-chatbot-prices
description: >-
  Use this skill when the user wants to update, change, or add pricing for any
  Galaxia staycation property chatbot. Handles base rate changes, prime/festive
  date pricing additions, and price reverts. Covers PromptBuilder.js system
  prompt rules, vault/knowledge base markdown files, and EC2 deployment.
---

# Update Chatbot Prices

This skill handles ALL pricing changes for the Galaxia chatbot system. It covers
base rate changes, prime/festive date additions, and price corrections.

> **CRITICAL**: Only modify chatbot files. NEVER touch website/frontend/backend
> files — the user always updates the website separately.

---

## Architecture Overview

All bots (IG + WA + generalized) share the **same codebase** served by one
PM2 process (`wa-chatbot`). Pricing is defined in TWO places that BOTH must
be updated:

1. **PromptBuilder.js** — System prompt rules injected into every bot
2. **Vault files** — Markdown knowledge base loaded via RAG per botType

### File Locations

| File | Path |
|------|------|
| PromptBuilder.js | `GLX2CB/mainchatbotgalaxia/services/ai/PromptBuilder.js` |
| Amstel Nest | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Amstel Nest/Pricing.md` |
| Ambrose Take-1 | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Take-1.md` |
| Ambrose Alta | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Alta.md` |
| Ambrose Santorini | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Santorini.md` |
| Ambrose Cypress | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Cypress.md` |
| Ambrose Bamboosa | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Bamboosa.md` |
| Ambrose Pricing.md | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Ambrose/Pricing.md` |
| Ambrose Pricing.md (DUPLICATE) | `GLX2CB/mainchatbotgalaxia/GALAXIA1/GALAXIA1/Staycation/Ambrose/Pricing.md` |
| La Paraiso | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/La Paraiso/Pricing.md` |
| Heavenly Villa | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Heavenly Villa/Pricing.md` |
| Mount View | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Mount View/Pricing.md` |
| Hill View | `GLX2CB/mainchatbotgalaxia/GALAXIA1/Staycation/Hill View/Pricing.md` |

### PromptBuilder.js Key Line Ranges

| Section | Approx Lines | Content |
|---------|-------------|---------|
| Rule 29 | ~292-302 | Base rates for ALL properties |
| Rule 30 | ~303-311 | Oct prime date pricing |
| Rule 30B | ~312-320 | Diwali week prime date pricing |
| Rule 33 | ~360-375 | Generalized query example listing (sorted by price) |

---

## Procedure: Base Rate Change

When the user says "change weekday/weekend/Saturday prices for [property]":

### Step 1: Update PromptBuilder.js Rule 29

Find the property line in Rule 29 (~line 292-302) and change the price values.

**Example** — Hill View weekday ₹2,000 → ₹2,950:
```
BEFORE: - **Hill View** ... Mon-Thu *₹2,000* (2p), Fri-Sun *₹3,000* (2p) ...
AFTER:  - **Hill View** ... Mon-Thu *₹2,950* (2p), Fri-Sun *₹3,950* (2p) ...
```

**Also update Rule 33** (generalized query example listing) if it shows the
changed property's price in the example.

### Step 2: Update Vault Pricing.md

Find the RENT section in the vault file and change the price values.

**Vault format varies by property:**
- Amstel Nest: `Mon-Thu: *₹4,950*`
- Ambrose villas: `- **Mon to Thu**: ₹5,500 for 2 Persons (with meals)`
- La Paraiso/MV/HV/HillV: `3000/- per night for 2 person + 5%`

### Step 3: Check for Ambrose Pricing.md duplicates

If changing Ambrose prices, update BOTH:
- `GALAXIA1/Staycation/Ambrose/Pricing.md`
- `GALAXIA1/GALAXIA1/Staycation/Ambrose/Pricing.md`

---

## Procedure: Add Prime/Festive Date Pricing

When the user provides special pricing for specific dates (e.g., Diwali, Oct 2-3):

### Step 1: Organize the Data

Group dates by price tier to keep PromptBuilder concise:
- Same-price dates can be grouped (e.g., "9-12 Nov" or "6/8/13 Nov")
- Identify pattern: typically Sat=peak, Fri/Sun=mid, Mon-Thu=elevated weekday

### Step 2: Add PromptBuilder Rule

Add a new sub-rule after existing prime date rules (30, 30B, 30C, etc.):

```
30X. **[Event] Prime Date Pricing ([dates] [year]) — CRITICAL: Override base rates (Excl. 5% GST)**:
    - **Amstel Nest**: Standard: [weekday dates] *₹X*, [fri/sun dates] *₹Y*, [sat dates] *₹Z*. Family: ...
    - **Ambrose Take-1 / Alta / Santorini**: [dates] *₹X* (2p), [dates] *₹Y* (4p).
    - **Ambrose Cypress**: ...
    - **Ambrose Bamboosa**: ...
    - **La Paraiso**: ...
    - **Hill View**: ...
    - **Mount View**: ...
    - **Heavenly Villa**: ...
```

### Step 3: Add Vault Sections

For EACH property vault file, add a new `## [Event] Pricing` section AFTER
the existing Prime Date section:

```markdown
## [Event] Pricing (Excl. 5% GST)
- **[Date 1]**: ₹X,XXX (2 persons)
- **[Date 2]**: ₹Y,YYY (2 persons)
- **[Date range]**: ₹Z,ZZZ (2 persons)
```

**Properties and their vault files (ALL 11 must be updated):**
1. Take-1.md, Alta.md, Santorini.md (same prices for these 3)
2. Cypress.md
3. Bamboosa.md
4. Amstel Nest/Pricing.md
5. La Paraiso/Pricing.md
6. Heavenly Villa/Pricing.md
7. Mount View/Pricing.md
8. Hill View/Pricing.md

---

## Property Pricing Structure Reference

### Meals Included Properties
| Property | Base Tier | Weekday | Fri/Sun | Saturday | Extra Adult | Kids 5-12 | Deposit |
|----------|-----------|---------|---------|----------|-------------|-----------|---------|
| Amstel Standard | 2p | ₹4,950 | ₹5,950 | ₹6,950 | ₹2,000 | ₹1,000 | ₹2,000 |
| Amstel Family | 4p | ₹9,000 | ₹10,000 | ₹12,000 | ₹2,000 | ₹1,000 | ₹2,000 |
| Take-1/Alta/Santorini | 2p/4p | ₹5,500 | ₹6,500 | ₹12,000(4p) | ₹2,000 | ₹1,000 | ₹3,000 |
| Cypress | 2p | ₹5,500 | ₹6,500 | — | ₹2,000 | ₹1,000 | ₹3,000 |
| Bamboosa | 4p | ₹10,500 | ₹11,500 | ₹13,000 | ₹2,000 | ₹1,000 | ₹3,000 |

### Meals NOT Included Properties
| Property | Base Tier | Weekday | Fri/Sun | Saturday | Extra Adult | Kids 5-12 | Deposit |
|----------|-----------|---------|---------|----------|-------------|-----------|---------|
| La Paraiso | 2p/4p | ₹4,950 | ₹7,500(4p) | ₹8,500(4p) | ₹1,200 | ₹800 | ₹3,000 |
| Hill View | 2p | ₹2,000 | ₹3,000 | ₹3,000 | ₹600 | ₹400 | ₹2,000 |
| Mount View | 2p | ₹3,000 | ₹4,000 | ₹4,000 | ₹800 | ₹500 | ₹3,000 |
| Heavenly Villa | 2p | ₹3,950 | ₹4,950 | ₹4,950 | ₹800 | ₹500 | ₹3,000 |

---

## Deploy Procedure

After ALL file edits are complete:

```bash
# 1. Commit and push
cd "C:\Users\K\Desktop\FINAL PROJ\GLX2"
git add -A
git commit -m "fix: [describe price change]"
git push origin main

# 2. Deploy to EC2
ssh -i "C:\Users\K\Desktop\FINAL PROJ\GLX2\backend\galaxia-deploy-key.pem" \
  -o StrictHostKeyChecking=no ec2-user@65.1.183.241 \
  "cd ~/galaxia && git pull && pm2 restart wa-chatbot --update-env"
```

---

## Checklist Before Deploying

- [ ] PromptBuilder.js Rule 29 base rates updated (if base rate change)
- [ ] PromptBuilder.js prime date rule added/updated (if prime date change)
- [ ] PromptBuilder.js Rule 33 example listing updated (if base rates changed)
- [ ] ALL 11 property vault files updated (or only affected properties)
- [ ] Ambrose Pricing.md duplicate updated (if Ambrose prices changed)
- [ ] No website/frontend/backend files modified
- [ ] git diff --stat shows ONLY chatbot files changed
- [ ] Committed, pushed, deployed, pm2 restarted

---

## Common Mistakes to Avoid

1. **Forgetting the duplicate Ambrose Pricing.md** at `GALAXIA1/GALAXIA1/Staycation/Ambrose/Pricing.md`
2. **Forgetting Rule 33** example listing when base rates change
3. **Touching website files** — user explicitly says not to
4. **Wrong person tier** — Take-1/Alta/Santorini Saturday is 4p base, weekday/Fri-Sun is 2p base
5. **ChatbotService.js Bot 2 hardcoded msg** (~line 265) — only has Amstel prices, check if relevant
6. **Not grouping dates** in PromptBuilder for readability (use "9-12 Nov" not listing each day)
