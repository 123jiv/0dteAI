# UNSETLD Rank: rewards design

**Status:** proposal for approval. Every number here lives in `Content/rank.json` and can be tuned without code.

## The idea in one line

**You can't buy rank, you work for it.** Showing up every day earns XP, and XP moves you up five ranks. Higher ranks unlock UNSETLD perks, but the discounts are capped hard, and rank decays if you stop showing up. *Never stop working.*

## How it differs from PEACEINWAR

Researched 2026-10-07 from the App Store listing, their Shopify product data, the privacy policy and screenshots.

| | PEACEINWAR "PRESTIGE" | UNSETLD Rank |
|---|---|---|
| How you get in | $9/month membership, sold through Shopify | Free for everyone; Premium doesn't change XP |
| How you earn XP | **Spending money:** 10 XP per $1 on orders | **Showing up:** daily line, non-negotiable, missions, streaks |
| Leaderboard | All-time XP, which is really a spending leaderboard | No public board at launch (it can't be trusted while XP lives on the phone); friend leagues later |
| Rewards | 10% at Prestige I, "exclusive discounts and free items" higher up; no published caps | Capped ladder: 10% → 15% → 20% max, $25/order and $150/person/year ceilings |
| Decay | None found | Rank decays when you stop showing up; shields cover off days |
| Same as theirs | Rank emblems, progress bar, "Claim" button, early access to drops, closet/verify by scanning tags (v2) | ← kept |

Their stack is Expo app + Next.js on Vercel + Shopify, which is the same backend shape you already have.

---

## Earning XP

| Action | XP | Limit |
|---|---|---|
| Open today's line (in the app, or tap the widget or a reminder) | 10 | once a day |
| Set today's **non-negotiable** (pick or write the one thing you'll do) | 10 | once a day |
| Complete today's **mission** (self check-off, e.g. "No phone for the first 30 min") | 15 | one per day |
| **Full week:** line + non-negotiable done Mon–Sun | +30 | weekly |
| Write a custom affirmation | 10 | once a week |
| Streak milestones: 7 / 30 / 60 / 100 / 180 / 365 days | +50 / 150 / 250 / 400 / 600 / 1,000 | each once per rolling year |
| **Comeback:** first 7-day streak after any decay | double daily XP | until the lost XP is back; once per 60 days |
| *(v2)* Order on unsetld.com with a linked account | +100 flat, never per dollar | once per 30 days |
| *(v2)* Scan the hang tag on an UNSETLD piece (adds it to your Closet, verified) | +100 per garment | 2 per month |
| *(v2)* A friend joins through your link **and** completes a 7-day streak | +150 | 3 per month |

**About 35 XP a day is the ceiling from daily actions**, so nobody can binge their way up.

**Never earns XP** (Apple rules, and to keep it honest):
- rating or reviewing the app
- turning on notifications, tracking or location
- following @unsetld or @unsetldclo
- posting or tagging on social media
- installing other apps
- buying Premium

XP is never sold, never cash, and never bought with Premium.

## The ladder

| Rank | XP | Daily-use time to get there | Perks |
|---|---|---|---|
| **SETTLED** | 0 | Day 0 | Everyone starts here. The whole app is about getting out of it |
| **HUNGRY** | 300 | ~1 week | Rank badge on profile + share cards, drop alerts (opt-in), votes in drop polls. No discount yet, so reinstalling and grinding a week for a code is pointless |
| **DIALED IN** | 1,300 | ~1 month | **10% off**, one code every 90 days |
| **RELENTLESS** | 3,500 | ~2.5 months | **15% off**, one code every 60 days. 24h early access to drops (full price) |
| **UNSETLD** | 8,000 | ~6 months | **20% off (max $25)**, one code every 60 days. 48h early access, app-only colorways (full price), first pick of numbered pieces, a physical rank patch in your next order (~$1–2 cost) |

The times assume near-daily use; at 80% consistency each takes about 1.3–1.5× longer. The perks that cost you nothing, like early access, app-only pieces, badges and drop votes, should carry most of the value. For limited runs that sell out anyway, buying first is worth more than a discount.

## Discount caps (so you never give away too much)

- **Ceiling:** 20% max, **$25 max off any order**, **$150 max per person per rolling 12 months**, and at most 6 codes a year.
- **Earned now, not months ago:** to claim, you must hold the rank right now (after decay) and be on a live streak of 7+ days.
- **One code per order:** no stacking with the 10% email welcome code, sale prices, bundles or anything else. Shopify discount combinations are off.
- **$60 minimum order:** a single $45 tee doesn't qualify; a hoodie plus anything does.
- **Excluded:** new drops and restocks for their first 72 hours, numbered/1-of-1 pieces, collabs, app-only colorways, gift cards, shipping and tax.
- **Expiry:** codes expire 14 days after claiming, and an unused code still starts the cooldown.
- **Monthly kill switch:** a hard cap on total redemptions. In v1 that's a total-use limit on each monthly code (e.g. 100). In v2 it's a dollar budget (e.g. $1,000/month). When it's hit, the app says *"Sold out this month. Back on the 1st."*
- **v1 ships only the 10% tier,** which is no better than your public email-signup offer, so a leaked v1 code costs nothing new. The 15% and 20% tiers switch on with v2's single-use codes. Nobody can reach RELENTLESS before ~day 75, so v2 has about 2.5 months after launch to ship.

## Decay: "rank is rented, rent is due daily"

- **Shields:** 2 per month, used automatically on a missed day; they don't roll over.
- **Grace:** the first 2 missed days in a row (with no shield left) cost only the streak.
- **Decay:** from the 3rd missed day in a row, rank XP drops 2% per missed day. It stops the moment you open today's line.
- **Floor:** you drop at most one rank per 30 days. Lifetime XP and your highest-ever rank badge are never touched.
- **Comeback:** after any decay, your next 7-day streak earns double XP until the lost XP is back.
- **Example:** a user at 8,000 XP who vanishes for 10 days with no shields left gets 2 grace days and then 8 days of decay (0.98⁸ ≈ 0.85). They lose about 15% and drop to RELENTLESS. A one-year user has enough buffer to survive a two-week break.
- **Reminder copy (unfiltered):** *"Day 3 gone. You're losing 2% a day. Open the app."*

---

## Margin math

**Assumptions (replace them with your real numbers):**
- Product cost is 40% of the retail price.
- Shopify Payments takes 2.9% + $0.30 per order.
- A typical discounted order is $100 (hoodie + tee).

| | Your profit on a $100 order | Cost of the code vs. full price |
|---|---|---|
| Full price | $56.80 | n/a |
| 10% off | $47.09 | $9.71 |
| 15% off | $42.23 | $14.57 |
| 20% off | $37.38 | $19.42 |

- **When a code pays for itself:** it only costs you when the person would have bought anyway. It breaks even when this share of redemptions are *extra* sales: **17%** (10% off), **26%** (15% off), **34%** (20% off).
- **The most one person can ever cost you:** $150 a year. That takes 6 orders of $125+, about $750 of product, which still earns you roughly $300+ after the discounts.
- **Worst case for the whole program:** with a $1,000/month budget cap, the most it can ever give away is **$12,000 a year**, and it only gets there if lots of people are opening your app every day.
- **Premium helps pay for it:** each annual subscription nets about $21 after Apple's 15% small-business commission. That's roughly two 10% codes.

---

## Anti-cheat

### v1: launch, no server, data stays on the phone

- **Daily XP cap:** the main defense. Faking mission check-offs gains nothing past the cap.
- **Clock tampering:** a new day only counts when the time checks out against unsetld.com's server clock and the phone's internal timer. Changing the phone's date earns nothing, and offline days stay "pending" until the next check.
- **Reinstalling:** XP and the claim history live in the iPhone's secure Keychain, which in practice survives deleting the app, plus the user's iCloud. Honest users keep progress on a new phone, and reinstalling can't reset code cooldowns.
- **Code leaks:** codes rotate monthly and are capped in Shopify (once per customer, $60 minimum, end-of-month expiry, total-use cap). A script creates the next 12 months of codes for you.
- **Editing the app's data:** the XP log is signed. A jailbroken phone can still cheat, but the v1 payoff (~$6–10) isn't worth more protection, which is why 15% and 20% wait for v2.

### v2: "Rank Sync" API on your existing Next.js/Vercel site

- **Accounts:** Sign in with Apple, plus in-app account deletion.
- **Server-side XP:** check-ins are recorded and timestamped by the server, one credit per day per account.
- **App checks:** Apple App Attest blocks modified apps, and DeviceCheck stops one phone farming many accounts.
- **Single-use codes:** a claim calls Shopify's Admin API and creates a code locked to that customer (one use, 14-day expiry, all limits applied). A leaked code is useless to anyone else.
- **Order XP:** Shopify webhooks add order XP and remove it on refunds or chargebacks.
- **Early access:** rank is saved as a Shopify customer tag, so your site can show early-access pages only to the right people.
- **Later:** hang-tag claims with a closet and transfers (like PEACEINWAR), weekly friend leagues with XP-only prizes, and referrals.

## Rules this design follows

Full list: [COMPLIANCE.md](COMPLIANCE.md).

- **Apple:**
  - XP only for in-app actions (Guideline 3.2.2(x)).
  - Nothing for ratings or reviews (5.6.3), or for enabling push, tracking or location (5.1.2(i)).
  - Clothes are paid for through Shopify, never in-app purchase (3.1.3(e)). XP is never sold (3.1.1). Premium is never gated behind rank (3.1.2).
  - QR or NFC tags never unlock Premium (3.1.1).
  - Drop and discount alerts need their own opt-in (4.5.4).
  - Widgets show no promos.
  - No prizes on leaderboards at launch (5.3).
- **Legal basics:**
  - Rewards are percent-off codes, not store credit or gift cards.
  - Published terms say "no cash value, not transferable", show expiry dates, and reserve the right to change the program.
  - Rewards are US only, and for 16+ or 18+ (your call).
