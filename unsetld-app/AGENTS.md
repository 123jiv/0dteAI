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

- This project deliberately uses **React Navigation directly** (`src/navigation/RootNavigator.tsx`: a native stack whose `Main` route holds the four bottom tabs, Today / Progress / Rewards / You, with the custom `src/ui/TabBar.tsx`), not Expo Router: the browser preview (`npm run build:preview`) must never touch the page URL so the single-file build works when opened from any link or file. Don't migrate to Expo Router without solving that.
- Deep links and notification taps become intents (`src/state/intents.ts`, listened for in `src/state/lifecycle.ts` and, for notification taps, at module scope in `index.ts` so a tap that cold-starts the app is heard) that `src/App.tsx` routes once navigation is ready:
  - `unsetld://today` → the Today tab (`popTo('Main', { screen: 'Today' })`)
  - `unsetld://progress` → the Progress tab (`unsetld://record` still works, for 2.x widgets and links)
  - `unsetld://mission/<id>` → that mission (the Next mission widget) when it's in today's plan and not proven yet; otherwise Home
  - 2.x links (`unsetld://line/412`, `unsetld://night-check`) open Home. There is no night check any more and no actionable notification buttons.
  - Notification taps: the focus timer's "done" alert opens its mission; reminders and drop alerts (a heads-up 24 hours before a drop) open Today.
- Screens (3.1, `docs/UX_REDESIGN.md`): onboarding `Name` → `Tracks` (Areas, pick 2–4) → `AboutYou` → `Pace` (15 / 30 / 45 / 60+ min) → `Goal` → `Day` (reminders) → `Main` (no widget guide or paywall in onboarding). Tabs under `Main`: `Today` (`src/screens/home/`), `Progress` (`src/screens/progress/`), `Rewards` (`src/screens/rewards/`), `You` (`src/screens/you/`, which holds what Settings used to). Stack screens: `Mission` (full-screen modal: detail, timer, before/after, review, done; `src/screens/mission/`), `Share` (9:16 card, `src/screens/share/`), `Plans` (`src/screens/plans/`; "Plans" in the UI, `program` in code), `WeeklyFocus`, `WeeklyReview`, `Moment`, `ProofHistory`, `Achievements`, `Stats`, `AllRewards`, `RewardHistory`, `HowPoints`, `Status`, `Goal`, `Account`, `Paywall` (UNSETLD+), `Widget`, `Doc` / `DocSheet`, `Milestone`, `Letter`, `DevTools` (tester tools, dev and preview builds only). The colorway sheet is `src/screens/today/ColorwaySheet.tsx`. Free vs UNSETLD+ lives in `src/core/features.ts`; the core loop is never behind it.
- Pure logic lives in `src/core/` (unit-tested with `npm test`); editable content in `src/content/*.json`; strings in `src/content/copy/*.ts`.
- Areas: eight (`discipline`, `school`, `fitness`, `money`, `career`, `skills`, `projects`, `organization`; `TrackId` in code, "areas" in the UI). Users pick two to four (one kept from an earlier version still works). Business was folded into Projects in 3.3 (store v7 maps `business` → `projects`; the weekly focus `business` stays and leans Projects). The ids `focus`, `reset` and `mindset` are gone too; the store migration maps them onto discipline and organization.
- The built-in library is exactly the founder's 66 approved missions (3.3; ids `D1` … `O9` with deliberate gaps, listed in `docs/MISSIONS_SPEC.md` §4). Only approved ids are ever planned, swapped in, recommended or placed by a plan (`MISSIONS`, `APPROVED_IDS`, `isApproved` in `src/content/index.ts`): no fallback lists, no generated missions, no LLM. Never add, rename or reword a mission and never renumber an id; retiring one is the founder's decision. Missions of the user's own carry `source: 'USER_CREATED'` (approved ones `UNSETLD`). The 235 retired missions live in `src/content/legacy-missions.json` for showing old proofs only (`historyMission`); never use it in planning, swaps, notifications or widgets. A mission's title as the user sees it is `missionTitle(mission, profile)` (core/titles; `useMissionTitle` in screens): use it wherever a mission is shown to do.
- Missions are plain, high-value actions ("Study One Subject for 30 Minutes"): a title, `minutes`, `points`, one `short` instruction sentence, a `proof` line and a `proofType` (`PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO`, `TIMER`). There are no Quick Win / Progress / Challenge labels and no `slot`, `difficulty`, `why` or `how` fields; `MissionSlot` (`easy` | `main`) is only a mission's place in the day's plan, never a label. Don't add motivational copy to missions or to the mission screen.
- The library is `scripts/missions/library.py` (never edit `src/content/missions.json` by hand): run `python3 scripts/missions/library.py` to regenerate the JSON, then `npm run validate`. Metadata (tags, cooldowns, groups) can change there; titles, instructions and ids can't. Points follow minutes (5–10 min 5, 15–20 min 10, 25–45 min 15–20); the daily plan logic is `src/core/missions.ts` (the time choice first: 15 min is two short missions (20 minutes or less), 30 one short and one focused, 45 one short and two focused, 60+ by intensity with Push me adding a focused one, within `dayBudget`; only areas the user chose, this week's focus, or ones their goal implies (`eligibleAreas`, `planAreas`), never a fallback area; at most two missions from one area a day; low-frequency missions wait their cooldown after being shown too; an empty slot is filled through the guarantee steps, never from outside the library or the plan areas; swaps stay in the planned area; requirements (only `jobsearch` in the approved library), `when` and `days` are never relaxed).
- Content: run `npm run validate` after editing anything in `src/content/`. It checks `missions.json` (exactly the 66 approved ids in order with their approved titles word for word, each id's letter matching its area, source, frequency (the weekly or rarer ones by id) and cooldowns, `jobsearch` on C2 only, points by minutes, proof types and timers, templates, requirements, no retired fields, voice and teen-safety rules; missions never mention points or UNSETLD), `legacy-missions.json` (never an approved id), `programs.json` (approved ids only; no two from one group a day; at least two free), `rewards.json`, `rules.json`, `tracks.json` (the eight areas), `colorways.json` and `reminders.json`. Errors fail the run; warnings are worth a look. Mission ids are permanent: completions, plans and programs refer to them.
- `docs/UX_REDESIGN.md` is the spec for screens, navigation and copy; `docs/MISSIONS_SPEC.md` for the mission model, the planner, proof and rewards rules; both win over older specs. Personalization (weekly focus, goal text, learning from what the user did) is plain rules in `src/core/personalize.ts`; never call it AI. The design spec (`docs/DESIGN_SPEC.md`) still holds tokens, type, colorways, the walker and the paywall layout. Use the tokens and primitives in `src/ui/` (`T`, `Button`, `Square`, `Segmented`, `Sheet`, …); red (`color.signal`) means "today" on the active-days barcode and appears nowhere else.
- Proof copy never says a photo was verified by AI: the checks run on the phone and look at when and how a photo was taken (and, for TIMER missions, that the timer ran to the end), not at what's in it.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
