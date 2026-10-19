# UNSETLD 3.0: Missions (supersedes TODAY_SPEC.md and the reader/standard parts of DESIGN_SPEC.md)

Tokens, type, colorways, the walker, the paywall layout, accounts and purchases from DESIGN_SPEC.md still apply. Access is UNSETLD status: since 3.2, one discount code per tier of days proven (docs/ACCESS.md). Where this file disagrees with an older spec, this file wins.

**3.1 (UX redesign, Oct 2026):** the navigation, screens and on-screen copy in §5–§12 (Today, the mission page, Progress, the weekly review, Rewards, Programs, Full Edition) are superseded by `docs/UX_REDESIGN.md`: four tabs (Today, Progress, Rewards, You), Programs are **Plans**, Full Edition is **UNSETLD+**, Settings lives in You, the weekly review's area chips became the weekly focus (`profile.priority` is retired; store v6 clears it), and Access is **UNSETLD status**. The data model, the planner, proof, verification, points, streak and reward rules here still apply, with the personalization rules below.

**3.3 (the approved library, 15 Oct 2026):** the built-in library is exactly the founder's 66 approved missions (§4, The approved library), and Business is folded into Projects (eight areas, §2). Nothing outside the 66 is ever planned, swapped in, recommended or placed by a plan: no fallback lists, no generated missions, no LLM. The library, eligibility, day shapes, frequency, the empty-slot guarantee and personalized titles in §2 and §4 describe the app as it is now; where an older section or §15's notes differ, §2 and §4 win.

**3.3 launch pass (19 Oct 2026):** the day keeps to the time the user chose (model J: one mission at 15 minutes, two at 30 and 45, three or four with an hour or more; §4, The daily plan); onboarding is three numbered steps after a 13+ age gate (§3); a goal or a weekly "Something else" that reaches none of the user's areas asks which area it's about instead of dead-ending; "Improve my routine", "Get my space in order" and "Learn a skill" are offered again; what the user writes is checked on the phone (§4, What the user writes); every swap after the day's first earns at most what it replaces; Plan days keep every Plan mission, a finished Plan goes on the record with one moment and the 8th achievement (§11); UNSETLD+ fails closed and reads the trial from the store (§12); the notification budget is 56 reminders (§13). [LAUNCH_PASS_PLAN.md](LAUNCH_PASS_PLAN.md) lists every change with its commit.

## 0. Audit and redirect (9 Oct 2026)

**What existed (2.2):** Expo SDK 57 / React Native / TypeScript; one native stack (React Navigation), zustand store persisted locally, Keychain backup of the record; a browser preview build. Onboarding: name → first line (quote) → three "standard" rules → chapters → reminders → widget → paywall. Today: a daily quote on top, a night check, then "today's work" = the 3 rules + 1 daily task + up to 3 own tasks. Task screen with why / how / proof, in-app camera (library on web), 10 points per proven task (max 4/day), discount codes at 600/1000 points (one per collection), "days on record" (opening the app) with a barcode and an Access road (status tiers at days 7, 90 and 365, since 3.2 discount codes), milestone letters, colorways, reminders, iOS widgets (Line / Record / Standard), Full Edition (RevenueCat), Sign in with Apple and account deletion, tester tools, 33 unit tests, a content validator.

**Worth keeping:** camera capture + local-only photos + the proof stamp; points → codes plumbing and the redeem backend contract; status tiers, letters and drop alerts; accounts; purchases; reminders and the 4 AM day boundary; widgets infrastructure; colorways; the editorial look (Cormorant + Inter + Plex Mono, black / bone / stone); tests, validator, preview build.

**What changed in 3.0:** missions are the product. Areas + optional personalization + intensity in onboarding; a mission library with a real data model; a few missions a day chosen per user with a swap; a plain mission screen; proof by photo, before and after, the in-app focus timer, or both; on-device proof checks behind a verifier interface (no fake AI); EXIF stripped, fingerprints against reuse, automatic photo expiry; points per mission + perfect-day bonus; a streak that means "I proved one mission today" with Off Days; levels per area and milestones; a weekly review; programs; reward tiers configurable from unsetld.com. The quote library, the standard rules, the night check, saved lines, your lines and the line share card are retired.

**The founder's redirect (same day, wins over everything above it):**
- Missions are normal, high-value actions a motivated 13–25 year old recognises (the 3.0 library's examples were `Study for 30 Minutes`, `Complete Your Workout`, `Plan Tomorrow`; since 3.3 the titles are the approved ones in §4). Clear beats clever. No motivational content, no essays, no lectures.
- The Quick Win / Progress / Challenge labels are gone everywhere. What matters is the user's goals (their areas), not archetypes.
- Nine areas replaced the seven 3.0 tracks (eight since 3.3: Business is part of Projects). Users choose two to four (one kept from an earlier version still works).
- The mission screen is the title, time and points, one instruction sentence, PROOF, and one button. No WHY THIS MATTERS, no HOW TO DO IT.
- Proof is PHOTO, TIMER, TIMER + PHOTO or BEFORE + AFTER PHOTO. Nothing ever claims AI looked at a photo.

## 1. The loop

Choose the areas you want to improve → get one to four plain, useful missions each day from those areas (by the time you have: one with 15 minutes, two with 30 or 45, three or four with an hour or more) → do them in real life → prove each one in the app (a photo, the focus timer, or both) → earn points → keep the streak → see each area's level and the week add up → trade points for UNSETLD rewards.

"Never settle for less." appears only at meaningful moments: onboarding (the name page), the weekly review, milestones and reward unlocks. Nowhere else.

## 2. Areas (src/content/tracks.json)

The UI says "areas"; the code calls them tracks (`TrackId`, `Mission.track`, `Profile.tracks`). Eight since 3.3, in this order (the validator checks it):

| id | name | short | scope |
|---|---|---|---|
| discipline | DISCIPLINE | Discipline | Focus, plans, finishing what you start. |
| school | SCHOOL | School | Studying, assignments, tests, grades. |
| fitness | FITNESS | Fitness | Workouts, cardio, getting outside. |
| money | MONEY | Money | Tracking, saving, budgeting. |
| career | CAREER | Career | Jobs, internships, your resume. |
| skills | SKILLS | Skills | Courses, practice, tutorials. |
| projects | PROJECTS | Projects | Building, shipping your thing: an app, a brand, a business. |
| organization | ORGANIZATION | Organization | Your room, your desk, your week. |

`short` is what rows, levels, swaps and widgets show ("School · 30 min · +15").

**Business folded into Projects (3.3).** The approved library has no Business area: a brand, a business or a shop is something being built, so it's Projects. Store version 7 (`toV7`) maps `business` → `projects` in the user's areas (no repeats, order kept, at most four; none left gives the defaults), the retired weekly priority, every saved plan's areas and swaps, missions of the user's own, the tester snapshot and plans, and the area stored on each proven mission; a record restored from the Keychain backup is mapped the same way. The weekly focus `business` ("Make progress on my business") stays (saved data uses it) and leans Projects.

**Earlier moves.** 3.0's seven tracks became nine areas; store version 4 maps the ids that went then: `focus` → discipline, `reset` → organization, `mindset` → discipline, on the same data. A plan saved before plans recorded areas gets each mission's area filled in once, as its row shows it. A proven mission is stored with the area it was in the day for (the planned area, else its own) and keeps it.

**Retired missions.** 3.3 retired every mission of the earlier library (§4, History). A saved plan, a running timer or a before photo holding a retired id is unknown: the plan is made again (one already touched keeps its approved and own missions, and is made again when nothing open is left), and the timer or photo is dropped on load (its notification cancelled, its photo deleted). Past proofs keep showing them.

## 3. Onboarding

Since the launch pass (19 Oct 2026): an age gate, then three numbered steps. No About you, no reminders step, no widget guide and no paywall in onboarding.

1. **Name** (unchanged): "unsettled", "Never settle for less." → Begin. Not numbered.
2. **Age** (not numbered; no way back; `AgeScreen`, core/age, copy/age). `What year were you born?` / `Only an age range is kept, on this phone.` A year wheel with nothing picked; `Which month?` only on the one year the 13 line runs through (the birth month itself counts as not reached yet). Only the bucket is saved (`Profile.age`: 13–15, 16–17, 18+; a year that straddles 16 or 18 gives the younger) with `settings.ageCheck = 'ok'`; the year and month are never saved. On iOS 26 and later, only where `isEligibleForAgeFeaturesAsync()` is true, Apple's Declared Age Range answers instead (services/ageRange, `expo-age-range`, gates 13 / 16 / 18); a decline, no service, an older iOS or the module's simulated adult (no declaration) falls back to the year. **Under 13:** `deleteLocalData()` (services/wipe: everything on the phone, the Keychain copy included), then `ageCheck = 'under13'` and `AgeBlocked`: `UNSETLD is for 13 and over.` / `Nothing you entered was kept.` with the Privacy Policy; no retry, nothing sent. The block holds even if the delete fails, and the block screen deletes again while anything is left. Start route (`startRoute`): under 13 → AgeBlocked; not onboarded → Name; onboarded before the gate existed → Age once, then Today; else Main. Links and notification taps wait for the gate.
3. **Areas** `01 / 03` — `What are you trying to improve right now?` / `Pick up to four.` Eight tiles, two to a row, the area name and its scope; counter `0 OF 4`; a fifth tap says `Four is the most. Take one off first.` `Continue` needs two (`MIN_AREAS`; someone with one area from an earlier version can keep it when editing). Picking School means in school: saving turns a `school: false` kept from an earlier version into `null` (`areasSave`).
4. **Time** `02 / 03` — `How much time do you realistically have each day?` 15 / 30 / 45 / 60+ MIN (45 preselected), with the day's shape under it: 15 `One mission a day, 20 minutes at most.` · 30 `Two missions a day. About 30 minutes.` · 45 `Two missions a day. About 45 minutes.` · 60+ `Three or four missions a day, by how hard you want it.` Below an hour the DayShape glyph draws the day (`slotsFor`). `How hard?` shows only at 60+: **START EASY** `Three missions. About an hour, shorter sessions.` · **LOCK IN** `Three missions. About an hour, two that take real focus.` · **PUSH ME** `Four missions. About an hour and a half.` Below an hour the intensity changes nothing (it's kept for a move to 60+). src/content/__tests__/day-shape-copy.test.ts checks every line against `slotsFor` and `dayBudget`.
5. **Goal** `03 / 03` — `What are you working toward?` / `Optional. A few words, and your missions lean toward it.` Up to 80 characters; example chips Get my GPA up · Launch my clothing brand · Get an internship · Build muscle · Learn coding · Save $1,000. When the words reach none of the user's areas (`core/areaChoice goalQuestion`), `Which of your areas is this about?` with the user's own areas as one-tap options (hidden with one usable area or fewer); above it, when the words name an area they didn't pick, `{Area} isn't one of your areas.` A first Continue reveals the question; the text stays as typed; the pick is saved as `Profile.goalArea`. What the user writes is checked first (§4, What the user writes). Continue and Skip both finish onboarding: the goal and its area are saved, today's plan is built, `completeOnboarding`, then Today.

After onboarding: reminders are offered on Today after the first proof (§13), and the permission ask at the first timer stays. **What you're learning** (Coding, Design, Video editing, Writing, A language, Music) is a You › YOUR GOALS row, shown only with Skills, Projects or Career. About you answers saved by earlier versions stay on the profile: a No to school still keeps School out, a yes to a project still brings Projects in, and working (not in school) still makes internship-only missions a last resort; gym and school level change nothing.

Edit mode: You › YOUR GOALS opens Areas, Time and intensity, What you're working toward and What you're learning with `Save`, which rebuilds today's plan if nothing in it was started (a timer running or a before photo waiting), proven or swapped yet.

## 4. Missions

### What a mission is

A normal, high-value action: work done, something learned, made, organised, trained, or progress with money or a career. The title says what to do (`Study One Subject for 30 Minutes`). One sentence says how (`Spend 30 focused minutes studying one class or subject.`). One line says what the proof shows (`A photo of your notes or the work in front of you. After the timer.`). Nothing else: no reasons, no steps, no pep talk. No mission requires a body photo, a scale or weight loss, calories, fasting, punishment or extreme exercise, bank balances or account or card numbers, an ID, grades, private messages, strangers, medical information or an exact location. A workout is proven by the place or the equipment, never the body; career and school proof can hide anything personal.

### The approved library (3.3, 15 Oct 2026)

The built-in library is exactly the founder's 66 approved missions. The planner, swaps, the RECOMMENDED FOR YOU choices and plans (programs) draw only from it: `MISSIONS` in src/content/index.ts (the active approved missions), with `APPROVED_IDS` (the 66 in order) and `isApproved(id)`. There are no fallback lists, no missions generated or made up at runtime, and no LLM. A mission is never added, renamed or reworded, and an id is never renumbered: the gaps (S8, S14, F4, M4, C6, C8, P8, K8, O3, O4, O6, O7) are missions the founder turned down. Retiring an approved mission is the founder's decision.

| area | letter | missions | ids |
|---|---|---|---|
| Discipline | D | 6 | D1–D6 |
| School | S | 13 | S1–S7, S9–S13, S15 |
| Fitness | F | 7 | F1–F3, F5–F8 |
| Money | M | 5 | M1–M3, M5, M6 |
| Career | C | 10 | C1–C5, C7, C9–C12 |
| Projects | P | 11 | P1–P7, P9–P12 |
| Skills | K | 9 | K1–K7, K9, K10 |
| Organization | O | 5 | O1, O2, O5, O8, O9 |

66 in all: 35 short (20 minutes or less) and 31 focused, 5 to 45 minutes (most 20–30); 43 photo proofs, 18 timer + photo, 5 before + after; 31 high, 24 medium and 11 low frequency; 13 core habits. Money and Organization have only short missions. Every area has at least two short ones.

**Discipline (6)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| D1 | Lock In for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit |
| D2 | Do Your Most Important Task for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit |
| D3 | Finish One Thing You've Been Avoiding | 30 | 15 | photo | medium (3 d) |  |
| D4 | Plan Tomorrow's Top 3 | 5 | 5 | photo | medium (3 d) | evening |
| D5 | Work With Your Phone Away for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit |
| D6 | Finish One Unfinished Task | 20 | 10 | photo | medium (3 d) |  |

**School (13)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| S1 | Study One Subject for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit; template `Study {subject} for 30 Minutes` |
| S2 | Test Yourself Without Looking at Your Notes | 15 | 10 | photo | high (2 d) |  |
| S3 | Complete 10 Practice Problems | 20 | 10 | photo | high (1 d) |  |
| S4 | Write Everything You Remember About One Topic | 15 | 10 | photo | medium (3 d) |  |
| S5 | Finish One Assignment | 30 | 15 | photo | high (1 d) | core habit |
| S6 | Start an Assignment Before It's Urgent | 30 | 15 | timer + photo | medium (3 d) |  |
| S7 | Turn Today's Notes Into 10 Questions | 15 | 10 | photo | medium (3 d) | evening |
| S9 | Test Yourself on Flashcards for 20 Minutes | 20 | 10 | timer + photo | high (1 d) |  |
| S10 | Explain One Difficult Concept From Memory | 15 | 10 | photo | high (2 d) |  |
| S11 | Spend 30 Minutes on Your Hardest Class | 30 | 15 | timer + photo | high (1 d) |  |
| S12 | Create Your Study Plan for the Week | 15 | 10 | photo | low (7 d) |  |
| S13 | Work on an Upcoming Project for 30 Minutes | 30 | 15 | timer + photo | medium (3 d) |  |
| S15 | Review a Topic You Learned Earlier This Week | 20 | 10 | timer + photo | high (2 d) |  |

**Fitness (7)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| F1 | Complete Your Workout | 45 | 20 | photo | high (1 d) | core habit |
| F2 | Walk for 30 Minutes | 30 | 15 | timer + photo | high (1 d) |  |
| F3 | Do 20 Minutes of Cardio | 20 | 10 | timer + photo | high (1 d) |  |
| F5 | Complete a 30-Minute At-Home Workout | 30 | 15 | timer + photo | high (1 d) | core habit |
| F6 | Get Outside and Move for 20 Minutes | 20 | 10 | timer + photo | high (1 d) |  |
| F7 | Complete Your Planned Strength Workout | 45 | 20 | photo | high (1 d) |  |
| F8 | Do Your Planned Cardio Today | 30 | 15 | timer + photo | high (1 d) |  |

**Money (5)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| M1 | Track Everything You Spend Today | 5 | 5 | photo | high (1 d) | core habit; evening |
| M2 | Review Your Spending From the Last 7 Days | 15 | 10 | photo | low (7 d) |  |
| M3 | Make a Spending Plan for This Week | 10 | 5 | photo | low (7 d) |  |
| M5 | Check One Subscription or Recurring Charge | 10 | 5 | photo | low (30 d) |  |
| M6 | Set One Savings Goal and Deadline | 10 | 5 | photo | low (45 d) |  |

**Career (10)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| C1 | Improve One Resume Bullet | 15 | 10 | photo | low (14 d) |  |
| C2 | Apply to One Job or Internship | 30 | 15 | photo | medium (3 d) | core habit; template `Apply to One {opportunity}`; requires `jobsearch` |
| C3 | Find 3 Opportunities Worth Applying To | 20 | 10 | photo | medium (3 d) | template `Find 3 {opportunities} Worth Applying To`; weight 2 (the founder: 1–2 times a week) |
| C4 | Improve One Part of Your Portfolio | 30 | 15 | photo | medium (3 d) |  |
| C5 | Practice 5 Interview Questions | 20 | 10 | photo | low (7 d) |  |
| C7 | Spend 30 Minutes Building a Career Skill | 30 | 15 | timer + photo | medium (3 d) | core habit |
| C9 | Add One Project or Accomplishment to Your Resume or Portfolio | 15 | 10 | photo | low (21 d) |  |
| C10 | Research 3 Skills Required for a Job You Want | 15 | 10 | photo | low (14 d) |  |
| C11 | Practice Explaining One Project You've Built | 15 | 10 | photo | medium (4 d) |  |
| C12 | Complete One Part of an Application | 30 | 15 | photo | medium (3 d) |  |

**Projects (11)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| P1 | Work on Your Project for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit; template `Work on {project} for 30 Minutes` |
| P2 | Finish One Small Part of Your Project | 30 | 15 | photo | high (1 d) | template `Finish One Small Part of {project}` |
| P3 | Create One Piece of Content | 30 | 15 | photo | medium (3 d) |  |
| P4 | Improve One Page, Screen, Product, or Listing | 30 | 15 | before + after | medium (3 d) |  |
| P5 | Fix One Problem With Your Project | 30 | 15 | photo | high (2 d) | template `Fix One Problem With {project}` |
| P6 | Write Your Next 3 Project Actions | 10 | 5 | photo | medium (3 d) | support |
| P7 | Create One New Design, Prototype, or Draft | 30 | 15 | photo | high (2 d) |  |
| P9 | Review One Important Metric and Make One Decision From It | 15 | 10 | photo | low (7 d) |  |
| P10 | Publish Something You Made | 20 | 10 | photo | medium (4 d) |  |
| P11 | Improve Something You Made Yesterday | 20 | 10 | before + after | high (2 d) |  |
| P12 | Turn One Idea Into a First Draft | 30 | 15 | photo | high (2 d) |  |

**Skills (9)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| K1 | Practice Your Skill for 30 Minutes | 30 | 15 | timer + photo | high (1 d) | core habit; template `Practice {skill} for 30 Minutes` |
| K2 | Complete One Lesson, Then Use What You Learned | 30 | 15 | photo | high (2 d) |  |
| K3 | Practice One Weak Part of Your Skill for 20 Minutes | 20 | 10 | timer + photo | high (2 d) |  |
| K4 | Build a Small Project Using Your Skill | 45 | 20 | photo | medium (4 d) |  |
| K5 | Explain One Thing You Learned From Memory | 15 | 10 | photo | high (2 d) |  |
| K6 | Create Something You Can Put in a Portfolio | 45 | 20 | photo | medium (4 d) |  |
| K7 | Improve Something You Created Before | 20 | 10 | before + after | high (2 d) |  |
| K9 | Watch One Tutorial and Apply One Thing From It | 30 | 15 | photo | high (2 d) |  |
| K10 | Recreate Something Without Following the Tutorial | 30 | 15 | photo | medium (3 d) |  |

**Organization (5)**

| id | title | min | pts | proof | frequency (cooldown) | notes |
|---|---|---|---|---|---|---|
| O1 | Clear Your Desk | 10 | 5 | before + after | medium (3 d) |  |
| O2 | Do a 15-Minute Room Reset | 15 | 10 | before + after | medium (3 d) | core habit |
| O5 | Pack Everything You Need for Tomorrow | 10 | 5 | photo | medium (3 d) | evening |
| O8 | Reset Your Workspace for Tomorrow | 10 | 5 | photo | medium (3 d) | evening |
| O9 | Review Your Calendar for the Next 7 Days | 10 | 5 | photo | low (7 d) |  |

### Where it lives

`scripts/missions/library.py` holds the 66, one `m(...)` call each, in the approved order (it asserts the exact list). `python3 scripts/missions/library.py` writes `src/content/missions.json`; never edit the JSON by hand. Then run `npm run validate`. Titles, instructions (`short`) and ids are the founder's and never change; metadata (tags, cooldowns, groups) is edited in the script too.

### Sources

Every approved mission carries `source: 'UNSETLD'`. A mission of the user's own (+ Create my own in the swap sheet, core/custom) carries `source: 'USER_CREATED'` (one saved before 3.3 gets it when the store registers it) and keeps every cap: it comes into a day only by replacing a planned mission, a day holds one, it earns at most what the mission it replaced was worth, and the planner never plans one. Its title must pass the user-text check (What the user writes, below): a refused title can't be added, and one saved before the check existed is hidden from the recent list. `MISSION_BY_ID` holds the approved missions and the user's own, nothing else.

### History: missions retired in 3.3

The 235 missions of the earlier library are kept only to show proofs made with them: `src/content/legacy-missions.json`, `{ id: { title, track, minutes, proofType, proof } }` (Business already moved to Projects; never an approved id, the validator checks). `historyMission(id)` (content/index.ts) returns the approved or own mission, else the retired one. Only history views read it:
- a proof's title when the proof kept none (screens/progress/proofView `proofTitle`; a proof made since 3.2 keeps the title it was proven with);
- the proof viewer's proof line;
- a past day's planned missions left unproven (Record › a day lists a retired one by its old title, so the rows match the planned count);
- time per area for old proofs without a timer (Record and Stats).

It never feeds the planner, swaps, `ensurePlan`, plans, notifications or widgets: a retired mission is never planned, swapped in or shown as something to do.

### Data model (`Mission` in src/core/types.ts)

| field | what |
|---|---|
| `id` | the approved id (`D1` … `O9`); its letter names its area |
| `track` | the area it counts toward (its row, its level, its swaps) |
| `title` | the founder's title: at most 64 characters, unique, no end punctuation |
| `short` | the one instruction sentence, at most 120 characters, ends with a full stop |
| `proof` | what the proof shows, at most 90 characters |
| `proofType` | `PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO` or `TIMER` (Proof types, below) |
| `minutes` | the real time it takes; 20 or less makes it a short mission (`EASY_MAX_MINUTES`) |
| `points` | set by `minutes` (below) |
| `timerMinutes` | the focus timer for `TIMER` and `TIMER_AND_PHOTO` |
| `source` | `UNSETLD` (approved) or `USER_CREATED` (the user's own) |
| `frequency` | how often it comes round: `high` (cooldown 1–2 days), `medium` (3–4), `low` (7 or more: weekly, monthly or rarer) |
| `cooldownDays` | days before it can come back after it was done (a `low` one also after it was shown) |
| `repeatable` | `true` for every approved mission |
| `anchor` | a core habit that comes back often (`CORE_SHARE`, `GOAL_CORE_SHARE` in an area the goal names): D1, D2, D5, S1, S5, F1, F5, M1, C2, C7, P1, K1, O2 |
| `group` | missions that overlap share one (`deep-work`, `study-block`, `recall`, `workout`, `cardio`, `planning`, `planning-week`, `build-block`, `draft`, `improve`, `practice-block`, `lesson`, `make`, `portfolio`, `desk`, `finish-it`); a day never holds two from one group (nor C7 with K1: The daily plan, below) |
| `when` | `evening`: tonight's (D4, S7, M1, O5, O8). `morning` (left out of a plan made between noon and 4 AM) is still understood; no approved mission uses it |
| `days` | the days of the week it can be planned, 0 = Sunday. Still understood; no approved mission uses it (S12 and M3 come round weekly by their cooldown; the planner leans plans for the week to Sunday–Tuesday) |
| `requires` | answers it needs; the approved library uses only `jobsearch` (C2) |
| `template`, `personalize` | the one slot its title fills from the user's goal or skills (Personalized titles, below) |
| `tags`, `active` | 1–8 lowercase tags, the area first: keywords a goal or weekly focus matches (`gym`, `exam`, `job` ...). `support` (P6) marks a planning task that's never an area's only mission of the day while a real one fits; `follow-up` (P11) one that follows real work the day before; `planning` on a weekly mission makes it a plan for the week |

`weight` multiplies a mission's draw weight: only C3 (Find 3 Opportunities Worth Applying To) sets one, 2, so it comes round more often among Career's missions (the validator takes 0.1–3). `also` and `fits` are still read, but no approved mission sets them. There is no `slot`, `difficulty`, `why` or `how`; the validator rejects them.

### Proof types

The founder's proof types map onto the app's four:

| founder | app |
|---|---|
| PHOTO | `PHOTO`: one photo of the thing or the result |
| TIMER | `TIMER`: the timer run to the end (no approved mission is timer only) |
| TIMER_AND_PHOTO | `TIMER_AND_PHOTO`: the timer, then a photo |
| BEFORE_AFTER | `BEFORE_AFTER`: a photo before, one after |
| COMPLETION_SCREEN, RESULT PHOTO, SCREENSHOT | `PHOTO`, with a proof line that says personal details can be hidden ("The submitted screen or confirmation. Hide anything personal.") |

A photo never pretends to prove elapsed time: a title that names a length of time (`for 30 Minutes`, `20 Minutes of Cardio`) needs `TIMER` or `TIMER_AND_PHOTO`. The one exception is `Do a 15-Minute Room Reset` (O2): before and after of the room is enough.

### Points by time

| time | points |
|---|---|
| 5–10 min | 5 |
| 15–20 min | 10 |
| 25–45 min | 15 or 20 (the approved 30-minute missions earn 15, the 45-minute ones 20) |
| over 45 min | 20 or 25 (no approved mission runs this long) |

A perfect day (every mission in the day's plan proven) adds 15 (`rules.json` `perfectDayBonus`). Missions never mention points, codes, merch or UNSETLD.

### Requirements

A mission is offered only when the user's answers allow it. The approved library uses one requirement: `jobsearch` (C2, Apply to One Job or Internship) passes only while the goal names a job or internship search (jobs, internship, hired, hiring, apply, applications, job hunt, job search; not where those words aren't a search: "Apply to college", college or scholarship applications, "Get promoted at my job") or this week's focus is Apply for jobs or internships (core/personalize `jobSearch`; `meetsRequirements(requires, profile, day)` takes the day for the focus). `school`, `highschool`, `work`, `gym`, `project`, `building`, `starting`, `age16`, `age18` and the skills are still understood; no approved mission uses them. Requirements, the time of day and the days of the week are never relaxed.

### Content rules (`npm run validate`, scripts/validate-content.mjs)

Errors fail the run:
- **Ids:** exactly the 66 approved ids, in order (one missing, extra or out of order fails); each id's letter matches its area (D discipline, S school, F fitness, M money, C career, P projects, K skills, O organization).
- **Areas:** exactly the eight, in order.
- **Every mission:** `source` `UNSETLD`; `frequency` high, medium or low with a matching cooldown (high 1–2, medium 3–4, low 7 or more); repeatable; points that match the time; a timer for a title that names a length of time (O2 excepted); `template` and `personalize` together, the template with exactly the one slot `personalize` names, and the title equal to the template with the plain default in it (`Your Project`, `One Subject`, `Your Skill`, `Job or Internship`, `Opportunities`); known requirements; tags; no retired fields.
- **Voice and safety:** no `"!"`, `"…"`, emoji or swearing; no hustle or therapy words (grind, level up, mindset, journey, your potential, you got this ...); nothing unsafe for a teen (calorie deficits, fasts and fasting, skipping meals, weigh-ins and body photos, no sleep and all-nighters, alcohol and liquor, beers, vaping and vapes, cigarettes, nicotine, weed, day, options, leveraged, crypto, stock or forex trading, casinos, gambling, betting, dares, purging, starving yourself; plurals and synonyms since the launch pass); no mention of points, codes, merch or UNSETLD.
- **Plans (programs):** approved ids only, no two from one group a day, at least two free; since the launch pass also five to fourteen days, no two plans with the same day lists, and under 80% of a plan's missions shared with any other plan (Jaccard of the mission sets). Every shipped plan is run through the real planner and must finish in exactly its days on every day shape (src/core/__tests__).
- **Retired missions:** legacy-missions.json never holds an approved id, and each entry has a title, one of the eight areas, minutes, a proof type and a proof line.

Warnings: words worth a second look for safety or privacy (diet, caffeine, crypto, selfie, face, grades, bedroom, address, location ...), except inside a privacy note ("Hide your name and any grades."). It also prints, per area, the short, focused, core, timed, before/after and low-frequency counts.

### Who gets which areas (eligibility)

An area is eligible for a user when:
- **School:** they picked School, or their goal or this week's focus is about school (grades, homework, studying, an exam, a school subject; Get caught up in school, Prepare for an exam), unless they said No to school in an earlier version (`school !== false`; onboarding no longer asks, and picking School means in school). Age alone never makes School eligible. A goal the user-text check refuses brings no area in.
- **Career:** they picked Career, or their goal names a job or internship search (`jobSearch`).
- **Projects:** they picked Projects, or said yes to Building a business or project? in an earlier version, or their goal says they're building something: it names the thing (`projectFrom`: "Launch my clothing brand"), or an app, a website, shipping or launching, a side project, a brand, a business, a shop or a startup. There's no bare "build": Build muscle is Fitness.
- **Fitness, Money, Skills, Organization, Discipline:** only when picked.
- **A weekly focus** counts as choosing its area for that week. **A plan** (program) is a choice too: its missions are placed for its days.

`eligibleAreas(profile, day)` (core/missions) lists them; tests and the simulations check every planned mission against it. The areas a day draws from (`planAreas`): this week's focus area when it isn't one of their picks, then their picks in order, then the areas their goal and answers imply (`impliedAreas`) only when they picked fewer than three. There is no fallback to an area they didn't choose (3.3 removed the old Discipline and Organization fallback); `usableAreas` can be empty. Onboarding can't finish without two areas, and before onboarding the defaults (Discipline, School, Fitness) apply.

### The daily plan (src/core/missions.ts)

- **Shape (launch pass, model J).** The time the user has decides first. One table, `DAY_SHAPE` in core/missions, is all `slotsFor`, `dayBudget`, `longestFor` and `generatePlan` read:

  | time | slots | budget | least | longest | measured: median (p90, max) |
  |---|---|---|---|---|---|
  | 15 | one short | 20 | 10 | 20 | 15 (20, 20) |
  | 30 | short + focused | 35 | 25 | 45 | 35 (40, 40) |
  | 45 | short + focused, the focused one 30+ when one is free | 55 | 40 | 45 | 45 (50, 60) |
  | 60+ Start easy | two short + focused | 65 | 55 | 30 | 60 (65, 70) |
  | 60+ Lock in | short + two focused | 75 | 60 | 45 | 65 (75, 80) |
  | 60+ Push me | short + three focused | 100 | 75 | 60 | 90 (100, 115) |

  Intensity counts only with an hour or more (Start easy never gets the 45-minute F1, F7, K4 or K6). A short slot takes a mission of 20 minutes or less and a focused slot one of 20 minutes or more, up to the day's longest (`fitsSlot`; `EASY_MAX_MINUTES`, `MAIN_MIN_MINUTES`), so a 20-minute mission fits either; `sizeOf` only labels a mission's own size. A focused slot reserves, for each short slot still to come, the shortest free mission in that slot's area (5 for Money, 20 for Fitness; a due weekly one first: `reserveFor`), not a flat 10. A short slot stretches only to what's left of the budget plus 5 (never past 20); the guarantee's step 6 allows +5 (`overshoot`); a short slot takes a short everyday mission still in its cooldown before a longer one, and a third short mission from an area already in the day beats an oversize pick. The day's last slot first tries a mission that brings the day to `least`, in its own area. A plan stored before the update keeps its shape until 4:00 AM (never replanned mid-day); `record.planned` keeps each day's own count. The most a day earns stays 4 × 20 + 15 = 95.

  **The time promise** is a test: src/core/__tests__/day-shape.sim.test.ts runs the planner over every combination of two to four areas (154) × three installs × 8 AM, 1 PM and 7 PM × seven goals, 28 days each (`SIM_FULL=1` for all 1,540 setups). Gates: the median inside the band at every choice; at least 80% of days in the band at 15 / 30 / 45 and 70% with an hour or more; p99 at most 5 over the band at 15 / 30 / 45; no day more than 10 over; a 15-minute day never over 20. Bands: 10–20, 25–35, 40–55, then 55–75, 60–80 and 75–110. Before the change the medians were 30 / 45 / 65 at 15 / 30 / 45. The copy that states the day (onboarding Time, legal.json "Your missions") is tested against the table.
- **One-mission days (15 minutes).** Areas rotate: a weekly focus leads two days in three, a goal's areas get about half the days, an area missing six days takes the day, and a plan for the week takes a Sunday-to-Tuesday day (and is always picked). Missions of 10 minutes or more are preferred.
- **Two-mission days (30 and 45).** An area that can't hold the short slot within the day's time (Fitness, whose shortest is 20) takes the focused one; a Money or Organization focused slot with no trade goes to an area with focused missions; a focused slot holding only a short or support task (or, in a focus week, nothing the focus names) takes its real work when another area can take a shorter short slot. At 45 a 20-minute mission long overdue may take the focused slot, a support task may join its area's real work, and the area the goal doesn't name takes the focused slot every other rest day.
- **Focused work stays focused.** A focused slot counts as holding the day's focused work only with a mission of 30 minutes or more (`LONG_MINUTES`); only then, or while another focused slot is still to come, may a focused slot take a short mission. If a focused slot took a short mission on the promise of a later focused one and that slot went to Money or Organization (short missions only), the day's open slots are planned again without short missions in focused slots: a day with focused slots always keeps a focused mission while one is free.
- **Areas first.** Every mission comes from one of the day's areas (above), and the plan records which area each mission is in the day for (`PlannedMission.area`; the row shows it and a swap stays in it). This week's focus area leads every day; otherwise the lead (the area the goal points at, else the first pick) leads on two days in three and the others go first on the third, in rotation. A goal naming two of the user's areas has them take turns leading and resting, and the other areas move on once every three days, so each goal area gets focused days (not only the second one). **The goal shapes the week** (spec-goal, 15 Oct 2026): when the goal names areas among the day's areas, the focused slots go to the lead and then the goal's other areas, before the areas the goal doesn't name, on every day the lead doesn't rest ("Improve grades and train consistently": School and Fitness hold the focused slots, Discipline the short one); the short slots keep their turn, so a 30-minute day (one focused slot, the lead's) and a 15-minute day (short slots only) are as before. On the lead's rest day (every third) the other areas get the focused slots, the ones the goal doesn't name included, so a picked area outside the goal still has focused missions about one day in three (`slotTracks`, `goalFocused`); when the goal names more areas than the day has focused slots ("Get a software job and improve coding" names Career, Skills and Projects), an area it doesn't name still takes one of them that day. The slot order of no goal, a goal naming only the lead, Day 1 and a week with a weekly focus (the focus leads) is unchanged. At most two missions from one area a day (`MAX_PER_AREA`), unless it's this week's focus or the user's only area. A focused slot drawn for Money or Organization (short missions only) trades areas with a short slot, so the day keeps its focused work; when the goal shapes the week and the trade gives that focused slot to an area the goal doesn't name, it fills after the lead's and the goal's ("Build a clothing brand and save money" on a day Money leads: the brand picks before Fitness, so a 45-minute workout doesn't leave it 20 minutes). On a 30-minute day, when a weekly mission is due in the area holding the focused slot, the two slots trade areas on most days (`DUE_SHARE`; `WEEK_PLAN_SHARE` for a plan for the week): the weekly mission takes the short slot and the short slot's area the focused one, so the day still covers two areas. When the short slot's area has no focused missions it waits a day; the week's focus can have both slots.
- **Core habits come back.** When an area has a core habit free, a slot takes it 45% of the time (`CORE_SHARE`), 50% in an area the goal names (`GOAL_CORE_SHARE`; not in a weekly focus week), half that when every core habit on offer was in yesterday's plan; core habits skip the "shown lately" gap. At most half, so the rest of an area gets enough slots for every mission in it to come round within a few weeks (0.6 in the goal's areas, the first proposal, left School's other missions out of whole months for a user whose goal is grades); Day 1 is still all core habits.
- **Frequency and cooldowns** (`available`). After a mission is done it waits its `cooldownDays`. Shown but not done: a high or medium one waits 2–3 days (core habits excepted), so a medium one comes round about twice a week at most. A low-frequency one (S12, M2, M3, M5, M6, C1, C5, C9, C10, P9, O9) waits its whole cooldown after being shown as well as after being done: weekly ones about once a week, M5 about monthly, M6, C9, C1 and C10 less often. Only the guarantee's last steps let it back early.
- **Rotation by turn.** Each mission's turn comes round after `TURN_DAYS` (high 2.5 days, medium 4.5) or, for a low-frequency one, its whole cooldown (`turnOf`). Its weight is multiplied by the days since it was last shown, done or swapped away over that turn, kept between 0.25 and 10 (`TURN_MIN`, `TURN_MAX`); never shown counts as fully due (10), and shown or done yesterday is at most 0.3 (`YESTERDAY_WEIGHT`). The ceiling is high because the goal and the time of day weigh missions up to three times apart, and a mission they weigh down still has to come round within a few weeks. A mission the user turned down (swapped as Not relevant, or its kind swapped again and again) doesn't build up a turn. Each recent swap still divides the weight by one more. A day never holds two from one group, nor C7 and K1 (Spend 30 Minutes Building a Career Skill and Practice Coding for 30 Minutes are the same half hour under two names; `SAME_TASK`, not a group, so swaps don't learn them as one kind), and morning-only missions drop out of a plan made between noon and 4 AM. Near-twins in one area (a group: D3 and D6, O1 and O8, the cardio missions) count together for the four days in seven, and a medium or low-frequency one isn't planned the day after its twin; both are preferences within the area, so where its twins are all it has (Fitness's short missions are both cardio) the area keeps its slot. One exception, in an area the goal doesn't name and outside a weekly focus week: a focused-only one (30 minutes or more) `OVERDUE_TURNS` behind its turn may follow a short twin. With the goal's areas holding the focused slots, Discipline holds one only on the lead's rest day, and D6 (short) always lands the day before it, so without the exception D3 would never come. With no goal, in an area the goal names and in a focus week the rule stands as it was. Once the day has a planning mission (Plan Tomorrow's Top 3, Create Your Study Plan for the Week), an area takes another of its missions when it has one.
- **Weekly missions come round on time.** When a low-frequency mission's turn has come (its cooldown is over, or it was never shown), a slot of its area takes it 40% of the time (`DUE_SHARE`), ahead of the core habits; not on Day 1. A focused slot takes one too while the day keeps a focused mission (above), so a weekly mission in an area that only ever holds a focused slot (P9 for someone whose short slot is always Money's) still comes about weekly; on a 30-minute day the slots trade areas instead (above).
- **Plans for the week at the start of the week.** S12, M3 and O9 (weekly, tagged `planning`) are due Sunday to Tuesday (`WEEK_START_DAYS`), when a slot takes one 80% of the time (`WEEK_PLAN_SHARE`); Wednesday to Saturday they weigh a fifth and wait unless two turns overdue. They aren't tied to those days (no `days`), so a week is never missed, but they don't stick to whatever weekday they first landed on.
- **The first weeks are the staples.** A mission rarer than weekly (M5, M6, C1, C9, C10) the user never had becomes due in their second week (`MissionHistory.recent` counts the days with a plan), and once a day has one weekly or rarer mission the user never had, the others wait for another day (a slot still takes one rather than stay empty).
- **Short missions that never get a short slot.** A focused slot may take a short mission three turns overdue (`OVERDUE_TURNS`; never shown counts once the user has a week of plans) in an area holding no short slot that day, so Career's and Skills' short missions (C11, K5) come round for someone whose short slot is always Organization's, and the lead area's short ones for someone with four areas. A support task (P6, Write Your Next 3 Project Actions) only joins its area's real mission (20 minutes or more, not another short task like P9); three turns overdue, a short slot takes it next to that real mission on a day of three or more missions (that area has two that day), so it comes round for someone whose Projects holds one slot a day. A follow-up (P11, Improve Something You Made Yesterday) is a last resort unless real work in its area (20 minutes or more) was proven the day before.
- **No mission on more than four days of any seven** (`MAX_DAYS_IN_WEEK`), core habits included: on the fifth, M1's area gives way to the others (Money is then in the day about six days in seven). Only the guarantee lets it back.
- **The guarantee: no empty slot.** Each step draws only from the approved library and the day's areas, and stops at the first that has a mission (`chooseForSlot`):
  1. the slot's area at the slot's size within the time left (missions shown lately wait, then are let back), then for a focused slot a shorter one there;
  2. the day's areas not in the day yet, the same way;
  3. the areas already in the day;
  4. missions the user swapped away lately;
  5. a mission already on four of the last six days, then low-frequency missions shown within their cooldown;
  6. the shortest few at the slot's size, up to the shape's overshoot (5 minutes) over the time left;
  7. the shortest few of any size, up to the day's longest mission (`longestFor`);
  8. repeatable missions still in their cooldown, relaxed as little as can be: not one done yesterday while another is left, then the one furthest through its cooldown (a weekly mission done 4 days ago before a monthly one done 4 days ago: M5 isn't back within days), then the one done longest ago.

  Nothing outside the library or the day's areas is ever returned. A slot still empty is tried once more letting a third mission into an area, so a day is never left short while an approved, eligible mission is left. Requirements (`jobsearch`), `when` and `days` are never relaxed.
- **Plans (programs).** A Plan day keeps every one of its missions, at every time choice: each goes in a slot it fits, or a slot of its own size when none fits, and a Plan day never has fewer slots than the Plan's missions for it; its placement ignores cooldowns by design. The day's own missions are added only while at least 10 minutes of the budget are left, so a Plan day can run past the time the user chose (the Plan's own time; src/core/__tests__ checks every day of every shipped plan). With a weekly focus, the focus keeps a mission (the one in the focus area, else the shortest). A plan mission ruled out by the answers, the time of day or the day of the week is left out; the day's other missions still move the plan on.
- **Swaps and RECOMMENDED FOR YOU.** A swap draws from the area the mission was in the day for, the same size first, never overlapping the rest of the day, and always through `chooseForSlot`, so only approved missions in the day's areas. The reason shapes the choices (`replacementChoices`): Too hard keeps the slot and offers only shorter missions, from the same area first, near-twins included (a 30-minute workout can become Do 20 Minutes of Cardio or Get Outside and Move for 20 Minutes; a 5–15 minute mission may have none); Too easy longer ones, up to the day's longest mission (`longestFor`), near-twins included (when it finds fewer than three, only missions at least as long fill in); Not relevant another kind (group and activity tags); Can't do this today and Already did this nothing from its group. A swap keeps a focused slot focused when the new mission fits it (a 20-minute one fits either), so the next swap there still offers focused missions. No choice is ever still in its cooldown or swapped away lately: the guarantee's last steps fill a day, never a swap. One swap a day, three with UNSETLD+. **Swap parity (launch pass):** every swap after the day's first earns at most what the mission it replaces was worth (`swapCap` in state/store; `replaceMission` and `rerollMission` plan the capped value, proof credits it, and the swap sheet shows it), the rule a mission of the user's own already followed. The first swap is unchanged for everyone, so free users see no difference and a member's day never earns more than a free user's. Can't do this today keeps the mission away for today only.
- The plan is made once per day (deterministic for the install, the day and the history) and stored with its swaps. A stored plan is kept only while every mission in it is approved or the user's own; an untouched plan holding anything else is made again.

### Personalization (src/core/personalize.ts; plain rules over the user's own answers and history, never called AI)

- **Weekly focus** ("What matters most this week?", Monday to Sunday; one picked in Sunday's review waits until Monday). Its area leads every day of the week and joins the day's areas if it wasn't one; on most days (80%) the focus area's mission is one it names or tags:

  | focus | area | missions, most fitting first | tags |
  |---|---|---|---|
  | Get caught up in school | School | S5, S6, S13, S11, S1 | homework, assignment, grades |
  | Prepare for an exam | School | S2, S9, S4, S10, S15, S3, S12 | exam, test |
  | Make progress on my business | Projects | P1, P9, P3, P4, P10 | business, brand, customers, sell, content |
  | Get back into training | Fitness | F1, F7, F5, F3, F8 | gym, workout, strength |
  | Finish my project | Projects | P1, P2, P5, P10, P12, P6 | build, launch, project |
  | Apply for jobs or internships | Career | C2, C3, C12, C1, C5 | apply, job, internship, resume |
  | Save money | Money | M3, M1, M2, M6, M5 | save, savings, budget |
  | Improve my routine · Get my space in order · Learn a skill (offered again since the launch pass, before Something else) | Discipline · Organization · Skills | D4, D1, D2, D5 · O1, O2, O8, O9, O5 · K1, K2, K3, K9, K10 | routine, habits · clean, organize · learn, practice |
  | Something else (typed, 60 characters) | the area its words point at; when they point at none, `Which area is this about?` asks (all eight plannable areas, the user's own first, School hidden for someone not in school who didn't pick it), and it can't be saved without one (`WeeklyFocus.area`) | missions its words tag | |

  The screen lists the user's own areas' options first (core/review `focusChoices`); the review hides options its areas can't plan, and Apply for jobs or internships under 16.

  When everything a focus names is short (Prepare for an exam), its short missions can fill the focused slot.
- **Goal** ("What are you working toward?"): keywords point at areas (an area it points at leads when no focus is set) and at mission tags (1.5×). A brand, clothing, a business, a shop or a startup points at Projects. Since the launch pass: school subjects (math, calculus, algebra, geometry, trig, chemistry, physics, biology, history, AP) point at School; promoted or promotion at Career; lock in and wasting time at Discipline; "spend … time" no longer points at Money, while credit card, emergency fund, impulse, afford and pay off do; TikTok, Instagram and followers point at Projects. The food row is gone (its tags matched no mission): a food goal gets the area question. When the words reach none of the user's areas, the area picked on the Goal screen (`Profile.goalArea`) comes after any areas the words reach (`leanFor`; the lean cache key includes it). A refused goal steers nothing and fills no title.
- **Day 1** (nothing planned before): the area the goal names leads whatever the date, each slot takes its area's core habit where one fits, and before 3 PM tonight's missions wait while a slightly longer real mission fits.
- **Learning** (last 28 days, `learnFrom`): a mission left undone on a day something else was proven comes up less; a kind of mission (its group, or an activity tag such as planning, recall, cardio, improve, portfolio) swapped away twice comes up less; when missions of 30 minutes or more (`LONG_MINUTES`) are mostly left while shorter ones get proven (over the last 14 days, at least six of each planned: `SHORT_LEARN_DAYS`, `SHORT_MIN_PLANNED`), focused missions stay under 30 minutes every other day (the days between still have long ones, so the user can show they do them and it can turn off again; a preference: the guarantee's steps 7 and 8 still take a longer one rather than leave a slot empty); an area proven consistently gets its 30+ minute missions more often; Too hard twice in an area means shorter missions there, Too easy twice bigger ones; morning or evening missions follow when proofs usually come in.

### What the user writes (core/safety.ts; launch pass P0-3)

Own-mission titles, the goal and the weekly focus "Something else" get the same kind of protection as the approved library: plain word and phrase rules on the phone (`checkText(text, 'mission' | 'goal' | 'focus')`), no network, no AI, nothing logged, counted or sent. Levels: `ok`; `note` (kept, with one quiet line: weight and body goals, `Missions stay on training and moving. Nothing here tracks weight or food.`); `block` (not kept as written, one line says why: fasting and calorie targets, punishment workouts and no sleep, nicotine, alcohol and drugs, betting and gambling, day, options and leveraged trading, dares and meeting people from online, adult content, passwords, card and ID numbers and addresses; an own mission about the scale); `support` (self-harm and eating-disorder signals: no hint, no area question, just `Call 988` / `Text 988` on a phone set to the US and findahelpline.com elsewhere). Quitting phrasing passes for habits ("Quit vaping", "drink less") and goes to the area question; it never passes for self-harm, eating risk, adult or private details. Phone numbers and emails are allowed in own missions. The copy is in src/content/copy/safety.ts; one line under the field after the 1.2 s pause (`ui/useSettled`); Continue, Save and Return are held, Skip and Back always work.

Read-time gates, so text saved before the check stops steering without anything being rewritten: `makeCustomMission` and `draftInput` refuse an unusable title; `recentOwn` hides one; `missionTitle` never fills a slot from an unusable goal (and the lifted phrase must itself check as ok and contain no swear word); `goalLean`, `goalPointsAt`, `jobSearch`, `impliedAreas` and the title parsers ignore refused text; `FOCUS.label` falls back to `Something else`. Proven titles are history and are never rewritten. Tests: src/core/__tests__/safety.test.ts (a 136-row table, a 290-phrase benign corpus as goal, mission and focus with zero flags, and every approved mission, plan, chip and focus label passing).

### Personalized titles (core/titles.ts)

Seven approved missions have a template with one slot, filled from the user's own words; the action never changes and nothing is generated:

| id | template | filled from | example |
|---|---|---|---|
| S1 | Study {subject} for 30 Minutes | one school subject the goal names | Pass calculus → Study Calculus for 30 Minutes |
| P1 | Work on {project} for 30 Minutes | the thing the goal says is being built | Launch my clothing brand → Work on Your Clothing Brand for 30 Minutes |
| P2 | Finish One Small Part of {project} | the same | Build and ship an app → Finish One Small Part of Your App |
| P5 | Fix One Problem With {project} | the same | Launch UNSETLD → Fix One Problem With UNSETLD |
| C2 | Apply to One {opportunity} | a field and a job or internship the goal names | Get a finance internship → Apply to One Finance Internship |
| C3 | Find 3 {opportunities} Worth Applying To | the same, plural | Find 3 Finance Internships Worth Applying To |
| K1 | Practice {skill} for 30 Minutes | the skill the goal names, else their only skill under What are you learning? | Coding → Practice Coding for 30 Minutes |

When nothing clear comes out of the goal, the approved title stands as it is. `missionTitle(mission, profile)` is the title everywhere a mission is shown to the user to do: Today's cards, the mission page, the swap sheet and its choices, Record › a day's open missions, Plans, the reminder preview and the colorway sheet, reminders and widgets. A mission of the user's own keeps its own title. A proof keeps the title it was proven under (`MissionDone.title`) next to the approved id, so the record says Work on Your Clothing Brand for 30 Minutes and analytics still see P1.

## 5. Home (root screen, route `Today`)

Colorway background. Top to bottom:
- `UNSETLD` (label, left) and `DAY 12` (mono, right: days with a proven mission).
- `12` `DAY STREAK` · `380` `POINTS` (tappable → Rewards). Under the streak, when banked: `1 OFF DAY BANKED`.
- Next reward line: `220 POINTS TO 10% OFF` (hidden when Access is off).
- `TODAY` + `0 / 3`; status line: `Three missions today.` · `2 to go.` · `Perfect day. Every mission proven.`
- Program banner if one is active: `7 DAY LOCK IN · DAY 3 OF 7`.
- **Mission rows**, one per planned mission, no labels above them:
  - `Study One Subject for 30 Minutes` (as the user reads it: `Study Calculus for 30 Minutes` for a goal of Pass calculus)
  - `School · 30 min · +15` (with `Timer` or `Before + after` when the proof needs one)
  - a small button: `START` (`TIMER 12:04` while a timer runs, `TAKE PHOTO` when it's done, `AFTER PHOTO` when a before photo is waiting).
  - Proven: the title steps back, a photo thumbnail, `PROVEN 9:47 AM · +15`. Unproven rows have a quiet `Swap`.
- When everything is proven: `Come back tomorrow for three more.`
- Weekly review card (Sunday to Tuesday until closed), bottom bar (`Progress`, `Programs`, `Rewards`, colorway), the Day 3 Access note. No quote anywhere.

## 6. Mission screen (full-screen modal)

**Detail**, and nothing more:

```
STUDY ONE SUBJECT FOR 30 MINUTES
30 MIN · +15 POINTS
Spend 30 focused minutes studying one class or subject.

PROOF
Run the 30-minute focus timer. When it ends, take a photo.
A photo of your notes or the work in front of you. After the timer.

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

> 3.2: the Progress screen is the **Record** again, redesigned around a calendar of days proven; swaps take a reason and missions of your own exist. See docs/RECORD.md.

- Streak = days in a row with at least one proven mission (today counts once proven; until then yesterday's streak stands).
- **Off Days**: one earned every 7 active days, up to 2 banked; a missed day uses one automatically. Copy: `OFF DAY` · `An Off Day covered Tuesday. Streak's still going.` · Settings/Progress explain: `Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.`
- Progress screen: title `Progress`; stats grid: `STREAK` / `LONGEST` / `MISSIONS` / `POINTS` / `FOCUSED` (4h 20m) / `THIS WEEK` (completion %); the active-days barcode; **Levels**: each chosen area first, then any other area with points: `SCHOOL` `LEVEL 4` thin bar `60 / 150`; **Milestones** (eight since the launch pass): First mission, First 10 missions, First perfect day, 7 days, First plan, 30 missions, 100 missions, 30-day streak (reached = bone square + date; not yet = outline + progress `12 / 30`); **This week** block with `See the week →`; Proof gallery link; Settings link (top right). UNSETLD status (a discount code at each tier, since 3.2) lives on Rewards; its day counts are active days.
- Milestone reached → a letter-style moment on Home (once): `30 MISSIONS.` `Never settle for less.` `Close`. Since the launch pass one full-screen moment a day at most (core/moments `dueMoment`): a Plan finished today or yesterday comes first and stands in for the milestones reached with it, and a status letter due the same day waits for the next.
- **Completion (launch pass):** the streak measures showing up; completion measures how much of those days was done. `completionIn(record, plans, from, to)` counts only days with a proof, each at its own size (`record.planned`, then the plan, then proven); today counts after its first proof; the percent is 100 only when complete, else 1–99, hidden with nothing to count. Stats: one Completion card (`This week` `76%` / `13 of 17 missions proven · 3 perfect days`, `Last 30 days` once the record goes back 8 days or more, `Counted on the days you showed up.`), and All time adds Perfect days and Plans finished when above 0. The weekly review reads `Missions proven 13 / 17` and `Days proven`; the Record's month line `18 days proven · 42 of 51 missions`. Today is unchanged, except that a zero streak reads `Prove a mission today to start a streak`.

## 9. Weekly review (WeeklyReview screen)

`THIS WEEK` (label) + dates. Big numbers: missions completed, focused time, points earned, perfect days. `Strongest area: School`. Each proof counts for the area its day's plan put it in. If one of the user's areas was left out: `Didn't get to: Fitness.` (never shaming). Only areas that can get missions with the user's answers are named, offered or promised (no School for someone not in school). `NEXT WEEK` — `Pick one area to focus on.` chips of those areas → sets `profile.priority`, which leads the plan on two days in three. Footer: `Never settle for less.` Button `Done`.

## 10. Rewards

- Tiers from content/rewards.json, replaced by unsetld.com's config when it sends `rewards` (id, title, detail, type, points, percent, maxOff, active, availableFrom/Until, codeValidDays, inventory, perCollection).
- Rewards screen: title `Rewards`; balance `380 POINTS`; next reward block with a bar and `220 POINTS LEFT`; tier list with status (`READY` / `150 TO GO` / `USED THIS COLLECTION` / `NOT AVAILABLE`); tapping a ready tier → confirm → account (if needed) → redeem → code + `Use it at unsetld.com` + expiry; Your codes; Access; terms link. Points are earned only by proven missions; Full Edition doesn't change them.
- On the done screen and Home, rewards are a quiet line, never a popup.

## 11. Programs

Optional multi-day runs (content/programs.json; "Plans" in the UI since 3.1): id, title, short, days, tracks (areas), free, plan (1–2 approved mission ids per day; no two from one group). Since 3.3 every plan uses approved ids only (the validator checks), each kept its id, name and free flag, and a plan places its day's missions whatever their cooldown:

| id | name | area | free | days |
|---|---|---|---|---|
| `lock-in-7` | 7 Day Lock In | Discipline | yes | D4 + D1 · D2 · D5 + D4 · D6 + D1 · D3 · D1 · D4 + D2 |
| `get-organized` | Get Organized | Organization | yes | O1 · O2 + O5 · O8 · O9 · O2 |
| `school-reset` | School Reset | School | | S12 · S5 · S1 + S7 · S11 · S9 + S2 · S3 · S15 + S10 |
| `build-something` | Build Something | Projects | | P6 + P1 · P1 · P2 · P7 · P5 · P1 + P11 · P10 |
| `fitness-base` | Fitness Reset | Fitness | | F2 · F5 · F3 · F5 · F6 · F5 · F2 |
| `business-week` | Business Week | Projects | | P6 + P1 · P9 · P3 · P4 · P1 · P7 · P10 |

Get Organized's line is now "Five days to clear your space and get ready for the week." (the old one promised a files mission the library no longer has). School Reset's first day is S12 on its own.

Programs screen: list with the edition, title, what it is, `7 days · Discipline`, `Start`; the active program at the top with `DAY 3 OF 7`, today's (or tomorrow's) missions as rows like Home's (`Work With Your Phone Away for 30 Minutes` / `Discipline · 30 min · +15 · Timer + photo`, with Home's VoiceOver wording and the user's titles), `Leave program`. A run with every day proven shows FINISHED with `Clear`, even without a finish date. Business Week's id is `business-week` (an earlier build used `project-mode` for a different program; that id is cleared). A program whose missions need an answer the user hasn't given shows `Needs a yes to In school or college? in About you.` instead of Start, and a running one stops when the answers change that way (the days proven stay). Since 3.3 no built-in program can: no approved School mission needs school (School Reset runs for anyone who starts it), and the only requirement left is C2's job search, which no program holds. A program day moves on once one of its missions is proven, so missing a day never fails it. One program at a time. Free: 7 Day Lock In and Get Organized; the rest need UNSETLD+. **Finishing one (launch pass):** the proof that finishes a Plan writes `{ id, finished }` to `record.plansFinished` (core/programs `recordPlanFinish`, once per id and day; Clear, leaving and starting another Plan never remove it; it's in the Keychain copy), and Today shows one restrained moment, once: `Finished 18 Oct` / `7 DAY LOCK IN.` / `Seven days. Each one proven.` / `Never settle for less.` (VoiceOver: `7 Day Lock In, finished. Seven days. Each one proven.`; a soft haptic; a fade under Reduce Motion; no points). The first one is the 8th achievement, First plan (`plan-1`). Store v8 backfills a finish saved before, and marks its moment shown when it's older than yesterday. An UNSETLD+ plan started as a member runs to its end if the membership lapses (nothing is taken away mid-plan); starting another needs UNSETLD+ again.

## 12. UNSETLD+ (was Full Edition)

| | Free | UNSETLD+ |
|---|---|---|
| Daily missions, proof, points, streak, levels, weekly focus and review, rewards and status | Yes | Yes |
| Plans | 2 (7 Day Lock In, Get Organized) | All six |
| Colorways | Black | All ten |
| Swaps | 1 a day | 3 a day (each after the first earns at most what it replaces) |
| Reminders | Up to 3 a day | Up to 10 a day |

Paywall rows (core/features order: plans first, reminders, a convenience, last): `All six plans instead of two` · `All ten colorways, in the app and on your widgets` · `Three swaps a day instead of one` · `Up to ten reminders a day instead of three`; ALWAYS FREE says membership never changes what you earn. No promise of content that isn't in the app ("and new ones each season" is gone).

**Purchases fail closed (launch pass P0-1).** `purchaseModeFor` (services/purchases): `revenuecat` only on an iPhone build with an App Store key (`appl_`, or any key in a dev build); otherwise `preview` in dev builds and the browser preview (labelled "Preview build. No charge."); otherwise `unavailable`: plans, purchase and restore throw, membership reads inactive, and the paywall says `UNSETLD+ isn't available right now.` / `Everything free still works.` A membership unlocked in preview mode is cleared at launch in any non-preview build (state/premium `guardPremium`). `scripts/check-release-env.mjs` (the `eas-build-pre-install` hook) stops a production build without an `appl_` key.

**The trial comes from the store (P1-10).** core/trial reads the intro offer (unit × count, only when its price is 0); the row reads `{length} free, then billed yearly`, the fine print names the length and auto-renewal, and a dated timeline shows TODAY · Everything opens / the reminder day (only when notifications are on and the trial runs longer than a day) / the first charge. `Subscribe` is disabled while prices load or fail; Annual is the default. The reminder follows the entitlement: `syncTrialReminder` schedules `trial-end` 24 hours before the store's trial end (none when that's under an hour away), cancels the legacy `trial-day2`, checks permission, and runs after launch, foreground, purchase and restore; the latest membership answer wins. Ask to Buy shows `Waiting for approval.`; a purchase without the entitlement `Purchase received.`; restore saves the real entitlement; the You row reads `Free trial, ends 22 Oct` or `Annual, ends 22 Oct 2026` for a cancelled membership.

## 13. Notifications and widgets

- **Reminders are offered after the first proof (launch pass P1-3).** A card on Today, in the weekly focus card's place and only when that question isn't showing: something proven today, reminders off, notifications not turned off for the app, and the offer new or first shown today. `Get reminded about open missions?` / `Up to 3 a day, 7:00 AM to 10:00 PM. None once the day is proven.` / `Turn on` / `Not now`; either button settles it for good (`reading.remindersOffer = 'done'`). The permission ask at the first timer stays.
- **The pending budget (P1-13, core/reminders).** iOS keeps 64 pending notifications per app and drops the rest without a word. The app keeps 4 free and holds one place for the timer's "done", one for the trial reminder and two for drop alerts: 56 reminders (days ahead: floor(56 / a day's count): 56, 18, 11, 5 for 1, 3, 5, 10 a day). Only the next two drop alerts are scheduled. After each rebuild `overBudget` cancels ids the app doesn't schedule (allowlist `rem-`, `drop-`, `timer-done`, `trial-end`) and then the latest reminders until 60 are left. The timer's "done" isn't scheduled when it would fire after that day's 4:00 AM.
- Reminders name missions by title, as the user reads it (§4, Personalized titles). First of the day: `Today: Study One Subject for 30 Minutes, Complete Your Workout, Plan Tomorrow's Top 3.` Later ones name what's left (`2 missions left. Complete Your Workout takes 45 minutes.`) and stop once everything is proven. The last one, only while nothing is proven today: `Last call: 1 mission left to keep the streak.` A day with no plan yet: `Two missions are waiting.` (the default day's count, `slotsFor`; `One mission is waiting.` at 15 minutes) or a plain prompt from `reminders.json`. Timer end: `30:00 done. Take the proof photo.` (TIMER_AND_PHOTO) or `30:00 done. Open the mission and mark it done.` (TIMER).
- Widgets: **Next mission** (Line): `NEXT MISSION`, the title (personalized as on Today), `School · 30 min · +15` and `1 / 3`; tap opens the mission. **Today** (Standard, Lock Screen): the day's mission titles with a square each, filled once proven, and `1 / 3`. **Streak** (Record): streak, points, active-days barcode.

## 14. Removed

Quote library and everything on it (line on Today, line share card, saved lines, your lines, strong language), the three standard rules and the standard screen, the night check, the old daily task library (tasks.json), chapters (replaced by areas), own tasks (replaced by swaps and programs). With the redirect: the Quick Win / Progress / Challenge slots and labels and their fixed points (10 / 15 / 25), `difficulty`, `why` and `how` (WHY THIS MATTERS, HOW TO DO IT), the seven 3.0 tracks (Focus & Discipline, Fitness & Energy, School & Learning, Money & Career, Skills & Projects, Life Reset, Confidence & Mindset) and the 313-mission library written for them. Old proofs keep their stored slot (`quick` / `progress` / `challenge`) and points; nothing reads the slot. With 3.3 (the approved library): the 235-mission library that followed (kept only as history, §4), the Business area (now Projects), the fallback to Discipline and Organization for a user with no usable area, and every way a mission outside the approved 66 could be planned.

## 15. Build notes (9 Oct 2026)

Where these notes and the sections above differ, the notes describe the app as built, except for the library, its areas and plans, where 3.3 (§2, §4, §11) wins.

- **Library (3.0, retired in 3.3): 218 missions, 216 active** (`Bike for 30 Minutes` and `Prepare Your Workspace` retired), written in `scripts/missions/library.py`: School 32, Career 29, Skills 27, Business 26, Fitness 24, Organization 23, Money 21, Projects 21, Discipline 13. 102 easy and 114 focused, 39 core habits; most are photo proofs, then timer + photo, before + after and timer only. `npm run validate` prints the current per-area counts.
- **Groups.** Missions that overlap share a `group` (the 3.0 library's were `deep-work`, `study`, `assignment`, `workout`, `cardio`, `tomorrow-ready`, `skill-session`, `room`, `computer` ...; the approved library's are in §4). A day never holds two from one group: the planner, swaps and program days all respect it, and the validator rejects a program day with two.
- **Six programs** (`src/content/programs.json`): 7 Day Lock In (7 days, Discipline, free), Get Organized (5 days, Organization, free), School Reset (7 days, School), Build Something (7 days, Projects), Fitness Reset (7 days, Fitness; id `fitness-base`), Business Week (7 days, Projects since 3.3).
- **Off Days** (`src/core/streak.ts`, `rules.json`: `offDayEvery` 7, `offDayMax` 2): one is earned on every 7th active day, up to 2 banked, and a missed day uses one automatically. A covered day keeps the streak going but doesn't add to it. Off Days cover the streak only; Access counts proven days.
- **Proof retention** (Settings → Proof photos: `30 days` / `1 year` / `Keep`; default from `rules.json` `proofRetentionDays`, 30). Expired photos are deleted from the phone at launch and each time the app comes back to the foreground; the mission, its points and its fingerprint stay. Choosing a shorter time asks first.
- **Rewards are discounts only**: 5% off (300), 10% off (600) and 15% off (1,000), each up to $25 off. Free shipping was taken out (5% off took its place as the first reward, about six perfect days in); a code already taken keeps its name under Your codes.
- **Rewards config.** unsetld.com's `config.json` may send `rewards`; each entry is checked on the phone, bad entries and repeated ids are dropped, and if none is valid the built-in tiers stay. The redeem body is `{ rewardId, points, type, percent }` and its errors are `used`, `short` and `unavailable` ([ACCESS.md](ACCESS.md)).
- **Access days** are days with a proven mission, plus days already on record from 2.x. The 2.x balance (10 points a proven task, at most 4 a day, minus the codes already taken) carries over as an opening balance (`src/core/legacy.ts`, `src/core/rewards.ts`).
- **Tester tools** (Progress → Settings → Tester tools; dev builds and the browser preview only, never a release build): the app's idea of today, streak, points and active days at the top; flags for Full Edition, timers 60× faster and Access enabled; *Prove today's missions* (skips the camera; accepted on the phone with a placeholder photo, or with none for a timer-only mission); *Add 20 days of proven missions* (plans each day from the user's areas and answers, as the store would, and proves it); time travel (next day, jump 6 / 23 / 60 days proving one mission a day, disappear for 15 days, back to the real today with the record from before the first jump); restart onboarding; clear the record. Notifications keep the real clock.
