# UNSETLD 3.0: Missions (supersedes TODAY_SPEC.md and the reader/standard parts of DESIGN_SPEC.md)

Tokens, type, colorways, the walker, Access (early access / patch / 365 piece), the paywall layout, accounts and purchases from DESIGN_SPEC.md still apply. Where this file disagrees with an older spec, this file wins.

## 0. Audit and redirect (9 Oct 2026)

**What existed (2.2):** Expo SDK 57 / React Native / TypeScript; one native stack (React Navigation), zustand store persisted locally, Keychain backup of the record; a browser preview build. Onboarding: name → first line (quote) → three "standard" rules → chapters → reminders → widget → paywall. Today: a daily quote on top, a night check, then "today's work" = the 3 rules + 1 daily task + up to 3 own tasks. Task screen with why / how / proof, in-app camera (library on web), 10 points per proven task (max 4/day), discount codes at 600/1000 points (one per collection), "days on record" (opening the app) with a barcode and an Access road (early access day 7, patch day 90, 365 piece), milestone letters, colorways, reminders, iOS widgets (Line / Record / Standard), Full Edition (RevenueCat), Sign in with Apple and account deletion, tester tools, 33 unit tests, a content validator.

**Worth keeping:** camera capture + local-only photos + the proof stamp; points → codes plumbing and the redeem/claim backend contract; Access milestones, letters and drops; accounts; purchases; reminders and the 4 AM day boundary; widgets infrastructure; colorways; the editorial look (Cormorant + Inter + Plex Mono, black / bone / stone); tests, validator, preview build.

**What changed in 3.0:** missions are the product. Areas + optional personalization + intensity in onboarding; a mission library with a real data model; a few missions a day chosen per user with a swap; a plain mission screen; proof by photo, before and after, the in-app focus timer, or both; on-device proof checks behind a verifier interface (no fake AI); EXIF stripped, fingerprints against reuse, automatic photo expiry; points per mission + perfect-day bonus; a streak that means "I proved one mission today" with Off Days; levels per area and milestones; a weekly review; programs; reward tiers configurable from unsetld.com. The quote library, the standard rules, the night check, saved lines, your lines and the line share card are retired.

**The founder's redirect (same day, wins over everything above it):**
- Missions are normal, high-value actions a motivated 13–25 year old recognises: `Study for 30 Minutes`, `Complete Your Workout`, `Work on Your Business for 30 Minutes`, `Read 10 Pages of a Useful Book`, `Plan Tomorrow`, `Track Today's Spending`. Clear beats clever. No motivational content, no essays, no lectures.
- The Quick Win / Progress / Challenge labels are gone everywhere. What matters is the user's goals (their areas), not archetypes.
- Nine areas replace the seven 3.0 tracks. Users choose about two to four (one to four allowed).
- The mission screen is the title, time and points, one instruction sentence, PROOF, and one button. No WHY THIS MATTERS, no HOW TO DO IT.
- Proof is PHOTO, TIMER, TIMER + PHOTO or BEFORE + AFTER PHOTO. Nothing ever claims AI looked at a photo.

## 1. The loop

Choose the areas you want to improve → get three plain, useful missions each day from those areas → do them in real life → prove each one in the app (a photo, the focus timer, or both) → earn points → keep the streak → see each area's level and the week add up → trade points for UNSETLD rewards.

"Never settle for less." appears only at meaningful moments: onboarding (the name page), the weekly review, milestones and reward unlocks. Nowhere else.

## 2. Areas (src/content/tracks.json)

The UI says "areas"; the code calls them tracks (`TrackId`, `Mission.track`, `Profile.tracks`). Nine, in this order (the validator checks it):

| id | name | short | scope |
|---|---|---|---|
| discipline | DISCIPLINE | Discipline | Focus, plans, finishing what you start. |
| school | SCHOOL | School | Studying, assignments, tests, grades. |
| fitness | FITNESS | Fitness | Workouts, cardio, real food. |
| money | MONEY | Money | Tracking, saving, budgeting. |
| career | CAREER | Career | Jobs, internships, your resume. |
| business | BUSINESS | Business | Customers, product, content, sales. |
| skills | SKILLS | Skills | Courses, practice, useful books. |
| projects | PROJECTS | Projects | Building, making, shipping your thing. |
| organization | ORGANIZATION | Organization | Your room, your stuff, your files. |

`short` is what rows, levels, swaps and widgets show ("School · 30 min · +15"). Earlier 3.0 builds had seven tracks; the store's migration (version 4) maps the ids that went away: `focus` → discipline, `reset` → organization, `mindset` → discipline, in the user's areas, their weekly priority and the area stored on each proven mission. The same mapping runs on a tester's saved snapshot and on a record restored from the Keychain backup. Retired missions (`active: false`) are still known: a plan, a running timer or a proof made before a mission was retired keeps it, and only new plans leave it out. A saved timer or before photo for a mission removed outright (the 3.0 preview library) is dropped on load (its notification cancelled, its photo deleted). A plan saved before plans recorded areas gets each mission's area filled in once, as its row shows it, so the proof counts there. A proven mission is stored with the area it was in the day for (the planned area, else its own), and keeps it even if the library later moves it.

## 3. Onboarding

1. **Name** (unchanged): "unsettled", "Never settle for less." → Begin. Not numbered; the five steps below are `01 / 05` to `05 / 05`.
2. **Areas** — title `What are you trying to improve right now?`, body `Pick up to four.` Nine tiles, numbered 01–09: the area name (label style) and its scope (small, stone); 1px rule border, chosen = bone border. Counter `0 OF 4`; a fifth tap says `Four is the most. Take one off first.` `Continue` needs at least one.
3. **About you** (optional) — title `A few quick ones.`, body `So the missions fit your life. Skip anything.` Yes / No: `In school or college?` · `Working?` · `Building a business or project?` (`A brand, a channel, an app, art.`) · `Gym access?`. `Age` 13–15 / 16–17 / 18+. `What are you learning?` (`Pick any that apply.`): Coding, Design, Video editing, Writing, A language, Music. After `In school or college? Yes`, `High school or college?` High school / College (sets `schoolLevel`; cleared on No). Answering No while School is one of the areas shows `School missions need a yes here. Continue and School comes off your areas.` (Save in edit mode) and drops School on Continue / Skip / Save; when School is the only area the note says `Answer Yes, or pick another area first.`, Continue is disabled and `Change areas` goes back. Areas shows a matching note if School is picked after a No; in Settings › Areas, School then stays off on Save (and Save waits when School would be the only area, with `Go to About you`). Buttons `Continue` and `Skip`.
4. **Pace** — `How much time a day?` 5–15 / 15–30 / 30–60 / 60+ MIN. `How hard?` three cards: **START EASY** `Three missions a day, shorter ones.` · **LOCK IN** `Three missions a day: one easy, two that take real focus.` · **PUSH ME** `Four missions a day, longer sessions.` With 5–15 minutes chosen: `With 5–15 minutes, you get three short missions a day, whatever you pick.` With 15–30: `With 15–30 minutes, you get two short missions and one focused one a day, whatever you pick.` On those two, the cards draw the same day shape and their text starts `With more time a day:`.
5. **Reminders** (DayScreen).
6. **Widget** (the widget guide).
7. **Paywall**, then Home with today's plan already built.

Edit mode: Settings → Your plan opens the same Areas / About you / Pace screens with `Save`, which rebuilds today's plan if nothing in it was started (a timer running or a before photo waiting), proven or swapped yet.

## 4. Missions

### What a mission is

A normal, high-value action: work done, something learned, made, organised, trained, or progress with money or a career. The title says what to do (`Study for 30 Minutes`). One sentence says how (`Put your phone away and spend 30 focused minutes studying one subject.`). One line says what the proof shows (`Your notes or study setup, after the timer.`). Nothing else: no reasons, no steps, no pep talk. Proof never needs a face, a body, other people, an ID, an address, bank details, grades, medical information, private messages or a location.

### Where it lives

The library is written in **`scripts/missions/library.py`**, one readable `m(...)` call per mission, grouped by area. Running `python3 scripts/missions/library.py` writes `src/content/missions.json`; never edit the JSON by hand. Then run `npm run validate`. Mission ids are permanent (`<area>-<slug>`, e.g. `school-study-30`): completions, plans and programs refer to them, so retire a mission with `active: false` rather than renaming or deleting it.

### Data model (`Mission` in src/core/types.ts)

| field | what |
|---|---|
| `id` | permanent, `<area>-<slug>` |
| `track` | the area it counts toward (its row, its level, its swaps) |
| `also` | other areas it also serves: `Work on Your Portfolio` is Career, also Projects and Skills |
| `title` | Title Case, at most 48 characters, unique, no end punctuation |
| `short` | the one instruction sentence, at most 120 characters, ends with a full stop |
| `proof` | what the proof shows, at most 90 characters |
| `proofType` | `PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO` or `TIMER` (`PHOTO_AFTER` stays readable for older records; the library uses none) |
| `minutes` | the real time it takes; 15 or less makes it an easy mission |
| `points` | set by `minutes` (below) |
| `timerMinutes` | the focus timer for `TIMER` and `TIMER_AND_PHOTO` (5–60, no more than `minutes`) |
| `requires` | `school`, `highschool`, `work`, `gym`, `project`, `age16`, `age18`, or a skill: `coding`, `design`, `video`, `writing`, `language`, `music` |
| `cooldownDays` | days before it can come back after it was done (1–365) |
| `repeatable` | `false` for a one-off (`Write the First Draft of Your Resume`) |
| `anchor` | a core habit that should come back most days (study, train, build, plan tomorrow, the drills for skills the user named, apply to a job, read a business book); repeatable, cooldown 3 days or less |
| `group` | missions that overlap share one; a day never holds two from one group |
| `weight` | how often the planner picks it, relative to 1 (0.1–3) |
| `when` | `morning` (left out of a plan made between noon and 4 AM) or `evening` (a label for now; the planner doesn't act on it) |
| `days` | Days of the week it can be planned, 0 = Sunday. Only for missions tied to a school day or the night before one: `Review Today's Notes` Monday–Friday; `Finish Tonight's Homework`, `Pack Your Bag for Tomorrow`, `Lay Out Your Clothes for Tomorrow`, `Prepare Everything You Need for Tomorrow` and `Prepare Tomorrow's Meal` Sunday–Thursday. Program days skip it on other days. |
| `fits` | skills a medium-specific mission suits (`Edit One Video`: video); a soft hint for users who named skills, never a requirement |
| `tags`, `active` | 1–4 tags; `active: false` retires it |

There is no `slot`, `difficulty`, `why` or `how` any more; the validator rejects them.

### Points by time

| time | points |
|---|---|
| up to 5 min | 5 |
| 6–20 min | 10 |
| 21–35 min | 15, or 20 for work on your own thing: a business or project session, your portfolio, a job or internship application, training |
| 36–59 min | 20 |
| 60 min and up | 25 |

A perfect day (every mission in the day's plan proven) adds 15 (`rules.json` `perfectDayBonus`). Missions never mention points, codes, merch or UNSETLD.

### Requirements

A mission is offered only when the user's answers allow it. `school`: unless they said they're not in school (a skipped answer allows it). `highschool` (SAT/ACT, college essays and research): in school, and not when they said college. `work`, `gym`, `project`: only after a yes. `building` (`Work on Your Product`, `Create One Piece of Content`, `Fix One Problem With Your Business`): not after a no to Building a business or project?; `starting` (`Write Down 10 Business Ideas`, `Pick One Business Idea and Plan It`): not after a yes. `age16`: not for 13–15. `age18`: only for 18+. A skill: only when they named it under What are you learning?

### Content rules (`npm run validate`, scripts/validate-content.mjs)

Errors fail the run: every field above; points that don't match the time; `"!"`, `"…"`, emoji or swearing; hustle and therapy words (grind, level up, mindset, journey, your potential, you got this ...); anything unsafe for a teen (calorie deficits, water or dry fasts, weigh-ins and body photos, no sleep, alcohol, vaping, nicotine, day or options trading, casinos, betting, dares); any mention of points, codes, merch or UNSETLD. Warnings: words worth a second look for safety or privacy (diet, caffeine, crypto, selfie, face, grades, bedroom, address, location ...). A `short` with more than one sentence is an error (safety notes go inside the one sentence); `fits` must be a non-empty list of distinct skills; a program day can't be all morning-only or weekday-only missions. It also prints, per area, the easy, focused, core, timed and before/after counts, and what an 18+ user who skipped About you can get, and warns when an area has fewer than 4 easy or 5 focused missions, no core habit, fewer than 8 easy missions or fewer than 3 focused missions with a cooldown of 3 days or less open to that user.

### The daily plan (src/core/missions.ts)

- **Shape.** The time the user chose decides first (`slotsFor`): 5–15 minutes is three easy missions (15 minutes or less) and 15–30 is two easy missions and one focused one, whatever the intensity. With 30 minutes or more: one easy mission and two focused ones on Start easy and Lock in; Push me adds a third focused one. The longest single mission is 30 minutes on Start easy, 45 on Lock in, 60 on Push me (`MAIN_MAX_MINUTES`). The day fits 25 / 45 / 75 / 120 minutes for the four time choices, 100 / 180 on Push me at 30–60 / 60+ (`dayBudget`). Only when nothing in the user's areas fits does a slot take one of the shortest few, at most 15 minutes over.
- **Areas first.** Every mission comes from one of the user's areas (its own area, or one it `also` serves), and the plan records which area each mission is in the day for (`PlannedMission.area`; the row shows it and a swap stays in it). Areas that can never get a mission with the user's answers drop out (School for someone not in school; `usableAreas`). Focused missions are placed first: the lead area (the first pick, or the week's priority from the weekly review) leads on two days in three and the other areas go first on the third, in rotation; easy missions take the next areas, and slots beyond the areas go to the other areas in turn. Each slot takes an area not in the day yet when it can, so a day covers as many of the user's areas as it has missions.
- **Core habits come back.** When an area has a core habit free, a slot takes it 60% of the time (`CORE_SHARE`), 30% when every core habit on offer was in yesterday's plan, and core habits skip the "shown lately" gap, so studying, training, building and planning come back on most days while the rest of the area fills the other days.
- **Variety.** Never planned before counts 1.3×; planned yesterday 0.3×, two days ago 0.6×; each recent swap divides the weight by one more; a mission that only `also` serves the area counts 0.6×. When the user named skills under What are you learning?, a drill for one of them counts 2×, and a mission whose `fits` names a medium counts 1.5× when it matches and 0.25× when it doesn't.
- **Filters.** Active; requirements met; morning missions (`Make Your Bed`, `Write Your Top 3 Priorities`) left out of a plan made between noon and 4 AM (the hours after midnight still belong to the day before); `days` respected; not within its cooldown after it was done; one-offs once; a swapped-out mission away 7 days, 21 after a third swap within a month, 2 for a core habit (swaps more than 30 days old are forgotten); a mission shown but not done waits 2–3 days before it's shown again (core habits excepted); never two from one group.
- **When an area runs dry.** In order: the slot's area, then the user's areas not in the day yet, at the slot's size, then (focused slot) a shorter mission from the same areas; then the areas already in the day; then missions the user swapped away lately; then the universal basics from Discipline and Organization; then the shortest few of their areas' missions. A day is never left short while anything is left.
- **Programs.** An active program's missions for its day go in first, each in a slot of its size or the first free one (a morning mission after noon, or a mission on the wrong day of the week, is left out; the day's other missions still move the program on).
- **Short days.** Easy slots share what's left of the day evenly (10 + 10 + 5 on a 25-minute day, not 15 + 5 + 5). For a user who named skills, a mission made for another medium (`fits`) is used only when nothing else in the area is left.
- The plan is generated once per day (deterministic for the install, the day and the history) and stored, with its swaps. A stored day with nothing left to prove (an update removed its missions, or what's left is all proven) is planned again, keeping its swaps; a started day keeps what's left while something in it is open.
- **Swap**: `Swap` on an unproven mission. The new mission comes from the area the old one was in the day for and is the same size, never overlaps the rest of the day, keeps the same size first and then tries a different kind of mission (not `Lock In for 30 Minutes` for `Do a 20-Minute Focus Session`), and falls back to the user's other areas only when that area has nothing left. A program's mission swaps within the program's area; a mission whose area the user has since dropped swaps into one of their areas not in the day yet. The swap dialog names the area the swap will use (`swapArea`). One swap a day, three with Full Edition. A swap counts as a skip.

## 5. Home (root screen, route `Today`)

Colorway background. Top to bottom:
- `UNSETLD` (label, left) and `DAY 12` (mono, right: days with a proven mission).
- `12` `DAY STREAK` · `380` `POINTS` (tappable → Rewards). Under the streak, when banked: `1 OFF DAY BANKED`.
- Next reward line: `220 POINTS TO 10% OFF` (hidden when Access is off).
- `TODAY` + `0 / 3`; status line: `Three missions today.` · `2 to go.` · `Perfect day. Every mission proven.`
- Program banner if one is active: `7 DAY LOCK IN · DAY 3 OF 7`.
- **Mission rows**, one per planned mission, no labels above them:
  - `Study for 30 Minutes`
  - `School · 30 min · +15` (with `Timer` or `Before + after` when the proof needs one)
  - a small button: `START` (`TIMER 12:04` while a timer runs, `TAKE PHOTO` when it's done, `AFTER PHOTO` when a before photo is waiting).
  - Proven: the title steps back, a photo thumbnail, `PROVEN 9:47 AM · +15`. Unproven rows have a quiet `Swap`.
- When everything is proven: `Come back tomorrow for three more.`
- Weekly review card (Sunday to Tuesday until closed), bottom bar (`Progress`, `Programs`, `Rewards`, colorway), the Day 3 Access note. No quote anywhere.

## 6. Mission screen (full-screen modal)

**Detail**, and nothing more:

```
STUDY FOR 30 MINUTES
30 MIN · +15 POINTS
Put your phone away and spend 30 focused minutes studying one subject.

PROOF
Run the 30-minute focus timer. When it ends, take a photo.
Your notes or study setup, after the timer.

[ START 30 MIN TIMER ]
Swap this mission
```

Close X and `DAY 12` in the nav row. Title, then time and points, then the mission's one sentence (`short`). `PROOF`: a line for the proof type (`Take one photo.` · `Take a photo before you start and one when you're done.` · `Run the 30-minute focus timer. When it ends, take a photo.` · `Run the 30-minute timer to the end.`), then the mission's own proof line. One button: `Start 30 min timer` (TIMER and TIMER_AND_PHOTO), `Take the before photo` (BEFORE_AFTER) or `Prove it` (PHOTO). `Swap this mission` while swaps are left. No WHY THIS MATTERS, no HOW TO DO IT, no steps.

Then:
1. **Timer** (TIMER and TIMER_AND_PHOTO) — a big mono countdown, the title, `Phone down. Come back when it rings.` `Pause` / `Resume` (Pause does nothing once the time is up), `End timer` (asks; ending early earns nothing). It runs on the wall clock while the app is closed, and a local notification fires at zero. At zero: TIMER_AND_PHOTO → `Time. Take the proof photo.` and the camera; TIMER → `Time. Mark it done.` and `Mark it done` (no photo).
2. **Before taken** (BEFORE_AFTER) — the before photo small, `Before saved. Now do it.` `Take the after photo`. It waits even if the app closes.
3. **Review** — the photo(s) with the proof stamp; `Submit proof`, `Retake`.
4. **Checking** — `Checking proof…` (on-device, instant).
5. **Done** — `PROVEN.`, the title, `+15 POINTS` counting up, `365 → 380 POINTS`, the next reward line, the streak line (`Streak started.` or `Streak: 12 days. Still alive.`, never a day number), and `PERFECT DAY` `+15 BONUS` when the day is complete. `Done`.
   - **Rejected** — `Not counted.` and each failed check's note (e.g. `Take the photo again. Proof has to be from the last 30 minutes.`), `Try again`.

Copy never says a photo was verified by AI. Wording: `Proof saved.` / `Checked on this phone: taken just now, timer finished, new photo.`

## 7. Proof (services/proof.ts, services/verify.ts, core/verify.ts)

- Proof types: **PHOTO** (one photo of the thing or the result), **TIMER** (the in-app timer run to the end, no photo), **TIMER_AND_PHOTO** (the timer, then a photo), **BEFORE_AFTER** (a photo before, then one after). PHOTO_AFTER is kept so older records still read.
- Capture: iOS opens the camera only (no library). The browser preview picks a file and says so.
- Saving: resized to 1600 px and re-encoded (drops EXIF and location), stored in the app's own folder, fingerprinted.
- On-device checks: the right photos are there, taken in the last 30 minutes, before → after at least 2 minutes apart, the timer finished and the photo came after it, the photo was never used before. TIMER: the timer ran its full length and ended before now; it can be marked done any time that day (until 4 AM), and there's no photo to check.
- `TaskProofVerifier` interface for a future vision check (server-side). None is connected; results say `on-device`.
- Retention: photos are cleared after 30 days by default (Settings → Proof photos: 30 days / 1 year / Keep). The mission and its fingerprint stay. Photos never leave the phone.
- Privacy: missions never require faces, bodies, other people, IDs, addresses, bank info, grades, medical info, private conversations, a bedroom specifically, or location. No facial recognition. No public feed.

## 8. Streak, progress, milestones (Progress screen; replaces Record)

- Streak = days in a row with at least one proven mission (today counts once proven; until then yesterday's streak stands).
- **Off Days**: one earned every 7 active days, up to 2 banked; a missed day uses one automatically. Copy: `OFF DAY` · `An Off Day covered Tuesday. Streak's still going.` · Settings/Progress explain: `Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.`
- Progress screen: title `Progress`; stats grid: `STREAK` / `LONGEST` / `MISSIONS` / `POINTS` / `FOCUSED` (4h 20m) / `THIS WEEK` (completion %); the active-days barcode; **Levels**: each chosen area first, then any other area with points: `SCHOOL` `LEVEL 4` thin bar `60 / 150`; **Milestones**: First mission, First 10 missions, First perfect day, 7 days, 30 missions, 100 missions, 30-day streak (reached = bone square + date; not yet = outline + progress `12 / 30`); **This week** block with `See the week →`; Proof gallery link; Settings link (top right). Access (early access / patch / 365 piece) lives on Rewards; its day counts are active days.
- Milestone reached → a letter-style moment on Home (once): `30 MISSIONS.` `Never settle for less.` `Close`.

## 9. Weekly review (WeeklyReview screen)

`THIS WEEK` (label) + dates. Big numbers: missions completed, focused time, points earned, perfect days. `Strongest area: School`. Each proof counts for the area its day's plan put it in. If one of the user's areas was left out: `Didn't get to: Fitness.` (never shaming). Only areas that can get missions with the user's answers are named, offered or promised (no School for someone not in school). `NEXT WEEK` — `Pick one area to focus on.` chips of those areas → sets `profile.priority`, which leads the plan on two days in three. Footer: `Never settle for less.` Button `Done`.

## 10. Rewards

- Tiers from content/rewards.json, replaced by unsetld.com's config when it sends `rewards` (id, title, detail, type, points, percent, maxOff, active, availableFrom/Until, codeValidDays, inventory, perCollection).
- Rewards screen: title `Rewards`; balance `380 POINTS`; next reward block with a bar and `220 POINTS LEFT`; tier list with status (`READY` / `150 TO GO` / `USED THIS COLLECTION` / `NOT AVAILABLE`); tapping a ready tier → confirm → account (if needed) → redeem → code + `Use it at unsetld.com` + expiry; Your codes; Access; terms link. Points are earned only by proven missions; Full Edition doesn't change them.
- On the done screen and Home, rewards are a quiet line, never a popup.

## 11. Programs

Optional multi-day runs (content/programs.json): id, title, short, days, tracks (areas), free, plan (1–2 mission ids per program day; no two from one group; only missions every user can do, `school` excepted). Programs screen: list with the edition, title, what it is, `7 days · Discipline`, `Start`; the active program at the top with `DAY 3 OF 7`, today's (or tomorrow's) missions as rows like Home's (`Lock In for 30 Minutes` / `Discipline · 30 min · +15 · Timer`, with Home's VoiceOver wording), `Leave program`. A run with every day proven shows FINISHED with `Clear`, even without a finish date. Business Week's id is `business-week` (an earlier build used `project-mode` for a different program; that id is cleared). A program whose missions need an answer the user hasn't given (School Reset for someone not in school) shows `Needs a yes to In school or college? in About you.` instead of Start, and a running one stops when the answers change that way (the days proven stay). A program day moves on once one of its missions is proven, so missing a day never fails it. One program at a time. Free: 7 Day Lock In and Get Organized; the rest are Full Edition.

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

- Reminders name missions by title. First of the day: `Today: Study for 30 Minutes, Complete Your Workout, Plan Tomorrow.` Later ones name what's left (`2 missions left. Complete Your Workout takes 45 minutes.`) and stop once everything is proven. The last one, only while nothing is proven today: `Last call: 1 mission left to keep the streak.` A day with no plan yet: `Three missions are waiting.` or a plain prompt from `reminders.json`. Timer end: `30:00 done. Take the proof photo.` (TIMER_AND_PHOTO) or `30:00 done. Open the mission and mark it done.` (TIMER).
- Widgets: **Next mission** (Line): `NEXT MISSION`, the title, `School · 30 min · +15` and `1 / 3`; tap opens the mission. **Today** (Standard, Lock Screen): the day's mission titles with a square each, filled once proven, and `1 / 3`. **Streak** (Record): streak, points, active-days barcode.

## 14. Removed

Quote library and everything on it (line on Today, line share card, saved lines, your lines, strong language), the three standard rules and the standard screen, the night check, the old daily task library (tasks.json), chapters (replaced by areas), own tasks (replaced by swaps and programs). With the redirect: the Quick Win / Progress / Challenge slots and labels and their fixed points (10 / 15 / 25), `difficulty`, `why` and `how` (WHY THIS MATTERS, HOW TO DO IT), the seven 3.0 tracks (Focus & Discipline, Fitness & Energy, School & Learning, Money & Career, Skills & Projects, Life Reset, Confidence & Mindset) and the 313-mission library written for them. Old proofs keep their stored slot (`quick` / `progress` / `challenge`) and points; nothing reads the slot.

## 15. Build notes (9 Oct 2026)

Where these notes and the sections above differ, the notes describe the app as built.

- **Library: 218 missions, 216 active** (`Bike for 30 Minutes` and `Prepare Your Workspace` retired), written in `scripts/missions/library.py`: School 32, Career 29, Skills 27, Business 26, Fitness 24, Organization 23, Money 21, Projects 21, Discipline 13. 102 easy and 114 focused, 39 core habits; most are photo proofs, then timer + photo, before + after and timer only. `npm run validate` prints the current per-area counts.
- **Groups.** Missions that overlap share a `group` (`deep-work`, `study`, `assignment`, `workout`, `cardio`, `tomorrow-ready`, `skill-session`, `room`, `computer` ...). A day never holds two from one group: the planner, swaps and program days all respect it, and the validator rejects a program day with two.
- **Six programs** (`src/content/programs.json`): 7 Day Lock In (7 days, Discipline, free), Get Organized (5 days, Organization, free), School Reset (7 days, School), Build Something (7 days, Projects), Fitness Base (7 days, Fitness), Business Week (7 days, Business).
- **Off Days** (`src/core/streak.ts`, `rules.json`: `offDayEvery` 7, `offDayMax` 2): one is earned on every 7th active day, up to 2 banked, and a missed day uses one automatically. A covered day keeps the streak going but doesn't add to it. Off Days cover the streak only; Access counts proven days.
- **Proof retention** (Settings → Proof photos: `30 days` / `1 year` / `Keep`; default from `rules.json` `proofRetentionDays`, 30). Expired photos are deleted from the phone at launch and each time the app comes back to the foreground; the mission, its points and its fingerprint stay. Choosing a shorter time asks first.
- **Rewards are discounts only**: 5% off (300), 10% off (600) and 15% off (1,000), each up to $25 off. Free shipping was taken out (5% off took its place as the first reward, about six perfect days in); a code already taken keeps its name under Your codes.
- **Rewards config.** unsetld.com's `config.json` may send `rewards`; each entry is checked on the phone, bad entries and repeated ids are dropped, and if none is valid the built-in tiers stay. The redeem body is `{ rewardId, points, type, percent }` and its errors are `used`, `short` and `unavailable` ([ACCESS.md](ACCESS.md)).
- **Access days** are days with a proven mission, plus days already on record from 2.x. The 2.x balance (10 points a proven task, at most 4 a day, minus the codes already taken) carries over as an opening balance (`src/core/legacy.ts`, `src/core/rewards.ts`).
- **Tester tools** (Progress → Settings → Tester tools; dev builds and the browser preview only, never a release build): the app's idea of today, streak, points and active days at the top; flags for Full Edition, timers 60× faster and Access enabled; *Prove today's missions* (skips the camera; accepted on the phone with a placeholder photo, or with none for a timer-only mission); *Add 20 days of proven missions* (plans each day from the user's areas and answers, as the store would, and proves it); time travel (next day, jump 6 / 23 / 60 days proving one mission a day, disappear for 15 days, back to the real today with the record from before the first jump); restart onboarding; clear the record. Notifications keep the real clock.
