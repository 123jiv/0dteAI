# Launch pass: the plan as executed

The refinement and launch-readiness pass of 19 Oct 2026, on branch `claude/charming-thompson-92eslx` from `acea784`. This is the prioritized plan with what happened to each item: done (with its commit), or pending and why. The last section lists every founder decision the pass needed, with the default that was assumed so the work could go ahead. **Every assumed default is reversible**, and none of them changed a mission, a mission title, a price or anything in App Store Connect.

Related documents:
- [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md): the gate before submission (code gates, ops, App Store Connect, legal review, real-device checks).
- [founder/](founder/): the founder-review documents (PRICING, PLANS, STORE_METADATA, BRAND_LABELS, LOCK_IN_TOGETHER), all "Proposed — not implemented".
- [METRICS.md](METRICS.md): the analytics spec (stream H).
- The live specs, brought up to date in the docs pass: [MISSIONS_SPEC.md](MISSIONS_SPEC.md), [UX_REDESIGN.md](UX_REDESIGN.md), [RECORD.md](RECORD.md), [ACCESS.md](ACCESS.md), [COMPLIANCE.md](COMPLIANCE.md), the README and AGENTS.md.

The brief's non-negotiable product rules held throughout: no AI or generated missions, proof photos private and on the phone, no social features, no buying points, UNSETLD+ never raises earning (now enforced, P0-2), the core loop free, no clothing ads in missions, reminders or widgets, no chance-based rewards, the restrained voice, no new tabs, and none of the 66 approved missions renamed, reworded or deleted.

**Baseline and now.** At `acea784`: 45 test files, 508 tests, store `unsetld-v2` version 7. After the merge (with stream H): 85 test files and 1,104 tests, store version 8 (one bump, `toV8`), app version 3.3.0. `npm run check` passes.

---

## 1. Status at a glance

| Priority | Done | Pending |
|---|---|---|
| P0 launch blockers | 8 of 8 in code and docs | P0-7's publishing and counsel review, and running P0-8's device checks (ops and founder) |
| P1 clearly safe | 19 of 21 | P1-18 (ops), most of P1-19 (held) |
| P1-founder | PF-1 and PF-3 (approved by the orchestrator) | PF-2, PF-4 to PF-10: founder decisions, documented |
| P2 | none, by design | listed in section 5 |

---

## 2. P0: launch blockers

| ID | Item | Status | Commits | Notes |
|---|---|---|---|---|
| Step 0 | Schema for v8: new optional fields, `toV8`, the v33 fixture, `recordPlanFinish` | Done | `575e63b` | The only persist bump. `toV8` can still change until a v8 build reaches TestFlight; after that, v9. |
| P0-1 | Purchases fail closed | Done | `df242bc`, merge `ff055c8` | `purchaseModeFor`: `revenuecat` only on iOS with an `appl_` key (any key in a dev build); `preview` only in dev builds and the browser preview; otherwise `unavailable`, which sells nothing. Preview unlocks are cleared at launch in store builds (`state/premium`). `scripts/check-release-env.mjs` stops a keyless production EAS build. Testers lose free unlocks, by design. |
| P0-2 | Swap parity | Done | `c75eca5`, seam test `feb6c7a` | Every swap after the day's first earns at most what it replaces. Free users see no change; a member's best day equals a free user's on every day shape. |
| P0-3 | User-text safety | Done | `4947e4e`, `b13acbe` | `core/safety.ts`: own-mission titles, the goal and the weekly "Something else" checked on the phone; levels ok / note / block / support; 988 call and text on US phones, findahelpline.com elsewhere. Read-time gates, so old saved text stops steering without being rewritten. Nothing about blocks is counted or sent. |
| P0-4 | 13+ age gate and Declared Age Range | Done | `275823f`, integration `cbefc80` | Year first, the month only on the 13 line; existing buckets; under 13 runs the real local delete, then a permanent block on the install; existing installs asked once. `npx expo install expo-age-range` succeeded (`~57.0.5`); the wrapper asks only on iOS 26+ where `isEligibleForAgeFeaturesAsync()` is true and never accepts the simulated adult. Needs a real-device check (LAUNCH_CHECKLIST D15). |
| P0-5 | Delete data on this phone | Done | `0321feb` (with `add78d9`'s backup gate) | You › YOUR DATA between ACCOUNT and HELP. Keychain first (the only gate), then the store, notifications (the trial reminder stays), photos and caches, widgets; no network call. Signed in: a note and "Delete account first". Account delete and local delete stay separate. |
| P0-6 | One version | Done | `e4b6c4b` | 3.3.0 in `app.json`, `package.json` (and lockfile) and `AppConfig`, with a test; no build number in the repo. Choosing 1.0.0 for the first App Store release is a founder decision (decision 26). Also removed the unused Face ID string. |
| P0-7 | Legal and privacy accuracy | Done in the app and docs; publishing and counsel pending | `c026883` (legal.json and `legal-copy.test.ts`), `f63b114` (COMPLIANCE), `453d14b` (23 Oct recheck: photo paths, unused photos, the Keychain after an app delete) | The policy now describes the Keychain copy's real contents, one-copy photo deletion, "Your answers" naming only answers that still exist, the age gate, Delete data on this phone versus Delete account, RevenueCat purchase records, and claims no usage data. The Terms gained "Age" (13+) and "What you write". **Pending:** publish Privacy, Terms and a support page (all 404 today) and counsel's review (checklist O1, O2, section 4). |
| P0-8 | Real-device release gate | Checklist written; the checks themselves pending | `915ffbb` | Seventeen device checks with a results column (the launch audit's thirteen plus four for this pass). The founder or QA runs them on TestFlight; submission waits for them. |

---

## 3. P1: done in this pass

| ID | Item | Status | Commits | Behavior now |
|---|---|---|---|---|
| P1-1 | Day shapes, model J | Done | `01f74ce` (simulation first), `0a6edbb`, `0b6b842`, `f6277f5`, `24f6223`, merge `33a6241` | One `DAY_SHAPE` table: 15 min one mission (20 at most), 30 and 45 two, 60+ three (Start easy, Lock in) or four (Push me); intensity counts only at 60+. Measured medians 15 / 35 / 45 / 60 / 65 / 90 minutes (before: 30 / 45 / 65 at 15 / 30 / 45). Gates in `day-shape.sim.test.ts`. Plan days keep every Plan mission. Points a day fall with shorter days (15 min −27%, 30 min −8%, 45 min −23%, 60+ −1% to −6%); the perfect-day bonus is unchanged and the most a day earns stays 95. The five regressions the tests caught are fixed. |
| P1-2 | Three-step onboarding | Done | `de5f61c`, `e7592c6`, integration `77e1927` | Name → Age → Areas 01/03 → Time 02/03 → Goal 03/03 → Today. "How hard?" only at 60+. About you left onboarding; "What you're learning" is a You row shown with Skills, Projects or Career; picking School means in school. Answers saved by earlier versions stay on the profile. |
| P1-3 | Reminders after the first proof | Done | `faba592` | A card on Today in the weekly focus card's place; "Get reminded about open missions?"; the timer-start permission ask stays. `toV8` marks it done for users already onboarded. |
| P1-4 | Goal and "Something else" never dead-end | Done | `4947e4e` | "Which of your areas is this about?" (the user's own areas) and "Which area is this about?" (all plannable areas, required before saving). `Profile.goalArea`, `WeeklyFocus.area`. Goal finishes onboarding. |
| P1-5 | Keyword fixes | Done | `4947e4e` | School subjects, promoted, lock in, "spend … time" no longer Money, money terms, TikTok/Instagram/followers; the food row removed. |
| P1-6 | Validator gaps | Done | `b13acbe` | `NEVER` covers plurals and synonyms; zero hits on the 66; every approved mission passes the user-text check. |
| P1-7 | Completion measure | Done | `27cfee9`, merge `113ef50` | `completionIn`: only days with a proof, each at its own size. Stats card (This week, Last 30 days), the review's "13 / 17" and "Days proven", the Record's "42 of 51 missions". `weeklyReview` no longer crashes on a damaged entry. |
| P1-8 | Plan finishes recorded, one moment | Done | `27cfee9` | `record.plansFinished`, never removed; one moment ("7 DAY LOCK IN." / "Seven days. Each one proven." / "Never settle for less."), no points; one full-screen moment a day. |
| P1-9 | No zero on Today | Done | `27cfee9` | "Prove a mission today to start a streak". |
| P1-10 | Trial from the store | Done | `df242bc`, `9d622b7` | `core/trial` reads the intro offer; the paywall row, fine print and dated timeline use it; `trial-end` 24 hours before the store's end, permission-aware, cancels `trial-day2`; the latest membership answer wins. |
| P1-11 | Purchase edge cases, honest membership copy | Done | `df242bc` | Ask to Buy, purchase-received, restore saves the real entitlement, the You row's trial and end dates, plans first on the paywall, "and new ones each season" removed. |
| P1-12 | Plan validator rules | Done | `9854d8d` | Five to fourteen days, no duplicate day lists, overlap under 0.8; every shipped plan finishes in its days on every shape. (No same-area carve-out yet: see PLANS.md, decision 8.) |
| P1-13 | Notification budget | Done | `add78d9`, seam test `feb6c7a` | 56 reminders, the next two drop alerts, `overBudget` clean-up, timer-done never after that day's 4:00 AM. |
| P1-14 | Rollover in the store | Done | `add78d9` | `refreshDay` clears an earlier day's timer and before photo once, with one dialog. |
| P1-15 | Release builds ignore tester state | Done | `add78d9` | Offset 0, timer speed 1, a held snapshot comes back, on load in release builds. |
| P1-16 | Photo hygiene | Done | `add78d9` | One copy kept; memory-only image views; startup orphan and cache sweep with guards. |
| P1-17 | Backup and session hygiene | Done | `add78d9` | Writes wait for the Keychain read; an empty record deletes the item; an orphaned session token is deleted; not onboarded cancels reminders and resets widgets. |
| P1-20 | Analytics pipeline, dormant | Done (dormant) | `952e39f`, `3e00978`, `7339b54` | A 16-event allowlist of categories and small numbers, a queue under its own key `unsetld.metrics.v1` (never in the store or the Keychain copy; removed by Delete data on this phone), one `track()` line at each call site, the paywall reading `from`, the config switch, and docs/METRICS.md. Nothing is recorded or sent: there is no consent UI, `settings.shareUsage` is null and only PF-5 can turn it on. The privacy policy and label claim no collection, which stays true until PF-5. |
| P1-21 | Docs pass | Done | `f63b114`, `8651eca`, `915ffbb`, `e6b33cc` (rollover, one-copy photos, tester state) | Specs, README, AGENTS, COMPLIANCE brought to the merged code; the founder documents copied into `docs/founder/` with their contradictions fixed; this document. |

### P1: pending

| ID | Item | Status | Why |
|---|---|---|---|
| P1-18 | Time check endpoint | Pending (ops, then one code line) | Kept for ops by the decisions file. Deploy `/api/app/time` (204, `Cache-Control: no-store`), then point `timeCheckUrl` at it. Until then the check reads an edge-cached `Date` and a day may never record as verified. Not a blocker while rewards are off (checklist O4, R8). |
| P1-19 | Brand code consolidation | Partly done | Only the `expo-secure-store` `faceIDPermission: false` fix shipped (`e4b6c4b`), as the decisions file allowed. The single barcode, `core/serial.ts`, `appStoreName` and the marketing line wait for PF-4 and PF-6. |
| — | Mission library audit (`founder/MISSION_LIBRARY_AUDIT.md`, brief Priority 7) | Done (`f9fd3b5`) | Repetition by area at every time choice and 30 proposals for review; nothing goes into `missions.json` without approval. |

---

## 4. P1-founder

| ID | Item | Status | Where |
|---|---|---|---|
| PF-1 | Restore "Improve my routine", "Get my space in order", "Learn a skill" | Done, approved by the orchestrator (assumed default, reversible: remove the three ids from `FOCUS.order`) | `4947e4e` |
| PF-2 | New Plans and "About N min a day" | Not built. Founder decision | founder/PLANS.md |
| PF-3 | 8th achievement "First plan" | Done, approved by the orchestrator (assumed default, reversible: one row in `MILESTONES_30`) | `27cfee9` |
| PF-4 | Brand labels on five surfaces | Not built. Founder decision | founder/BRAND_LABELS.md |
| PF-5 | Turn analytics on (consent, policy text, label, manifest, endpoint) | Not built. Founder decision | METRICS.md, founder/STORE_METADATA.md §7.2 |
| PF-6 | App Store metadata | Not changed. Founder decision | founder/STORE_METADATA.md |
| PF-7 | Announce a reinstall restore with "Start fresh instead" | Not built. Founder decision (depends on P0-5, which shipped) | plan decision 22 |
| PF-8 | Ask for notification permission right after a trial starts | Not built. Founder decision | founder/PRICING.md decision 4 |
| PF-9 | Mission library additions | None. Founder review only | founder/MISSION_LIBRARY_AUDIT.md |
| PF-10 | Prices, trial length, Family Sharing in App Store Connect and RevenueCat | Nothing set. Founder decision | founder/PRICING.md |

---

## 5. P2: later

Kept out of this pass on purpose (from the plan, unchanged):
- **Planner:** "ABOUT 35 MIN" on Today's header; capping "Too easy" choices near the day's budget; lifting 60+ Start easy; one `dayShape()` source the copy reads (partly there: the copy is tested against `DAY_SHAPE`).
- **Onboarding and age:** an age-check date or an "Age range" row in You; re-asking Apple's range in regulated regions; removing dead About-you code and fields (with a migration); a tester tool to reset the age check.
- **Goal:** example chips ordered by the user's areas with Discipline and Organization examples; "driving test", "college apps" and TikTok title alignment; a "Missions lean toward X" confirmation.
- **Safety:** leetspeak and Spanish lists; clearing old unsafe saved goals; an anonymous count of blocks by category (only with PF-5, and the decision says never).
- **Progress:** "Finished 18 Oct" on plan cards; a Plan share card; one perfect-day helper; "x of y" on Today's weekly card.
- **UNSETLD+:** a billing-issue row; plan type by exact product id; a path to Lifetime for members; Interview Week, Deep Work Week, Money Reset and Resume Week once new missions exist.
- **Data:** deleting a single proof; compacting the Keychain copy and device-only items (decision 23); retention at the 4:00 AM rollover; retrying a failed `lastWritten`; a proof photo left by someone who has never proven a mission (the startup sweep skips an empty record, so it stays until the first proof or Delete data); the Sign in with Apple credential-state check (before rewards); finishing an account delete without re-uploading days; a moment re-showing after a restore; removing `unsetld-state-v1` at startup; `legal.json` in `npm run validate`.
- **Analytics:** the endpoint and queries, TestFlight tagging, MetricKit, notification, widget and restore events.
- **Brand:** a serial on the Streak widget, a season mark, "UNSETLD" capitalization in permission strings, an `unsetld.com/app` page, a review of `NSLocalNetworkUsageDescription`.
- **Rewards (all gated on rewards turning on):** the $25 cap and a real redeem URL, Apple token revocation and the server-to-server endpoint, drop alerts (LAUNCH_CHECKLIST section 7).
- **Lock in with a friend:** proposal only (founder/LOCK_IN_TOGETHER.md), after the rewards backend.

---

## 6. Founder decisions and the defaults assumed

Each row is a decision the founder still owns. "In the build" means the default is what the merged code does now; "proposed" means nothing was changed and the default is only a recommendation. **Every row is an assumed default — reversible**; the last column says how.

| # | Decision | Assumed default — reversible | State | To reverse |
|---|---|---|---|---|
| 1 | The 30-minute day | Model J: two missions every day (one short, one focused) | In the build | Swap the 30 row of `DAY_SHAPE` for model I (alternate one focused with two short) and rebaseline the sim |
| 2 | Points a day under the new shapes | Accept the drop (15 min −27%, 30 −8%, 45 −23%); keep +15 perfect-day bonus at every shape; max 95 | In the build | Change the day shapes (decision 1) or the perfect-day bonus in `rules.json`; mission points stay as approved |
| 3 | New rotation and coverage targets | The model J targets recorded in `rotation.test.ts` and `day-shape.sim.test.ts` | In the build | Edit the targets; they're tests, not behavior |
| 4 | Plans and time | Plans run on their own time; every Plan mission kept; others fill only while 10 minutes are left | In the build ("About N min a day" on cards is PF-2, not built) | One rule in `generatePlan` |
| 5 | Intensity and the default time | "How hard?" only at 60+; intensity ignored below an hour; 45 preselected | In the build | `PaceScreen` and `DAY_SHAPE` |
| 6 | About you | Dropped from onboarding; "What you're learning" in You; K1's skill not filled from goal words | In the build | Restore the screen in the flow (the fields were kept) |
| 7 | Age gate | Year first, month on the 13 line; 13–15 / 16–17 / 18+; under 13 a permanent block on the install plus a full local wipe; existing installs asked once | In the build | `core/age`, `ageGate.ts` |
| 8 | Declared Age Range (legal) | Ask only where `isEligibleForAgeFeaturesAsync()` is true; a decline or no service falls back to the year question, pending counsel; rewards off for everyone until counsel rules | In the build | `services/ageRange.ts` |
| 9 | Notifications | Reminders card after the first proof, 3 a day; keep the ask at timer start; the ask after a trial starts (PF-8) not built | In the build (PF-8 proposed) | `RemindersCard`, `shouldOfferReminders` |
| 10 | Goal fallback | Offer only the user's own areas; "Something else" needs an area to save; copy "Which of your areas is this about?", "{Area} isn't one of your areas.", "Which area is this about?" | In the build | `core/areaChoice`, copy |
| 11 | Weekly focus | Restore the three options before "Something else" (PF-1) | In the build | `FOCUS.order` |
| 12 | User-text safety | 988 call and text on US phones, findahelpline.com elsewhere (counsel reviews); weight steering kept with a note; food steering removed; fasting and calorie tracking blocked for everyone; adult category included; "quit X" allowed (goes to the area question); phone numbers and emails allowed in own missions; never send analytics about blocks | In the build | `core/safety.ts`, `copy/safety.ts` |
| 13 | Completion | Count only days with a proof; show "x of y" and the percent; the Stats card with "Last 30 days", the review's "13 / 17" and "Days proven", the Record's "42 of 51 missions" | In the build | `core/progress`, copy |
| 14 | Plan moment | "7 DAY LOCK IN." / "Seven days. Each one proven." / "Never settle for less."; one per finish; it replaces that day's milestones; one full-screen moment a day | In the build | `core/moments`, `copy/programs` |
| 15 | First-plan achievement | Yes, the 8th, after 7 days (PF-3) | In the build | `MILESTONES_30` |
| 16 | Swap parity | Swaps after the first earn at most what they replace; free users unchanged | In the build | `swapCap` (alternative: cap every swap) |
| 17 | Prices | Monthly $4.99, Annual $24.99, Lifetime $69.99; Family Sharing off at launch | Proposed (founder/PRICING.md) | App Store Connect only |
| 18 | Trial | 7 days, Annual only | Proposed; the app reads any length from the store | App Store Connect only |
| 19 | Paywall promise | "and new ones each season" removed | In the build | Copy, only with a committed schedule |
| 20 | New Plans | Ship Exam Week, Assignment Catch-Up, Back Into Training, Portfolio Week, Launch Week, Skill Week, 14 Day Lock In (all paid); hold Money Reset, Resume Week, Interview Week, Creator Week; reject Ship Something, Sunday Reset, Deep Work Week | Proposed (founder/PLANS.md); not added | `programs.json`, plus the overlap carve-out for 14 Day Lock In |
| 21 | Mission library additions | Approve none until the library audit is reviewed | Proposed; nothing added | `scripts/missions/library.py`, after approval |
| 22 | Local delete | Signed in: a note and "Delete account first"; keep the trial reminder; YOUR DATA between Account and Help; announce a reinstall restore with "Start fresh instead" (PF-7, not built) | In the build (PF-7 proposed) | `DeleteDataScreen`, `copy/data.ts` |
| 23 | Keychain copy | Keep its contents and the default accessibility for launch; describe them accurately in the policy; compaction is P2 | In the build (policy updated) | `services/backup.ts` and the policy together |
| 24 | Analytics | No install ID; include `purchase_completed`; 13-month retention; ships dormant; turned on only with the endpoint, policy text, label and manifest; consent switch on the Goal step and in You › PRIVACY, on by default for 18+ and off for 13–17 | Dormant pipeline in the build (P1-20); consent UI not built | METRICS.md; PF-5 |
| 25 | Store territories | US only at launch | Proposed | App Store Connect |
| 26 | App version | The code says 3.3.0 (the decisions file); 1.0.0 recommended for the first App Store release if no build was ever uploaded under `com.unsetld.app` | 3.3.0 in the build | Three files and the lockfile; `version.test.ts` keeps them equal |
| 27 | Store metadata | "UNSETLD: Daily Missions"; "Do the mission. Prove it."; keyword set 1; the after-shapes promo text; a listing without rewards; the Record grid instead of a Rewards screenshot | Proposed (founder/STORE_METADATA.md); `appStoreName` still "Daily Discipline" | App Store Connect, then `AppConfig.appStoreName` |
| 28 | Brand labels | Labels on five surfaces, "No." meaning a day on record; no season or collection mark; the share card with the 28-day barcode and the colorway name, the red bar for today | Proposed (founder/BRAND_LABELS.md) | PF-4 |
| 29 | Rewards at launch | Off; sign-in, the account deletion server, drops and the $25 cap out of the launch scope | In the build (`accessEnabled` false on iOS) | `config.json`, only through a reviewed update |
| 30 | Legal pages and infrastructure | Publish Privacy, Terms and Support at the configured `/pages/app-*` URLs; deploy `/api/app/time`, `config.json` and `drops.json` (`accessEnabled: false`) before the launch build; counsel reviews privacy, terms, rewards terms, minors, state age laws and the 988 copy | Pending (ops, counsel) | — |
| 31 | Notification budget | 56 reminders queued (5 days ahead at 10 a day); drop alerts capped at the next 2 | In the build | `core/reminders.ts` constants |
| 32 | Today's zero streak | "Prove a mission today to start a streak" | In the build | `copy/home.ts` |
| 33 | Lock in with a friend | P2, after the rewards backend; free; anonymous tokens; the friend's name on the device only; status live; 13+ unless counsel says 16+; renamed (proposed "Two of you") | Proposed (founder/LOCK_IN_TOGETHER.md) | — |
| 34 | The $25 cap | Decide before rewards turn on; the leading option is fixed-amount codes; ACCESS.md corrected now | Pending; ACCESS.md corrected | ACCESS.md, Minting codes |

The founder documents add their own narrower decision tables, each with a recommended default: PRICING.md (7), PLANS.md (12), STORE_METADATA.md (11), BRAND_LABELS.md and LOCK_IN_TOGETHER.md. None of those defaults is in the build.

---

## 7. Behavior changes users will notice

- New installs answer a birth year before anything else; installs from before the gate answer it once. Under 13, the app deletes what was entered and stays closed.
- Onboarding is three steps; no About you and no notification ask.
- The day has as many missions as the time chosen: one at 15 minutes, two at 30 or 45. Points a day are lower at 15 and 45 minutes.
- A goal or a typed weekly focus that matches none of the user's areas asks which area it's about.
- Some words in a goal, an own mission or a typed focus are refused, with one calm line; self-harm text shows where to get help.
- A member's second and third swaps can't earn more than the mission they replace.
- Finishing a Plan gets one quiet moment and goes on the Record; Stats and the weekly review show completion.
- Today offers reminders after the first proof, and never shows "0 day streak".
- You has Delete data on this phone.
- The paywall shows the trial length the store sells, with dates, and a build without a proper key sells nothing instead of unlocking.

---

## 8. Review fixes (23 Oct 2026)

Four adversarial reviews (product rules, migrations, UX and copy, correctness) ran on the merged pass. Every high and medium finding is fixed, each with a regression test:

- **User-text safety:** self-harm methods, ideation and recovery statements get the support line (checked before the harmless-phrase strip; soft hyphens, "un-alive" and digit spellings handled); body and progress photos, shape goals ("get shredded", "six pack") and numeric dieting, fasting, sleep and weight-cutting phrasing are blocked as own missions and noted as goals; every term on the validator's never list fails as an own mission. Ordinary teen goals still pass (238 of 238; 5 of 176 edge cases flagged). "Quit porn" stays blocked pending a founder decision.
- **Members-only Plans are earning-neutral:** a day running a Plan that needs UNSETLD+ is capped at what the same user's day earns without it (`capForPlan`); a members-only Plan week never beats the best free option (576 of 576 setups). A capped Plan mission can show fewer points, even +0. Free Plans are unchanged.
- **Planner:** on a Plan day the focus slot stays in the focus area; one-area Fitness days stay on time (a near-twin may keep the day on time on Push me only); a third mission from one area only on Push me when nothing else fits (at most 0.3% of Push me days).
- **UX and accessibility:** the age year is confirmed before an under-13 delete; reminder copy matches when they stop; Plan cards say when a day runs longer than the user's time; the 30-minute line reads "About 30 to 40 minutes"; examples hide under the crisis line; the year wheel snaps with 44pt rows; time choices read with their lines in VoiceOver; "days proven" everywhere; the Plan moment is read once.
- **Migrations and data:** a running timer at tester speed is cleared on release load; a Plan finished during time travel goes back to its real days; the under-13 block survives an interrupted delete, with photos deleted before the reset; trial end dates at month end are correct.

Final checks: `tsc`, `expo lint`, `vitest` (92 files, 1,175 tests), `npm run validate`, the full day-shape simulation and the full plan-earnings check all pass.

