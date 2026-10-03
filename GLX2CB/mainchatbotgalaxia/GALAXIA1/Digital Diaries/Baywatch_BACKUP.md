# Baywatch Screen Backup — Digital Diaries

> **Backup created**: 2026-10-03
> **Reason**: Baywatch screen temporarily disabled due to renovation work.

---

## Screen Details

| Field | Value |
|-------|-------|
| **Screen Name** | Baywatch |
| **Theme** | Lifeguard / Ocean Theme 🌊 — Ocean and lifeguard-inspired coastal setup |
| **Max Occupancy** | Max 3 Person Capacity |
| **Room Size** | 15 x 8 sq ft |
| **Movie Time Booking Link** | https://www.galaxiaresorts.com/celebration/movie-time/baywatch |
| **Celebration Booking Link** | https://www.galaxiaresorts.com/celebration/celebration/baywatch |

## Theme Aliases (Customer Search Terms)
- "Ocean theme" / "lifeguard" / "baywatch" / "sea theme" / "water theme" → **Baywatch**

## PromptBuilder.js References (backed up from lines 333, 347, 352)

### Screen Capacities (line 333):
```
Sandy Screen (max 3 person capacity), Park N Watch (max 3 person capacity), Baywatch (max 3 person capacity), Cine Love (max 8 person capacity).
```

### Movie Time Pic Links (line 347):
```
- Baywatch: https://www.galaxiaresorts.com/celebration/movie-time/baywatch
```

### Celebration Pic Links (line 352):
```
- Baywatch: https://www.galaxiaresorts.com/celebration/celebration/baywatch
```

## ChatbotService.js References (backed up)

### Allowed Screen Slugs (line 136):
```
Allowed Screen Slugs: "park-n-watch", "cine-love", "sandy-screen", "baywatch".
```

### Regex (line 320):
```js
const diariesRegex = /\b(sandy|cine\s*love|park\s*n\s*watch|baywatch|wadala|movie\s*time|celebration|screen|screens|digital\s*diaries)\b/i;
```

### Screen slug detection (line 643):
```js
else if (textLowerCheck.includes("baywatch")) effectiveScreenSlug = "baywatch";
```

### All-screens array (lines 660, 688):
```js
const screens = ["sandy-screen", "cine-love", "park-n-watch", "baywatch"];
```

## Vault Files References

### Screens Overview.md (line 11):
```
| **Baywatch** | **Lifeguard / Ocean Theme** 🌊 — Ocean and lifeguard-inspired coastal setup | **Max 3 Person Capacity** | **15 x 8 sq ft** | https://www.galaxiaresorts.com/celebration/movie-time/baywatch |
```

### Screens Overview.md (line 14 — capacity note):
```
Sandy Screen, Park N Watch, and Baywatch are strictly limited to a maximum of 3 person capacity.
```

### Screens Overview.md (line 19 — aliases):
```
- "Ocean theme" / "lifeguard" / "baywatch" / "sea theme" / "water theme" → **Baywatch**
```

### Policies.md (lines 33-34 — pic links):
```
Movie Time: .../movie-time/baywatch
Celebration: .../celebration/baywatch
```

---

## Restoration Instructions

To restore Baywatch, reverse all the changes made in the "disable baywatch" commit.
Search git log for the commit message and `git revert` or manually re-add the backed-up content above.
