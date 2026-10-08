# UNSETLD

**One line every morning, and a record of the days you showed up.**

UNSETLD is a daily line for the unsettled, built like the Motivation app and on the clothing brand of the same name ("unsettled" minus two letters; *never settle for less*).

- **The line.** One raw, original line every morning, on the lock screen and in the notification. Swipe up for more from the chapters you chose: Discipline, Focus, Training, Money, Confidence, Vices, Stoic.
- **The standard.** You set three plain rules. Each night the app asks one question: did you hold it?
- **The record.** Every day you open the line goes on record, drawn like a garment-tag barcode.
- **Proof and points.** Once a day you can add proof: a photo of the work, taken live in the app and kept on the phone. Each day with proof is 10 points, and points trade for a discount code at unsetld.com (300 = 10% off, 500 = 15%, up to $25, one code each collection).
- **Access.** Days on record open access to the brand: drops 24 hours early (Day 7), a numbered patch (Day 90) and a piece only year-one people can buy (Day 365). None of it is sold. See [docs/ACCESS.md](docs/ACCESS.md).

The design is in [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md) and every string is in [docs/COPY_DECK.md](docs/COPY_DECK.md). Built with **Expo SDK 57** (React Native, TypeScript), `expo-widgets` for the iOS widgets and RevenueCat for Full Edition.

---

## See it

### Browser preview (no setup)

Open the published preview link, or build it yourself:

```bash
npm install
npm run build:preview   # → dist-preview/unsetld-preview.html (one file, opens anywhere)
```

The whole app runs in the browser. Widgets, notifications, Sign in with Apple and purchases are simulated: the paywall is in preview mode and charges nothing.

**Tester tools:** Record → Settings → Tester tools. You can:
- jump days ahead, to see Day 7 and its letter;
- add 30 days of test proof, to trade points for a code;
- disappear for 15 days, to see the pause and the comeback letter;
- make the night check due now;
- switch Full Edition on and off.

### On your iPhone

Widgets and Sign in with Apple need a development build. Expo Go can't show them.

- **With a Mac and Xcode 26+:** `npx expo run:ios --device`
- **Without a Mac (EAS cloud build):**
  1. `npx eas-cli@latest login`
  2. `npx eas-cli@latest build --profile development --platform ios`. The first build walks you through your Apple Developer account and registering the phone.
  3. Install from the QR code, turn on **Settings → Privacy & Security → Developer Mode**, run `npx expo start`, then open the build.

To add a widget, follow the in-app guide: Record → Settings → Add a widget.

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

What Full Edition opens:
- all seven chapters
- all ten colorways, in the app and on widgets
- no daily line limit
- up to ten reminders a day
- Your lines

Free gets:
- Discipline plus one chapter
- the Black colorway
- 10 lines a day
- up to 3 reminders
- the night check, saved lines, sharing, every widget, the Record and all of Access

### 2. Access (optional at launch)

Access stays hidden until `https://www.unsetld.com/api/app/config.json` says `"accessEnabled": true`. Build the small routes in [docs/ACCESS.md](docs/ACCESS.md) first (check-in, sync, proof, redeem, claim), then upload `Web/api/app/config.json` and `Web/api/app/drops.json` to the site.

### 3. Content

- **Lines:** in `src/content/lines.json`.
  - Numbers are permanent catalogue numbers ("No. 0412").
  - `explicit: true` lines never reach widgets, notifications, onboarding or the paywall. People who turn Strong language off never see them.
  - Run `npm run validate` after every edit. It enforces the voice rules: 7–14 words, at most 80 characters, no "!", banned words, the explicit share and duplicates.
- **Today's line:** the same line for everyone each day. To choose a specific day's line, add `"2026-11-01": 412` to `src/content/schedule.json`.
- **Quotes:** attributed Stoic quotes ship only with `"verified": true`. Quotes still being checked live in `src/content/quotes-pending.json`.
- **Other content:**
  - reminder prompts: `reminders.json`
  - standard rules: `standard.json`
  - colorways: `colorways.json` (plates come from `npm run colorways`)
  - milestone copy: `milestones.json`
  - legal pages: `legal.json`
  - all UI strings: `copy.ts`
- **Widget guide images:** `assets/guide/widget-lock.jpg` and `widget-home.jpg` are high-fidelity stand-ins. Replace them with real screenshots, or with screen recordings shown via `expo-video`, before launch.

### 4. App Store

- **Name:** UNSETLD: Daily Discipline
- **Subtitle:** One line every morning.
- **Age rating:** declare *Frequent profanity*, which gives 13+.
- **Privacy:** no tracking and no ads. Purchases go through RevenueCat. Identifiers are collected only if the user signs in for Access.
- **Screenshots:**
  - clean lines only (never an explicit line)
  - the list is in the copy deck
  - **Privacy Policy and Terms:** `src/content/legal.json` holds the in-app copies. Publish them at the URLs in `src/config/app.ts`.

---

## Project map

| Path | What |
|---|---|
| `src/screens/` | Onboarding O1–O6, Paywall, Record, Milestone, Letter, Settings and its sub-pages |
| `src/screens/reader/` | The reader: line pages, night check, end card, the Chapters / Colorway / Share sheets |
| `src/core/` | Pure, unit-tested rules: the 4:00 AM day, feed, record, Access pause, reminder plan, typography |
| `src/state/` | Zustand store (persisted), app lifecycle (4:00 AM rollover, rescheduling, deep links) |
| `src/services/` | Notifications, purchases, widgets, sharing, Access network calls, Sign in with Apple |
| `src/ui/` | Design tokens, type, buttons/squares/segmented control, icons, the walker, sheets |
| `widgets/` | The iOS widgets: Line, Record, Standard |
| `scripts/` | Preview build, content validation, colorway plates |

## Checks

```bash
npm run check   # typecheck + lint + unit tests + content validation
```
