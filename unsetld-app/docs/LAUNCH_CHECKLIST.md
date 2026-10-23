# Launch checklist

The gate for submitting UNSETLD to the App Store. Written 19 Oct 2026, after the launch pass merged on `claude/charming-thompson-92eslx` (version 3.3.0). **Submission is blocked until every line in sections 1–5 is ticked and every check in section 6 has passed on a real device.** Section 7 lists what must exist before rewards are ever switched on; none of it is needed for a launch with rewards off.

What changed in the launch pass, and every founder decision with the default that was assumed, is in [LAUNCH_PASS_PLAN.md](LAUNCH_PASS_PLAN.md). The proposed listing, privacy label and age-rating answers are in [founder/STORE_METADATA.md](founder/STORE_METADATA.md); prices and the trial in [founder/PRICING.md](founder/PRICING.md).

The unit and store tests are valuable, but they run in Node with the native modules stubbed. They don't replace section 6.

---

## 1. P0 code gates

Run `npm run check` (typecheck, lint, every test, content validation) on the commit you build from. Each gate below names the test that holds it; all of them passed on the launch-pass branch at the time of writing. If one fails, the build doesn't ship.

| # | Gate | Held by (file › test) | Result |
|---|---|---|---|
| P0-1 | A build that can't reach the App Store never unlocks UNSETLD+ | `src/services/__tests__/purchases-mode.test.ts` › "purchaseModeFor: the full matrix", "a release build never runs in preview mode, so it never unlocks for free", "a release iPhone build with no key sells nothing and answers inactive", "a release build with a Test Store key is unavailable too" | [ ] |
| P0-1 | A preview-mode unlock saved by an earlier build is cleared at launch, offline | `src/state/__tests__/premium.test.ts` › "a preview-mode unlock is cleared in a store build, offline, before RevenueCat answers" | [ ] |
| P0-1 | A production EAS build without an `appl_` key stops | `src/services/__tests__/check-release-env.test.ts` › "exits non-zero for a keyless production build and zero otherwise", "runs as the eas-build-pre-install hook" | [ ] |
| P0-2 | UNSETLD+'s extra swaps never raise what a day earns | `src/state/__tests__/swap-parity.test.ts` › "the first swap is free of the cap; every later one is capped at what it replaces", "{minutes} min, {intensity}: three swaps never beat one" (every day shape); `src/screens/swap/__tests__/swap-store.test.ts` › "a member's second and third swaps: offered and planned at what they replace, and proving credits that" | [ ] |
| P0-3 | What a user types is checked on the phone; ordinary text is never flagged | `src/core/__tests__/safety.test.ts` › "user text safety table", "none of the 290 everyday goals and missions, as any field", "every approved mission title, instruction, proof line and template", "support names 988 on a US phone and findahelpline.com elsewhere" | [ ] |
| P0-3 | A refused title can't be added or fill a mission title | `src/screens/swap/__tests__/swap-safety.test.ts` › "draftInput is null for it, so \"Add to today\" stays off", "won't make a mission of the user's own from a refused title"; `src/core/__tests__/titles.test.ts` | [ ] |
| P0-4 | Age: year first, the month only on the 13 line; only the bucket kept | `src/core/__tests__/age.test.ts` › "year first, the month only on the 13 line" (all cases) | [ ] |
| P0-4 | Apple's simulated adult is never accepted | `src/core/__tests__/age.test.ts` › "never takes the simulated adult (before iOS 26, on the web): no declaration, no answer"; `src/services/__tests__/age-range.test.ts` › "the simulated adult (no declaration) is never an answer", "a decline, an unavailable service or a failed check falls back to the year question" | [ ] |
| P0-4 | Under 13 deletes everything, then blocks the install | `src/services/__tests__/wipe.test.ts` › "Under 13: the age gate runs the real delete" › "deletes everything on this phone, then blocks the install for good", "a delete that fails still blocks, with the data left for the block screen to try again"; `src/core/__tests__/age.test.ts` › "where the app opens" | [ ] |
| P0-5 | Delete data on this phone removes everything local, Keychain first | `src/services/__tests__/wipe.test.ts` › "deletes all four Keychain items, the record first and before the store reset", "leaves only the trial reminder pending and dismisses what was delivered", "clears the proof folder, the image caches and the widgets, after the store reset", "goes nowhere near the network, and then reads UNSETLD+ from the store again", "a write already waiting when the delete starts never puts the Keychain record back", "touches nothing else when the Keychain record cannot be deleted, and the writer runs again" | [ ] |
| P0-5 | The backup can't undo a delete or overwrite a restore | `src/services/__tests__/backup.test.ts` › "writes nothing before startup has read the Keychain copy, then restores it and writes what the store holds", "suspending drops the write waiting, so deleting the item sticks", "an empty record deletes the item instead of writing one" | [ ] |
| P0-5 | After the delete the app is a new install | `src/state/__tests__/store-reset.test.ts` › "leaves the state a new install starts with, loaded and saved", "a reload after the reset still starts fresh"; `src/content/__tests__/data-copy.test.ts` › "WHAT GOES covers the brief's eight things" | [ ] |
| P0-6 | One version everywhere, no build number in the repo | `src/config/__tests__/version.test.ts` › "is the same in app.json, package.json, the lockfile and AppConfig", "leaves the build number to EAS", "adds no Face ID usage string" | [ ] |
| P0-7 | The policy says what the app does | `src/content/__tests__/legal-copy.test.ts` (all), `src/content/__tests__/day-shape-copy.test.ts` › "the record doc's day paragraph says the same" | [ ] |
| P1-1 | The day keeps to the time chosen | `src/core/__tests__/day-shape.sim.test.ts` › "the time promise, model J targets (gates)" (all six), "a 15-minute day is never more than 20 minutes"; run once with `SIM_FULL=1` (1,540 setups) before the release build | [ ] |
| P1-13 | Notifications never silently exceed iOS's 64 | `src/services/__tests__/notification-budget.test.ts` › both iOS models: "10 reminders a day, 3 drops, a trial and a running timer: everything fits, the timer included"; "{model}: syncTrialReminder's trial-end survives a full rebuild, and the 2.x trial-day2 goes" | [ ] |
| v8 | A 3.3 (store v7) install upgrades without losing anything | `src/state/__tests__/store-migrate.test.ts` › "v7 → v8 (launch pass): from the state the 3.3 build saved" | [ ] |
| Content | The 66 missions and the plans are as approved | `npm run validate` prints "Content OK." | [ ] |

---

## 2. Ops

| # | Item | Owner | Result |
|---|---|---|---|
| O1 | Publish the Privacy Policy and Terms of Use from `src/content/legal.json` (after counsel, section 4) at `https://www.unsetld.com/pages/app-privacy` and `/pages/app-terms` (`src/config/app.ts`). Both return 404 today. | Founder / site | [ ] |
| O2 | Publish a support page (proposed `https://www.unsetld.com/pages/app-support`): contact email, how to delete data on the phone, restore or cancel UNSETLD+, links to Privacy and Terms. | Founder / site | [ ] |
| O3 | Deploy `/api/app/config.json` and `/api/app/drops.json` with `"accessEnabled": false` (from `Web/api/app/`). Both return 404 today; the app then keeps its defaults, which is safe, but a deployed `false` is the switch you control. | Ops | [ ] |
| O4 | Time check: deploy `GET /api/app/time` returning 204 with `Cache-Control: no-store`, then change `timeCheckUrl` in `src/config/app.ts` to it (one line, not done in this pass). Today the check reads the site root's edge-cached `Date` header, so a day may never record as verified. Not a blocker for a rewards-off launch (nothing reads "verified" until rewards), but do it before rewards. | Ops + one code line | [ ] |
| O5 | RevenueCat: the iOS app for `com.unsetld.app` connected to App Store Connect, App Store Server Notifications pointing at RevenueCat, the three products imported, entitlement `full_edition` attached to all three, offering `default` marked Current with the standard Annual, Monthly and Lifetime packages. | Founder | [ ] |
| O6 | EAS: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` = the public App Store key (`appl_…`) in the EAS **production** environment (`npx eas-cli@latest env:list --environment production`). | Founder | [ ] |
| O7 | **Open seam: `eas.json` production environment.** The `production` build profile doesn't name an `environment`. Either add `"environment": "production"` to it or confirm in the first production build's log that EAS loaded the production variables and that `check-release-env: production RevenueCat key present.` printed. A build that can't see the key stops at the pre-install hook (safe, but blocks the release). | Founder | [ ] |
| O8 | Apple Developer: the App ID `com.unsetld.app` has the Declared Age Range capability (the entitlement `com.apple.developer.declared-age-range` is in `app.json`), App Groups (`group.com.unsetld.app`) for the widgets, and Sign in with Apple (`usesAppleSignIn`). The widget extension `com.unsetld.app.widgets` is in the same group. | Founder | [ ] |
| O9 | The EAS image is `sdk-57` (Xcode 26) for every profile (`eas.json`), needed for the age-range entitlement and iOS 26 APIs. Run `npx expo prebuild --clean` before any local build. | Dev | [ ] |
| O10 | A new development client after the launch pass (it added the native `expo-age-range` module); an older dev client falls back to the year question, by design. | Dev | [ ] |

---

## 3. App Store Connect

| # | Item | Result |
|---|---|---|
| A1 | Create the app record for `com.unsetld.app` (it doesn't exist yet). Complete the Paid Applications agreement, tax and banking. | [ ] |
| A2 | **Version.** The code says 3.3.0 in `app.json`, `package.json` and `AppConfig` (a test keeps them equal). The plan's default for the first App Store release is 1.0.0, provided no build was ever uploaded under `com.unsetld.app`. Founder picks; changing it is the three files plus the lockfile, and `version.test.ts` checks them. The build number is EAS's (remote, auto-increment). | [ ] |
| A3 | Name and subtitle (proposed "UNSETLD: Daily Missions" / "Do the mission. Prove it."; founder/STORE_METADATA.md). `AppConfig.appStoreName` still says "UNSETLD: Daily Discipline" (nothing reads it); align it after approval. | [ ] |
| A4 | Privacy label as in founder/STORE_METADATA.md §7.1: no tracking; **Purchases › Purchase History** collected by RevenueCat, not linked, for App Functionality and Analytics; nothing else collected. Analytics ship dormant, so no Usage Data row until PF-5. | [ ] |
| A5 | Age rating: answers in founder/STORE_METADATA.md §8, **Age Assurance: Yes**, Health or Wellness Topics: Yes, everything else None or No; **Override to 13+** (the Terms of Use now set 13 as the minimum). | [ ] |
| A6 | Subscriptions: one group "UNSETLD+" with Annual (`unsetld_full_annual`) and Monthly (`unsetld_full_monthly`), Annual ranked above Monthly; Lifetime non-consumable (`unsetld_full_lifetime`); prices and the trial per the founder's pricing decision (default: $4.99 / $24.99 / $69.99, a 1-week free trial on Annual only); **Family Sharing off** on all three (it can't be turned off later). Keep the product ids: the app tells plans apart by "monthly" and "lifetime" in the id when the offering hasn't been read. | [ ] |
| A7 | URLs: Privacy Policy (O1), Support (O2), Terms of Use in the description; all open. | [ ] |
| A8 | Description, keywords, promotional text and seven screenshots as approved (founder/STORE_METADATA.md §3–6). No Rewards screen, no prices, no "free", no "AI". Proof photos show objects only. | [ ] |
| A9 | Review notes as approved (founder/STORE_METADATA.md §10), with the contact line filled in: no account needed, the birth-year gate, rewards in the binary but off and only turned on through a reviewed update, Delete data on this phone. | [ ] |
| A10 | Territories: the default is US only at launch (founder decision 25). | [ ] |
| A11 | Sandbox testers, including one in a family group with Ask to Buy. | [ ] |

---

## 4. Legal review (scope and sign-off)

Counsel reviews the text as it is in `src/content/legal.json` (Privacy Policy updated 23 Oct 2026, Terms of Use 19 Oct 2026, rewards terms 12 Oct 2026) and the in-app copy named here, then signs off below. Nothing in the app is legal advice; this list is what to ask.

| # | Question | Where | Signed off |
|---|---|---|---|
| L1 | Privacy Policy: accurate and sufficient, including the Keychain copy's contents and that iOS keeps it after the app is deleted, the local delete versus account delete, and how RevenueCat purchase records are deleted (by email with Apple's order ID). | `legal.json` › privacy | [ ] |
| L2 | Terms of Use: 13 and over, "What you write", UNSETLD+ auto-renewal wording, Apple's standard EULA. | `legal.json` › terms | [ ] |
| L3 | Rewards and status terms (only shown when rewards are on): no purchase necessary, US residents 13 and over with a parent's OK under 18, no cash value, changes with 30 days' notice. | `legal.json` › access | [ ] |
| L4 | Real-value rewards for minors: whether 13–17 can take part, and whether a parental consent flow is needed before rewards turn on. | ACCESS.md, COMPLIANCE.md | [ ] |
| L5 | US state app-store age laws (Texas, Utah, Louisiana): is a neutral year-of-birth gate plus Apple's Declared Age Range (asked only where `isEligibleForAgeFeaturesAsync()` is true) enough; may a decline fall back to the year question (the shipped default); what changes when someone in a regulated state declines. | COMPLIANCE.md, `services/ageRange.ts` | [ ] |
| L6 | COPPA posture: the under-13 path deletes what was entered, keeps nothing, sends nothing, and allows no retry on the install (a reinstall asks again). | `screens/onboarding/ageGate.ts`, `copy/age.ts` | [ ] |
| L7 | The 988 support copy: "If you're thinking about hurting yourself, you don't have to deal with it alone." / "Call or text 988, any time. It's free and confidential." (US phones) / findahelpline.com elsewhere. | `src/content/copy/safety.ts` | [ ] |
| L8 | Subscription disclosures on the paywall (3.1.2): trial length from the store, "Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends.", Terms and Privacy links. | `copy/platform.ts` › paywall | [ ] |
| L9 | Before analytics are ever turned on (PF-5): the policy section, the consent default by age, and the privacy manifest. Not needed for launch: nothing is collected. | docs/METRICS.md | [ ] |

Sign-off: name ______________________  date __________

---

## 5. Open seams from the merge

Small things the integrator listed that no test covers end to end. Each needs a decision or a device check before submission.

| # | Seam | What to do | Result |
|---|---|---|---|
| S1 | **`trial-day2` legacy id.** 3.2 builds scheduled a fixed 48-hour trial reminder as `trial-day2`. `syncTrialReminder` and `cancelTrialReminder` cancel it by name whenever the membership is read, and it is off the budget's allowlist (`core/reminders` `OWN_IDS`), so every reminder rebuild cancels it as an older build's id, Delete data's included. | Device check D14 (an upgrade mid-trial). | [ ] |
| S2 | **PlansScreen's About-you line.** `copy/programs.ts` `needsSchool` ("Needs a yes to "In school or college?" in About you") still links to `AboutYou`, which is now You › What you're learning and has no school question. No shipped plan can show it (no approved mission needs school), but a future plan holding C2 (job search) would show a dead end. | Remove or reword before any plan with a requirement ships (PF-2 review). | [ ] |
| S3 | **`eas.json` production environment.** See O7. | O7 | [ ] |
| S4 | **Declared Age Range on a device.** Only stubs test it. | Device check D15. | [ ] |
| S5 | **RevenueCat sandbox.** The fail-closed matrix and the trial math are unit-tested; the real store isn't. | Device check D8. | [ ] |
| S6 | **Widget reset.** Delete data and the under-13 path call `resetWidgets()` (Black preview, nothing for the foreground listener to write back). Tested with the native module stubbed. | Device check D16. | [ ] |

---

## 6. Real-device checks

Run on TestFlight builds (a production-profile build where it says so), on at least one iPhone on iOS 26.2 or later and one on an earlier iOS. Record each result. A failure blocks submission until it's fixed and re-run.

| # | Check | Steps | Pass when | Device / iOS / build | Result | Date, tester |
|---|---|---|---|---|---|---|
| D1 | Pending limit | Member build, 10 reminders a day, a running timer, a trial in sandbox, three test drops through a staging `drops.json` (`accessEnabled: true` on staging only). Read the pending list in a debug build. Kill the app. | At most 60 pending; `timer-done` and `trial-end` present; only two `drop-*`; the timer alert fires with the app killed. | | | |
| D2 | Timer, kill and reboot | Start a timer, lock, kill, reboot. Then pause, resume past 4:00 AM. | The alert sounds at zero, the tap opens the mission, proof is accepted. After 4:00 AM: one "The day ended at 4:00 AM." dialog, and no stale alert arrives. | | | |
| D3 | 4:00 AM rollover | Leave the app open across 4:00 AM on Today, the Record tab and a Mission screen; separately, background it across 4:00 AM. | A new day's plan with the right shape; yesterday's timer and before photo gone (once); widgets roll over with the app closed. | | | |
| D4 | Daylight saving, 1 Nov 2026 (US) | Reminders scheduled across the change; a timer running across 2:00 AM; the 4:00 AM boundary that night. | Reminders at their local times; the timer ends on time; the day changes once at 4:00 AM. | | | |
| D5 | Locked launch | Reboot, then launch from a notification before unlocking. Unlock. | Storage is read again after unlock; nothing resets; the Keychain copy isn't overwritten by an empty record. | | | |
| D6 | Reinstall and restore | Prove 3 days, delete the app, reinstall. | Record, streak and points come back; photos show "Not on this phone"; onboarding (with the age gate) runs again; notifications are asked for again only when needed. Then: Delete data on this phone, delete the app, reinstall: nothing comes back. | | | |
| D7 | Offline | Airplane mode for first launch and onboarding, a proof, the paywall (failed state, then Retry), Restore, and Delete data on this phone. Back online. | Everything free works; the paywall shows its error, not a fake price; the delete completes offline; config and drops refresh online. | | | |
| D8 | RevenueCat sandbox | Production-profile build with the `appl_` key: Annual with its trial (the paywall shows the store's length and dated timeline), Monthly, Lifetime, Restore on a second device, cancel in Settings (gates return, the You row shows the end date, the trial reminder goes), Ask to Buy ("Waiting for approval."), a declined payment. Then a build with no key, and one with a `test_` key. | Every purchase opens UNSETLD+ through `full_edition`; a keyless or `test_` build shows "UNSETLD+ isn't available right now." and never unlocks; an old preview unlock is gone. | | | |
| D9 | Sign in with Apple (staging) | Staging config with `accessEnabled: true`: first and repeat sign-in, relay email, Delete account, revoke in iOS Settings, the sign-in-again-to-delete path. Then the release config. | Account works on staging; in the release config the Account group is hidden and nothing reaches sign-in. (The server routes are a rewards item, section 7; this check confirms the launch build exposes none of it.) | | | |
| D10 | Widgets | All three widgets in every family, Lock Screen, StandBy, tinted mode, a member's colorway, deep links before and after onboarding and before the age gate. | Titles personalized as on Today; counts match the day's shape (one to four); taps wait for the age gate. | | | |
| D11 | Camera and photo cleanup | Deny camera, go to Settings, come back. Prove a photo mission and inspect the container. Kill the app during review. Let 30 days pass (device date). | EXIF stripped; `Caches/ImagePicker` and `Caches/ImageManipulator` empty after the proof; the killed review's photo removed at the next launch (after 10 minutes); 30-day expiry deletes the file and keeps the mission. | | | |
| D12 | Time check | With `/api/app/time` live (O4), and again with a wrong device clock. | A day records as verified with the right clock and not with a wrong one. | | | |
| D13 | First upload | Upload the production build. Open the App Store Connect URLs. | No version-mismatch warning (ITMS-90473); the privacy, terms and support URLs open; the build has no `NSFaceIDUsageDescription`. | | | |
| D14 | Upgrade from 3.3 (store v7) | Install the last pre-launch-pass build, onboard, prove a few days, finish Get Organized, start a trial in sandbox (3.2-era `trial-day2` if available), then install this build over it. | The record, plans and answers stay; the age question shows once, then Today; no surprise Plan moment for an old finish; reminders offer doesn't appear (already onboarded); `trial-day2` is replaced by `trial-end`. | | | |
| D15 | Declared Age Range | On iOS 26.2+ with an account where age rules apply: share a range; decline; and a child account under 13 if one is available. On an earlier iOS and in the browser preview. | A shared range answers the gate without the year question; a decline or no service shows the year question; under 13 deletes and blocks; an earlier iOS never shows Apple's prompt. | | | |
| D16 | Delete data on this phone | With proofs, a plan running, reminders on, widgets placed, a trial running: delete. Then the under-13 path on a fresh install with a Keychain record restored. | The app returns to Name; the widgets show the empty preview and stay that way after returning to the app; only the trial reminder is pending; the proof folder is empty; a reinstall restores nothing. | | | |
| D17 | Notification permission flows | New install: onboarding asks nothing. Start a timer (iOS asks). New install again: prove a mission, then the reminders card's Turn on. | The ask comes at the timer or the card, never in onboarding; Not now hides the card for good; a denied permission never shows the card. | | | |

D1–D13 are the launch audit's thirteen; D14–D17 cover what this pass added.

---

## 7. Before rewards turn on

Rewards stay off at launch (`accessEnabled: false`). Switching them on later is its own reviewed release, with updated metadata, privacy label and review notes. None of these is needed for a rewards-off launch.

| # | Item | Result |
|---|---|---|
| R1 | Server routes from docs/ACCESS.md: `sync`, `checkin`, `proof`, `redeem`, `account/delete`, on the existing site. | [ ] |
| R2 | Apple token revocation on account delete (`/auth/revoke` with the stored refresh token) and Apple's server-to-server notification endpoint. | [ ] |
| R3 | A Sign in with Apple credential-state check on foreground (`getCredentialStateAsync`; revoked or not found signs out on the phone). Not in the app yet. | [ ] |
| R4 | The $25 cap: decide and build (docs/ACCESS.md, Minting codes): a Shopify Discount Function at checkout (needs Shopify Plus, or a public discount app), fixed-amount codes (the leading option, which changes the tiers, the copy and the terms from percent to amount), or dropping the cap. | [ ] |
| R5 | A redeem URL that applies the code at checkout (`https://www.unsetld.com/discount/{CODE}` or equivalent), tested end to end. | [ ] |
| R6 | Drop alerts on staging: the opt-in switch, only the next two scheduled, never Time Sensitive. | [ ] |
| R7 | Counsel's answer on rewards for minors (L4) and any consent flow it needs. | [ ] |
| R8 | The time check live (O4): `sync` sends only the phone's clock-verified days. | [ ] |
| R9 | Re-check the privacy label (sign-in adds a user ID, an optional email and proof counts, linked) and the review notes; submit as an update. | [ ] |
