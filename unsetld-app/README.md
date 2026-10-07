# UNSETLD app

A daily discipline app for guys 18–30. It gives you:
- lock screen and home screen widgets with a new line every day
- a swipe feed
- reminders
- streaks and a rank system

*Never settle for less. Never stop working.* Showing up earns XP, and higher ranks unlock capped UNSETLD perks.

Built with **Expo SDK 57** (React Native + TypeScript). The iOS widgets use `expo-widgets`, subscriptions use RevenueCat, and all user data stays on the device.

---

## See it and test it

### 1. Browser preview (instant, no setup)

Open the published preview link, or build it yourself:

```bash
npm install
npm run build:preview      # → dist-preview/unsetld-preview.html (one file, open it anywhere)
```

The whole app runs in the browser. Widgets, notifications and purchases are simulated, and the paywall is in preview mode with no charges.
- **Tester tools** are under **Me → Tester tools**. They time-travel days so you can watch streaks, rank-ups, shields and decay without waiting months.

### 2. On your iPhone with Expo Go (about 5 minutes, needs a computer)

1. Install **Expo Go** from the App Store on your iPhone.
2. On a Mac or PC with Node 20+:
   ```bash
   cd unsetld-app
   npm install
   npx expo start
   ```
3. Scan the QR code with the iPhone camera.

Everything except widgets and real purchases works in Expo Go.

### 3. Real build with widgets (dev build)

Widgets need a development build. Pick one:

- **With a Mac and Xcode 26+:** `npx expo run:ios --device`
- **Without a Mac:** build in the cloud with EAS.
  1. Make a free Expo account and run `npx eas-cli@latest login`.
  2. Run `npx eas-cli@latest build --profile development --platform ios`.
  3. The first time, it walks you through your Apple Developer account ($99/yr) and registering your iPhone.
  4. Install the build from the QR code, then turn on **Settings → Privacy & Security → Developer Mode**.
  5. Run `npx expo start` and open the dev build.

To add the widgets, follow the in-app guide (Me → Add the widget).

---

## Make it yours

| What | Where |
|---|---|
| App name, links, TikTok accounts, limits | `src/config/app.ts` (display name under the icon: `app.json` → `name`) |
| Daily lines (edit freely) | `src/content/lines/*.json`, then run `npm run validate` |
| Stoic quotes (with sources) | `src/content/stoic.json` |
| Missions, reminder texts, onboarding copy | `src/content/missions.json`, `notifications.json`, `onboarding.json` |
| Rank thresholds, XP, decay, code limits | `src/content/rank.json` |
| Themes | `src/content/themes.json` (textures: `npm run textures`) |
| Privacy, terms, rewards terms | `src/content/legal.json` |

Every line has `"status": "draft"`. Flip it to `"approved"` as you review them.

## Payments (RevenueCat)

Prices live in App Store Connect and RevenueCat, never in the code.

1. **App Store Connect:** create one subscription group with two products:
   - **Yearly** $24.99 (`unsetld.premium.annual`), with a **3-day free trial** introductory offer
   - **Monthly** $4.99 (`unsetld.premium.monthly`)

   Then create a non-consumable **Lifetime** $39.99 (`unsetld.premium.lifetime`).
2. **RevenueCat:**
   - Add the three products and attach all of them to the entitlement **`premium`**.
   - Make an Offering marked **Current**, with packages **Annual**, **Monthly** and **Lifetime**.
3. Copy `.env.example` to `.env` and paste the RevenueCat **public iOS key**.

The paywall reads the current Offering. "Save 58%" is calculated from the real prices.

## Discount codes (rank perks, v1)

```bash
npm run codes   # prints the next 12 months of codes the app will show
```

Create each one in Shopify. The script's header lists the exact settings: 10% off, $60 minimum, one use per customer, a monthly usage cap, no combinations, and that month's end date. The 15% and 20% tiers turn on with Rank Sync (v2); see `docs/REWARDS.md`.

## Drops feed (optional)

Put `Web/app-feed.example.json` on your site as `https://www.unsetld.com/app-feed.json`. Users who opted into drop alerts get notified at each drop's time.

## Checks

```bash
npm run check      # typecheck + unit tests + content validation
```

## Docs

- [Build plan](docs/BUILD_PLAN.md)
- [Rewards / rank system](docs/REWARDS.md)
- [Voice sample](docs/VOICE_SAMPLE.md)
- [Compliance notes](docs/COMPLIANCE.md)
- [Name + trademark](docs/NAME_AND_TRADEMARK.md)
- [TikTok slideshows](marketing/tiktok-slideshows.md)
