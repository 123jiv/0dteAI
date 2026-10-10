# UNSETLD

**Daily missions you do in real life and prove with the camera. Points, a streak, and rewards at unsetld.com.**

UNSETLD 3.1 is a mission app for ages 13–25, from the clothing brand of the same name ("unsettled" minus two letters; *never settle for less*).

- **Choose areas.** Pick two to four of nine: Discipline, School, Fitness, Money, Career, Business, Skills, Projects, Organization. A few optional questions (school, work, gym, a business or project, age range, what you're learning), the time you have (15 / 30 / 45 / 60+ minutes, and Start easy / Lock in / Push me) and, optionally, what you're working toward in your own words shape what you get.
- **Daily missions.** Normal, useful actions with plain titles: *Study for 30 Minutes*, *Complete Your Workout*, *Work on Your Business for 30 Minutes*, *Read 10 Pages of a Useful Book*, *Plan Tomorrow*, *Track Today's Spending*. Three a day from your areas, picked from a library of about 230: one easy one (15 minutes or less) and two that take real focus; Push me adds a third focused one, and with only 5–15 minutes a day all three are short. Core habits (study, train, build, plan tomorrow) come back on most days, and Day 1 is all staples. One swap a day, three with UNSETLD+; a swap stays in the same area.
- **Personal, by plain rules.** "What matters most this week?" (optional, on Today) and your goal lean the plan toward the missions they name; the plan also learns from the last four weeks (missions you keep swapping or leaving come up less, long missions give way to shorter ones if those are the ones you finish). No AI.
- **Prove it.** Each mission is a title, its time and points, one sentence and how to prove it: a photo, before and after photos, the in-app focus timer and then a photo, or the timer on its own. The checks run on the phone and the photo stays there.
- **Points.** By how long a mission takes: 5 (up to 5 minutes), 10 (up to 20), 15 or 20 (about 30), 20 (about 45), 25 (an hour). A perfect day (every mission in the plan proven) adds 15.
- **Streak.** Days in a row with at least one proven mission. Off Days: you earn one every 7 days you show up and can bank two; a missed day uses one automatically.
- **Progress.** Your streak, today, the week, a level per area with the time you've put in, proof history by month, achievements and stats, a weekly review, and optional multi-day plans. A perfect day can be shared as a 9:16 card with no photos on it.
- **Rewards.** Points trade for discount codes at unsetld.com: 5% off (300), 10% off (600) and 15% off (1,000), up to $25 off, one of each per collection. Every tier's points, discount, cap, dates, cooldown and limits come from configuration. Separately, days with a proven mission build UNSETLD status: early access to drops (Day 7), a numbered patch (Day 90) and the 365 piece (Day 365), also configurable. None of it can be bought. See [docs/ACCESS.md](docs/ACCESS.md).

The screens, navigation and copy are specified in [docs/UX_REDESIGN.md](docs/UX_REDESIGN.md); the mission model, planner, proof and rewards rules in [docs/MISSIONS_SPEC.md](docs/MISSIONS_SPEC.md). Where an older spec disagrees, these win. Tokens, type, colorways, the walker and the paywall layout are still in [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md). Every UI string is in `src/content/copy/*.ts`. Built with **Expo SDK 57** (React Native, TypeScript), `expo-widgets` for the iOS widgets and RevenueCat for UNSETLD+.

Quotes, the daily line, chapters, the three standard rules and the night check were retired in 3.0. The Quick Win / Progress / Challenge labels, the WHY / HOW sections and the seven original tracks went later in 3.0: missions are now plain actions in nine areas.

---

## See it

### Browser preview (no setup)

Open the published preview link, or build it yourself:

```bash
npm install
npm run build:preview   # → dist-preview/unsetld-preview.html (one file, opens anywhere)
```

The whole app runs in the browser. Proof picks a file instead of opening the camera, and says so. Widgets, notifications, Sign in with Apple and purchases are simulated: the paywall is in preview mode and charges nothing. Access is switched on in the preview so the whole product can be seen.

**Tester tools:** You → Tester tools. They're in dev builds and the browser preview only, never in a release build. The top lines show the app's idea of today, the streak, points, missions proven today and active days.

- **Flags**
  - UNSETLD+ on or off. A build with a RevenueCat key asks the App Store, and its answer replaces this switch on the next launch.
  - Timers run 60× faster: a 25-minute timer takes 25 seconds (for timers started after you switch it).
  - Access enabled.
- **Missions**
  - Prove today's missions: skips the camera and accepts each one on the phone with a placeholder photo (a timer-only mission needs none).
  - Add 20 days of proven missions: plans the 20 days before today from your areas and answers, as the app would, and proves them (every third day only partly). That's enough points to take a reward, and enough history to see the levels, the milestones and the barcode move.
- **Time travel** (notifications still use the real clock; after a jump, go back to Home, which builds the day's plan and shows any milestone or letter)
  - Next day.
  - Jump 6, 23 or 60 days, proving one mission each day. Used in that order from an empty record, each one lands on the day that becomes Day 7, Day 30 and Day 90 once you prove a mission there.
  - Disappear for 15 days: Off Days get used, the streak breaks, and once early access is open it pauses (prove a mission on 7 more days for the comeback letter).
  - Back to the real today, with the record as it was before the first jump (whatever was proven while travelling goes).
- **Reset**
  - Restart onboarding.
  - Clear the record: missions, points, streak, rewards taken and proof photos on this phone. Your answers and settings stay.

### On your iPhone

Widgets and Sign in with Apple need a development build. Expo Go can't show them.

- **With a Mac and Xcode 26+:** `npx expo run:ios --device`
- **Without a Mac (EAS cloud build):**
  1. `npx eas-cli@latest login`
  2. `npx eas-cli@latest build --profile development --platform ios`. The first build walks you through your Apple Developer account and registering the phone.
  3. Install from the QR code, turn on **Settings → Privacy & Security → Developer Mode**, run `npx expo start`, then open the build.

To add a widget, follow the in-app guide: You → Widgets. There are three: **Next mission** (Lock Screen and Home Screen), **Today** (Lock Screen) and **Streak** (Home Screen and Lock Screen).

---

## UNSETLD+

| | Free | UNSETLD+ |
|---|---|---|
| Daily missions, proof, points, streak, progress, weekly focus and review, rewards and status | Yes | Yes |
| Swaps | 1 a day | 3 a day |
| Plans | 2 (7 Day Lock In, Get Organized) | All six |
| Colorways | Black | All ten, in the app and on widgets |
| Reminders | Up to 3 a day | Up to 10 a day |

Points, rewards and status are the same for everyone. UNSETLD+ never changes what you earn, and no clothing reward is members-only.

---

## Before launch

### 1. UNSETLD+ (App Store Connect + RevenueCat)

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

Everything editable lives in `src/content/`. Run **`npm run validate`** after every edit: it checks the files below against the rules in `scripts/validate-content.mjs` (and docs/MISSIONS_SPEC.md section 4), prints a count per area, and fails on errors.

- **Missions:** written in **`scripts/missions/library.py`**, one `m(...)` call per mission, grouped by area. Don't edit `src/content/missions.json` by hand: edit the script, run `python3 scripts/missions/library.py` (it rewrites `missions.json` and prints a count per area), then `npm run validate`. 176 missions across the nine areas. Fields:
  - `id` (permanent, `<area>-<slug>`: completions, plans and programs refer to it, so retire a mission with `active: false` instead of renaming or deleting it), `track` (its area), `also` (other areas it serves)
  - `title` (Title Case, says what to do, at most 48 characters, unique), `short` (the one instruction sentence), `proof` (what the proof shows)
  - `proofType`: `PHOTO`, `BEFORE_AFTER`, `TIMER_AND_PHOTO` or `TIMER` (the last two with `timerMinutes`, 5–60)
  - `minutes` is the real time it takes (15 or less makes it the day's easy mission), and `points` follow it: up to 5 minutes 5, up to 20 minutes 10, 21–35 minutes 15 (20 for work on your own business, project, portfolio, applications or training), 36–59 minutes 20, an hour 25
  - `requires` (`school`, `work`, `gym`, `project`, `age16`, `age18`, or a skill: `coding`, `design`, `video`, `writing`, `language`, `music`): only offered when the user's answers match
  - `cooldownDays`, `repeatable` (one-off missions like a first resume are `false`), `anchor` (a core habit that comes back most days; cooldown 3 days or less)
  - `group`: missions that overlap ("deep-work", "study", "tomorrow-ready" ...) share a group, and a day never holds two from one group, including swaps and programs
  - `weight`: how often the planner picks it, relative to 1; `when`: `morning` missions are left out of a plan made from noon on
  - `tags` (1–4), `active`
  - There are no slots, difficulty, why or how: the validator rejects them. It also enforces the voice and safety rules. It fails on "!", "…", emoji, swearing and banned hustle words; on anything unsafe for a teen (calorie deficits, water or dry fasts, weigh-ins and body photos, skipping sleep, alcohol, vaping, nicotine, day or options trading, casinos, sports betting, dares); and on missions that mention points, discount codes, merch or UNSETLD. Words worth a second look for safety or privacy (diets, fasting, supplements, caffeine, crypto, betting, selfies, faces, grades, a bedroom, an address, a location) are listed as warnings.
- **Plans:** `programs.json`: `id`, `title`, `short`, `days`, `tracks` (areas), `free`, and `plan` (one entry per program day, 1–2 mission ids, no two from one group, no missions that need anything but school: no work, gym, project, age or skill). At least two must be free.
- **Rewards:** `rewards.json`, the default tiers: 5% off (300, up to $25), 10% off (600, up to $25), 15% off (1,000, up to $25), and a limited piece that is switched off. Fields: `id`, `title`, `detail`, `type`, `points`, `percent`, `maxOff`, `active`, `availableFrom` / `availableUntil`, `codeValidDays`, `inventory`, `perCollection`. Change them here, or send `rewards` from unsetld.com's config.json to replace the whole list without an update ([docs/ACCESS.md](docs/ACCESS.md)).
- **Rules:** `rules.json`: perfect-day bonus (15), swaps a day (free 1, UNSETLD+ 3), Off Days (one every 7 active days, up to 2), how fresh a proof photo must be (30 minutes), the gap between before and after photos (120 seconds), and the default photo retention (30 days).
- **Other content:**
  - areas: `tracks.json` (nine, in a fixed order)
  - reminder prompts for days without a plan: `reminders.json`
  - colorways: `colorways.json` (ten, only Black is free; plates come from `npm run colorways`)
  - Access milestones and letters: `milestones.json`
  - legal pages and How missions work: `legal.json`
  - all UI strings: `copy.ts` and `copy/*.ts`
- **Widget guide:** the in-app guide (`src/screens/WidgetScreen.tsx`) draws the Next mission, Today and Streak widgets from the same copy the real widgets use, on an example day, so there are no screenshots to replace. If a mission it names (`discipline-make-your-bed`, `school-study-30`, `fitness-workout`) is retired, the example drops it.

### 4. Privacy

- **Photos stay on the phone.** Proof is taken with the camera inside the app (iOS never offers the photo library), saved in the app's own folder and never uploaded.
- **Metadata is stripped.** Each photo is resized to 1600 px and re-encoded as a new JPEG when it's saved, which drops EXIF, including location. A fingerprint of the saved image stops the same photo counting twice.
- **Retention.** Photos are deleted after 30 days by default (You → Proof photos: 30 days, 1 year or Keep). The mission, its points and the fingerprint stay. Choosing a shorter time asks before deleting older photos.
- **On-device checks only.** The checks look at how and when proof was taken: the right photos are there, the proof photo was taken in the last 30 minutes, before and after are at least 2 minutes apart, the focus timer finished first (for a timer-only mission, it ran its full length in the last 30 minutes), and the photo was never used before. They don't look at what's in the photo. There is no AI, and the app never claims a photo was verified by AI. `services/verify.ts` has a `TaskProofVerifier` interface for a future server-side check; none is connected.
- **What missions never ask for:** faces, bodies, other people, IDs, addresses, bank details, grades, medical information, private conversations, a bedroom specifically, or location. No facial recognition, no public feed.
- **What leaves the phone:** a time check against unsetld.com (no identifier), the public config and drops files, purchases through Apple and RevenueCat (an anonymous app user ID), and, only for someone who signs in for rewards, each day's count of proven missions and their points. Never a photo, never the About you answers or the areas.
- The record is mirrored into the iOS Keychain so a reinstall keeps the streak and points. Photos aren't part of it.

### 5. App Store

- **Name:** UNSETLD: Daily Missions (suggested; the name field allows 30 characters)
- **Subtitle:** Do the mission. Prove it.
- **Age rating:** the app no longer ships any profanity or strong language (the quote library and its Strong language setting are gone), so answer the questionnaire with **Profanity: None** and drop the old *Frequent profanity* answer. Health or wellness topics: yes (fitness missions). User-generated content: no (photos never leave the phone). Unrestricted web: no (store links open in Safari). The app is made for 13 and up, as the Privacy Policy and the rewards terms say; if the questionnaire comes out lower and App Store Connect lets you choose a higher rating, choose 13+. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).
- **Privacy label:** no tracking, no ads, no analytics. Purchases go through RevenueCat. An Apple user ID, an optional email and the dates and counts of proven missions are collected only if the user signs in for rewards. Photos are not collected.
- **Camera:** the permission text is in `app.json` (`expo-image-picker` plugin). The app asks the first time someone opens the camera to prove a mission.
- **Screenshots** (captions are suggestions; proof photos in them show objects, never people, faces, documents or screens with personal details):
  1. Home with today's three missions: *Three missions a day, built around your goals.*
  2. A mission page (Study for 30 Minutes, START 30 MIN TIMER): *Do it for real. Prove it in the app.*
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
| `src/screens/onboarding/` | Name, Areas (`TracksScreen`), About you, Time (`PaceScreen`), Goal; each also opens from You in edit mode |
| `src/screens/home/` | The Today tab: day and points, the next reward, the weekly focus card, TODAY x / 3, the mission cards, the active plan, the weekly card; the weekly focus page |
| `src/screens/mission/` | Mission (full-screen): the detail page with its proof card, focus timer, before and after, review, the on-device checks, the done stage and the perfect day |
| `src/screens/share/` | The 9:16 share card (iOS share sheet; a screenshot note in the browser preview) |
| `src/screens/progress/` | The Progress tab, Proof history, Achievements, Stats, the weekly review, milestone moments |
| `src/screens/rewards/` | The Rewards tab, All rewards, Reward history, How points work, UNSETLD status, the redeem flow |
| `src/screens/plans/` | Plans: start, follow and leave a plan (`program` in code) |
| `src/screens/you/` | The You tab: goals, your day, membership, appearance, proof photos, account, help |
| `src/screens/` | Reminders (Day), Widget guide, Paywall (UNSETLD+), Account, Doc, Milestone, Letter, Tester tools; `today/ColorwaySheet.tsx` |
| `src/core/` | Pure, unit-tested rules: the 4:00 AM day, the daily plan from the user's areas and swaps within an area, completion and points, streak and Off Days, levels and milestones, the weekly review, programs, rewards and the config parser, proof checks (photo and timer), fingerprints and retention, the focus timer, Access and the pause rule, reminders, 2.x carry-over |
| `src/state/` | Zustand store (persisted), mission hooks, app lifecycle (4:00 AM rollover, rescheduling, photo expiry, deep links), intents |
| `src/services/` | Camera and proof storage, the verifier interface, notifications and the timer-done alert, widgets, Access network calls, Sign in with Apple, purchases, Keychain backup, time check |
| `src/content/` | Missions (generated from `scripts/missions/library.py`), programs, rewards, rules, areas, colorways, milestones, legal pages, every string |
| `src/ui/` | Design tokens, type, buttons, squares, segmented control, icons, the walker, sheets, the proof stamp |
| `widgets/` | The iOS widgets: Next mission (`UnsetldLine`), Today (`UnsetldStandard`), Streak (`UnsetldRecord`). The 2.x kinds are kept so widgets already placed stay put. |
| `scripts/` | The mission library (`missions/library.py`, writes `missions.json`), preview build, content validation, colorway plates |

## Checks

```bash
npm run check   # typecheck + lint + unit tests + content validation
```
