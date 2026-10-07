# UNSETLD app: build plan

**Status:** proposal, waiting for your go-ahead. No app code has been written yet.
**Updated:** 2026-10-07. Current platforms: iOS 27.0.1, Xcode 27, Expo SDK 57, RevenueCat iOS 5.93.

**What it is:** a real discipline app for guys 18–30, not a store. A new line every day on the lock screen and home screen, a swipe feed, reminders and streaks, all in a raw Gen Z voice: *never settle for less, never stop working.* Showing up earns XP, and XP moves you up ranks. The top ranks unlock capped UNSETLD perks: early access, app-only pieces, and occasional discount codes. The brand stays in the background.

Related docs:
- [REWARDS.md](REWARDS.md): rank system, discount caps, margin math, anti-cheat
- [VOICE_SAMPLE.md](VOICE_SAMPLE.md): 60 sample lines for you to approve before the full 600
- [COMPLIANCE.md](COMPLIANCE.md): Apple / TikTok rules this plan follows
- [NAME_AND_TRADEMARK.md](NAME_AND_TRADEMARK.md): name check + what to file
- [../marketing/tiktok-slideshows.md](../marketing/tiktok-slideshows.md)

---

## 1. Expo vs. native SwiftUI

**Recommendation: native SwiftUI + WidgetKit.** Your git history shows commits from a MacBook Air, so you can build natively. It needs a Mac that runs Xcode 26 or newer, which is Apple's current upload requirement. If that Mac can't, the fallback is Expo SDK 57 + EAS cloud builds.

Every iOS widget, lock screen ones included, is drawn by SwiftUI/WidgetKit. Expo doesn't remove that layer; it changes who writes it:

| | **Native SwiftUI** | **Expo SDK 57** |
|---|---|---|
| Widget code | Swift, sharing models and logic with the app through one Swift package | Official `expo-widgets` (stable since SDK 56): JSX widgets built from `@expo/ui` components, run in an isolated JS runtime with no imports or shared code, data passed as props. Or `@bacons/apple-targets` with a hand-written Swift widget |
| Today's line when the app hasn't been opened in weeks | Widget computes it from shared content + settings, so it never runs dry | App pre-writes future timeline entries, which can run out |
| Lock screen vibrant mode, iOS 26/27 tinted and clear (Liquid Glass) Home Screens | Every WidgetKit API | What `@expo/ui` exposes |
| Rank system needs (Keychain, iCloud sync, App Attest, trusted time) | First-class | Native modules or extra libraries |
| RevenueCat | `purchases-ios` 5.93 + RevenueCatUI | `react-native-purchases` 10.11 (about one version behind) |
| Build without a Mac | No | Yes: EAS Build + EAS Submit to TestFlight from any OS |
| Android later | UI rewrite | Most of the app ports, and `expo-widgets` gains Android in SDK 58 |

**Why native wins here:** the widget *is* the product, and the rank system adds device-level work: Keychain, iCloud, App Attest, tamper-resistant day tracking. Both are best done in Swift, with one tested `UnsetldCore` package shared by the app and the widget. Onboarding, the feed, the paywall and the rank screens are straightforward in SwiftUI.

PEACEINWAR's app is built with Expo, but it's a shopping app with no widgets. That's where Expo is strongest.

**How we'll work:**
- I write the code; you build and run it on your Mac. This cloud container is Linux, so I can't run the iOS Simulator.
- The Xcode project is generated from a readable `project.yml` (XcodeGen). You run `xcodegen` and open the project, and nobody hand-edits a `.pbxproj`.
- All the logic lives in `UnsetldCore`, a plain Swift package with unit tests (⌘U): daily picks, streaks, XP and ranks, decay, reminder planning, entitlements.
- Content JSON and scripts are validated here before you see them.

---

## 2. Phased build plan

I stop after every phase so you can test.

| # | Phase | What gets built | You test |
|---|---|---|---|
| 0 | **Skeleton** | XcodeGen project with app + widget extension and an App Group. `AppConfig`: one source for the name, bundle IDs, App Group, RevenueCat key, URLs and TikTok handles; the display name comes from a single xcconfig value. `UnsetldCore` package. Brand design tokens. ~40 placeholder lines in the real JSON format. Content validation script | Runs on Simulator + iPhone. Widget appears in the gallery |
| 1 | **Content engine + widgets** | JSON loading, category filter and tone filter (Clean / Unfiltered). Daily pick: seeded, no repeats until the pool is exhausted, rolls over at local midnight. Widgets: lock screen inline + rectangular + circular (streak or rank), home screen small + medium. Timeline with an entry per midnight; reload on settings change. **Widgets show only the line, streak and rank, never promos** | Add every size. Switch categories and tone. Change the date. Try tinted and clear Home Screens |
| 2 | **Onboarding + widget guide** | Goals → struggles → tone (Clean / Unfiltered) + "keep my lock screen clean" → reminders per day + time window → theme → "How did you find us?" (each TikTok account, "UNSETLD clothing / hang tag", Other) → reminder permission → animated step-by-step widget setup guide (lock screen + home screen). Ends: *"Everyone starts SETTLED."* | Fresh install end to end. VoiceOver. Largest Dynamic Type |
| 3 | **Feed, favorites, share, streak** | Full-screen vertical paging feed with today's line first. Tap to favorite; favorites list. Share as a 1080×1920 story image with a small UNSETLD mark and rank badge. Streak = consecutive local days today's line was opened | Swipe, favorite, share to IG/TikTok/Photos, streak across days |
| 4 | **Reminders** | N lines per day at random times inside the window. iOS holds at most 64 pending local notifications, so a rolling schedule is refilled on app open, settings change and background refresh. Tapping a reminder opens that line. The lock-screen-clean setting is honored | 5/day in a short window. Change the window. Leave the app closed for 2 days |
| 5 | **Premium** | RevenueCat, paywall after onboarding (spec below), restore, entitlement gating, custom affirmations feeding the widget and feed. Settings: subscription, restore, terms, privacy, tone, reminders, theme, categories. Local `.storekit` file for testing | Buy each plan in the sandbox, restore on a 2nd install, cancel and watch the gating return |
| 6 | **Rank (v1)** | Rank tab with all five ranks visible from day 1 (SETTLED → HUNGRY → DIALED IN → RELENTLESS → UNSETLD). XP from the daily line, today's non-negotiable, the daily mission, streak milestones and full weeks; capped per day. Streak shields + rank decay + comeback. Rank-up screens that celebrate the person, with the perk mentioned second. One "Perks" card: early-access link + the 10% code at DIALED IN, with all caps. Drop alerts behind their own opt-in. Tamper resistance (trusted time from unsetld.com, Keychain + iCloud). Rewards terms page. Details: [REWARDS.md](REWARDS.md) | Earn XP over several days. Try changing the phone clock. Reinstall. Claim a code and check out on unsetld.com |
| 7 | **Content** | 600 original lines: ~100 per lane, each written in a clean and an unfiltered version per the approved voice, under 15 words, all `"status": "draft"`. Plus 60+ notification lines, 30+ missions, and the Stoic set (Marcus Aurelius, George Long, Gutenberg #15877; Seneca, see §5), with a script that checks every quote word for word. An HTML review sheet lets you approve or reject lines fast. Lines from the TikTok slideshows are in the app | Review sheet; I revise what you flag |
| 8 | **Themes + polish** | 8–12 themes: default **UNSETLD** (brand colors below), plus premium Obsidian Gold, Onyx Silver, Black Marble, Carbon, Gunmetal, Espresso, Midnight, Noir Grain, Graphite. Grain and marble textures generated by a script. App icon from your figure mark. Haptics, Reduce Motion, VoiceOver, contrast audit. Privacy policy + terms pages | Look and feel, accessibility |
| 9 | **Launch kit** | App Store launch checklist: Developer account, App Store Connect, App Group + widget capabilities, RevenueCat products, age rating answers, privacy label, review notes, build + submit. Description, subtitle, keyword field + research list, screenshot shot list (**clean lines only**; Apple requires the store page to suit all ages). A `unsetld.com/app` page + Smart App Banner so one bio link serves both app and store | Follow the checklist |
| 10 | **Rank Sync (v2, ~2–3 months after launch)** | A small API on your existing Next.js/Vercel site: Sign in with Apple, server-side daily check-ins, App Attest, single-use per-person Shopify codes. This turns on the 15% and 20% tiers, the account caps, order XP and hang-tag scans. It must be live before anyone can reach RELENTLESS (~day 75) | Full redemption flow end to end |

### Paywall

Prices live in App Store Connect + RevenueCat, never in code.

| RevenueCat package | App Store product | Price | Notes |
|---|---|---|---|
| Annual (**default, most prominent**) | auto-renewing, 1 year | **$24.99/year** | 3-day free trial set up as an introductory offer in App Store Connect. Badge **"Save 58%"** |
| Monthly | auto-renewing, 1 month | **$4.99/month** | Same subscription group as annual |
| Lifetime | non-consumable | **$39.99** once | |

All three unlock one `premium` entitlement. The app reads RevenueCat's current Offering and shows StoreKit's localized prices.

- **"Save 58%" is calculated, not typed:** `1 − annual ÷ (monthly × 12)` = `1 − 24.99 ÷ 59.88` = 58.3%, rounded down. That keeps it true in every country and after any price change, and the badge is hidden if a price fails to load.
- **Apple layout rules:**
  - The billed amount ("$24.99/year") is the most prominent price. The badge and any per-month figure are smaller.
  - The trial is spelled out: "3 days free, then $24.99/year. Cancel anytime in Settings." That copy only shows when StoreKit says the user is eligible.
  - Restore, Terms and Privacy are visible, along with a clear close button. No fake timers.
- **Free tier (unchanged):** 2 categories, 1 theme, basic widget.
- **Premium:** all categories, all themes, more reminders, and custom affirmations in the widget and feed.
  - **"Unlimited reminders" needs a decision:** iOS can hold 64 pending notifications, so the reliable ceiling is about 12/day. I suggest marketing it as "up to 12 a day" so the App Store listing stays accurate.
- **XP is the same for free and premium.** You can't buy rank, not even with Premium. It's a strong brand line and keeps Apple happy.

---

## 3. Voice and tone

Full guide and samples: [VOICE_SAMPLE.md](VOICE_SAMPLE.md).

- **Two tones, both written by hand.** Every line exists as **Clean** and **Unfiltered**. Unfiltered swears (fuck, shit, damn, hell, ass), always aimed at the reader's excuses, phone, couch and habits, never at women, other people or any group. "Bitch" is capped at two lines in the whole library, both aimed at the snooze button or couch.
- **Lock screen stays clean by default.** Widgets and reminders show on the lock screen and in StandBy, where a parent, boss or teacher sees them. A "keep lock screen clean" toggle is on by default, and anyone who wants it raw can turn it off.
- **Lanes (Gen Z category names):**

  | Category | Lane name |
  |---|---|
  | discipline | Show Up |
  | money | Bag Talk |
  | gym | Gym Rat |
  | focus | Lock In |
  | confidence | Back Yourself |
  | habits | Cut It Off |

- **What the voice never does:** no promises about money, bodies or "changing your life"; no "real men" or alpha talk; no glorifying no-sleep or training through injury; never mocks mental health.
- **App Store rating:** frequent profanity rates the app **13+** under Apple's current scale. I suggest choosing **16+** to match the audience. The App Store page itself (icon, name, subtitle, screenshots, preview) must use clean lines.

---

## 4. Brand → design system

These values come from unsetld.com.

| Token | Value | Use |
|---|---|---|
| Background | `#0a0a0a` | Default theme base |
| Surface / border | `#141414`, `#1c1c1c` / `#252525` | Cards, dividers |
| Text | `#ffffff`, secondary `#888888` | |
| Accent | `#c41e1e` (pressed `#a71a1a`) | Streak, XP bar, rank-ups, primary buttons |
| Display serif | **Cormorant Garamond** (OFL, bundled) | Daily lines, with Dynamic Type scaling |
| UI sans | **Inter** (OFL) | Interface |
| Mark | Walking-figure silhouette + lowercase "unsetld" wordmark | App icon, share watermark |

Lock screen widgets are always monochrome (iOS vibrant mode), so they rely on typography. Tinted and clear Home Screens strip widget backgrounds, so every widget must read without one.

---

## 5. Content sourcing

- **Original lines:** written fresh, with a search check on anything that sounds familiar. The critic pass already caught near-copies of Nike, Goggins-style lines, Elizabeth Gilbert, Henry Rollins and Ed Mylett.
- **Marcus Aurelius:** George Long's translation, Gutenberg **#15877**. (#2680 is Casaubon's translation, not Long's.)
- **Seneca:**
  - Gummere's translation is **not on Gutenberg**. It is public domain in the US (1917–1925), but Gummere died in 1969, so it's in copyright in life+70 countries (UK, EU) until 2039.
  - For the in-app library, I suggest Aubrey Stewart's Seneca translations: Stewart died in 1918, so they're public domain everywhere, and they're on Gutenberg. I'll confirm the exact ebooks in Phase 7.
  - The TikTok slide's Gummere quote is verified (*Letters* 13.4) and fine as a short quote.

---

## 6. Folder structure

```
unsetld-app/
├── project.yml                     # XcodeGen spec → UNSETLD.xcodeproj (generated, git-ignored)
├── Config/
│   ├── Base.xcconfig               # APP_DISPLAY_NAME = UNSETLD, bundle IDs, App Group, team ID
│   ├── Debug.xcconfig  Release.xcconfig
│   ├── Secrets.xcconfig.example    # RevenueCat public SDK key (real file git-ignored)
│   └── UNSETLD.storekit            # local StoreKit test products
├── Packages/UnsetldCore/           # shared by app + widget; no UI imports; unit-tested
│   ├── Sources/UnsetldCore/
│   │   ├── AppConfig.swift         # the one config constant
│   │   ├── Models/                 # Line, Lane, Tone, Theme, UserSettings, Entitlement
│   │   ├── Content/                # ContentLoader, DailyLinePicker, SeededShuffle
│   │   ├── Storage/                # SharedStore (App Group), SecureStore (Keychain), CloudBackup (iCloud)
│   │   ├── Streak/                 # StreakTracker, Shields
│   │   ├── Rank/                   # XPLedger, RankEngine, Decay, TrustedClock, PerkCatalog
│   │   └── Reminders/              # ReminderPlanner
│   └── Tests/UnsetldCoreTests/
├── App/
│   ├── Features/  Onboarding/ WidgetGuide/ Paywall/ Feed/ Favorites/ CustomLines/
│   │              Rank/ Missions/ Settings/ Share/
│   ├── Services/  Purchases (RevenueCat), Notifications, WidgetRefresher, PerksFeed
│   ├── DesignSystem/  Resources/ (Fonts: Cormorant Garamond, Inter)  Info.plist  App.entitlements
├── Widget/  WidgetBundle.swift  DailyLineProvider.swift  Views/  Info.plist  Widget.entitlements
├── Content/                        # ← edit freely; no code changes
│   ├── lanes.json  themes.json  onboarding.json  rank.json  missions.json
│   ├── lines/show-up.json bag-talk.json gym-rat.json lock-in.json back-yourself.json cut-it-off.json
│   ├── notifications.json  stoic.json
│   └── schema/*.schema.json
├── Scripts/  validate_content.py  verify_stoic.py  review_sheet.py  gen_textures.py  shopify_codes.py
├── Web/                            # drop-ins for unsetld.com: /app page, perks feed, early-access check, (v2) API
├── Legal/    privacy.md  terms.md  rewards-terms.md
├── marketing/  tiktok-slideshows.md  app-store-copy.md  screenshots.md
└── docs/     BUILD_PLAN.md  REWARDS.md  VOICE_SAMPLE.md  COMPLIANCE.md  NAME_AND_TRADEMARK.md  research/
```

---

## 7. Questions before Phase 0

Each has a default, so "defaults are fine" is a valid answer.

1. **Mac:** can your MacBook Air run Xcode 26 or newer, and do you have an iPhone to test widgets on? *Default: yes, so native SwiftUI.*
2. **Voice:** approve [VOICE_SAMPLE.md](VOICE_SAMPLE.md), or tell me what to push harder or pull back.
3. **Rank ladder + discount caps:** OK with 10% / 15% / 20% max, at most $25 off an order and $150 per person per year ([REWARDS.md](REWARDS.md))? Are your real product costs close to the assumed 40% of price?
4. **TikTok accounts for "How did you find us?":** @unsetldclo and @unsetld, any others?
5. **Apple Developer account:** individual or company (the seller name shows on the App Store)? Bundle ID prefix (e.g. `com.unsetld`)? *Default: `com.unsetld.app`.*
6. **Attribution:** OK to send the "How did you find us?" answer to RevenueCat as an anonymous attribute so you can see trials per TikTok account? *Default: yes, disclosed in the privacy policy.*
7. **Repo:** build in `unsetld-app/` inside this repo (where these docs now live), or a new repo? *Default: here.*
8. **Premium reminders:** market as "up to 12 a day" instead of "unlimited"? *Default: yes.*
