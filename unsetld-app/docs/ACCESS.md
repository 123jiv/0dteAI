# Rewards and status: what the app earns you at unsetld.com

Updated for 3.2 (12 Oct 2026); launch pass notes 19 Oct 2026. Everything is earned by proving missions, and none of it can be bought. UNSETLD+ doesn't change any of it: since the launch pass every swap after the day's first earns at most what the mission it replaces was worth, so a member's extra swaps never raise what a day earns. **Rewards stay off at launch** (`accessEnabled: false`): sign-in, the routes below, account deletion on the server, drop alerts and the $25 cap (below) are out of the launch scope and on the launch checklist's "before rewards turn on" list ([LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)). **Every reward is a discount code** for one order at unsetld.com: no merchandise, no early access, nothing else.

There are two separate things, and the app keeps them apart:

- **Point rewards (spent with points).** Each mission proven in the app earns its points (5 to 20, by how long it takes; an hour-long mission earned 25 before 3.3), plus 15 when every mission in the day's plan is proven. Points trade for single-use discount codes at unsetld.com (by default 5% off at 300, 10% off at 600 and 15% off at 1,000). Taking a code spends its points.
- **UNSETLD status (earned by days proven).** A day proven (an active day) is a day with at least one proven mission. Days proven are never spent: each status tier is **one discount code, once per person**, yours when you reach its number of days (by default 10% off at 7, 15% off at 30, 20% off at 90 and 25% off at 365, each up to $25 off, the code working 30 days from when it's taken). Taking one costs no points. Days on record from 2.x carry over.

Both lists come from configuration: `src/content/rewards.json` and `src/content/milestones.json` are the defaults, and unsetld.com's `config.json` (`rewards`, `status`) replaces them without an app update (below). No threshold, price or discount is written into a screen.

3.2 retired the status perks of 3.0 and 3.1 (early access to drops, the 90-day patch, the 365 piece), the `claim` endpoint and the pause rule that existed only for early access. Drop alerts stay, as a plain heads-up before each public drop (below).

The app has to make sense for someone who never buys a hoodie, so rewards stay quiet: the Rewards tab, one line on Today and on the done screen after a proof (never a popup), status letters and the status pages. They never appear in widgets, notifications or mission text. The paywall names them only in its Always free line, as staying free, and only while rewards are on.

## Where it shows

| Screen | What it holds |
|---|---|
| Rewards tab (`src/screens/rewards/RewardsScreen.tsx`) | Points (a big serif number; Day 1 shows "Your first proven mission earns your first points." instead of a zero), the **next reward** card (title, meter, "380 / 600 · 220 points left", or Ready with `Get the code`), **up next** (the two open rewards after it), links to All rewards, Reward history and How points work, and the **UNSETLD status** card, which opens Status: "10% off is ready" when a status code is reached and not taken (the highest, when there are more), else "Next: 15% off at 30 days" with a meter and "29 / 30 days proven", else "Every status reward earned". No rules on this page. |
| All rewards | Every reward tier, cheapest first: points, title, its line and its limits from its own fields ("Up to $25 off. Orders of $50 or more. Code works 30 days. One each collection."), and where it stands: Ready, N to go, Used this collection (Used, for a one-time reward), Cooling down (with the day it opens again) or Not available. A ready one can be taken from here. |
| Reward history | Your codes, newest first: 3.x points rewards, status codes ("10% off · 7 days proven") and 2.x codes, with when each was taken and runs out. A code whose reward has left the list keeps its name (`retiredRewards` in `src/content/copy/rewards.ts`). Tap to copy or use. |
| How points work | How points are earned (by mission length, the perfect-day bonus), that each mission's points also count as XP toward its area's level on the Record, how codes work, what status is, the limits, and the terms. |
| Status (`src/screens/rewards/StatusScreen.tsx`) | "UNSETLD status": days proven (a big serif number), the road (a tick at each tier's day, with the walker), and the tiers in day order, each a row with its day number in serif, "days proven", the discount ("10% off") and its cap ("Up to $25 off"). Ready: `Get the code`, through the same redeem flow as a points reward (sign in first if needed, confirm, then the code sheet with Copy, "Works until …" and Use it at unsetld.com). Taken: the code, when it runs out, and Copy (or, when unsetld.com said it was taken but didn't send it, "Taken before, maybe on another phone."). Locked: "12 days to go", with a quiet meter on the next tier only. |
| A status tier's page (`src/screens/MilestoneScreen.tsx`, route `Milestone { id }`) | The same as its row, larger, with the tier's `detail` and `Get the code` (or the code taken, or the meter). Opened from the status letter. An id that isn't a tier in effect (and whose code wasn't taken) falls back to Status. |
| Status letter (`src/screens/LetterScreen.tsx`) | Shown once on Today, a beat after it settles, on a day with something proven: "7 DAYS PROVEN." / "10% off is yours." / one line (one order, the cap, how long the code works) / `Get the code` (opens the tier's page) and `Not now`. |

## UNSETLD status (days proven)

The default tiers (`src/content/milestones.json`):

| Days proven | Tier (`id`) | What it is |
|---|---|---|
| 7 | 10% off (`status-7`) | One code for 10% off one order at unsetld.com, up to $25 off |
| 30 | 15% off (`status-30`) | One code for 15% off one order, up to $25 off |
| 90 | 20% off (`status-90`) | One code for 20% off one order, up to $25 off |
| 365 | 25% off (`status-365`) | One code for 25% off one order, up to $25 off |

Each code is taken once per person, ever (the tier shows Taken afterwards, with its code), works for 30 days from when it's taken (`codeValidDays`) and costs no points. A tier stays open once reached: there's no rush to take it, and nothing pauses or drops. Every tier is handled the same way; there are no special ids.

How it's worked out (`src/core/rewards.ts`):
- **Days proven** (`statusDays`): days on record (2.x days included) plus days with a proven mission. The count never drops.
- **A tier's state** (`statusState`): `taken` when a redemption with its id exists (with that code and whether it has run out), else `locked` with the days to go, else `ready`.
- **Taking it** (`statusReward`): the tier as a reward with `points: 0`, `type: 'discount'`, `perCollection: 1` and `oneTimeOnly: true`, through the same redeem flow as a points reward (`useRedeem` in `src/screens/rewards/redeem.tsx` → `redeem` in `src/services/access.ts` → the store's `redeemReward`). Its redemption records 0 points, so the balance is untouched. A 2.x code never counts against a status code.
- **The letter** (`pendingStatusLetter`): the highest tier reached whose code isn't taken and that no letter has covered yet. Letter keys are `status:<day>`, and a letter covers its own tier and every lower one (`markLetterShown`), so someone restoring a long record gets one letter, not four, and reaching 30 after skipping the 7 letter doesn't then show 7. Keys from earlier builds (`'7'`, `'90'`, `'comeback:…'`) are kept but no longer read, so someone who saw the old 7-day letter still hears about 10% off once.

## Proof and points

| | |
|---|---|
| Missions | One to four a day, by the time the user has (one with 15 minutes, two with 30 or 45, three with an hour or more, four on Push me; launch pass, model J), chosen per user from the approved library (`src/content/missions.json`, 3.3). Only a mission in today's plan can be proven, and each one earns points once. |
| Proof | Taken with the camera inside the app (iOS never offers the photo library): one photo, a photo of the result, before and after photos, or a focus timer and then a photo. Stamped with the time and date. |
| Checks | On the phone: the right photos are there, taken in the last 30 minutes, before and after at least 2 minutes apart, the timer finished first, and the photo was never used before (fingerprints). They don't look at what's in the photo. A rejected proof earns nothing. |
| Where photos go | Nowhere. They're saved inside the app on the phone, re-encoded without EXIF or location, and deleted after 30 days by default (You → Proof photos). When signed in, only the date, the number of proven missions and the points that day go to the server. |
| Points | By how long the mission takes: up to 10 minutes +5, 15–20 minutes +10, 25–45 minutes +15 to +20 (an hour +25 before 3.3); perfect day +15. At most four missions a day, so at most 95 points a day now (4 × 20 + 15); the server keeps its cap of 115 for days earned before 3.3, when a mission could earn +25. Points from 2.x tasks carry over as an opening balance. Points don't expire. |
| Rewards | From `src/content/rewards.json`, or from unsetld.com's config when it sends `rewards` (below). |

The default reward tiers:

| Reward | Points | What | Limits |
|---|---|---|---|
| 5% off (`five-off`) | 300 | 5% off one order | Up to $25 off, one each collection, code works 30 days |
| 10% off (`ten-off`) | 600 | 10% off one order | Up to $25 off, one each collection, code works 30 days |
| 15% off (`fifteen-off`) | 1,000 | 15% off one order | Up to $25 off, one each collection, code works 30 days |

None of the defaults has a minimum purchase, a cooldown or a one-time limit (`minimumPurchase: null`, `redemptionCooldownDays: null`, `oneTimeOnly: false`); the config can add them per tier.

**Why the checks are only on the phone:** a photo can't truly prove anything, and checking every photo with a vision model would cost money per photo and mean uploading people's pictures. The checks make faking slower (live camera only, fresh photos, no reused photos, real timers) and the caps keep abuse cheap. Someone who fakes every mission still gets one code per tier per collection, each worth at most $25, against full-price orders they chose to place. `src/services/verify.ts` has a `TaskProofVerifier` interface for a future server-side check; none is connected, and the app never says a photo was verified by AI.

**Limits**
- One code per tier each collection (`perCollection`, 1 by default), or once ever (`oneTimeOnly`), with an optional wait between codes (`redemptionCooldownDays`). One code per order.
- $25 maximum off an order for the default percentage codes (`maxOff`), and an optional minimum order (`minimumPurchase`).
- No stacking with other codes, including the site's 10% first-order code.
- Status codes: one per tier per person, ever (`oneTimeOnly`), each with its own cap (`maxOff`).
- US residents 13 and over. Under 18s need a parent's or guardian's OK to order. (Codes are a loyalty reward, not a sweepstakes; have a lawyer confirm the terms before launch.)
- No purchase necessary to earn. No cash value. Not transferable. Points can't be sold or bought.

**No pause rule.** 3.0 and 3.1 paused early access after 14 days without a proven mission; with early access gone, so is the pause. Days proven and the tiers reached never drop, and points don't expire. The streak and its Off Days (`src/core/streak.ts`) are separate and unchanged.

**Day boundary:** a day runs from 4:00 AM to 3:59 AM local time, so a late night counts as the day it started.

## Why this costs little

A typical perfect day on Lock in with 30–60 minutes is about 55 points (5 + 15 + 20, plus the 15 bonus), so 5% off takes about 6 perfect days, 10% off about 11, 15% off about 18, and all three about 35 perfect days in one collection, which few people keep up. The worst case per person per collection is three points codes worth at most $25 each, plus, once ever, four status codes worth at most $25 each ($100 a person over a year or more of proven days). Assume 4 collections a year and that 15–20% of active users take a percentage code each collection. Then 1,000 active users cost at most about 1,000 × 20% × 4 × $75 = **$60,000 of discount a year** in points codes, plus at most $25 a person for each status tier they reach and use (most people never reach 90 or 365 days), and only against full-price orders those people chose to place. In practice it's far less, because most people don't buy every collection. Tiers and points can be changed from the config without an app update.

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
    { "id": "status-7", "day": 7, "title": "10% off", "short": "10% off your next order, up to $25.", "detail": "Earned with 7 days proven. One code for 10% off one order at unsetld.com, up to $25 off. It works for 30 days after you take it. One per person.", "percent": 10, "maxOff": 25, "codeValidDays": 30, "active": true }
  ]
}
```

- **`accessEnabled`** (required; a file without it is ignored). `false` (the default until the backend below exists) hides the Rewards tab (the bar shows Today, Record and You), the next reward and up next, All rewards, the status card and Status, the next-reward line on Today and on the done screen, the rewards in the paywall's Always free line, status letters and pages, the drop alerts switch in You (unless it's already on, so it can be turned off), the Account row (unless someone is already signed in) and the terms. The points figure on Today opens How points work instead, which then shows only how points are earned and that each mission's points also count as XP toward its area's level. Codes already taken are never hidden: while one still works (`holdsLiveCode` in `src/screens/rewards/codes.ts`) the Rewards tab stays, with the points, one line ("Rewards aren't open. Points still count toward your area levels on your Record."), Reward history with every code, and How points work. Missions, proof, points, the streak and levels work unchanged. The app never says "coming soon".
- **`collection`** is the current collection. Rewards are counted per collection, so when this value changes everyone can take each tier again (except one-time rewards, and a tier still cooling down waits out its days).
- **`rewards`** (optional) replaces the app's built-in tiers (`src/content/rewards.json`) as a whole list. Leave it out, or send an empty list, to use the built-in ones. Each entry is checked on the phone (`parseRewardTier` in `src/core/rewards.ts`) and dropped if anything in it is off; repeated ids are dropped too (the first wins). If no entry is valid, the built-in tiers are used.
- **`status`** (optional) replaces the built-in status tiers (`src/content/milestones.json`) the same way (`parseStatus` in `src/core/rewards.ts`).

Reward fields (`RewardTier` in `src/core/types.ts`). The second name in brackets is an alias the parser also accepts; when both are sent, the first name wins.

| Field | Type | Notes |
|---|---|---|
| `id` | string, ≤64 characters | Permanent. Sent back in `redeem` and kept with each code taken. |
| `title` | string, ≤40 characters | "10% off" |
| `detail` | string | One line under the title ("One order at unsetld.com."). Optional, defaults to "". The limits below are shown from their fields, so don't repeat them here. |
| `type` (`rewardType`) | `discount` | Every reward is a discount. An entry of any other type (`free-shipping`, `limited` or `drop` from an earlier config) is dropped. |
| `points` (`pointsRequired`) | whole number ≥1 | Cost in points. |
| `percent` (`discountPercent`) | number, >0 and ≤100 | Required. (The local file is validated to 1–50.) |
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

Status fields (`StatusTier` in `src/core/types.ts`). Each entry is checked on the phone (`parseStatusTier`) and dropped if anything in it is off; a list from an earlier build (early access, the patch, the 365 piece, with no `percent`) reads as nothing usable, so the built-in tiers are used.

| Field | Type | Notes |
|---|---|---|
| `id` | string, ≤64 characters | Permanent: sent back in `redeem` and kept with the code taken (that's what marks the tier Taken). No id is special. |
| `day` (`activeDays`) | whole number ≥1 | Days proven needed. Moving a tier's day moves its state, its page and its letter: Today asks `accessLetter` (`src/screens/access.ts`, `pendingStatusLetter` in `src/core/rewards.ts`) for the letter with the tiers in effect, and the letter page shows nothing for a tier the config has since moved or switched off. A code already taken stays taken. |
| `title` | string, ≤40 characters | The discount: "10% off". The letter says "10% off is yours." |
| `percent` (`discountPercent`) | whole number, 1–90 | Required. Sent with `redeem`. |
| `maxOff` (`maxDiscount`) | number >0, dollars, or `null` | The cap: "Up to $25 off". Defaults to no cap ("One order at unsetld.com"). |
| `codeValidDays` | whole number ≥1 | Days the minted code works. Defaults to 30. |
| `short` | string | One line ("10% off your next order, up to $25."): the confirm and the code's detail. Optional, defaults to "". |
| `detail` | string | The tier's page. Optional, defaults to "". |
| `active` | boolean | Defaults to `true`. `false` hides the tier everywhere, its letter included. A code already taken still shows in Reward history and on its page. |

`pausable`, `action` and `letter` (3.0–3.1) are no longer read; `npm run validate` rejects them in `milestones.json`, along with any early access, patch or piece wording.

The app shows what the config says; the server checks the tier again at redeem time (active, dates, inventory, per collection, one-time, cooldown, minimum purchase, points or days proven), so a stale config on a phone can't mint anything the server wouldn't. The server should read the same `rewards` and `status` lists it serves.

The browser preview simulates `accessEnabled: true` so the whole product can be seen.

## Drops

The app also reads `https://www.unsetld.com/api/app/drops.json`; see [`Web/api/app/drops.json`](../Web/api/app/drops.json). Each drop needs an `id`, a `collection` and `publicAt` (when it opens to everyone). Drop alerts are an opt-in switch in You ("Drop alerts: A heads-up 24 hours before a new UNSETLD drop."), off by default and shown while rewards are on (or while already on, so it can be turned off). When they're on:
- One notification 24 hours before each drop's `publicAt`: "Collection 004 opens tomorrow at 9:00 PM." Nobody gets a drop before anyone else.
- Tapping it opens Today.
- Turning alerts on asks for notification permission first; if it's denied, the switch stays off and the app points to Settings.
- Drops are fetched and alerts scheduled only while the switch is on (`src/state/lifecycle.ts`). If the file can't be read, the alerts already scheduled stay as they are.

`drops.json` may still carry `earlyAt`, which builds before 3.2 require; 3.2 ignores it. Drop the field once those builds are gone.

## Accounts

Taking a code (points or status) needs a free account made with **Sign in with Apple** (`expo-apple-authentication`; the entitlement is added by the config plugin). Nothing else needs an account: missions, proof photos, points and the streak stay on the phone, with a Keychain backup of the record (not the photos) so a reinstall keeps it.

The phone counts as signed in only once the server has returned a session token at sign-in (below). The signed-in Account page has **Sign out** and, under it, **Delete account** (App Store Guideline 5.1.1(v)): it asks to confirm, calls `account/delete` and then signs out on the phone, saying "Account deleted." The record and proof photos stay on the phone; the dialog says "To clear them too, use Delete data on this phone in You." (You › YOUR DATA, launch pass P0-5: local only, no network call; it signs out on the phone but never deletes the account, and a signed-in user is pointed to "Delete account first"). The two are separate actions. The browser preview simulates sign-in and deletion.

## Backend (to build before turning `accessEnabled` on)

Build these as a few routes on the existing site (Vercel/Next.js), or on Supabase.

**Sign-in.** Apple's identity token expires within a day, so the app sends it only once: with `sync`, at sign-in, together with the one-time `authorizationCode`. The server:
1. Verifies `appleIdToken` against Apple's public keys (issuer `https://appleid.apple.com`, audience `com.unsetld.app`) and uses its `sub` as the user ID.
2. Exchanges `authorizationCode` at `POST https://appleid.apple.com/auth/token` (`grant_type=authorization_code`, with the app's client-secret JWT) and keeps the **refresh token** with the account. Deleting the account needs it to revoke the Sign in with Apple link. The code works once and expires after 5 minutes, so exchange it straight away.
3. Returns `{ sessionToken }`: its own long-lived random token, stored hashed against the user. The app keeps it in the Keychain and sends it as `Authorization: Bearer <sessionToken>` on every later request.

If any step fails, don't return a `sessionToken`. The phone then stays signed out and shows "Couldn't sign in. Try again in a moment."

**401.** Answer `401` when the session token is missing, unknown or revoked. The app then signs out on the phone (deletes its session token and clears the account), so the next code asks the user to sign in again. A phone with an account but no session token (for example from an older build that kept Apple's identity token) does the same without calling the server. Use `401` only for this; business errors like `used` come back as `200` with `{ error }`.

| Route | Auth | Body | Does |
|---|---|---|---|
| `POST /api/app/sync` | Apple tokens in the body | `{ appleIdToken, authorizationCode, days: string[], proofs: { day, count, points? }[] }` | Runs at each sign-in. Signs in as above and returns `{ sessionToken }`. `days` are the phone's clock-verified days on record (days with a proven mission, plus 2.x days). `proofs` has one entry per day: for 3.0 days, the number of proven missions and the points they earned (missions plus the perfect-day bonus); for 2.x days, `count` only (proven tasks, 10 points each). Accept none in the future, at most one entry per server day since install; clamp `count` to 0–4 and `points` to 0–115. |
| `POST /api/app/checkin` | session | `{ dayKey }` | Sent once a mission is proven that day. Stores one check-in per account per **server** day (these are the days proven that status counts). Rejects a `dayKey` more than a day from server time. |
| `POST /api/app/proof` | session | `{ dayKey, count, points? }` | Sent after each proven mission: the day's proven-mission count (clamp 0–4) and, since 3.0, its points (clamp 0–115). Sets them for the current **server** day; past days are frozen. A body without `points` is a 2.x phone: count 10 points per proof, at most 40. The photo never leaves the phone. |
| `POST /api/app/redeem` | session | Points reward: `{ rewardId, points, type, percent, minimumPurchase }` (`percent` and `minimumPurchase` are `null` when the tier has none). Status code: `{ rewardId, kind: "status", day, percent, maxOff, codeValidDays }` (`maxOff` is `null` with no cap). | **Points reward:** looks up `rewardId` in the **server's** `rewards` list (the same list it serves in config.json) and checks it is active, inside its dates and not sold out, else `{ error: "unavailable" }`. For a `oneTimeOnly` tier, checks the user never took it, else `{ error: "used" }`; otherwise checks how many of that tier the user took this collection against `perCollection`, else `{ error: "used" }`. If the tier has `redemptionCooldownDays`, checks the user's last code for it is at least that many days old, else `{ error: "cooldown" }`. Recounts the balance **from the server's own proof records** (points per day as stored, minus points already spent), and if it's short of the tier's points returns `{ error: "short" }`. **Status code** (`kind: "status"`): if the user already took this tier (one per person, ever), returns **that same code again**, `{ code, url, expires }` with `200`, and mints nothing: the phone gives up after 8 seconds, so a slow mint can be recorded on the server while the phone saw no reply, and the retry (or a second phone) must still get the code. Otherwise looks up `rewardId` in the server's `status` list (active, else `{ error: "unavailable" }`) and counts the user's days proven **from the server's own check-ins** against that tier's `day`, else `{ error: "short" }`; it spends no points. Either way it never trusts the numbers from the phone (they're there to log mismatches), mints the code (below) with the tier's own percent, cap, minimum and `codeValidDays`, records the redemption with its points (0 for status), day, collection, code and last day, and returns `{ code, url, expires }`. `expires` is the code's last day as `YYYY-MM-DD`; it's optional (without it the app counts `codeValidDays` from the day the phone got the code), but send it, so a status code sent again keeps its real last day. |
| `POST /api/app/account/delete` | session | `{}` | Deletes the account: the Apple user ID, the email, check-ins, proof counts and points, redemptions and every session token. Revokes the stored refresh token at `POST https://appleid.apple.com/auth/revoke` (`token_type_hint=refresh_token`). Returns `{ deleted: true }`. On a `401` the phone signs out and the Account page shows "Sign in again to delete your account." Anything else leaves the phone signed in with "Couldn't delete your account. Try again in a moment." |

The app shows each redeem error in plain words. Points rewards: `used` "You've taken this one. It opens again with the next collection.", `cooldown` "You took this one recently. It opens again once its wait is over.", `short` "unsetld.com hasn't counted all your points yet. Try again in a moment.", `unavailable` "This reward isn't available right now." Status codes: `used` comes only from a server that doesn't send a taken code again (above); the app then marks the tier Taken with no code to show and the line "Taken before, maybe on another phone. There's one per person." `short` "unsetld.com hasn't counted all your days yet. Try again in a moment.", `unavailable` (or `cooldown`) "This code isn't available right now." Anything else, or no answer, reads as a network error.

There is no `claim` route any more: 3.0 and 3.1 used `POST /api/app/claim` for early access, the patch and the 365 piece, all retired in 3.2. The server can answer it with `{ error: "unavailable" }` for builds that still call it.

Minting codes (Shopify Admin API): single use, usage limit 1, `combinesWith` nothing, valid for the tier's `codeValidDays` (30 by default), and with `minimumRequirement.subtotal` set to the tier's `minimumPurchase` when it has one. Return `https://www.unsetld.com/discount/{CODE}`, which applies it at checkout.
- **`discount`:** a percentage code. Shopify percentage codes can't cap at `maxOff` by themselves, and the cart isn't known when the code is minted (the code is taken in the app, the order is placed later), so a fixed-amount code worth `min(percent × the cart, maxOff)` can't be minted at redeem time. **Decide before rewards turn on** (founder decision 34; the leading option is the second):
  1. **Keep percent codes and enforce the cap at checkout** with a small **Shopify Discount Function** that applies `min(percent × subtotal, maxOff)`. The copy stays "10% off, up to $25".
  2. **Mint fixed-amount codes** (for example $5, $10, $15 off) with a minimum order, so the amount is known at redeem. The tiers, the app copy ("$10 off") and the rewards terms change from percent to amount.

  Until one is built, `maxOff` is shown in the app but not enforced by Shopify, which is one more reason rewards stay off at launch.
- No other type: every reward, points or status, is a `discount` code. A free-shipping code taken before 3.0 keeps its name in Reward history.

All store links open in Safari, never an in-app browser.

## In the app

| Part | File |
|---|---|
| Letter keys (`letterKey`, `markLetterShown`), the barcode | `src/core/record.ts`; days proven, the status tiers in effect, the status letter and drop alerts in `src/screens/access.ts` |
| Points, balance, reward status (used, cooldown, one-time), next reward, up next, the reward and status config parsers, days proven, status state, `statusReward`, the status letter, the road | `src/core/rewards.ts` |
| Completing a mission, perfect-day bonus | `src/core/complete.ts` |
| 2.x carry-over (old points, old proof days for sync) | `src/core/legacy.ts` |
| Tests | `src/core/__tests__/` (`rewards-config.test.ts`, `rewards-rules.test.ts`, `drops-config.test.ts`), `src/services/__tests__/redeem-status.test.ts`, `src/state/__tests__/store-status.test.ts`, `src/content/__tests__/rewards-a11y-copy.test.ts` |
| Copy and thresholds | `src/content/rewards.json`, `src/content/rules.json`, `src/content/milestones.json`, `src/content/copy/rewards.ts` |
| Network calls | `src/services/access.ts` |
| Sign-in | `src/services/account.ts` |
| Screens | Rewards, All rewards, Reward history, How points work, Status and the redeem flow in `src/screens/rewards/`; Milestone (a status tier's page), Letter (the status letter) and Account in `src/screens/` |
| Terms shown in the app | `src/content/legal.json` (`record`: How missions work; `access`: Rewards and status terms); get a lawyer to review these before launch |
