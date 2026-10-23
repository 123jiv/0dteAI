# Compliance notes (Apple, TikTok, rewards)

Updated for UNSETLD 3.1 (10 Oct 2026): a missions app for ages 13–25 with photo proof, points and rewards at unsetld.com. The product is specified in [MISSIONS_SPEC.md](MISSIONS_SPEC.md) and the 3.1 screens in [UX_REDESIGN.md](UX_REDESIGN.md); the reward contract is in [ACCESS.md](ACCESS.md). The paid membership is **UNSETLD+** (it was Full Edition), guided programs are **Plans**, and Settings now lives in the **You** tab.

Sources were checked on 2026-10-07: the App Review Guidelines (last updated 2026-06-08), the App Store Connect age-rating questionnaire, Apple's subscription page, and TikTok's Community Guidelines (effective 2026-09-24). Raw research is in `research/`. This isn't legal advice; have a lawyer review the rewards terms and the Privacy Policy before launch.

**Launch pass (19 Oct 2026, version 3.3.0).** Brought up to date with the merged launch pass: the 13+ age gate and Apple's Declared Age Range, the user-text safety check, Delete data on this phone, purchases that fail closed, the trial read from the store, the notification budget and the Keychain copy's real contents. Rewards stay off at launch. The submission steps, the legal review scope and the real-device checks are in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md); the proposed listing, privacy label and age-rating answers in [founder/STORE_METADATA.md](founder/STORE_METADATA.md).

## What changed in 3.0

- **No strong language.** The quote library, its *Strong language* setting and the "keep lock screen clean" switch are gone. Nothing in the app swears, and `npm run validate` fails on swearing in missions and reminders.
- **Photo proof is how a day counts.** The night check is gone: a day goes on record once a mission is proven with the in-app camera. Photos stay on the phone and are checked on the phone.
- **Rewards** come from points for proven missions, with tiers that can change from unsetld.com's config. The 2.x ranks are gone; levels per area count only your own points, and there are no leaderboards.

## Age rating and audience

- **Audience:** 13 and up (the Privacy Policy, the Terms of Use and the rewards terms say so, and the age gate enforces it). The app is built for 13–25.
- **Questionnaire answers:**
  - Profanity or crude humor: **None**. (The 2.x answer was *Frequent*; drop it.)
  - Age Assurance: **Yes** (the year-of-birth gate, and Apple's Declared Age Range where available).
  - Health or wellness topics: **Yes**. The seven Fitness missions cover workouts, walks and cardio. (An earlier version of this note listed stretching, sleep and food missions; the approved library has none.)
  - Alcohol, tobacco or drug use or references: **None** in the app's content. The user-text check names nicotine, alcohol and drugs only to refuse them after someone types them.
  - Contests: **None**. Rewards are fixed points thresholds, with no chance, no ranking and no prizes.
  - User-generated content: **No**. Photos never leave the phone and nobody else sees them.
  - Social media or messaging: **No**.
  - Unrestricted web access: **No**. Store links open in Safari, never an in-app browser.
- **Rating:** with these answers the questionnaire is likely to come out at 9+. Choose **Override to Higher Age Rating → 13+**: the Terms of Use now set 13 as the minimum, and Apple requires the override when the app's terms set a minimum above the calculated rating.
- **What keeps the content safe for teens (Guideline 1.4.5):** missions never urge risky challenges. `npm run validate` fails on calorie deficits, water or dry fasts, weigh-ins, shirtless, body-check or progress pictures, skipping sleep and all-nighters, alcohol, vaping, nicotine and weed, day or options trading and leverage, casinos, sports betting, lotteries and dares. Since the launch pass the hard list also covers plurals and synonyms (all-nighters, vapes, beers, liquor, cigarettes, weed, purging, starving yourself, skipping meals, crypto, stock and forex trading, gambling). It lists softer words (diets, calories, supplements, caffeine, ice baths, selfies, mirrors, faces, grades, a bedroom, an address, a location) as warnings to check by hand before shipping. No approved mission needs gym access (the only requirement in the library is C2's job search). The Terms of Use say missions are motivation, not medical advice, and to do them within your limits and swap any that don't suit you.
- **What people type (launch pass P0-3).** Own-mission titles, the goal and the weekly "Something else" are checked on the phone with the same unsafe categories the library excludes (fasting and calorie targets, extreme exercise and no sleep, nicotine, alcohol and drugs, gambling, day, options and leveraged trading, dares and meeting people from online, adult content, passwords, card and ID numbers, addresses). A refused title can't be added, a refused goal steers nothing and never fills a mission title, and nothing is counted or sent. Self-harm and eating-disorder signals show a calm line with Call 988 / Text 988 on a US phone and findahelpline.com elsewhere. Counsel reviews the 988 wording. Details: MISSIONS_SPEC.md §4, What the user writes.
- **The age gate (launch pass P0-4).** After the brand intro, before anything is entered: "What year were you born?", the month only on the one year the 13 line runs through. Only the bucket (13–15, 16–17, 18+) is kept, on the phone; the year and month are never saved or sent. Under 13: everything on the phone is deleted (the Keychain copy included), the install stays on "UNSETLD is for 13 and over." with the Privacy Policy, and there's no retry. Installs from before the gate are asked once. The age bucket changes almost nothing: Apply for jobs or internships isn't offered as a weekly focus under 16.
- **Apple's Declared Age Range** (`expo-age-range`, entitlement `com.apple.developer.declared-age-range`): asked on iOS 26 and later, only where `isEligibleForAgeFeaturesAsync()` says age rules apply (iOS 26.2+), with the gates 13, 16 and 18. A decline, an unavailable service or the module's simulated adult falls back to the year question. It needs a real-device check (LAUNCH_CHECKLIST.md).
- **US state app-store age laws** (Texas, Utah, Louisiana): counsel to confirm whether a decline in a regulated state may fall back to the year question (the shipped default), and whether rewards need a parent's consent flow for minors. Rewards stay off for everyone until counsel rules; consider limiting real-value rewards to users 18 and over if a lawyer advises it.

## Photo proof

- **Camera only.** iOS opens the camera, never the photo library (`photosPermission: false` in `app.json`). The camera permission text says what it's for: "unsetld uses the camera only when you prove a mission. Photos stay on your phone." (5.1.1(ii)). The app asks the first time someone opens the camera.
- **Saving the share card.** The share card (no proof photos on it) goes to the system share sheet only when the user taps Share. "Save Image" there needs add-only Photos access, so `app.json` sets `NSPhotoLibraryAddUsageDescription`: "unsetld saves your share card to Photos only when you choose Save Image." The app never reads the photo library.
- **Photos stay on the phone.** They're saved in the app's own folder and never uploaded. Like other app files, they can be part of the user's own iPhone backup.
- **Metadata is stripped.** Each photo is resized to 1600 px and re-encoded as a new JPEG, which drops EXIF, including location.
- **Retention.** Photos are deleted after 30 days by default (You → Proof photos: 30 days, 1 year or Always), at the next launch or return to the app. The mission, its points and its fingerprint stay.
- **One copy (launch pass P1-16).** Saving a proof deletes the camera's full-size original and the resized copy from their cache folders; the photo views keep images in memory only; at startup, proof files nothing points to (older than 10 minutes) and the two cache folders are cleared. Delete data on this phone removes every photo and clears the image caches.
- **Checks run on the phone and don't look at the content.** They check that the right photos are there, the proof photo is from the last 30 minutes, before and after are at least 2 minutes apart, the focus timer finished first, and the photo was never used before. No AI, no facial recognition, nobody reviewing photos. Copy never says a photo was verified by AI (2.3.1: no misleading claims). If a server-side vision check is ever added (`TaskProofVerifier` in `src/services/verify.ts`), it means uploading photos: update the Privacy Policy, the privacy label and the camera text first.
- **What missions never ask for:** faces, bodies, other people, IDs, addresses, bank details, grades, medical information, private conversations, a bedroom specifically, or location. There's no public feed and no sharing of proof.
- **Store screenshots** show proof photos of objects only, never people, faces, documents or screens with personal details.

## The App Store page must stay clean (2.3.7, 2.3.8)

- Icon, name, subtitle, keywords, screenshots, the preview video and its audio, subscription promo images and in-app event cards must suit every age.
- Suggested name and subtitle: **UNSETLD: Daily Missions**, **Do the mission. Prove it.** (The 2.x subtitle "One line every morning." is retired.)
- No prices, discount percentages or "free" in the name, subtitle, keywords, description or screenshot captions, and nothing that makes the app read as a store. A screenshot of the Rewards screen shows the tiers as the app does; keep its caption about points.
- The description says which features need UNSETLD+ (2.3.2): every plan, three swaps a day, all ten colorways and up to ten reminders a day.

## Lock screen, widgets and notifications

- **Widgets show the mission side only:** the next mission (title, area, minutes, points), today's missions with done squares, and the streak with points and the active-days barcode. No drop, discount or reward banners in widgets (2.5.16).
- **Notification permissions:**
  - Mission reminders and the focus timer's "done" alert are local notifications and use the normal prompt.
  - Drop alerts (a heads-up 24 hours before a drop opens to everyone) have their own opt-in switch in You, are off by default, and are never marked Time Sensitive (4.5.4). They exist only while rewards are on.
  - Onboarding asks for nothing. The permission is asked when a focus timer first starts, from the reminders card on Today after the first proof, or when reminders are turned on in You.
  - The trial reminder (`trial-end`) is scheduled from the store's own trial end, 24 hours before, only with permission.
  - **The 64 limit.** iOS keeps 64 pending notifications per app and silently drops the rest. The app keeps 4 free and holds places for the timer, the trial reminder and two drop alerts, so reminders get 56; a clean-up after each rebuild cancels anything else and trims the latest reminders to 60 in all (core/reminders, `overBudget`).
- Missions, proof, the streak and widgets all work with notifications off.

## Rewards and money

- **Points only for proven missions** (3.2.2(x)). Never for:
  - App Store ratings or reviews (5.6.3, FTC review rule)
  - turning on notifications, tracking or location (5.1.2(i))
  - installing other apps
  - posting about UNSETLD on social media (that would make posts paid endorsements needing #ad)
- **No purchase necessary.** UNSETLD+ is sold only through in-app purchase via RevenueCat and never changes points, rewards or status. Its extra swaps can't raise a day's points: every swap after the day's first earns at most what it replaces (launch pass P0-2). Its extra Plans can't either: a members-only Plan day is capped at what the same user's day earns without it (`capForPlan`). Everything it includes (more plans, swaps, colorways, reminders) unlocks the moment someone subscribes, never gated by streak or points (3.1.2(a)).
- **Never sell points,** codes or boosts through in-app purchase, and never create a subscription tier whose main value is merch discounts (3.1.1).
- **Clothes** are paid for only through Shopify checkout at unsetld.com, opened in Safari (3.1.3(e)). Discount codes for physical goods are fine.
- **No cash value.** Points and codes are not transferable and can't be sold, bought or exchanged for money. Codes are percent-off discounts, never store credit or gift cards (gift card law).
- **The tiers** (default, `src/content/rewards.json`): 5% off at 300 points, 10% off at 600 and 15% off at 1,000, each up to $25 off, one code per tier per collection, codes valid 30 days. unsetld.com's config can change them; the server checks every redeem against its own list and its own count of points.
- **UNSETLD status** (default, `src/content/milestones.json`): one discount code per tier, once per person, for days with a proven mission: 10% off at 7, 15% at 30, 20% at 90 and 25% at 365, each up to $25 off, codes valid 30 days. Free, earned only by proving missions; the server counts the days itself at redeem. Every reward in the app is a discount: no merchandise, no early access.
- **Minors:** rewards are for US residents 13 and over; under 18s need a parent's or guardian's OK to place an order. This is in the in-app rewards terms.
- **Not a contest.** Fixed thresholds, no chance, no leaderboard. If prizes are ever added, the program becomes a contest (5.3): official rules, "Apple is not a sponsor", free entry, adults only, $5,000 total or less (more needs registration in NY and FL), and a W-9 or 1099 above $2,000. **No prizes at launch.**
- **Positioning (4.2.2, 4.3(b)):** an app that is mainly a storefront gets rejected. Missions and proof are the product; rewards stay quiet (the Rewards tab and one line on Today and the done screen, never a popup, never in widgets, notifications or mission text; the paywall names them only as staying free, and only while they're on). In the App Review notes, explain that points come only from missions proven in the app, that nothing can be bought, and that photos stay on the phone. Tester tools aren't in release builds, so show the rewards flow with screenshots or a screen recording from a development build.
- **Rewards terms** (in the app as `access` in `src/content/legal.json`, and on unsetld.com before launch):
  - who can take part: US residents 13 and over, a parent's or guardian's OK under 18
  - no purchase necessary; how points are earned, the tiers and their limits
  - no cash value, not transferable
  - code expiry and one code per order
  - the right to remove points earned through misuse, and to change or end the program with notice

## Privacy

- **No account needed** for missions, proof, points, the streak or levels. Everything lives on the phone.
- **The Keychain copy.** The record is mirrored into the iPhone Keychain (`unsetld.record.v2`) so a reinstall keeps the streak and points. It holds the days on record and each proven mission with its title as the user saw it (goal words and the user's own titles included), its points, its check results and the paths on the phone and fingerprints of its photos (never the photos), Plans finished, reward codes taken, 2.x tasks and night check answers, and the planner's random number. The app never uploads it; iOS keeps it after the app is deleted, and it can be in the user's encrypted iPhone backups (default accessibility). Compaction and device-only items are a later decision. The Privacy Policy says all of this (`legal.json`, "The copy in your Keychain").
- **Delete data on this phone** (launch pass P0-5, You › YOUR DATA): local only, no network call, so it works offline and signed out. It removes the record, points, plans, settings and answers, the user's own missions, proof photos and caches, the sign-in on the phone, every Keychain item (`unsetld.record.v2`, `unsetld.session`, `unsetld.apple.identityToken`, `unsetld.rank.v1`), pending and delivered notifications except a trial reminder, and the widgets' data, then returns to the first screen. The Keychain delete comes first and is the only gate. UNSETLD+ stays with the Apple ID. It never deletes an account; a signed-in user is pointed to Delete account first.
- **What leaves the phone without an account:** a time check against unsetld.com (no identifier), the public config and drops files, and purchases through Apple and RevenueCat (an anonymous app user ID and purchase history). Nothing else: no analytics.
- **Analytics** ship dormant (plan item P1-20, docs/METRICS.md): no consent screen, nothing recorded and nothing sent until the founder turns them on (PF-5), which needs the policy text, the privacy label row and the privacy manifest in the same build.
- **Sign in with Apple** is optional and only for rewards and status (off at launch). The server then gets an Apple user ID, an optional relay email, and the dates and counts of proven missions with their points. Never a photo, never the user's answers or what they typed.
- **In-app account deletion** (5.1.1(v)): You → Account → Delete account removes the account and revokes the Sign in with Apple link (server route and revocation still to build before rewards turn on). It says what it leaves on the phone and where to clear it.
- **Privacy label at launch:** no tracking, no ads, no analytics. Purchases › Purchase History: collected by RevenueCat, not linked, not tracking, for App Functionality and Analytics (RevenueCat's guidance). Nothing else is collected; photos are not collected. With sign-in (later): a user ID, an optional email, and the dates and counts of proven missions, linked to the account, for app functionality. The full answers are in founder/STORE_METADATA.md §7.
- **Under 13:** the age gate blocks them on the install and deletes what was entered; the app doesn't knowingly collect their information, and the Privacy Policy says to email for deletion if a child has signed in.
- **Email** for rewards is always optional; codes show in the app (5.1.1).

## Paywall (subscriptions page, 3.1.2)

- The billed amount ($24.99/year) is the most prominent price. "Save 58%" and any per-month figure are smaller.
- Trial wording comes from the store product (launch pass P1-10): "1 week free, then billed yearly" on the row and "{length} free, then {price} per year. Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends." in the fine print, with a dated timeline (today, the reminder day when notifications are on, the first charge). It's shown only to eligible users; nothing assumes a fixed length.
- **Fails closed (P0-1).** A build without an App Store RevenueCat key (`appl_`) sells nothing and unlocks nothing: the paywall says "UNSETLD+ isn't available right now." Only dev builds and the browser preview show the labelled preview mode. A production EAS build without the key stops at `scripts/check-release-env.mjs`.
- No promise of content that isn't in the app ("and new ones each season" was removed).
- Restore Purchases, Terms of Use and Privacy Policy links are visible on the paywall and in the App Store metadata.
- Annual and monthly are in one subscription group. Lifetime is a non-consumable with restore.
- No prices in the app name, subtitle or screenshots.

## TikTok

- **Swearing:** there's no blanket rule that swearing in captions, on-screen text or audio removes a video from For You. The risk is aiming insults at a real person or a group. The app itself is clean now; keep brand posts aimed at the viewer's excuses, never at people.
- **Disclosure:** posts from @unsetld or @unsetldclo that push the app, a hoodie or a code need the commercial disclosure setting turned on ("Your brand").
- **Proof in posts:** show proof photos of objects, the same as the store screenshots: no faces, no minors, no documents or screens with personal details.
- **Avoid:**
  - reposting clipped motivational speeches (both a For You and a copyright risk)
  - "follow + comment for a code" bait
  - claims like "30 days to shredded"
  - challenge framing that pushes risk (no all-nighters, fasting or dares), matching the mission rules
- Use commercial-cleared music on brand posts.
