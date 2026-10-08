# Access: what days on record open, and how it's delivered

Access replaces the old XP and rank system. It's earned only with **days on record**. You put a day on record by opening that day's line in the app, from a widget or from a reminder. It can't be bought, and Full Edition doesn't change it. The app has to make sense for someone who never buys a hoodie, so the rewards appear only on the Record screen, in milestone letters and on milestone pages. They never appear in the reader, widgets, notifications, the paywall or share cards.

## The ladder

| Day | Milestone | What it is |
|---|---|---|
| 007 | Early access | Every UNSETLD drop opens to you 24 hours before the public. |
| 030 | Member price | 10% off one order each collection. |
| 090 | The patch | A woven patch with your number, free with your next order. One per person. |
| 180 | Member price, 15% | Up from 10%, same limits. |
| 365 | The 365 piece | A numbered piece made only for people who reach a year. Sold at full price, never restocked. |

**Limits**
- One member-price order per collection.
- $25 maximum off an order.
- No stacking with other codes, including the site's 10% first-order code.
- Excludes the 365 piece.
- US residents 18+ only.
- No cash value. Not transferable.

**Pause rule**
- If 14 days pass with nothing on record, early access and member prices show PAUSED.
- They reopen once 7 more days are on record, and a comeback letter arrives.
- The count and milestones never drop. The patch and the 365 piece don't pause.

**Day boundary:** a day runs from 4:00 AM to 3:59 AM local time, so a late night counts as the day it started.

## Why this costs little

The worst case per person is one member-price order per collection at most $25 off, one patch, and early access, which costs nothing. Assume 4 collections a year and a typical 15–20% of users reaching Day 30. Then 1,000 active users cost at most about 1,000 × 20% × 4 × $25 = **$20,000 of discount a year**, and only against full-price orders those people chose to place. In practice it's far less, because most months a user doesn't buy. Early access is free and is the strongest pull for a drop brand.

## Feature flag

The app reads `https://www.unsetld.com/api/app/config.json` on launch and on every foreground. See [`Web/api/app/config.json`](../Web/api/app/config.json):

```json
{ "accessEnabled": false, "collection": "004" }
```

- **`accessEnabled: false`** (the default until the backend below exists) hides all of Access: the Record screen's Access section, the Day 3 intro page, milestone letters, milestone pages, the Account row and Access terms. The rest of the app works unchanged. The app never says "coming soon".
- **`collection`** is the current collection. The member price is one order per collection, so when you change this value every member price opens again.

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
| `POST /api/app/sync` | `{ appleIdToken, days: string[] }` | Runs on first sign-in. Accepts the phone's clock-verified days, one per day, none in the future, at most one per server day since install. |
| `POST /api/app/claim` | `{ appleIdToken, perk }` | Recomputes days on record and the pause rule **from the server's check-ins** (never trust the phone's count). Returns `{ url }`, or `{ error: "paused" \| "used" }`. |

Claims by `perk`:
- **`member-price`:** mint a single-use Shopify discount with the Admin API: once per customer, `combinesWith` nothing, usage limit 1, valid for 14 days. Return `https://www.unsetld.com/discount/{CODE}`, which applies it at checkout.
  - Shopify percentage codes can't cap at $25 by themselves. Either enforce the cap with a small **Shopify Discount Function** that applies `min(percent × subtotal, $25)`, or mint a fixed-amount code worth `min(10% of the cart, $25)` at claim time.
  - Record one claim per user per collection.
- **`patch`:** mint a 100%-off code limited to the patch product. Return `https://www.unsetld.com/cart/{PATCH_VARIANT_ID}:1?discount={CODE}`. One per user, ever. Engrave the patch with the user's number, i.e. the order of their claim.
- **`early-access`:** return a signed, expiring URL to the drop collection. The collection is published 24 hours early but kept out of navigation and search, and a cart validation function (or a theme script that checks the token with the backend) blocks checkout without a valid token until `publicAt`.
- **`piece-365`:** same token pattern as early access, for the 365 piece's product page.

All store links open in Safari, never an in-app browser.

## In the app

| Piece | File |
|---|---|
| Rules (pause, statuses, letters, barcode, road) | `src/core/record.ts`, tested in `src/core/__tests__/core.test.ts` |
| Copy and thresholds | `src/content/milestones.json` |
| Network calls | `src/services/access.ts` |
| Sign-in | `src/services/account.ts` |
| Screens | Record, Milestone, Letter and Account in `src/screens/` |
| Terms shown in the app | `src/content/legal.json` (`access`); get a lawyer to review these before launch |
