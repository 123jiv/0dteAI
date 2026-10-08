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

- This project deliberately uses **React Navigation directly** (`src/navigation/RootNavigator.tsx`, one native stack, no tab bar), not Expo Router: the browser preview (`npm run build:preview`) must never touch the page URL so the single-file build works when opened from any link or file. Deep links (`unsetld://line/{no}`, `today`, `record`, `night-check`) and notification taps become intents (`src/state/intents.ts`, listened for in `src/state/lifecycle.ts` and `index.ts`) that `src/App.tsx` routes once navigation is ready. Don't migrate to Expo Router without solving that.
- Screens live in `src/screens/`; pure logic in `src/core/` (unit-tested with `npm test`); editable content in `src/content/*.json` (`npm run validate`).
- The design spec (`docs/DESIGN_SPEC.md`) and copy deck (`docs/COPY_DECK.md`) are the source of truth for UI. Use the tokens and primitives in `src/ui/` (`T`, `Button`, `Square`, `Segmented`, `Sheet`, …); red (`color.signal`) means "today" on the record and appears nowhere else.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
