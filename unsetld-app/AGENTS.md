This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This project deliberately uses **React Navigation directly** (`src/navigation/RootNavigator.tsx`: a native stack whose `Main` route holds the bottom tabs, Today / Record / Rewards / You (Rewards only while rewards are on or a code taken still works), with the custom `src/ui/TabBar.tsx`), not Expo Router: the browser preview (`npm run build:preview`) must never touch the page URL so the single-file build works when opened from any link or file. Don't migrate to Expo Router without solving that.
- Deep links and notification taps become intents (`src/state/intents.ts`, listened for in `src/state/lifecycle.ts` and, for notification taps, at module scope in `index.ts` so a tap that cold-starts the app is heard) that `src/App.tsx` routes once navigation is ready:
  - `unsetld://today` → the Today tab (`popTo('Main', { screen: 'Today' })`)
  - `unsetld://record` → the Record tab (3.1's `unsetld://progress` still works)
  - Links and notification taps wait until the age gate has passed (`settings.ageCheck === 'ok'`).
  - `unsetld://mission/<id>` → that mission (the Next mission widget) when it's in today's plan and not proven yet; otherwise Home
  - 2.x links (`unsetld://line/412`, `unsetld://night-check`) open Home. There is no night check any more and no actionable notification buttons.
  - Notification taps: the focus timer's "done" alert opens its mission; reminders and drop alerts (a heads-up 24 hours before a drop) open Today.
- Screens (`docs/UX_REDESIGN.md`, `docs/RECORD.md`, launch pass 19 Oct 2026): onboarding `Name` → `Age` (the 13+ gate; `AgeBlocked` for under 13) → `Tracks` (Areas `01 / 03`, pick 2–4) → `Pace` (Time `02 / 03`: 15 / 30 / 45 / 60+ min, intensity only at 60+) → `Goal` (`03 / 03`, finishes onboarding) → `Main` (no About you, reminders step, widget guide or paywall in onboarding). The start route is `startRoute(settings)` in `src/core/age.ts`. Tabs under `Main`: `Today` (`src/screens/home/`), `Record` (`src/screens/progress/`), `Rewards` (`src/screens/rewards/`), `You` (`src/screens/you/`, which holds what Settings used to). Stack screens: `Mission` (full-screen modal: detail, timer, before/after, review, done; `src/screens/mission/`), `Share` (9:16 card, `src/screens/share/`), `Plans` (`src/screens/plans/`; "Plans" in the UI, `program` in code), `WeeklyFocus`, `WeeklyReview`, `Moment` (a milestone `{ key }` or a Plan finish `{ plan, day }`), `ProofHistory`, `RecordDay`, `Achievements`, `Stats`, `AllRewards`, `RewardHistory`, `HowPoints`, `Status`, `AboutYou` (You › What you're learning), `Day` (You › Reminders), `Account`, `DeleteData` (You › YOUR DATA), `Paywall` (UNSETLD+), `Widget`, `Doc` / `DocSheet`, `Milestone`, `Letter`, `DevTools` (tester tools, dev and preview builds only). The colorway sheet is `src/screens/today/ColorwaySheet.tsx`. Free vs UNSETLD+ lives in `src/core/features.ts`; the core loop is never behind it.
- Pure logic lives in `src/core/` (unit-tested with `npm test`); editable content in `src/content/*.json`; strings in `src/content/copy/*.ts`.
- Areas: eight (`discipline`, `school`, `fitness`, `money`, `career`, `skills`, `projects`, `organization`; `TrackId` in code, "areas" in the UI). Users pick two to four (one kept from an earlier version still works). Business was folded into Projects in 3.3 (store v7 maps `business` → `projects`; the weekly focus `business` stays and leans Projects). The ids `focus`, `reset` and `mindset` are gone too; the store migration maps them onto discipline and organization.
- The built-in library is exactly the founder's 66 approved missions (3.3; ids `D1` … `O9` with deliberate gaps, listed in `docs/MISSIONS_SPEC.md` §4). Only approved ids are ever planned, swapped in, recommended or placed by a plan (`MISSIONS`, `APPROVED_IDS`, `isApproved` in `src/content/index.ts`): no fallback lists, no generated missions, no LLM. Never add, rename or reword a mission and never renumber an id; retiring one is the founder's decision. Missions of the user's own carry `source: 'USER_CREATED'` (approved ones `UNSETLD`). The 235 retired missions live in `src/content/legacy-missions.json` for showing old proofs only (`historyMission`); never use it in planning, swaps, notifications or widgets. A mission's title as the user sees it is `missionTitle(mission, profile)` (core/titles; `useMissionTitle` in screens): use it wherever a mission is shown to do.
- Missions are plain, high-value actions ("Study One Subject for 30 Minutes"): a title, `minutes`, `points`, one `short` instruction sentence, a `proof` line and a `proofType` (`PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO`, `TIMER`). There are no Quick Win / Progress / Challenge labels and no `slot`, `difficulty`, `why` or `how` fields; `MissionSlot` (`easy` | `main`) is only a mission's place in the day's plan, never a label. Don't add motivational copy to missions or to the mission screen.
- The library is `scripts/missions/library.py` (never edit `src/content/missions.json` by hand): run `python3 scripts/missions/library.py` to regenerate the JSON, then `npm run validate`. Metadata (tags, cooldowns, groups) can change there; titles, instructions and ids can't. Points follow minutes (5–10 min 5, 15–20 min 10, 25–45 min 15–20); the daily plan logic is `src/core/missions.ts` (the time choice first, from the one `DAY_SHAPE` table (model J): 15 min is one mission of 20 minutes at most, 30 and 45 one short (20 minutes or less) and one focused, 60+ by intensity (Start easy two short and one focused, Lock in one short and two focused, Push me one short and three focused), within `dayBudget` (20 / 35 / 55 / 65, 75 or 100); intensity changes nothing below an hour; `src/core/__tests__/day-shape.sim.test.ts` holds the time promise as gates, and copy that states the day is tested against the table; a Plan day keeps every Plan mission; only areas the user chose, this week's focus, or ones their goal implies (`eligibleAreas`, `planAreas`), never a fallback area; at most two missions from one area a day; every mission takes its turn (`turnOf`: a weekly one whose turn has come goes first on most days, plans for the week on Sunday to Tuesday) and none comes up on more than four days of any seven; a day with focused slots keeps a focused mission (30 minutes or more once a focused slot holds a short one); low-frequency missions wait their cooldown after being shown too; an empty slot is filled through the guarantee steps, never from outside the library or the plan areas; swaps stay in the planned area; requirements (only `jobsearch` in the approved library), `when` and `days` are never relaxed).
- Content: run `npm run validate` after editing anything in `src/content/`. It checks `missions.json` (exactly the 66 approved ids in order with their approved titles word for word, each id's letter matching its area, source, frequency (the weekly or rarer ones by id) and cooldowns, `jobsearch` on C2 only, points by minutes, proof types and timers, templates, requirements, no retired fields, voice and teen-safety rules; missions never mention points or UNSETLD), `legacy-missions.json` (never an approved id), `programs.json` (approved ids only; no two from one group a day; at least two free), `rewards.json`, `rules.json`, `tracks.json` (the eight areas), `colorways.json` and `reminders.json`. Errors fail the run; warnings are worth a look. Mission ids are permanent: completions, plans and programs refer to them.
- `docs/UX_REDESIGN.md` is the spec for screens, navigation and copy; `docs/MISSIONS_SPEC.md` for the mission model, the planner, proof and rewards rules; both win over older specs. Personalization (weekly focus, goal text, learning from what the user did) is plain rules in `src/core/personalize.ts`; never call it AI. The design spec (`docs/DESIGN_SPEC.md`) still holds tokens, type, colorways, the walker and the paywall layout. Use the tokens and primitives in `src/ui/` (`T`, `Button`, `Square`, `Segmented`, `Sheet`, …); red (`color.signal`) means "today" on the active-days barcode and appears nowhere else.
- What the user types (own-mission titles, the goal, the weekly "Something else") goes through `checkText` in `src/core/safety.ts` (rules on the phone, never sent, never logged). Read it, don't bypass it: titles, leans and the focus label already gate on `usableText`.
- UNSETLD+ never raises what a day earns: swaps after the first are capped (`swapCap` in `src/state/store.ts`). Purchases fail closed (`purchaseModeFor` in `src/services/purchases.ts`): never unlock UNSETLD+ in a build that can't reach the App Store.
- Notification ids are fixed: `rem-*`, `drop-*`, `timer-done`, `trial-end` (`trial-day2` is legacy and cancelled). Anything else pending is cancelled by `overBudget`; keep within the budget in `src/core/reminders.ts` (56 reminders).
- Delete data on this phone (`deleteLocalData` in `src/services/wipe.ts`) must reach anything new that stores data on the phone: a new storage key, Keychain item, file folder or notification kind needs a line there and in `wipe.test.ts`.
- Proof copy never says a photo was verified by AI: the checks run on the phone and look at when and how a photo was taken (and, for TIMER missions, that the timer ran to the end), not at what's in it.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
