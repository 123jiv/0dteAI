# Access and proof: what the app earns you at unsetld.com

There are two ways to earn, and neither can be bought. Full Edition doesn't change either one.

- **Showing up opens access.** A day goes on record when you open the app that day, from the icon, a widget or a reminder. Days on record open early access, the patch and the 365 piece.
- **Proof earns points; points become codes.** Each day's work is your three rules plus one task from UNSETLD (and up to three of your own in Full Edition). Prove a task with a photo taken in the app and it's 10 points, up to 4 tasks (40 points) a day. Trade points for a single-use discount code you use on unsetld.com.

The app has to make sense for someone who never buys a hoodie, so rewards appear only on the Record screen, in milestone letters, on milestone pages, on the task screen after a proof and in one footnote under Today's work. They never appear in the line, widgets, notifications, the paywall or share cards.

## The ladder (days on record)

| Day | Milestone | What it is |
|---|---|---|
| 007 | Early access | Every UNSETLD drop opens to you 24 hours before the public. |
| 090 | The patch | A woven patch with your number, free with your next order. One per person. |
| 365 | The 365 piece | A numbered piece made only for people who reach a year. Sold at full price, never restocked. |

## Proof and points

| | |
|---|---|
| Tasks | Each day: your three rules, one task from UNSETLD drawn from the chapters you read, and up to three of your own (Full Edition). A task can be marked done without a photo; only a photo earns points. |
| Proof | A photo taken live in the app, one per task. It's stamped like a garment tag with the day's line number, the time and the date. |
| Where photos go | Nowhere. They're saved inside the app on the phone. When signed in, only the date and the number of proven tasks that day are sent to the server. |
| Points | 10 per proven task, up to 4 a day (40 points). Retaking a photo earns nothing more. Unmarking a task takes its points back. |
| Codes | 600 points → 10% off one order; 1,000 points → 15% off one order. Up to $25 off. **One code each collection.** Codes are single use and work for 30 days. |

All numbers live in `src/content/points.json`, so you can change them without touching code.

**Why it's honour-based:** a photo can't truly prove anything, and checking every photo with AI would cost money per photo and mean storing people's pictures. The caps keep abuse cheap instead. Someone who fakes every task for a month still gets at most one code worth at most $25 per collection, against a full-price order they chose to place. Proof also has to be taken live: the camera opens inside the app and the photo library isn't offered. The 4-a-day cap means extra tasks of your own add to the day's work but not to the points.

**Limits**
- One code each collection.
- $25 maximum off an order.
- No stacking with other codes, including the site's 10% first-order code.
- Excludes the 365 piece.
- US residents 18+ only.
- No cash value. Not transferable. Points can't be sold or bought.

**Pause rule**
- If 14 days pass with nothing on record, early access shows PAUSED.
- It reopens once 7 more days are on record, and a comeback letter arrives.
- The count and milestones never drop, and points don't expire. The patch and the 365 piece don't pause.

**Day boundary:** a day runs from 4:00 AM to 3:59 AM local time, so a late night counts as the day it started.

## Why this costs little

The worst case per person is one code per collection at most $25 off, one patch, and early access, which costs nothing. The 10% code takes at least 15 days of four proven tasks (60 proofs), the 15% code at least 25 days, which few people keep up. Assume 4 collections a year and that 15–20% of active users earn a code each collection. Then 1,000 active users cost at most about 1,000 × 20% × 4 × $25 = **$20,000 of discount a year**, and only against full-price orders those people chose to place. In practice it's far less, because most people don't buy every collection. Early access is free and is the strongest pull for a drop brand.

## Feature flag

The app reads `https://www.unsetld.com/api/app/config.json` on launch and on every foreground. See [`Web/api/app/config.json`](../Web/api/app/config.json):

```json
{ "accessEnabled": false, "collection": "004" }
```

- **`accessEnabled: false`** (the default until the backend below exists) hides all of Access: the Record screen's Access section, the Day 3 intro page, milestone letters, milestone pages, the Account row and Access terms. The rest of the app works unchanged. The app never says "coming soon".
- **`collection`** is the current collection. Codes are one per collection, so when you change this value everyone with enough points can take a new code.

The browser preview simulates `accessEnabled: true` so the whole product can be seen.

## Drops

The app also reads `https://www.unsetld.com/api/app/drops.json`; see [`Web/api/app/drops.json`](../Web/api/app/drops.json). Drop alerts are a separate opt-in switch in Settings and are off by default. When they're on:
- Day 7 and up: a notification at `earlyAt` ("Collection 004 is open to you now. Everyone else gets it tomorrow at 9:00 PM.").
- Everyone else: a heads-up at the same time ("Collection 004 opens tomorrow at 9:00 PM.").

## Accounts

Claiming anything needs a free account made with **Sign in with Apple** (`expo-apple-authentication`; the entitlement is added by the config plugin). Nothing else needs an account: the record, saved lines and your lines stay on the phone, with a Keychain backup of the record so a reinstall keeps it.

## Backend (to build before turning `accessEnabled` on)

Build these as a few routes on the existing site (Vercel/Next.js), or on Supabase. Each request carries the Apple identity token (`appleIdToken`). Verify it against Apple's public keys (issuer `https://appleid.apple.com`, audience `com.unsetld.app`), then use its `sub` as the user ID.

| Route | Body | Does |
|---|---|---|
| `POST /api/app/checkin` | `{ appleIdToken, dayKey }` | Stores one check-in per account per **server** day. Rejects a `dayKey` more than a day from server time. |
| `POST /api/app/sync` | `{ appleIdToken, days: string[], proofs: { day, count }[] }` | Runs on first sign-in. Accepts the phone's clock-verified days and each day's proven-task count, none in the future, at most one entry per server day since install, each count clamped to 0–4. |
| `POST /api/app/proof` | `{ appleIdToken, dayKey, count }` | Sets the proven-task count (clamped to 0–4) for the current **server** day; past days are frozen. Sent after each proof and when a proven task is unmarked. The photo never leaves the phone. |
| `POST /api/app/redeem` | `{ appleIdToken, points, percent }` | Recounts points **from the server's counts** (10 per proven task, at most 40 a day, minus points already spent). If the user has the points and no code this collection, it mints a single-use Shopify discount and returns `{ code, url }`; otherwise `{ error: "short" \| "used" }`. |
| `POST /api/app/claim` | `{ appleIdToken, perk }` | Recomputes days on record and the pause rule **from the server's check-ins** (never trust the phone's count). Returns `{ url }`, or `{ error: "paused" \| "used" }`. |

The redeem code is minted with the Admin API: once per customer, `combinesWith` nothing, usage limit 1, valid for 30 days. Return `https://www.unsetld.com/discount/{CODE}`, which applies it at checkout.
- Shopify percentage codes can't cap at $25 by themselves. Either enforce the cap with a small **Shopify Discount Function** that applies `min(percent × subtotal, $25)`, or mint a fixed-amount code worth `min(percent × the cart, $25)` at redeem time.
- Record one code per user per collection.

Claims by `perk`:
- **`patch`:** mint a 100%-off code limited to the patch product. Return `https://www.unsetld.com/cart/{PATCH_VARIANT_ID}:1?discount={CODE}`. One per user, ever. Engrave the patch with the user's number, i.e. the order of their claim.
- **`early-access`:** return a signed, expiring URL to the drop collection. The collection is published 24 hours early but kept out of navigation and search, and a cart validation function (or a theme script that checks the token with the backend) blocks checkout without a valid token until `publicAt`.
- **`piece-365`:** same token pattern as early access, for the 365 piece's product page.

All store links open in Safari, never an in-app browser.

## In the app

| Piece | File |
|---|---|
| Rules (pause, statuses, letters, barcode, road) | `src/core/record.ts`, tested in `src/core/__tests__/core.test.ts` |
| Daily task, points, codes | `src/core/points.ts`, same tests |
| Copy and thresholds | `src/content/milestones.json`, `src/content/points.json`, `src/content/tasks.json` |
| Network calls | `src/services/access.ts` |
| Sign-in | `src/services/account.ts` |
| Screens | Record, Milestone, Letter and Account in `src/screens/` |
| Terms shown in the app | `src/content/legal.json` (`access`); get a lawyer to review these before launch |
