# UNSETLD 3.0: Missions (supersedes TODAY_SPEC.md and the reader/standard parts of DESIGN_SPEC.md)

Tokens, type, colorways, the walker, Access (early access / patch / 365 piece), the paywall layout, accounts and purchases from DESIGN_SPEC.md still apply. Where this file disagrees with an older spec, this file wins.

## 0. Audit (9 Oct 2026)

**What existed (2.2):** Expo SDK 57 / React Native / TypeScript; one native stack (React Navigation), zustand store persisted locally, Keychain backup of the record; a browser preview build. Onboarding: name → first line (quote) → three "standard" rules → chapters → reminders → widget → paywall. Today: a daily quote on top, a night check, then "today's work" = the 3 rules + 1 daily task + up to 3 own tasks. Task screen with why / how / proof, in-app camera (library on web), 10 points per proven task (max 4/day), discount codes at 600/1000 points (one per collection), "days on record" (opening the app) with a barcode and an Access road (early access day 7, patch day 90, 365 piece), milestone letters, colorways, reminders, iOS widgets (Line / Record / Standard), Full Edition (RevenueCat), Sign in with Apple and account deletion, tester tools, 33 unit tests, a content validator.

**Worth keeping:** camera capture + local-only photos + the proof stamp; points → codes plumbing and the redeem/claim backend contract; Access milestones, letters and drops; accounts; purchases; reminders and the 4 AM day boundary; widgets infrastructure; colorways; the editorial look (Cormorant + Inter + Plex Mono, black / bone / stone); tests, validator, preview build.

**Poorly structured for the product:** the experience was built around quotes (589 lines, saved lines, your lines, a quote share card, the line at the top of Today); tasks were bare sentences with no title, points, difficulty, time, proof type or requirements; everyone got the same three "rules" (the source of "Do the hard thing first", "Finish what I start"); one daily task, no selection logic beyond a shuffle; no replacement, no timers, no before/after; streak = opening the app; no levels, no weekly review, no programs; reward tiers hardcoded in points.json.

**What changes in 3.0:** missions are the product. Tracks + optional personalization + intensity in onboarding; a mission library with a real data model; 3 missions a day chosen per user with a free swap; a mission screen with PROVE IT; four proof types incl. an in-app focus timer and before/after; on-device proof checks behind a verifier interface (no fake AI); EXIF stripped, fingerprints against reuse, automatic photo expiry; points per mission + perfect-day bonus; a streak that means "I proved one mission today" with Off Days; levels per track and milestones; a weekly review; programs; reward tiers configurable from unsetld.com. The quote library, the standard rules, the night check, saved lines, your lines and the line share card are retired.

## 1. The loop

Choose what you want to improve → get 3 realistic missions each day → do it in real life → PROVE IT with the camera → earn points → keep the streak → see the levels and the week add up → trade points for UNSETLD rewards.

"Never settle for less." appears only at meaningful moments: onboarding (the name page), the weekly review, milestones and reward unlocks. Nowhere else.

## 2. Tracks (src/content/tracks.json)

| id | name | short |
|---|---|---|
| focus | FOCUS & DISCIPLINE | Focus |
| fitness | FITNESS & ENERGY | Fitness |
| school | SCHOOL & LEARNING | School |
| money | MONEY & CAREER | Money |
| skills | SKILLS & PROJECTS | Skills |
| reset | LIFE RESET | Reset |
| mindset | CONFIDENCE & MINDSET | Mindset |

## 3. Onboarding (replaces O2–O4)

1. **Name** (unchanged): "unsettled", "Never settle for less." → Begin.
2. **Tracks** — title `What are you trying to improve right now?`, body `Pick up to three.` 7 tiles (2 columns; last row 1). Tile: track name (label style) + scope (small, stone), 1px rule border, selected = bone border + filled square. Counter `0 OF 3`. Button `Continue` (disabled until 1+).
3. **About you** (optional) — title `A few quick ones.`, body `So the missions fit your life. Skip anything.` Rows of chip pairs: `In school?` Yes / No · `Working?` Yes / No · `Gym access?` Yes / No · `Building something?` (a business, a brand, a channel, art, an app) Yes / No · `Age` 13–15 / 16–17 / 18+. Buttons: `Continue`, text button `Skip`.
4. **Pace** — title `How much time a day?` chips: `5–15 min` / `15–30 min` / `30–60 min` / `60+ min`. Then `How hard?` three cards: **START EASY** `Shorter missions. Build the habit first.` · **LOCK IN** `A quick win, real progress and one challenge a day.` · **PUSH ME** `Longer, harder missions. Four a day.` Button `Continue`.
5. **Reminders** (DayScreen, unchanged except the night check row is removed; the last reminder is the evening nudge).
6. **Widget** (unchanged step).
7. **Your first missions** — after the paywall, Home opens with today's plan already built.

Edit mode: Settings → Your plan opens the same Tracks / About you / Pace screens with `Save` (and replans today if nothing was done or swapped yet).

## 4. Missions

Data model: `Mission` in src/core/types.ts; library in src/content/missions.json (validated by scripts/validate-content.mjs; brief in docs/research/2026-10-09-missions-brief.md).

Daily plan (src/core/missions.ts):
- Slots by intensity: START EASY = quick, quick, progress · LOCK IN = quick, progress, challenge · PUSH ME = quick, progress, challenge, challenge.
- Points by slot: quick 10, progress 15, challenge 25. Perfect day (every mission in the plan proven): +15 bonus.
- Tracks rotate across slots by day; the week's priority track (from the weekly review) takes the progress slot on 2 of 3 days.
- Filters: requirements (school / work / gym / project / age16 / age18) against the profile (unknown allows what a teen could do; gym and work need a yes; 18+ needs 18+), cooldown after a mission was done, one-off missions once, not shown again for 4 days (anchors sooner), skipped missions away 21 days (90 after 3 skips).
- Time: the day fits the chosen time where possible; for 5–15 min users slots get easier rather than longer.
- Programs: an active program's missions for its current day are placed first.
- The plan is generated once per day and stored; swaps are stored too.
- **Swap**: `↻ Swap` on an unproven mission card. 1 free swap a day, 3 with Full Edition. The swapped mission is counted as a skip.

## 5. Home (root screen, replaces Today)

Colorway background as before. Top to bottom:
- Row: label `UNSETLD` (left), mono `DAY 012` (= days with a proven mission, padded) (right).
- Stats row: `12` + label `DAY STREAK` (left) · `340` + label `POINTS` (right, tappable → Rewards). Numbers in Cormorant 44. Under the streak, when banked: mono `1 OFF DAY BANKED`.
- Next reward line (mono, secondary): `150 POINTS TO 10% OFF` (hidden when Access is off).
- Section header: label `TODAY` + mono `1 / 3 COMPLETE`, a 2px progress bar (bone on rule).
- Status line (body, secondary): 0 done `Three missions. Finish them.` · some done `2 left. Keep going.` · all done `Perfect day. That's how it's done.` (for 4-mission days the numbers follow).
- Program banner if one is active: label `7 DAY LOCK IN · DAY 3 OF 7`.
- **Mission cards** (one per planned mission): label `QUICK WIN` / `PROGRESS` / `CHALLENGE` + track short name; title in Cormorant 26; meta row in mono: `25 MIN · +15 PTS` (+ `TIMER` / `BEFORE + AFTER` badges); right side: primary small button `START` (or `TIMER 12:04` while a timer runs, `AFTER PHOTO` when a before photo is waiting). Proven: title in secondary, a 28×35 photo thumbnail, mono `PROVEN 9:47 AM · +15`. Under unproven cards: text button `↻ Swap` (`1 swap left today` / `No swaps left today`).
- When everything is proven: a quiet line `Come back tomorrow for three more.`
- **Weekly review card** (Sunday, Monday, Tuesday until closed): label `YOUR WEEK` + `14 missions · 4h 20m focused` + `See the week →`.
- Bottom bar (fixed, solid colorway background): `Progress` (walker), `Programs`, `Rewards`; colorway icon stays.
- Day 3 Access note as before (under the missions).
- No quote anywhere.

## 6. Mission screen (full-screen modal; replaces Task)

Stages:
1. **Detail** — close X, mono `DAY 012`. Label `QUICK WIN · FOCUS`. Title (title.xl). Meta row: `25 MIN · +15 POINTS`. Sections with labels: `WHY THIS MATTERS` (body), `HOW TO DO IT` (numbered steps 01–04, body), `PROOF REQUIRED` (body + proof-type line: `One photo` / `A photo of the result` / `Before and after photos` / `25-minute timer, then a photo`). Big primary button `PROVE IT` (or `START THE 25:00 TIMER` for TIMER_AND_PHOTO, `TAKE THE BEFORE PHOTO` for BEFORE_AFTER). Text button `Swap this mission` when swaps are left.
2. **Timer** (TIMER_AND_PHOTO) — huge mono countdown `24:59`, the mission title, `Phone down. Come back when it rings.` Buttons: `Pause` / `Resume`, text button `End timer` (asks to confirm; ending early earns nothing). The timer keeps running when the app is closed (wall clock); a local notification fires at zero: `25:00 done. Take the proof photo.` At zero: `Time. Take the proof photo.` → camera.
3. **Before taken** (BEFORE_AFTER) — the before photo small, `Before saved. Now do it.` `TAKE THE AFTER PHOTO`. The before photo waits even if the app closes (store.pendingBefore).
4. **Review** — the photo(s) at 4:5 with the proof stamp; `Submit proof` (primary), `Retake`.
5. **Checking** — `Checking proof…` (the on-device checks; instant).
6. **Done** — `PROVEN.` (title.xl), the mission title, a count-up `+15 POINTS` (mono.l, 600 ms), `340 → 355 POINTS`, a thin bar and `245 POINTS TO 10% OFF` (or `10% OFF IS READY` → Rewards), streak line (`Day 12. Streak's alive.` the first mission of the day / `Streak: 12 days`), perfect day block when the plan is complete: label `PERFECT DAY` `+15 BONUS`. Haptic on the count-up. Button `Done`.
   - **Rejected** — `Not counted.` + each failed check's note (e.g. `Take the photo again. Proof has to be from the last 30 minutes.`) + `Try again`.

Copy never says a photo was "verified by AI". Wording: `Proof saved.` / `Checked on this phone: taken just now, timer finished, new photo.`

## 7. Proof (services/proof.ts, services/verify.ts, core/verify.ts)

- Proof types: PHOTO, PHOTO_AFTER, BEFORE_AFTER, TIMER_AND_PHOTO.
- Capture: iOS opens the camera only (no library). The browser preview picks a file and says so.
- Saving: resized to 1600 px and re-encoded (drops EXIF and location), stored in the app's own folder, fingerprinted.
- On-device checks: right photos present, taken in the last 30 minutes, before → after at least 2 minutes apart, timer finished and photo after it, photo never used before (fingerprints of all past proofs).
- `TaskProofVerifier` interface for a future vision check (server-side). None is connected; results say `on-device`.
- Retention: photos are cleared after 30 days by default (Settings → Proof photos: 30 days / 1 year / Keep). The mission and its fingerprint stay. Photos never leave the phone.
- Privacy: missions never require faces, bodies, other people, IDs, addresses, bank info, grades, medical info, private conversations, a bedroom specifically, or location. No facial recognition. No public feed.

## 8. Streak, progress, milestones (Progress screen; replaces Record)

- Streak = days in a row with at least one proven mission (today counts once proven; until then yesterday's streak stands).
- **Off Days**: one earned every 7 active days, up to 2 banked; a missed day uses one automatically. Copy: `OFF DAY` · `An Off Day covered Tuesday. Streak's still going.` · Settings/Progress explain: `Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.`
- Progress screen: title `Progress`; stats grid: `STREAK` / `LONGEST` / `MISSIONS` / `POINTS` / `FOCUSED` (4h 20m) / `THIS WEEK` (completion %); the active-days barcode (existing component, now mission days); **Levels**: each chosen track first, then the rest: `FOCUS` `LEVEL 4` thin bar `60 / 150`; **Milestones**: First mission, First 10 missions, First perfect day, 7 days, 30 missions, 100 missions, 30-day streak (reached = bone square + date; not yet = outline + progress `12 / 30`); **This week** block (same numbers as the weekly review) with `See the week →`; Proof gallery link; Settings link (top right). Access (early access / patch / 365 piece) lives on Rewards; its day counts are active days.
- Milestone reached → a letter-style moment on Home (once): `30 MISSIONS.` `Never settle for less.` `Close`.

## 9. Weekly review (WeeklyReview screen)

`THIS WEEK` (label) + dates. Big numbers: missions completed, focused time, points earned, perfect days. `Strongest area: Skills & Projects`. If one was left out: `Didn't get to: Fitness.` (never shaming). `NEXT WEEK` — `Pick one area to lean on.` chips of the user's tracks → sets profile.priority. Footer: `Never settle for less.` Button `Done`.

## 10. Rewards

- Tiers from content/rewards.json, replaced by unsetld.com's config when it sends `rewards` (id, title, detail, type, points, percent, maxOff, active, availableFrom/Until, codeValidDays, inventory, perCollection).
- Rewards screen: title `Rewards`; balance (Cormorant 56) `340 POINTS`; next reward block: `450 / 600` mono, bar, `150 POINTS LEFT`, the reward title `10% OFF`; tier list: title, detail, points, status (`READY` / `150 TO GO` / `USED THIS COLLECTION` / `NOT AVAILABLE`); tapping a ready tier → confirm → account (if needed) → redeem → code + `Use it at unsetld.com` + expiry; Your codes list; Access (early access / patch / 365 piece) section moved here from Record; terms link. Points are earned only by proven missions; Full Edition doesn't change them.
- On the done screen and Home, rewards are a quiet line, never a popup.

## 11. Programs

Optional multi-day runs (content/programs.json): id, title, short, days, tracks, free, plan (mission ids per program day). Programs screen: list with title, days, tracks, `FREE` / `FULL EDITION`, `Start`; active program at the top with `DAY 3 OF 7`, the next day's missions, `Leave program`. A program day moves on once one of its missions is proven, so missing a day never fails it. Only one program at a time. Free: 7 Day Lock In and Get Organized; the rest are Full Edition.

## 12. Full Edition

| | Free | Full Edition |
|---|---|---|
| Daily missions, proof, points, streak, levels, weekly review, rewards | Yes | Yes |
| Swaps | 1 a day | 3 a day |
| Programs | 2 | All |
| Colorways | Black | All ten |
| Reminders | Up to 3 a day | Up to 10 a day |

Paywall rows: `PROGRAMS — Every program, and new ones each season` · `SWAPS — Three a day` · `COLORWAYS — All ten, in the app and on your widgets` · `REMINDERS — Up to ten a day`. Description: `More programs, more swaps, every colorway.`

## 13. Notifications and widgets

- Reminders: first of the day `Today: 25-Minute Lock In, 10 Pages, Make the Bed.`; later ones name what's left (`2 missions left. 10 Pages takes 15 minutes.`) and are dropped when everything is proven; the evening one `Last call: 1 mission left to keep the streak.` (only when nothing is proven yet today). Timer end: `25:00 done. Take the proof photo.` The night check and its Held / Not today actions are removed.
- Widgets: Line → **Next mission** (title, track, minutes, points); Standard → **Today** (the day's missions with done squares, `1 / 3`); Record → **Streak** (streak, points, active-days barcode).

## 14. Removed

Quote library and everything on it (line on Today, line share card, saved lines, your lines, strong language, colorway preview lines become mission titles), the three standard rules and the standard screen, the night check, the old daily task library (tasks.json), chapters (replaced by tracks), own tasks (replaced by swaps and programs).

## 15. Build notes (what changed during the build, 9 Oct 2026)

Where these notes and the sections above differ, the notes describe the app as built.

- **Library: 313 missions** in `src/content/missions.json`: focus, fitness, school, money, skills and reset 45 each, mindset 43. By slot: 99 quick wins, 136 progress, 78 challenges. By proof: 167 PHOTO, 58 PHOTO_AFTER, 58 TIMER_AND_PHOTO, 30 BEFORE_AFTER. 16 are one-offs (`repeatable: false`) and 31 are anchors. `npm run validate` checks every field, the voice and the teen-safety rules.
- **Groups.** Missions that overlap share a `group` (7 groups, 20 missions: `deep-block`, `fitness-test`, `laundry`, `phone-setup`, `resume`, `room-reset`, `tomorrow-ready`). A day never holds two from one group: the planner, swaps and program days all respect it, and the validator rejects a program day with two.
- **Weights.** `weight` (0.1–3, default 1) sets how often the planner picks a mission. The 18 situational missions (the night before a test, asking for a raise, an apology) are 0.5. On top of it, a mission never planned before counts 1.5×, an anchor 1.4×, and each skip divides its weight by one more.
- **Short days.** With 5–15 minutes a day the plan has at most three missions (Push me drops its second challenge), slots that don't fit get easier, and a track's own quick wins come before another track's, so every chosen track still gets its turn. The Pace screen says so: `With 5–15 minutes, you get up to three short missions a day, whatever you pick.`
- **Six programs** (`src/content/programs.json`): 7 Day Lock In (7 days, Focus, free), Get Organized (5 days, Reset, free), School Reset (7 days, School and Focus), Build Something (7 days, Skills), Fitness Base (7 days, Fitness), Project Mode (10 days, Skills and Money). Program days list 1–2 missions and never use missions that need work, a gym or an age; a program mission takes the slot that matches its own, or the first free one.
- **Off Days** (`src/core/streak.ts`, `rules.json`: `offDayEvery` 7, `offDayMax` 2): one is earned on every 7th active day, up to 2 banked, and a missed day uses one automatically. A covered day keeps the streak going but doesn't add to it. Home shows `1 OFF DAY BANKED`, Progress explains them and names the covered day, Settings shows how many are banked. Off Days cover the streak only; Access counts proven days.
- **Proof retention** (Settings → Proof photos: `30 days` / `1 year` / `Keep`; default from `rules.json` `proofRetentionDays`, 30). Expired photos are deleted from the phone at launch and each time the app comes back to the foreground; the mission, its points and its fingerprint stay. Choosing a shorter time asks first (`Delete 3 older photos?`). The proof gallery opens from Progress and from Settings under Proof photos.
- **Rewards config.** unsetld.com's `config.json` may send `rewards`; each entry is checked on the phone, bad entries and repeated ids are dropped, and if none is valid the built-in tiers stay. The redeem body is `{ rewardId, points, type, percent }` and its errors are `used`, `short` and `unavailable` ([ACCESS.md](ACCESS.md)).
- **Access days** are days with a proven mission, plus days already on record from 2.x. The 2.x balance (10 points a proven task, at most 4 a day, minus the codes already taken) carries over as an opening balance, and a 2.x code from the current collection uses up the tier with the same percent (`src/core/legacy.ts`, `src/core/rewards.ts`).
- **Tester tools** (Progress → Settings → Tester tools; dev builds and the browser preview only, never a release build): the app's idea of today, streak, points and active days at the top; flags for Full Edition, timers 60× faster and Access enabled; *Prove today's missions* (skips the camera, accepted on the phone with a placeholder photo); *Add 20 days of proven missions*; time travel (next day, jump 6 / 23 / 60 days proving one mission a day, disappear for 15 days, back to the real today with the record from before the first jump); restart onboarding; clear the record. Notifications keep the real clock.
