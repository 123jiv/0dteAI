# Rewards and Access: what the app earns you at unsetld.com

Updated for 3.0 (9 Oct 2026). Everything is earned by proving missions, and none of it can be bought. Full Edition doesn't change any of it.

- **Proven missions earn points; points become rewards.** Each mission proven with the in-app camera earns its points (quick win 10, progress 15, challenge 25), plus 15 when every mission in the day's plan is proven. Points trade for single-use codes at unsetld.com: free shipping, 10% off, 15% off.
- **Days with a proven mission open Access.** A day counts once at least one mission is proven that day. Those days open early access (Day 7), the patch (Day 90) and the 365 piece (Day 365). Days on record from 2.x carry over.

The app has to make sense for someone who never buys a hoodie, so rewards stay quiet: the Rewards screen, one line on Home and on the done screen after a proof (never a popup), milestone letters and milestone pages. They never appear in widgets, notifications, the paywall or mission text.

## The ladder (days with a proven mission)

| Day | Milestone | What it is |
|---|---|---|
| 007 | Early access | Every UNSETLD drop opens to you 24 hours before the public. |
| 090 | The patch | A woven patch with your number, free with your next order. One per person. |
| 365 | The 365 piece | A numbered piece made only for people who reach a year. Sold at full price, never restocked. |

## Proof and points

| | |
|---|---|
| Missions | Three a day (four on Push me), chosen per user from `src/content/missions.json`. Only a mission in today's plan can be proven, and each one earns points once. |
| Proof | Taken with the camera inside the app (iOS never offers the photo library): one photo, a photo of the result, before and after photos, or a focus timer and then a photo. Stamped with the time and date. |
| Checks | On the phone: the right photos are there, taken in the last 30 minutes, before and after at least 2 minutes apart, the timer finished first, and the photo was never used before (fingerprints). They don't look at what's in the photo. A rejected proof earns nothing. |
| Where photos go | Nowhere. They're saved inside the app on the phone, re-encoded without EXIF or location, and deleted after 30 days by default (Settings → Proof photos). When signed in, only the date, the number of proven missions and the points that day go to the server. |
| Points | Quick win 10, progress 15, challenge 25, perfect day +15. At most four missions a day, so at most 115 points a day. Points from 2.x tasks carry over as an opening balance. Points don't expire. |
| Rewards | From `src/content/rewards.json`, or from unsetld.com's config when it sends `rewards` (below). |

The default tiers:

| Reward | Points | What | Limits |
|---|---|---|---|
| Free shipping (`free-shipping`) | 300 | Free shipping on one order | One each collection, code works 30 days |
| 10% off (`ten-off`) | 600 | 10% off one order | Up to $25 off, one each collection, 30 days |
| 15% off (`fifteen-off`) | 1,000 | 15% off one order | Up to $25 off, one each collection, 30 days |
| Limited piece (`limited-drop`) | 2,000 | First pick of a limited run at full price | Switched off (`active: false`) |

**Why the checks are only on the phone:** a photo can't truly prove anything, and checking every photo with a vision model would cost money per photo and mean uploading people's pictures. The checks make faking slower (live camera only, fresh photos, no reused photos, real timers) and the caps keep abuse cheap. Someone who fakes every mission still gets one code per tier per collection, each worth at most $25, against full-price orders they chose to place. `src/services/verify.ts` has a `TaskProofVerifier` interface for a future server-side check; none is connected, and the app never says a photo was verified by AI.

**Limits**
- One code per tier each collection (`perCollection`, 1 by default). One code per order.
- $25 maximum off an order for percentage codes (`maxOff`).
- No stacking with other codes, including the site's 10% first-order code.
- Excludes the 365 piece.
- US residents 13 and over. Under 18s need a parent's or guardian's OK to order. (Codes are a loyalty reward, not a sweepstakes; have a lawyer confirm the terms before launch.)
- No purchase necessary to earn. No cash value. Not transferable. Points can't be sold or bought.

**Pause rule**
- Only once early access is open (7 or more days with a proven mission when the gap began): if 14 days pass without a proven mission, early access shows PAUSED. Before Day 7 nothing can pause.
- While paused, the Day 7 letter for someone who reaches 7 during the pause waits until access reopens; the comeback letter then stands in for it.
- It reopens once a mission is proven on 7 more days, and a comeback letter arrives.
- The count and milestones never drop, and points don't expire. The patch and the 365 piece don't pause.
- The streak is separate: Off Days cover missed days for the streak, not for Access.

**Day boundary:** a day runs from 4:00 AM to 3:59 AM local time, so a late night counts as the day it started.

## Why this costs little

A perfect day on Lock in is 65 points (10 + 15 + 25 + 15), so free shipping takes about 5 perfect days, 10% off about 10, 15% off about 16, and all three about 30 perfect days in one collection, which few people keep up. The worst case per person per collection is free shipping on one order plus two codes worth at most $25 each, one patch ever, and early access, which costs nothing. Assume 4 collections a year and that 15–20% of active users take a percentage code each collection. Then 1,000 active users cost at most about 1,000 × 20% × 4 × $50 = **$40,000 of discount a year** plus shipping, and only against full-price orders those people chose to place. In practice it's far less, because most people don't buy every collection. Tiers and points can be changed from the config without an app update.

## Feature flag and reward config

The app reads `https://www.unsetld.com/api/app/config.json` on launch and on every foreground. See [`Web/api/app/config.json`](../Web/api/app/config.json):

```json
{
  "accessEnabled": false,
  "collection": "004",
  "rewards": [
    { "id": "free-shipping", "title": "Free shipping", "detail": "On your next UNSETLD order.", "type": "free-shipping", "points": 300, "active": true, "availableFrom": null, "availableUntil": null, "codeValidDays": 30, "inventory": null, "perCollection": 1 }
  ]
}
```

- **`accessEnabled`** (required; a file without it is ignored). `false` (the default until the backend below exists) hides the reward tiers, the redeem flow, your codes, the next-reward line on Home and on the done screen, the Access section on Rewards, the Day 3 note, milestone letters, milestone pages, the Account row (unless someone is already signed in) and the Access terms. Missions, proof, points, the streak, levels and "how points are earned" work unchanged. The app never says "coming soon".
- **`collection`** is the current collection. Rewards are counted per collection, so when this value changes everyone can take each tier again.
- **`rewards`** (optional) replaces the app's built-in tiers (`src/content/rewards.json`) as a whole list. Leave it out, or send an empty list, to use the built-in ones. Each entry is checked on the phone and dropped if anything in it is off; repeated ids are dropped too. If no entry is valid, the built-in tiers are used. Fields (`RewardTier` in `src/core/types.ts`):

| Field | Type | Notes |
|---|---|---|
| `id` | string, ≤64 characters | Permanent. Sent back in `redeem` and kept with each code taken. |
| `title` | string, ≤40 characters | "10% off" |
| `detail` | string | One line under the title. Optional, defaults to "". |
| `type` | `discount` \| `free-shipping` \| `early-access` \| `limited` \| `drop` | |
| `points` | whole number ≥1 | Cost in points. |
| `percent` | number, >0 and ≤100 | Required for `discount`; optional otherwise. (The local file is validated to 1–50.) |
| `maxOff` | number >0, dollars | Cap for percentage discounts. Optional. |
| `active` | boolean | Defaults to `true`. `false` shows NOT AVAILABLE. |
| `availableFrom`, `availableUntil` | ISO date (`YYYY-MM-DD`, a time may follow) or `null` | Outside the window the tier shows NOT AVAILABLE. |
| `codeValidDays` | whole number ≥1 | Days a minted code works. Defaults to 30. |
| `inventory` | whole number ≥0 or `null` | `null` = unlimited, `0` = sold out. The server enforces it. |
| `perCollection` | whole number ≥1 | How many a user can take each collection. Defaults to 1. |

The app shows what the config says; the server checks the tier again (active, dates, inventory, per collection) at redeem time, so a stale config on a phone can't mint anything the server wouldn't.

The browser preview simulates `accessEnabled: true` so the whole product can be seen.

## Drops

The app also reads `https://www.unsetld.com/api/app/drops.json`; see [`Web/api/app/drops.json`](../Web/api/app/drops.json). Drop alerts are a separate opt-in switch in Settings and are off by default. When they're on:
- Day 7 and up (days with a proven mission), with Access on and not paused: a notification at `earlyAt` ("Collection 004 is open to you now. Everyone else gets it tomorrow at 9:00 PM.").
- Everyone else (including paused users): a heads-up at the same time ("Collection 004 opens tomorrow at 9:00 PM.").
- Tapping the early alert opens the Day 7 page. While a drop is in its early window, that page shows `Open Collection 004`, which claims `early-access` (account needed) and opens the returned URL in Safari.
- Turning alerts on asks for notification permission first; if it's denied, the switch stays off and the app points to Settings.

If the file can't be read, the alerts already scheduled stay as they are.

## Accounts

Taking a reward or claiming anything needs a free account made with **Sign in with Apple** (`expo-apple-authentication`; the entitlement is added by the config plugin). Nothing else needs an account: missions, proof photos, points and the streak stay on the phone, with a Keychain backup of the record (not the photos) so a reinstall keeps it.

The phone counts as signed in only once the server has returned a session token at sign-in (below). The signed-in Account page has **Sign out** and, under it, **Delete account** (App Store Guideline 5.1.1(v)): it asks to confirm, calls `account/delete` and then signs out on the phone. The record and proof photos stay on the phone. The browser preview simulates sign-in and deletion.

## Backend (to build before turning `accessEnabled` on)

Build these as a few routes on the existing site (Vercel/Next.js), or on Supabase.

**Sign-in.** Apple's identity token expires within a day, so the app sends it only once: with `sync`, at sign-in, together with the one-time `authorizationCode`. The server:
1. Verifies `appleIdToken` against Apple's public keys (issuer `https://appleid.apple.com`, audience `com.unsetld.app`) and uses its `sub` as the user ID.
2. Exchanges `authorizationCode` at `POST https://appleid.apple.com/auth/token` (`grant_type=authorization_code`, with the app's client-secret JWT) and keeps the **refresh token** with the account. Deleting the account needs it to revoke the Sign in with Apple link. The code works once and expires after 5 minutes, so exchange it straight away.
3. Returns `{ sessionToken }`: its own long-lived random token, stored hashed against the user. The app keeps it in the Keychain and sends it as `Authorization: Bearer <sessionToken>` on every later request.

If any step fails, don't return a `sessionToken`. The phone then stays signed out and shows "Couldn't sign in. Try again in a moment."

**401.** Answer `401` when the session token is missing, unknown or revoked. The app then signs out on the phone (deletes its session token and clears the account), so the next reward or claim asks the user to sign in again. A phone with an account but no session token (for example from an older build that kept Apple's identity token) does the same without calling the server. Use `401` only for this; business errors like `used` come back as `200` with `{ error }`.

| Route | Auth | Body | Does |
|---|---|---|---|
| `POST /api/app/sync` | Apple tokens in the body | `{ appleIdToken, authorizationCode, days: string[], proofs: { day, count, points? }[] }` | Runs at each sign-in. Signs in as above and returns `{ sessionToken }`. `days` are the phone's clock-verified days on record (days with a proven mission, plus 2.x days). `proofs` has one entry per day: for 3.0 days, the number of proven missions and the points they earned (missions plus the perfect-day bonus); for 2.x days, `count` only (proven tasks, 10 points each). Accept none in the future, at most one entry per server day since install; clamp `count` to 0–4 and `points` to 0–115. |
| `POST /api/app/checkin` | session | `{ dayKey }` | Sent once a mission is proven that day. Stores one check-in per account per **server** day (these are the Access days). Rejects a `dayKey` more than a day from server time. |
| `POST /api/app/proof` | session | `{ dayKey, count, points? }` | Sent after each proven mission: the day's proven-mission count (clamp 0–4) and, since 3.0, its points (clamp 0–115). Sets them for the current **server** day; past days are frozen. A body without `points` is a 2.x phone: count 10 points per proof, at most 40. The photo never leaves the phone. |
| `POST /api/app/redeem` | session | `{ rewardId, points, type, percent }` (`percent` is `null` for non-discount tiers) | Looks up `rewardId` in the **server's** tier list (the same list it serves in config.json) and checks it is active, inside its dates and not sold out, else `{ error: "unavailable" }`. Checks how many of that tier the user took this collection against `perCollection`, else `{ error: "used" }`. Recounts the balance **from the server's own proof records** (points per day as stored, minus points already spent), and if it's short of the tier's points returns `{ error: "short" }`. Never trusts `points`, `type` or `percent` from the phone; they're there to log mismatches. Otherwise mints the code (below), records the redemption with its points and the collection, and returns `{ code, url }`. |
| `POST /api/app/claim` | session | `{ perk }` | Recomputes Access days and the pause rule **from the server's check-ins** (never trust the phone's count). Returns `{ url }`, or `{ error: "paused" \| "used" }`. |
| `POST /api/app/account/delete` | session | `{}` | Deletes the account: the Apple user ID, the email, check-ins, proof counts and points, redemptions and every session token. Revokes the stored refresh token at `POST https://appleid.apple.com/auth/revoke` (`token_type_hint=refresh_token`). Returns `{ deleted: true }`. On a `401` the phone signs out and the Account page shows "Sign in again to delete your account." Anything else leaves the phone signed in with "Couldn't delete your account. Try again in a moment." |

The app shows each redeem error in plain words: `used` "You took this one this collection. It opens again with the next collection.", `short` "unsetld.com hasn't counted all your points yet. Try again in a moment.", `unavailable` "This reward isn't available right now." Anything else, or no answer, reads as a network error.

Minting codes (Shopify Admin API): single use, usage limit 1, `combinesWith` nothing, valid for the tier's `codeValidDays` (30 by default). Return `https://www.unsetld.com/discount/{CODE}`, which applies it at checkout.
- **`discount`:** a percentage code. Shopify percentage codes can't cap at `maxOff` by themselves. Either enforce the cap with a small **Shopify Discount Function** that applies `min(percent × subtotal, maxOff)`, or mint a fixed-amount code worth `min(percent × the cart, maxOff)` at redeem time.
- **`free-shipping`:** a free-shipping code for one order.
- **`limited`, `early-access`, `drop`:** not offered by default. Before switching one on in the config, build its handling here (for example a reserved cart link like the patch claim below) and decrement `inventory`.

Claims by `perk`:
- **`patch`:** mint a 100%-off code limited to the patch product. Return `https://www.unsetld.com/cart/{PATCH_VARIANT_ID}:1?discount={CODE}`. One per user, ever. Engrave the patch with the user's number, i.e. the order of their claim.
- **`early-access`:** return a signed, expiring URL to the drop collection. The collection is published 24 hours early but kept out of navigation and search, and a cart validation function (or a theme script that checks the token with the backend) blocks checkout without a valid token until `publicAt`.
- **`piece-365`:** same token pattern as early access, for the 365 piece's product page.

All store links open in Safari, never an in-app browser.

## In the app

| Piece | File |
|---|---|
| Access rules (pause, statuses, letters, barcode, road) | `src/core/record.ts`; Access days from proven missions in `src/screens/access.ts` |
| Points, balance, tiers, status, next reward, the config parser | `src/core/rewards.ts` |
| Completing a mission, perfect-day bonus | `src/core/complete.ts` |
| 2.x carry-over (old points, old proof days for sync) | `src/core/legacy.ts` |
| Tests | `src/core/__tests__/` |
| Copy and thresholds | `src/content/rewards.json`, `src/content/rules.json`, `src/content/milestones.json`, `src/content/copy/rewards.ts` |
| Network calls | `src/services/access.ts` |
| Sign-in | `src/services/account.ts` |
| Screens | Rewards in `src/screens/rewards/`; Milestone, Letter and Account in `src/screens/` |
| Terms shown in the app | `src/content/legal.json` (`record`: How missions work; `access`: Rewards and access terms); get a lawyer to review these before launch |
