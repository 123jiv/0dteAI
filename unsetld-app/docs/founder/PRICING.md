**Proposed — not implemented. Needs founder approval.**

> **Where this stands (19 Oct 2026, after the launch pass merged).** The code parts marked "this pass" are merged: purchases fail closed and the trial, membership and reminder come from the store (df242bc, 9d622b7), swap parity (c75eca5), the paywall order and copy (df242bc). Prices, the trial length and Family Sharing are still App Store Connect decisions (1–3), and nothing there or in RevenueCat has been created. Source notes such as `audits/*.md`, `audit/...`, `decisions.md` and "plan §6" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan, what shipped and every founder decision with its assumed default.

# UNSETLD+ pricing and value

Prices, the trial length and Family Sharing are App Store Connect settings. Nothing in App Store Connect or RevenueCat has been changed. Some sections describe app code from this launch pass; those are marked "this pass". Everything else here is a proposal.

Sources: the UNSETLD+ audit (`audits/plus.md`), the analytics audit (`audits/analytics.md`), plan §6 decisions 9, 16–19 and 24, and the repo at `acea784` (`src/services/previewProducts.ts`, `src/services/purchases.ts`, `src/core/pricing.ts`, `src/core/features.ts`, `src/content/rules.json`, `src/content/programs.json`, `README.md`).

---

## Decisions in this document

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| 1 | Prices | Monthly $4.99, Annual $24.99, Lifetime $69.99 | Annual $29.99 with Lifetime $79.99; or no Lifetime at launch |
| 2 | Trial | 7 days, on Annual only | Keep 3 days |
| 3 | Family Sharing | Off at launch | On at launch (can never be turned off) |
| 4 | Ask for notification permission when a trial starts | Yes, if it hasn't been asked | No. Someone without notifications then sees no reminder step on the paywall |
| 5 | Paywall line "and new ones each season" | Removed this pass. Bring it back only with a committed release schedule | Commit to a schedule and keep it |
| 6 | Swap parity | Swaps after the first earn at most what the replaced mission was worth (this pass) | Cap every swap, including the free one |
| 7 | Send `purchase_completed` when analytics is turned on | Yes | No. Conversion by paywall entry point then stays unknown |

---

## 1. Current sample prices

These are the preview products in `src/services/previewProducts.ts`. `README.md` tells you to set the same prices in App Store Connect.

| | Monthly | Annual | Lifetime |
|---|---|---|---|
| Product id | `unsetld_full_monthly` | `unsetld_full_annual` | `unsetld_full_lifetime` |
| Price | $4.99 | $24.99 | $39.99 |
| Billed | Every month | Every year | Once |
| Trial in the sample | None | 3 days | None |
| Cost over one year | $59.88 | $24.99 | $39.99 |

**Ratios**
- Annual is 5.0× Monthly. The paywall's badge reads "Save 58%" (1 − 24.99 ÷ 59.88, rounded down, from `src/core/pricing.ts`). The per-month line reads $2.08.
- Lifetime is 1.6× Annual, about 19 months of Annual.
- Lifetime is 8.0× Monthly.

---

## 2. Why Lifetime at $39.99 undercuts Annual

Annual is billed up front. So a member who renews once has paid $49.98. Lifetime would have cost $39.99.

| Member stays | Pays on Annual | Pays on Lifetime at $39.99 | Cheaper |
|---|---|---|---|
| Up to 1 year | $24.99 | $39.99 | Annual |
| Up to 2 years | $49.98 | $39.99 | Lifetime |
| Up to 3 years | $74.97 | $39.99 | Lifetime |

- Anyone who expects to renew even once does better with Lifetime. The paywall shows both side by side, so the choice reads as "$15 more and never pay again".
- Lifetime is also cheaper than nine months of Monthly ($44.91).
- Lifetime buyers never pay again. The value UNSETLD+ is meant to grow through is the Plan library, which is ongoing work. One-off payments at under two years of Annual don't fund it.
- Raising Lifetime later only affects new buyers. Everyone who bought at $39.99 keeps it at that price for good. So the price set at launch is the one that matters.

---

## 3. Recommendation and alternatives

| | Current sample | **Recommended** | Alternative A | Alternative B |
|---|---|---|---|---|
| Monthly | $4.99 | **$4.99** | $4.99 | $4.99 |
| Annual | $24.99 | **$24.99** | $29.99 | $24.99 |
| Lifetime | $39.99 | **$69.99** | $79.99 | None at launch |
| Annual badge | Save 58% | **Save 58%** | Save 49% | Save 58% |
| Annual per-month line | $2.08 | **$2.08** | $2.49 | $2.08 |
| Lifetime ÷ Annual | 1.6× | **2.8×** | 2.7× | — |
| Lifetime in months of Monthly | 8 | **14** | 16 | — |
| Lifetime cheaper than Annual from | 2nd payment ($49.98) | **3rd payment ($74.97)** | 3rd payment ($89.97) | — |

**Recommended: $4.99 / $24.99 / $69.99**
- Only Lifetime changes. Monthly and Annual stay at the prices already written in `README.md`, `COMPLIANCE.md` and the copy deck. The app itself holds no prices. The "Save 58%" badge doesn't change.
- Lifetime stays a real option for people, and parents, who won't take a subscription. It only beats Annual for someone who would pay for a third year.

**Alternative A: $4.99 / $29.99 / $79.99**
- More per Annual member.
- The badge drops to "Save 49%". The yearly price is higher for an audience of 13–25.

**Alternative B: no Lifetime at launch**
- All revenue is recurring, and the paywall has two rows.
- This is the most reversible option. Adding Lifetime later is a store change. The app lists only the packages the offering has, so no code change is needed (confirm on a device).
- Nothing is offered to people who won't subscribe.

**What can be undone later**

| Change after launch | What happens |
|---|---|
| Lower any price | Allowed. No consent needed |
| Raise Monthly or Annual | Goes through Apple's price-increase process for existing subscribers (section 6) |
| Raise Lifetime | New buyers only. Earlier buyers keep it |
| Add Lifetime | Store change only |
| Remove Lifetime from sale | Earlier buyers keep it and can restore it |
| Change the trial length | New trials only. The app reads it from the store (section 4) |
| Turn Family Sharing on | Allowed |
| Turn Family Sharing off | Not possible |

Not built yet (P2): a path to Lifetime for existing members. Members never reach the paywall: their You row opens Apple's subscription settings. So a subscriber can't move to Lifetime in the app. A path would also need to tell them to cancel the subscription in Settings, because buying Lifetime doesn't stop it.

---

## 4. Trial

**Before this pass**
- The paywall assumed 3 days. The timeline read "DAY 2 We remind you / DAY 3 $X billed". "DAY 3 billed" is off by one even for 3 days, because billing comes 72 hours after the start.
- The fine print fell back to 3 days when the store gave none (`trialDays ?? 3`).
- The reminder fired at a fixed 48 hours, only from the paywall's buy button. It never followed a restore or reinstall and never checked notification permission.
- Only Annual was checked for a trial. A month counted as 30 days.
- "Start free trial" showed while prices were still loading, before eligibility was known.

**This pass (P1-10): the app reads the trial from the store**
- The length comes from the store product's free introductory offer: its unit (day, week, month, year) and count. A paid intro offer is not a trial.
- A trial shows for any subscription that has one and the user is eligible, not just Annual. StoreKit decides eligibility. Apple gives an Apple ID the introductory offer once per subscription group.
- The dates are computed. For a 7-day trial started 19 Oct:
  - Row: "1 week free, then billed yearly"
  - Timeline: "TODAY · Everything opens / 25 OCT · We remind you / 26 OCT · $24.99 billed"
  - Fine print: "1 week free, then $24.99 per year. Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends."
- The reminder comes from the entitlement, so it also follows a restore or another device. It fires 24 hours before the trial ends, under the id `trial-end`, and cancels the old `trial-day2`. It is skipped when notifications are off, and the timeline then drops "We remind you".
  - Body: "Your free trial ends tomorrow. $24.99 a year starts then. Cancel any time in Settings."
- The notification budget keeps one slot for it: 56 reminders, 1 timer, 1 trial, 2 drop alerts and 4 spare, within iOS's 64.
- While prices load or fail, the button reads "Subscribe" and is disabled.

So the trial length is now a store setting. Changing it needs no app update.

**Recommendation: 7 days, on Annual only**
- It matches the Plans. 7 Day Lock In (free) and all four paid plans run 7 days, so a trial can cover a full Plan.
- Any 7 days include a Sunday, so the trial always reaches the weekly review, which opens on Sundays.
- The reminder lands on day 7, the day before billing.
- Set in App Store Connect as a "1 week" free trial. The app shows "1 week". If you prefer "7 days", that is a copy change.

**Alternative:** keep 3 days. No code change either way.

**Not on Monthly.** If a trial is ever added to Monthly, the app shows it without a code change.

**Notification permission at trial start (decision 4).** Not in this pass. Without it, someone who never allowed notifications gets no reminder, and the paywall says so by leaving the step out.

---

## 5. Family Sharing

Family Sharing lets the buyer's family group use the same purchase. It is set per product in App Store Connect.

- **It can't be turned off.** Once it is on for a product, Apple doesn't allow switching it off. That is why the recommendation is off at launch.
- **For turning it on:** the audience is 13–25, and many teens are in a family group. One parent's purchase would cover the household.
- **Against:** less revenue per household, and it can't be undone.
- **It is not Ask to Buy.** Ask to Buy is a parent approving a teen's purchase. It happens either way. This pass (P1-11) handles it: "Waiting for approval." / "UNSETLD+ opens here once the purchase is approved."
- If it is turned on later, the app needs no change: the gate reads only the `full_edition` entitlement. Test a shared purchase on a real device first.

---

## 6. Changing prices later: Apple's price-increase consent

- **Monthly and Annual** are auto-renewing subscriptions. When their price goes up, App Store Connect asks whether existing subscribers keep their current price.
  - If you don't keep it, Apple notifies them. Depending on the size of the increase, how often prices have gone up and local law, Apple either just notifies them or requires them to agree before the next renewal. Anyone who doesn't agree isn't renewed.
- **Lifetime** is a one-time purchase. A new price applies only to future buyers. Nobody is charged again.
- **Lowering** any price needs no consent.

So set Annual where it should stay at launch. Raising it later puts existing members through a consent step, and some will lapse.

---

## 7. What UNSETLD+ includes, and never includes

**Includes.** One gate (`entitlementsOf`) reads `src/core/features.ts`.

| | Free | UNSETLD+ |
|---|---|---|
| Plans | 2 (7 Day Lock In, Get Organized) | All 6 |
| Colorways | Black | All 10, in the app and on widgets |
| Swaps a day | 1 | 3. Swaps after the first earn at most what the replaced mission was worth (section 8) |
| Reminders a day | Up to 3 | Up to 10 |

- **When membership lapses:** the colorway goes back to Black, reminders are capped at 3 and swaps at 1. A paid plan already running continues to its end.
- **Paywall order (this pass, P1-11):** plans, colorways, swaps, reminders. The plans line reads "All six plans instead of two".
- **You row (this pass):** "Every plan, all colorways, more swaps."
- **Reminders** are a convenience, not the reason to subscribe. They are listed last.
- **Future value** comes from a deeper Plan library. The candidates, and which can be built from the 66 approved missions, are in `PLANS.md`. The recommended set would add 7 paid plans to the 4 paid now.

**Never includes**

| Never | Where it holds |
|---|---|
| More points, or a way to buy points | Points come only from proof. Swap parity (section 8) closes the one gap |
| Rewards, discounts or status progress | `rewards: 'free'` in `features.ts`. Paywall: "Membership never changes what you earn." |
| Daily missions, proof, points, the streak, progress, the Record | All `free` in `features.ts`. The Record has no gate at all |
| Weekly focus, weekly review, widgets | All `free` |
| AI, generated missions or coaching | Not in the app, and not proposed |
| Uploading proof photos | Photos stay on the phone for everyone |
| A paywall in onboarding | Not in the app, and not proposed |
| A promise of content on a schedule | "and new ones each season" removed this pass (decision 5) |

---

## 8. Swap parity

**The problem.** The "too easy" swap turns a short slot into a focused mission, for example 5 points into 15. With 3 swaps instead of 1, members could earn more in a day. That breaks the rule that UNSETLD+ never increases earning power, and contradicts the paywall's own line.

Points a day on the planner before this pass's day-shape change, averaged over 70 simulated days per row (5 sets of areas × 14 days), with each swap taken for the most points (`audit/plus/swap-points.txt`). The last column is the largest gap between 3 swaps and 1 on any single day:

| Day shape | No swap | 1 swap (free) | 3 swaps (UNSETLD+) | Most extra on one day |
|---|---|---|---|---|
| 15 min, Lock in | 19.7 pts | 25.7 | 31.0 | +10 |
| 30 min, Lock in | 23.5 | 29.5 | 31.0 | +5 |
| 45 min, Lock in | 36.1 | 41.1 | 44.0 | +5 |
| 60 min, Lock in | 37.2 | 42.0 | 44.0 | +5 |
| 60 min, Push me | 46.6 | 52.6 | 56.9 | +15 |

**The rule (this pass, P0-2)**
- The first swap of the day works as before, for everyone.
- Swaps after the first earn at most what the replaced mission was worth. Own missions already follow this rule.
- Free users see no change. The best day with 3 swaps equals the best day with 1.
- The swap choices show the capped value. How points gains the row: "Swaps after the first earn up to what the mission they replace was worth."

**Alternative (decision 6):** cap every swap, including the free one. Stricter, but it changes free users' days too.

---

## 9. What RevenueCat Charts and App Store Connect already report

Pricing can be judged without new analytics.

| Question | Where | Notes |
|---|---|---|
| Downloads, sources, store page conversion, campaigns | App Store Connect, App Analytics | All users |
| Proceeds, paying users, download-to-paid | App Store Connect, App Analytics | All users |
| Cohorts by download date and source | App Store Connect, App Analytics | All users |
| Trial starts and trial conversion | RevenueCat Charts | |
| Renewals and churn | RevenueCat Charts | |
| Which product people pick | RevenueCat Charts, by product | Shows whether Lifetime still takes Annual's buyers |
| Sessions, D1/D7/D28 retention, crashes, deletions | App Store Connect | Only users who opted in to share with developers |
| Which paywall entry point leads to a purchase (Plans lock, colorway, You row, swap limit) | Not covered | Needs `purchase_completed` with `from` in first-party analytics (decision 7). Plan item P1-20 makes the paywall read `from` and wires the event dormant: nothing is recorded until analytics is turned on (PF-5) |
| Retention measured by proof, not by app opens | Not covered | First-party analytics, dormant |

The privacy label must list Purchases › Purchase History, because RevenueCat receives it. `COMPLIANCE.md` and `README.md` include it since the docs pass; the full answers are in `STORE_METADATA.md` §7.

---

## 10. Setup: App Store Connect

1. Create the app record for `com.unsetld.app`. It doesn't exist yet.
2. Complete the Paid Applications agreement, tax and banking. In-app purchases don't work without them.
3. Create one subscription group, "UNSETLD+", so nobody can hold Annual and Monthly at once:
   - Annual: auto-renewing, 1 year, `unsetld_full_annual`, at the approved price.
   - Monthly: auto-renewing, 1 month, `unsetld_full_monthly`, at the approved price.
   - Levels decide when a switch between them takes effect. Ranking Annual above Monthly makes a switch to Annual take effect at once.
4. Create a non-consumable, `unsetld_full_lifetime`, at the approved price (unless Alternative B).
5. Keep these product ids. Until the P2 exact-id mapping, the app tells plans apart by "monthly" or "lifetime" in the id; anything else counts as Annual.
6. Add the introductory offer to Annual only: free trial, "1 week" (or 3 days if decision 2 says so), for new subscribers.
7. Leave Family Sharing off on all three products (decision 3).
8. Set the price in the US. The plan's default is US only at launch (plan decision 25, still a founder decision).
9. Add a display name, description and review screenshot for each product. Submit them with the first app version.
10. Privacy label: add Purchase History (section 9).
11. Create sandbox testers, including one in a family group with Ask to Buy.

---

## 11. Setup: RevenueCat and the build

1. Create the iOS app in RevenueCat for `com.unsetld.app` and connect it to App Store Connect, with App Store Server Notifications pointing at RevenueCat.
2. Import the three products.
3. Create the entitlement `full_edition` and attach all three products. The app checks only this entitlement (`AppConfig.entitlementId`).
4. Create the offering `default` and mark it Current. The app reads `default` first, then Current (`AppConfig.offeringId`).
5. Give it the standard Annual, Monthly and Lifetime packages. The app maps packages by type and skips custom ones, so a custom package won't appear.
6. Put the public iOS SDK key, which starts with `appl_`, in the EAS production environment as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
   - This pass (P0-1): a production build fails unless the key starts with `appl_` (`scripts/check-release-env.mjs`). A `test_` key (RevenueCat's Test Store) is refused in release.
   - This pass: a release build with no usable key shows "UNSETLD+ isn't available right now. Everything free still works." instead of unlocking for free. A free unlock saved by an earlier keyless build is cleared at startup.
7. Test in the sandbox on a real device (launch checklist):
   - buy each product, restore on a second install, cancel and watch the gates return;
   - a trial: the paywall shows the store's length and the timeline dates. The sandbox shortens trials to minutes by default, too short for the reminder 24 hours before the end; its timing is covered by unit tests;
   - Ask to Buy shows "Waiting for approval.";
   - a keyless build doesn't unlock.

---

## 12. After approval: what else changes

These still carry the sample prices or the 3-day trial. Update them to the approved values:

- `src/services/previewProducts.ts`: the sample products (Annual with a 3-day trial, Lifetime $39.99). The comment says they mirror App Store Connect. Only the browser preview and keyless dev builds show them.
- `README.md` "Before launch" §1: the docs pass dropped the 3-day trial ("a free-trial introductory offer") and points here; it still lists Lifetime at the $39.99 sample price.
- `docs/BUILD_PLAN.md:66-75`: kept as history, with notes added in the docs pass (trial from the store, Lifetime recommendation). It also calls the entitlement `premium`; it is `full_edition`.
- `docs/COMPLIANCE.md`, Paywall: the docs pass replaced "3 days free" with the store-read wording; "$24.99/year" and "Save 58%" are the sample annual price and its badge.
- `docs/COPY_DECK.md:289-306`: the 2.x paywall rows (3-day trial, Lifetime $39.99) are history; the trial reminder line is annotated with the current `trial-end` text.

Apart from the sample products, no code change is needed for prices or the trial. The paywall reads both from StoreKit.
