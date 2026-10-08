# Access and proof: what the app earns you at unsetld.com

There are two ways to earn, and neither can be bought. Full Edition doesn't change either one.

- **Showing up opens access.** A day goes on record when you open the app that day, from the icon, a widget or a reminder. Days on record open early access, the patch and the 365 piece.
- **Proof earns points; points become codes.** Each day's work is your three rules plus one task from UNSETLD (and up to three of your own). Prove a task with a photo taken in the app and it's 10 points, up to 4 tasks (40 points) a day. Trade points for a single-use discount code you use on unsetld.com.

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
| Tasks | Each day: your three rules, one task from UNSETLD drawn from the chapters you read, and up to three of your own. A task can be marked done without a photo; only a photo earns points. |
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
- US residents 13 and over. Under 18s need a parent's or guardian's OK to order. (Codes are a loyalty reward, not a sweepstakes; have a lawyer confirm the terms before launch.)
- No cash value. Not transferable. Points can't be sold or bought.

**Pause rule**
- Only once early access is open (7 or more days on record when the gap began): if 14 days pass with nothing on record, early access shows PAUSED. Before Day 7 nothing can pause.
- While paused, the Day 7 letter for someone who reaches 7 during the pause waits until access reopens; the comeback letter then stands in for it.
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
- Day 7 and up, with Access on and not paused: a notification at `earlyAt` ("Collection 004 is open to you now. Everyone else gets it tomorrow at 9:00 PM.").
- Everyone else (including paused users): a heads-up at the same time ("Collection 004 opens tomorrow at 9:00 PM.").
- Tapping the early alert opens the Day 7 page. While a drop is in its early window, that page shows `Open Collection 004`, which claims `early-access` (account needed) and opens the returned URL in Safari.
- Turning alerts on asks for notification permission first; if it's denied, the switch stays off and the app points to Settings.

If the file can't be read, the alerts already scheduled stay as they are.

## Accounts

Claiming anything needs a free account made with **Sign in with Apple** (`expo-apple-authentication`; the entitlement is added by the config plugin). Nothing else needs an account: the record, saved lines and your lines stay on the phone, with a Keychain backup of the record so a reinstall keeps it.

The phone counts as signed in only once the server has returned a session token at sign-in (below). The signed-in Account page has **Sign out** and, under it, **Delete account** (App Store Guideline 5.1.1(v)): it asks to confirm, calls `account/delete` and then signs out on the phone. The record and proof photos stay on the phone. The browser preview simulates sign-in and deletion.

## Backend (to build before turning `accessEnabled` on)

Build these as a few routes on the existing site (Vercel/Next.js), or on Supabase.

**Sign-in.** Apple's identity token expires within a day, so the app sends it only once: with `sync`, at sign-in, together with the one-time `authorizationCode`. The server:
1. Verifies `appleIdToken` against Apple's public keys (issuer `https://appleid.apple.com`, audience `com.unsetld.app`) and uses its `sub` as the user ID.
2. Exchanges `authorizationCode` at `POST https://appleid.apple.com/auth/token` (`grant_type=authorization_code`, with the app's client-secret JWT) and keeps the **refresh token** with the account. Deleting the account needs it to revoke the Sign in with Apple link. The code works once and expires after 5 minutes, so exchange it straight away.
3. Returns `{ sessionToken }`: its own long-lived random token, stored hashed against the user. The app keeps it in the Keychain and sends it as `Authorization: Bearer <sessionToken>` on every later request.

If any step fails, don't return a `sessionToken`. The phone then stays signed out and shows "Couldn't sign in. Try again in a moment."

**401.** Answer `401` when the session token is missing, unknown or revoked. The app then signs out on the phone (deletes its session token and clears the account), so the next claim or code asks the user to sign in again. A phone with an account but no session token (for example from an older build that kept Apple's identity token) does the same without calling the server. Use `401` only for this; business errors like `used` come back as `200` with `{ error }`.

| Route | Auth | Body | Does |
|---|---|---|---|
| `POST /api/app/sync` | Apple tokens in the body | `{ appleIdToken, authorizationCode, days: string[], proofs: { day, count }[] }` | Runs at each sign-in. Signs in as above and returns `{ sessionToken }`. Accepts the phone's clock-verified days and each day's proven-task count, none in the future, at most one entry per server day since install, each count clamped to 0–4. |
| `POST /api/app/checkin` | session | `{ dayKey }` | Stores one check-in per account per **server** day. Rejects a `dayKey` more than a day from server time. |
| `POST /api/app/proof` | session | `{ dayKey, count }` | Sets the proven-task count (clamped to 0–4) for the current **server** day; past days are frozen. Sent after each proof and when a proven task is unmarked. The photo never leaves the phone. |
| `POST /api/app/redeem` | session | `{ points, percent }` | Recounts points **from the server's counts** (10 per proven task, at most 40 a day, minus points already spent). If the user has the points and no code this collection, it mints a single-use Shopify discount and returns `{ code, url }`; otherwise `{ error: "short" \| "used" }`. |
| `POST /api/app/claim` | session | `{ perk }` | Recomputes days on record and the pause rule **from the server's check-ins** (never trust the phone's count). Returns `{ url }`, or `{ error: "paused" \| "used" }`. |
| `POST /api/app/account/delete` | session | `{}` | Deletes the account: the Apple user ID, the email, check-ins, proof counts and every session token. Revokes the stored refresh token at `POST https://appleid.apple.com/auth/revoke` (`token_type_hint=refresh_token`). Returns `{ deleted: true }`. On a `401` the phone signs out and the Account page shows "Sign in again to delete your account." Anything else leaves the phone signed in with "Couldn't delete your account. Try again in a moment." |

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
