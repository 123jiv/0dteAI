# UNSETLD

**Daily missions you do in real life and prove with the camera. Points, a streak, and rewards at unsetld.com.**

UNSETLD 3.0 is a mission app for ages 13–25, from the clothing brand of the same name ("unsettled" minus two letters; *never settle for less*).

- **Choose tracks.** Pick up to three of seven: Focus & Discipline, Fitness & Energy, School & Learning, Money & Career, Skills & Projects, Life Reset, Confidence & Mindset. A few optional questions (school, work, gym, a project, age range) and a pace (time a day, and Start easy / Lock in / Push me) shape what you get.
- **Daily missions.** Three a day (four on Push me), picked for you from a library of 313: a quick win, real progress and a challenge. One free swap a day, three with Full Edition.
- **Prove it.** Do it, then prove it with the in-app camera: one photo, a photo of the result, before and after photos, or a focus timer and then a photo. The checks run on the phone and the photo stays there.
- **Points.** 10 for a quick win, 15 for progress, 25 for a challenge, and 15 more for a perfect day (every mission in the plan proven).
- **Streak.** Days in a row with at least one proven mission. Off Days: you earn one every 7 days you show up and can bank two; a missed day uses one automatically.
- **Levels.** A level per track, milestones (first mission, first 10 missions, first perfect day, 7 days, 30 missions, 100 missions, a 30-day streak), a weekly review, and optional multi-day programs.
- **Rewards.** Points trade for codes at unsetld.com: free shipping (300), 10% off (600), 15% off (1,000), up to $25 off, one of each per collection. Days with a proven mission also open Access: early access to drops (Day 7), a numbered patch (Day 90) and the 365 piece (Day 365). None of it can be bought. See [docs/ACCESS.md](docs/ACCESS.md).

The product spec is [docs/MISSIONS_SPEC.md](docs/MISSIONS_SPEC.md); where an older spec disagrees, it wins. Tokens, type, colorways, the walker and the paywall layout are still in [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md). Every UI string is in `src/content/copy/*.ts`. Built with **Expo SDK 57** (React Native, TypeScript), `expo-widgets` for the iOS widgets and RevenueCat for Full Edition.

Quotes, the daily line, chapters, the three standard rules and the night check were retired in 3.0.

---

## See it

### Browser preview (no setup)

Open the published preview link, or build it yourself:

```bash
npm install
npm run build:preview   # → dist-preview/unsetld-preview.html (one file, opens anywhere)
```

The whole app runs in the browser. Proof picks a file instead of opening the camera, and says so. Widgets, notifications, Sign in with Apple and purchases are simulated: the paywall is in preview mode and charges nothing. Access is switched on in the preview so the whole product can be seen.

**Tester tools:** Progress → Settings → Tester tools. They're in dev builds and the browser preview only, never in a release build. The top lines show the app's idea of today, the streak, points, missions proven today and active days.

- **Flags**
  - Full Edition on or off. A build with a RevenueCat key asks the App Store, and its answer replaces this switch on the next launch.
  - Timers run 60× faster: a 25-minute timer takes 25 seconds (for timers started after you switch it).
  - Access enabled.
- **Missions**
  - Prove today's missions: skips the camera and accepts each one on the phone with a placeholder photo.
  - Add 20 days of proven missions: plans and proves the 20 days before today (every third day only partly). That's enough points to take a reward, and enough history to see the levels, the milestones and the barcode move.
- **Time travel** (notifications still use the real clock; after a jump, go back to Home, which builds the day's plan and shows any milestone or letter)
  - Next day.
  - Jump 6, 23 or 60 days, proving one mission each day. Used in that order from an empty record, each one lands on the day that becomes Day 7, Day 30 and Day 90 once you prove a mission there.
  - Disappear for 15 days: Off Days get used, the streak breaks, and once early access is open it pauses (prove a mission on 7 more days for the comeback letter).
  - Back to the real today.
- **Reset**
  - Restart onboarding.
  - Clear the record: missions, points, streak, rewards taken and proof photos on this phone. Settings stay.

### On your iPhone

Widgets and Sign in with Apple need a development build. Expo Go can't show them.

- **With a Mac and Xcode 26+:** `npx expo run:ios --device`
- **Without a Mac (EAS cloud build):**
  1. `npx eas-cli@latest login`
  2. `npx eas-cli@latest build --profile development --platform ios`. The first build walks you through your Apple Developer account and registering the phone.
  3. Install from the QR code, turn on **Settings → Privacy & Security → Developer Mode**, run `npx expo start`, then open the build.

To add a widget, follow the in-app guide: Progress → Settings → Add a widget. There are three: **Next mission** (Lock Screen and Home Screen), **Today** (Lock Screen) and **Streak** (Home Screen and Lock Screen).

---

## Full Edition

| | Free | Full Edition |
|---|---|---|
| Daily missions, proof, points, streak, levels, weekly review, rewards | Yes | Yes |
| Swaps | 1 a day | 3 a day |
| Programs | 2 (7 Day Lock In, Get Organized) | All six |
| Colorways | Black | All ten, in the app and on widgets |
| Reminders | Up to 3 a day | Up to 10 a day |

Points, rewards and Access are the same on every plan. Full Edition never changes what you earn.

---

## Before launch

### 1. Full Edition (App Store Connect + RevenueCat)

Prices live in App Store Connect and RevenueCat, never in the code. The paywall reads the localized prices from StoreKit.

1. **App Store Connect:**
   - Create one subscription group with:
     - **Annual**, $24.99, `unsetld_full_annual`, with a **3-day free trial** introductory offer
     - **Monthly**, $4.99, `unsetld_full_monthly`
   - Create a non-consumable **Lifetime**, $39.99, `unsetld_full_lifetime`.
2. **RevenueCat:**
   - Add the three products to the entitlement **`full_edition`**.
   - Create the Offering **`default`**, marked Current, with packages Annual, Monthly and Lifetime.
3. Copy `.env.example` to `.env` and paste the RevenueCat **public iOS key**. Without a key the paywall runs in preview mode.

### 2. Rewards and Access (optional at launch)

Rewards and Access stay hidden until `https://www.unsetld.com/api/app/config.json` says `"accessEnabled": true`. With it off, missions, proof, points, the streak and levels all work; the reward tiers, codes, the next-reward line and Access just don't show, and the app never says "coming soon".

Build the small routes in [docs/ACCESS.md](docs/ACCESS.md) first (sync, check-in, proof, redeem, claim, account delete), then upload `Web/api/app/config.json` and `Web/api/app/drops.json` to the site. The config can also send a `rewards` list that replaces the app's built-in tiers without an app update.

### 3. Content

Everything editable lives in `src/content/`. Run **`npm run validate`** after every edit: it checks the files below against the rules in `scripts/validate-content.mjs` (and docs/MISSIONS_SPEC.md section 4), prints a count per track, and fails on errors.

- **Missions:** `missions.json`, 313 missions across the seven tracks. Fields:
  - `id` (permanent, `<track>-<slug>`: completions and programs refer to it), `track`, `slot` (`quick` / `progress` / `challenge`)
  - `title` (Title Case, at most 28 characters, unique), `short` (one sentence), `why`, `how` (2–4 steps), `proof` (what the photo shows)
  - `proofType`: `PHOTO`, `PHOTO_AFTER`, `BEFORE_AFTER` or `TIMER_AND_PHOTO` (with `timerMinutes`, 5–60)
  - `points` and `difficulty` follow the slot: quick 10 / 1, progress 15 / 2, challenge 25 / 3. `minutes` is the real time it takes (quick 1–15, progress 10–45, challenge 20–90).
  - `requires` (`school`, `work`, `gym`, `project`, `age16`, `age18`): only offered when the user's answers match
  - `cooldownDays`, `repeatable` (one-off missions like a first resume are `false`), `anchor` (a habit meant to come back often; cooldown 3 days or less)
  - `group`: missions that overlap ("room-reset", "tomorrow-ready", "phone-setup" ...) share a group, and a day never holds two from one group, including swaps and programs
  - `weight`: how often the planner picks it, relative to 1 (situational missions, like the night before a test, are 0.5)
  - `tags` (1–4), `active`
  - The validator also enforces the voice and safety rules: no "!", "…", emoji or swearing, no banned hustle words, nothing unsafe for a teen (diets, fasting, skipping sleep, substances, betting, trading, dares), and missions never mention points, discounts or UNSETLD. Words worth a second look for privacy are listed as warnings.
- **Programs:** `programs.json`: `id`, `title`, `short`, `days`, `tracks`, `free`, and `plan` (one entry per program day, 1–2 mission ids, no two from one group, no missions that need work, a gym or an age). At least two must be free.
- **Rewards:** `rewards.json`, the default tiers: free shipping (300), 10% off (600, up to $25), 15% off (1,000, up to $25), and a limited piece that is switched off. Fields: `id`, `title`, `detail`, `type`, `points`, `percent`, `maxOff`, `active`, `availableFrom` / `availableUntil`, `codeValidDays`, `inventory`, `perCollection`. Change them here, or send `rewards` from unsetld.com's config.json to replace the whole list without an update ([docs/ACCESS.md](docs/ACCESS.md)).
- **Rules:** `rules.json`: perfect-day bonus (15), swaps a day (free 1, Full Edition 3), Off Days (one every 7 active days, up to 2), how fresh a proof photo must be (30 minutes), the gap between before and after photos (120 seconds), and the default photo retention (30 days).
- **Other content:**
  - tracks: `tracks.json` (seven, in a fixed order)
  - reminder prompts for days without a plan: `reminders.json`
  - colorways: `colorways.json` (ten, only Black is free; plates come from `npm run colorways`)
  - Access milestones and letters: `milestones.json`
  - legal pages and How missions work: `legal.json`
  - all UI strings: `copy.ts` and `copy/*.ts`
- **Widget guide images:** `assets/guide/widget-lock.jpg` and `widget-home.jpg` are stand-ins. Replace them with real screenshots of the Next mission, Today and Streak widgets before launch.

### 4. Privacy

- **Photos stay on the phone.** Proof is taken with the camera inside the app (iOS never offers the photo library), saved in the app's own folder and never uploaded.
- **Metadata is stripped.** Each photo is resized to 1600 px and re-encoded as a new JPEG when it's saved, which drops EXIF, including location. A fingerprint of the saved image stops the same photo counting twice.
- **Retention.** Photos are deleted after 30 days by default (Settings → Proof photos: 30 days, 1 year or Keep). The mission, its points and the fingerprint stay. Choosing a shorter time asks before deleting older photos.
- **On-device checks only.** The checks look at how and when proof was taken: the right photos are there, the proof photo was taken in the last 30 minutes, before and after are at least 2 minutes apart, the focus timer finished first, and the photo was never used before. They don't look at what's in the photo. There is no AI, and the app never claims a photo was verified by AI. `services/verify.ts` has a `TaskProofVerifier` interface for a future server-side check; none is connected.
- **What missions never ask for:** faces, bodies, other people, IDs, addresses, bank details, grades, medical information, private conversations, a bedroom specifically, or location. No facial recognition, no public feed.
- **What leaves the phone:** a time check against unsetld.com (no identifier), the public config and drops files, purchases through Apple and RevenueCat (an anonymous app user ID), and, only for someone who signs in for rewards, each day's count of proven missions and their points. Never a photo, never the About you answers.
- The record is mirrored into the iOS Keychain so a reinstall keeps the streak and points. Photos aren't part of it.

### 5. App Store

- **Name:** UNSETLD: Daily Missions (suggested; the name field allows 30 characters)
- **Subtitle:** Do the mission. Prove it.
- **Age rating:** the app no longer ships any profanity or strong language (the quote library and its Strong language setting are gone), so answer the questionnaire with **Profanity: None** and drop the old *Frequent profanity* answer. Health or wellness topics: yes (fitness missions). User-generated content: no (photos never leave the phone). Unrestricted web: no (store links open in Safari). The app is made for 13 and up, as the Privacy Policy and the rewards terms say; if the questionnaire comes out lower and App Store Connect lets you choose a higher rating, choose 13+. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).
- **Privacy label:** no tracking, no ads, no analytics. Purchases go through RevenueCat. An Apple user ID, an optional email and the dates and counts of proven missions are collected only if the user signs in for rewards. Photos are not collected.
- **Camera:** the permission text is in `app.json` (`expo-image-picker` plugin). The app asks the first time someone opens the camera to prove a mission.
- **Screenshots** (captions are suggestions; proof photos in them show objects, never people, faces, documents or screens with personal details):
  1. Home with today's three missions: *Three missions a day, built around your life.*
  2. A mission page with PROVE IT: *Do it for real. Prove it with the camera.*
  3. The done screen with points: *Every proven mission earns points.*
  4. Progress with the streak and levels: *A streak that means you showed up.*
  5. The lock screen with the Next mission and Streak widgets: *Your next mission, on your lock screen.*
  6. Rewards: *Trade points for rewards at unsetld.com.*
- **App Review notes:** explain that points come only from missions proven in the app and trade for codes at unsetld.com, that nothing can be bought, and that photos stay on the phone. Tester tools aren't in release builds, so show the rewards flow with screenshots or a screen recording from a development build.
- **Privacy Policy and Terms:** `src/content/legal.json` holds the in-app copies. Publish them at the URLs in `src/config/app.ts`.

---

## Project map

| Path | What |
|---|---|
| `src/screens/onboarding/` | Name, Tracks, About you, Pace (also Settings → Your plan, in edit mode) |
| `src/screens/home/` | Home (route `Today`): streak, points, today's missions, swaps, program banner, weekly review card, the bottom bar |
| `src/screens/mission/` | Mission (full-screen): detail, focus timer, before and after, review, the on-device checks, the done screen |
| `src/screens/progress/` | Progress (stats, barcode, levels, milestones, this week), Weekly review, milestone moments |
| `src/screens/rewards/` | Rewards: balance, next reward, tiers and redeem, your codes, how points are earned, Access |
| `src/screens/programs/` | Programs: start, follow and leave a program |
| `src/screens/` | Reminders (Day), Widget guide, Paywall, Settings, Account, Doc, Milestone, Letter, Proof gallery, Tester tools; `today/ColorwaySheet.tsx` |
| `src/core/` | Pure, unit-tested rules: the 4:00 AM day, the daily plan and swaps, completion and points, streak and Off Days, levels and milestones, the weekly review, programs, rewards and the config parser, proof checks, fingerprints and retention, the focus timer, Access and the pause rule, reminders, 2.x carry-over |
| `src/state/` | Zustand store (persisted), mission hooks, app lifecycle (4:00 AM rollover, rescheduling, photo expiry, deep links), intents |
| `src/services/` | Camera and proof storage, the verifier interface, notifications and the timer-done alert, widgets, Access network calls, Sign in with Apple, purchases, Keychain backup, time check |
| `src/content/` | Missions, programs, rewards, rules, tracks, colorways, milestones, legal pages, every string |
| `src/ui/` | Design tokens, type, buttons, squares, segmented control, icons, the walker, sheets, the proof stamp |
| `widgets/` | The iOS widgets: Next mission (`UnsetldLine`), Today (`UnsetldStandard`), Streak (`UnsetldRecord`). The 2.x kinds are kept so widgets already placed stay put. |
| `scripts/` | Preview build, content validation, colorway plates |

## Checks

```bash
npm run check   # typecheck + lint + unit tests + content validation
```
