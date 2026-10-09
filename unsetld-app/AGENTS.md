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

- This project deliberately uses **React Navigation directly** (`src/navigation/RootNavigator.tsx`, one native stack, no tab bar), not Expo Router: the browser preview (`npm run build:preview`) must never touch the page URL so the single-file build works when opened from any link or file. Don't migrate to Expo Router without solving that.
- Deep links and notification taps become intents (`src/state/intents.ts`, listened for in `src/state/lifecycle.ts` and, for notification taps, at module scope in `index.ts` so a tap that cold-starts the app is heard) that `src/App.tsx` routes once navigation is ready:
  - `unsetld://today` → Home (route `Today`)
  - `unsetld://progress` → Progress (`unsetld://record` still works, for 2.x widgets and links)
  - `unsetld://mission/<id>` → that mission (the Next mission widget) when it's in today's plan and not proven yet; otherwise Home
  - 2.x links (`unsetld://line/412`, `unsetld://night-check`) open Home. There is no night check any more and no actionable notification buttons.
  - Notification taps: the focus timer's "done" alert opens its mission; reminders and drop alerts open Home (an early drop alert then opens the Day 7 page).
- Screens (3.0): onboarding `Name` → `Tracks` (shown as Areas) → `AboutYou` → `Pace` → `Day` (reminders) → `Widget` → `Paywall`; `Today` (Home, `src/screens/home/`), `Mission` (full-screen modal: detail, timer, before/after, review, done; `src/screens/mission/`), `Progress`, `WeeklyReview`, `Moment` (`src/screens/progress/`), `Rewards` (`src/screens/rewards/`), `Programs` (`src/screens/programs/`), `Settings`, `Account`, `Doc` / `DocSheet`, `Milestone`, `Letter`, `ProofGallery`, `DevTools` (tester tools, dev and preview builds only). The colorway sheet is `src/screens/today/ColorwaySheet.tsx`.
- Pure logic lives in `src/core/` (unit-tested with `npm test`); editable content in `src/content/*.json`; strings in `src/content/copy/*.ts`.
- Areas: nine (`discipline`, `school`, `fitness`, `money`, `career`, `business`, `skills`, `projects`, `organization`; `TrackId` in code, "areas" in the UI). Users pick one to four. The ids `focus`, `reset` and `mindset` are gone; the store migration maps them onto discipline and organization.
- Missions are plain, high-value actions ("Study for 30 Minutes"): a title, `minutes`, `points`, one `short` instruction sentence, a `proof` line and a `proofType` (`PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO`, `TIMER`). There are no Quick Win / Progress / Challenge labels and no `slot`, `difficulty`, `why` or `how` fields; `MissionSlot` (`easy` | `main`) is only a mission's place in the day's plan, never a label. Don't add motivational copy to missions or to the mission screen.
- Editing missions: change `scripts/missions/library.py` (never `src/content/missions.json` by hand), run `python3 scripts/missions/library.py` to regenerate the JSON, then `npm run validate`. Points follow minutes (5 / 10 / 15–20 / 20 / 25); the daily plan logic is `src/core/missions.ts` (one easy + two focused missions, Push me three focused; core habits come back on most days; swaps stay in the same area; morning missions drop out of plans made after noon; requirements include skills).
- Content: run `npm run validate` after editing anything in `src/content/`. It checks `missions.json` (ids `<area>-<slug>`, points by minutes, proof types and timers, requirements, groups and weights, no retired fields, voice and teen-safety rules; missions never mention points or UNSETLD), `programs.json` (known, active missions; no two from one group a day; at least two free), `rewards.json`, `rules.json`, `tracks.json`, `colorways.json` and `reminders.json`. Errors fail the run; warnings are worth a look. Mission ids are permanent: completions, plans and programs refer to them, so retire a mission with `active: false` instead of renaming or deleting it.
- `docs/MISSIONS_SPEC.md` is the product spec and wins over older specs. The design spec (`docs/DESIGN_SPEC.md`) still holds tokens, type, colorways, the walker and the paywall layout. Use the tokens and primitives in `src/ui/` (`T`, `Button`, `Square`, `Segmented`, `Sheet`, …); red (`color.signal`) means "today" on the active-days barcode and appears nowhere else.
- Proof copy never says a photo was verified by AI: the checks run on the phone and look at when and how a photo was taken (and, for TIMER missions, that the timer ran to the end), not at what's in it.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
