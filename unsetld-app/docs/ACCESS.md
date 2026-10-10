# Rewards and status: what the app earns you at unsetld.com

Updated for 3.1 (10 Oct 2026). Everything is earned by proving missions, and none of it can be bought. UNSETLD+ doesn't change any of it.

There are two separate things, and the app keeps them apart:

- **Point rewards (spent with points).** Each mission proven in the app earns its points (5 to 25, by how long it takes), plus 15 when every mission in the day's plan is proven. Points trade for single-use discount codes at unsetld.com (by default 5% off at 300, 10% off at 600 and 15% off at 1,000). Taking a code spends its points.
- **UNSETLD status (earned by active days).** An active day is a day with at least one proven mission. Active days are never spent: they open status tiers (by default early access at 7, the patch at 90 and the 365 piece at 365). Days on record from 2.x carry over.

Both lists come from configuration: `src/content/rewards.json` and `src/content/milestones.json` are the defaults, and unsetld.com's `config.json` (`rewards`, `status`) replaces them without an app update (below). No threshold, price or product is written into a screen.

The app has to make sense for someone who never buys a hoodie, so rewards stay quiet: the Rewards tab, one line on Today and on the done screen after a proof (never a popup), status letters and the status pages. They never appear in widgets, notifications or mission text. The paywall names them only in its Always free line, as staying free, and only while rewards are on.

## Where it shows

| Screen | What it holds |
|---|---|
| Rewards tab (`src/screens/rewards/RewardsScreen.tsx`) | Points (a big serif number; Day 1 shows "Your first proven mission earns your first points." instead of a zero), the **next reward** card (title, meter, "380 / 600 · 220 points left", or Ready with `Get the code`), **up next** (the two open rewards after it), links to All rewards, Reward history and How points work, and the **UNSETLD status** card (the next status tier, its meter, "12 / 90 active days · 78 to go"). No rules on this page. |
| All rewards | Every reward tier, cheapest first: points, title, its line and its limits from its own fields ("Up to $25 off. Orders of $50 or more. Code works 30 days. One each collection."), and where it stands: Ready, N to go, Used this collection (Used, for a one-time reward), Cooling down (with the day it opens again) or Not available. A ready one can be taken from here. |
| Reward history | Your codes, newest first: 3.x rewards and 2.x codes, with when each was taken and runs out. A code whose reward has left the list keeps its name (`retiredRewards` in `src/content/copy/rewards.ts`). Tap to copy or use. |
| How points work | How points are earned (by mission length, the perfect-day bonus), how codes work, what status is, the limits, and the terms. |
| Status | Active days, the road (a tick at each tier's day, with the walker), and each status tier with Open / Reached / Used / Paused / N to go. Each tier opens its page (`MilestoneScreen`), which holds its action. |

## UNSETLD status (active days)

The default tiers (`src/content/milestones.json`):

| Active days | Tier (`id`) | What it is | Action (app's own ids only) |
|---|---|---|---|
| 7 | Early access (`early-access`) | Every UNSETLD drop opens to you 24 hours before the public. Pauses (below). | Turn on drop alerts; during a drop's early window, `Open Collection 004` (claims `early-access`) |
| 90 | The patch (`patch`) | A woven patch with your number, free with your next order. One per person. | Claim it (`patch`), once |
| 365 | The 365 piece (`piece-365`) | A numbered piece made only for people who reach a year. Sold at full price, never restocked. | Open it (`piece-365`) |

Only these three ids carry an action, the pause and a letter, because the app knows what they do. A tier with any other id (from the config, say "30 active days: special access") shows on Status and on its page as **display only**: title, line, detail and progress, "Reached" once reached, no button, no letter. Build its delivery (a claim route, an email) before promising anything in its text.

## Proof and points

| | |
|---|---|
| Missions | Three a day (four on Push me, unless the user has only 5–15 minutes a day), chosen per user from `src/content/missions.json`. Only a mission in today's plan can be proven, and each one earns points once. |
| Proof | Taken with the camera inside the app (iOS never offers the photo library): one photo, a photo of the result, before and after photos, or a focus timer and then a photo. Stamped with the time and date. |
| Checks | On the phone: the right photos are there, taken in the last 30 minutes, before and after at least 2 minutes apart, the timer finished first, and the photo was never used before (fingerprints). They don't look at what's in the photo. A rejected proof earns nothing. |
| Where photos go | Nowhere. They're saved inside the app on the phone, re-encoded without EXIF or location, and deleted after 30 days by default (You → Proof photos). When signed in, only the date, the number of proven missions and the points that day go to the server. |
| Points | By how long the mission takes: a few minutes +5, 10–20 minutes +10, 25–45 minutes +15 to +20, an hour +25; perfect day +15. At most four missions a day, so at most 115 points a day. Points from 2.x tasks carry over as an opening balance. Points don't expire. |
| Rewards | From `src/content/rewards.json`, or from unsetld.com's config when it sends `rewards` (below). |

The default reward tiers:

| Reward | Points | What | Limits |
|---|---|---|---|
| 5% off (`five-off`) | 300 | 5% off one order | Up to $25 off, one each collection, code works 30 days |
| 10% off (`ten-off`) | 600 | 10% off one order | Up to $25 off, one each collection, code works 30 days |
| 15% off (`fifteen-off`) | 1,000 | 15% off one order | Up to $25 off, one each collection, code works 30 days |
| Limited piece (`limited-drop`) | 2,000 | First pick of a limited run at full price | Switched off (`active: false`) |

None of the defaults has a minimum purchase, a cooldown or a one-time limit (`minimumPurchase: null`, `redemptionCooldownDays: null`, `oneTimeOnly: false`); the config can add them per tier.

**Why the checks are only on the phone:** a photo can't truly prove anything, and checking every photo with a vision model would cost money per photo and mean uploading people's pictures. The checks make faking slower (live camera only, fresh photos, no reused photos, real timers) and the caps keep abuse cheap. Someone who fakes every mission still gets one code per tier per collection, each worth at most $25, against full-price orders they chose to place. `src/services/verify.ts` has a `TaskProofVerifier` interface for a future server-side check; none is connected, and the app never says a photo was verified by AI.

**Limits**
- One code per tier each collection (`perCollection`, 1 by default), or once ever (`oneTimeOnly`), with an optional wait between codes (`redemptionCooldownDays`). One code per order.
- $25 maximum off an order for the default percentage codes (`maxOff`), and an optional minimum order (`minimumPurchase`).
- No stacking with other codes, including the site's 10% first-order code.
- Excludes the 365 piece.
- US residents 13 and over. Under 18s need a parent's or guardian's OK to order. (Codes are a loyalty reward, not a sweepstakes; have a lawyer confirm the terms before launch.)
- No purchase necessary to earn. No cash value. Not transferable. Points can't be sold or bought.

**Pause rule**
- Only once early access is open (7 or more active days when the gap began): if 14 days pass without a proven mission, early access shows Paused. Before that nothing can pause.
- While paused, the early-access letter for someone who reaches early access during the pause waits until access reopens; that letter then stands in for the comeback letter.
- It reopens once a mission is proven on 7 more days, and a comeback letter arrives ("Early access is open again."), only while early access is switched on and reached.
- The count and the tiers never drop, and points don't expire. The patch, the 365 piece and display-only tiers don't pause.
- The streak is separate: Off Days cover missed days for the streak, not for Access.

**Day boundary:** a day runs from 4:00 AM to 3:59 AM local time, so a late night counts as the day it started.

## Why this costs little

A typical perfect day on Lock in with 30–60 minutes is about 55 points (5 + 15 + 20, plus the 15 bonus), so 5% off takes about 6 perfect days, 10% off about 11, 15% off about 18, and all three about 35 perfect days in one collection, which few people keep up. The worst case per person per collection is three codes worth at most $25 each, one patch ever, and early access, which costs nothing. Assume 4 collections a year and that 15–20% of active users take a percentage code each collection. Then 1,000 active users cost at most about 1,000 × 20% × 4 × $75 = **$60,000 of discount a year**, and only against full-price orders those people chose to place. In practice it's far less, because most people don't buy every collection. Tiers and points can be changed from the config without an app update.

## Feature flag, reward config and status config

The app reads `https://www.unsetld.com/api/app/config.json` on launch and on every foreground. See [`Web/api/app/config.json`](../Web/api/app/config.json):

```json
{
  "accessEnabled": false,
  "collection": "004",
  "rewards": [
    { "id": "five-off", "title": "5% off", "detail": "One order at unsetld.com.", "type": "discount", "points": 300, "percent": 5, "maxOff": 25, "active": true, "availableFrom": null, "availableUntil": null, "codeValidDays": 30, "inventory": null, "perCollection": 1, "minimumPurchase": null, "redemptionCooldownDays": null, "oneTimeOnly": false }
  ],
  "status": [
    { "id": "early-access", "day": 7, "title": "Early access", "short": "Every drop opens to you 24 hours early.", "detail": "Every UNSETLD drop opens to you 24 hours before the public. When a drop is announced, open it from here.", "active": true }
  ]
}
```

- **`accessEnabled`** (required; a file without it is ignored). `false` (the default until the backend below exists) hides the next reward and up next, All rewards, Reward history, the status card and Status, the next-reward line on Today and on the done screen, the rewards in the paywall's Always free line, status letters and pages, the Account row (unless someone is already signed in) and the terms. The Rewards tab then shows the points (or, before any, how the first ones come), one calm line ("Rewards aren't open right now. Your points keep counting.") and How points work, which shows only how points are earned. Missions, proof, points, the streak and levels work unchanged. The app never says "coming soon".
- **`collection`** is the current collection. Rewards are counted per collection, so when this value changes everyone can take each tier again (except one-time rewards, and a tier still cooling down waits out its days).
- **`rewards`** (optional) replaces the app's built-in tiers (`src/content/rewards.json`) as a whole list. Leave it out, or send an empty list, to use the built-in ones. Each entry is checked on the phone (`parseRewardTier` in `src/core/rewards.ts`) and dropped if anything in it is off; repeated ids are dropped too (the first wins). If no entry is valid, the built-in tiers are used.
- **`status`** (optional) replaces the built-in status tiers (`src/content/milestones.json`) the same way (`parseStatus` in `src/core/rewards.ts`).

Reward fields (`RewardTier` in `src/core/types.ts`). The second name in brackets is an alias the parser also accepts; when both are sent, the first name wins.

| Field | Type | Notes |
|---|---|---|
| `id` | string, ≤64 characters | Permanent. Sent back in `redeem` and kept with each code taken. |
| `title` | string, ≤40 characters | "10% off" |
| `detail` | string | One line under the title ("One order at unsetld.com."). Optional, defaults to "". The limits below are shown from their fields, so don't repeat them here. |
| `type` (`rewardType`) | `discount` \| `free-shipping` \| `early-access` \| `limited` \| `drop` | |
| `points` (`pointsRequired`) | whole number ≥1 | Cost in points. |
| `percent` (`discountPercent`) | number, >0 and ≤100 | Required for `discount`; optional otherwise. (The local file is validated to 1–50.) |
| `maxOff` (`maxDiscount`) | number >0, dollars | Cap for percentage discounts. Shown as "Up to $25 off". Optional. |
| `minimumPurchase` | number ≥0 (dollars) or `null` | Smallest order the code works on (`0`/`null` = none). Shown as "Orders of $50 or more"; sent with `redeem`; **enforced by unsetld.com** on the minted code. Optional. |
| `redemptionCooldownDays` (`redemptionCooldown`) | whole number ≥0 or `null` | Days after taking it before it can be taken again (also across collections). While inside them the tier shows **Cooling down** and the day it opens again. `0`/`null` = none. Optional. |
| `oneTimeOnly` | boolean | Can be taken once per person, ever (any collection). Afterwards it shows **Used**. Optional, defaults to `false`. |
| `active` | boolean | Defaults to `true`. `false`: not listed anywhere (nothing is promised that can't be had). |
| `availableFrom` (`startDate`), `availableUntil` (`endDate`) | ISO date (`YYYY-MM-DD`, a time may follow) or `null` | Outside the window the tier shows **Not available**. |
| `codeValidDays` | whole number ≥1 | Days a minted code works. Defaults to 30. |
| `inventory` | whole number ≥0 or `null` | `null` = unlimited, `0` = sold out (**Not available**). The server enforces it. |
| `perCollection` | whole number ≥1 | How many a user can take each collection. Defaults to 1. |

How a tier's status is worked out (`rewardStatus`): not active, outside its dates or sold out → Not available; one-time and taken before → Used; taken `perCollection` times this collection → Used this collection; taken within `redemptionCooldownDays` → Cooling down; enough points → Ready; else "N to go". A 2.x discount code counts as taking the tier with the same percent. The **next reward** is the most valuable Ready tier, else the cheapest one still out of reach; **up next** is the two open tiers after it. Used, cooling-down and unavailable tiers are never "next".

Status fields (`StatusTier` in `src/core/types.ts`):

| Field | Type | Notes |
|---|---|---|
| `id` | string, ≤64 characters | `early-access`, `patch` and `piece-365` are the app's own: they keep their action, pause and letter from `milestones.json`. Any other id is a display-only tier. The 365 piece's letter says "A full year", so keep `piece-365` at day 365 (or change its letter in `milestones.json` with it). |
| `day` (`activeDays`) | whole number ≥1 | Active days needed. Moving an own tier's day moves its status, its page and its letter: Today asks `accessLetter` (`src/screens/access.ts`, `pendingStatusLetter` in `src/core/rewards.ts`) for the letter with the tiers in effect, and the letter page shows nothing for a tier the config has since moved or switched off. A letter's sub never names the number of days. The pause still starts at 7 active days (`PAUSABLE_DAYS` in `src/core/record.ts`). |
| `title` | string, ≤40 characters | |
| `short` | string | One line on Status. Optional: an own tier left without one keeps the built-in line; others default to "". |
| `detail` | string | The tier's page. Same defaults as `short`. |
| `active` | boolean | Defaults to `true`. `false` hides the tier everywhere, its letter included (for early access, the comeback letter too). |
| `action` | string, ≤40 characters | The button on an own tier's page (e.g. "Add it to my next order"). Ignored for other ids. |

The app shows what the config says; the server checks the tier again at redeem and claim time (active, dates, inventory, per collection, one-time, cooldown, minimum purchase, active days), so a stale config on a phone can't mint anything the server wouldn't. The server should read the same `rewards` and `status` lists it serves.

The browser preview simulates `accessEnabled: true` so the whole product can be seen.

## Drops

The app also reads `https://www.unsetld.com/api/app/drops.json`; see [`Web/api/app/drops.json`](../Web/api/app/drops.json). Drop alerts are a separate opt-in switch in You (and the early access page) and are off by default. When they're on:
- 7 active days and up, with rewards on and early access not paused: a notification at `earlyAt` ("Collection 004 is open to you now. Everyone else gets it tomorrow at 9:00 PM.").
- Everyone else (including paused users): a heads-up at the same time ("Collection 004 opens tomorrow at 9:00 PM.").
- Tapping the early alert opens the early access page. While a drop is in its early window, that page shows `Open Collection 004`, which claims `early-access` (account needed) and opens the returned URL in Safari.
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
| `POST /api/app/redeem` | session | `{ rewardId, points, type, percent, minimumPurchase }` (`percent` and `minimumPurchase` are `null` when the tier has none) | Looks up `rewardId` in the **server's** tier list (the same list it serves in config.json) and checks it is active, inside its dates and not sold out, else `{ error: "unavailable" }`. For a `oneTimeOnly` tier, checks the user never took it, else `{ error: "used" }`; otherwise checks how many of that tier the user took this collection against `perCollection`, else `{ error: "used" }`. If the tier has `redemptionCooldownDays`, checks the user's last code for it is at least that many days old, else `{ error: "cooldown" }`. Recounts the balance **from the server's own proof records** (points per day as stored, minus points already spent), and if it's short of the tier's points returns `{ error: "short" }`. Never trusts `points`, `type`, `percent` or `minimumPurchase` from the phone; they're there to log mismatches. Otherwise mints the code (below), with the tier's own `minimumPurchase` as the code's minimum subtotal, records the redemption with its points, day and the collection, and returns `{ code, url }`. |
| `POST /api/app/claim` | session | `{ perk }` | Recomputes active days and the pause rule **from the server's check-ins** (never trust the phone's count), against the `day` of that tier in the server's `status` list. Returns `{ url }`, or `{ error: "paused" \| "used" }`. |
| `POST /api/app/account/delete` | session | `{}` | Deletes the account: the Apple user ID, the email, check-ins, proof counts and points, redemptions and every session token. Revokes the stored refresh token at `POST https://appleid.apple.com/auth/revoke` (`token_type_hint=refresh_token`). Returns `{ deleted: true }`. On a `401` the phone signs out and the Account page shows "Sign in again to delete your account." Anything else leaves the phone signed in with "Couldn't delete your account. Try again in a moment." |

The app shows each redeem error in plain words: `used` "You've taken this one. It opens again with the next collection.", `cooldown` "You took this one recently. It opens again once its wait is over.", `short` "unsetld.com hasn't counted all your points yet. Try again in a moment.", `unavailable` "This reward isn't available right now." Anything else, or no answer, reads as a network error.

Minting codes (Shopify Admin API): single use, usage limit 1, `combinesWith` nothing, valid for the tier's `codeValidDays` (30 by default), and with `minimumRequirement.subtotal` set to the tier's `minimumPurchase` when it has one. Return `https://www.unsetld.com/discount/{CODE}`, which applies it at checkout.
- **`discount`:** a percentage code. Shopify percentage codes can't cap at `maxOff` by themselves. Either enforce the cap with a small **Shopify Discount Function** that applies `min(percent × subtotal, maxOff)`, or mint a fixed-amount code worth `min(percent × the cart, maxOff)` at redeem time.
- **`free-shipping`:** a free-shipping code for one order. Not in the default tiers (taken out in 3.0); a past code keeps its name on the Rewards screen.
- **`limited`, `early-access`, `drop`:** not offered by default. Before switching one on in the config, build its handling here (for example a reserved cart link like the patch claim below) and decrement `inventory`.

Claims by `perk`:
- **`patch`:** mint a 100%-off code limited to the patch product. Return `https://www.unsetld.com/cart/{PATCH_VARIANT_ID}:1?discount={CODE}`. One per user, ever. Engrave the patch with the user's number, i.e. the order of their claim.
- **`early-access`:** return a signed, expiring URL to the drop collection. The collection is published 24 hours early but kept out of navigation and search, and a cart validation function (or a theme script that checks the token with the backend) blocks checkout without a valid token until `publicAt`.
- **`piece-365`:** same token pattern as early access, for the 365 piece's product page.

All store links open in Safari, never an in-app browser.

## In the app

| Piece | File |
|---|---|
| Access rules (pause, letters, barcode) | `src/core/record.ts`; active days, the status tiers in effect and the status letter in `src/screens/access.ts` |
| Points, balance, reward status (used, cooldown, one-time), next reward, up next, the reward and status config parsers, status state, the road | `src/core/rewards.ts` |
| Completing a mission, perfect-day bonus | `src/core/complete.ts` |
| 2.x carry-over (old points, old proof days for sync) | `src/core/legacy.ts` |
| Tests | `src/core/__tests__/` (`rewards-config.test.ts`, `rewards-rules.test.ts`) |
| Copy and thresholds | `src/content/rewards.json`, `src/content/rules.json`, `src/content/milestones.json`, `src/content/copy/rewards.ts` |
| Network calls | `src/services/access.ts` |
| Sign-in | `src/services/account.ts` |
| Screens | Rewards, All rewards, Reward history, How points work, Status and the redeem flow in `src/screens/rewards/`; Milestone (a status tier's page), Letter and Account in `src/screens/` |
| Terms shown in the app | `src/content/legal.json` (`record`: How missions work; `access`: Rewards and status terms); get a lawyer to review these before launch |
