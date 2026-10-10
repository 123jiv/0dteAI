# Compliance notes (Apple, TikTok, rewards)

Updated for UNSETLD 3.1 (10 Oct 2026): a missions app for ages 13–25 with photo proof, points and rewards at unsetld.com. The product is specified in [MISSIONS_SPEC.md](MISSIONS_SPEC.md) and the 3.1 screens in [UX_REDESIGN.md](UX_REDESIGN.md); the reward contract is in [ACCESS.md](ACCESS.md). The paid membership is **UNSETLD+** (it was Full Edition), guided programs are **Plans**, and Settings now lives in the **You** tab.

Sources were checked on 2026-10-07: the App Review Guidelines (last updated 2026-06-08), the App Store Connect age-rating questionnaire, Apple's subscription page, and TikTok's Community Guidelines (effective 2026-09-24). Raw research is in `research/`. This isn't legal advice; have a lawyer review the rewards terms and the Privacy Policy before launch.

## What changed in 3.0

- **No strong language.** The quote library, its *Strong language* setting and the "keep lock screen clean" switch are gone. Nothing in the app swears, and `npm run validate` fails on swearing in missions and reminders.
- **Photo proof is how a day counts.** The night check is gone: a day goes on record once a mission is proven with the in-app camera. Photos stay on the phone and are checked on the phone.
- **Rewards** come from points for proven missions, with tiers that can change from unsetld.com's config. The 2.x ranks are gone; levels per area count only your own points, and there are no leaderboards.

## Age rating and audience

- **Audience:** 13 and up (the Privacy Policy and the rewards terms say so). The app is built for 13–25.
- **Questionnaire answers:**
  - Profanity or crude humor: **None**. (The 2.x answer was *Frequent*; drop it.)
  - Health or wellness topics: **Yes**. Fitness missions cover training, running, stretching, sleep and everyday food habits.
  - Contests: **None**. Rewards are fixed points thresholds, with no chance, no ranking and no prizes.
  - User-generated content: **No**. Photos never leave the phone and nobody else sees them.
  - Social media or messaging: **No**.
  - Unrestricted web access: **No**. Store links open in Safari, never an in-app browser.
- **Rating:** with these answers the questionnaire is likely to come out below 13+. If App Store Connect lets you choose a higher rating, choose **13+** to match the audience.
- **What keeps the content safe for teens (Guideline 1.4.5):** missions never urge risky challenges. `npm run validate` fails on calorie deficits, water or dry fasts, weigh-ins, shirtless, body-check or progress pictures, skipping sleep and all-nighters, alcohol, vaping, nicotine and weed, day or options trading and leverage, casinos, sports betting, lotteries and dares. It lists softer words (diets, fasting, calories, supplements, caffeine, ice baths, crypto, stocks, betting, selfies, mirrors, faces, grades, a bedroom, an address, a location) as warnings to check by hand before shipping. Gym missions are only offered to people who said they have gym access. The Terms of Use say missions are motivation, not medical advice, and to do them within your limits and swap any that don't suit you.
- **The About you age answer** (13–15, 16–17, 18+) only filters missions on the phone. It isn't an age gate, and it never leaves the phone.
- **US state app-store age laws** (Texas, Utah, Louisiana): add Apple's Declared Age Range API before launch, and consider limiting real-value rewards to users 18 and over if a lawyer advises it.

## Photo proof

- **Camera only.** iOS opens the camera, never the photo library (`photosPermission: false` in `app.json`). The camera permission text says what it's for: "unsetld uses the camera only when you prove a mission. Photos stay on your phone." (5.1.1(ii)). The app asks the first time someone opens the camera.
- **Photos stay on the phone.** They're saved in the app's own folder and never uploaded. Like other app files, they can be part of the user's own iPhone backup.
- **Metadata is stripped.** Each photo is resized to 1600 px and re-encoded as a new JPEG, which drops EXIF, including location.
- **Retention.** Photos are deleted after 30 days by default (You → Proof photos: 30 days, 1 year or Keep). The mission, its points and its fingerprint stay.
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
  - Drop alerts have their own opt-in switch in You (and on the early access page), are off by default, and are never marked Time Sensitive (4.5.4).
- Missions, proof, the streak and widgets all work with notifications off.

## Rewards and money

- **Points only for proven missions** (3.2.2(x)). Never for:
  - App Store ratings or reviews (5.6.3, FTC review rule)
  - turning on notifications, tracking or location (5.1.2(i))
  - installing other apps
  - posting about UNSETLD on social media (that would make posts paid endorsements needing #ad)
- **No purchase necessary.** UNSETLD+ is sold only through in-app purchase via RevenueCat and never changes points, rewards or status. Everything it includes (more plans, swaps, colorways, reminders) unlocks the moment someone subscribes, never gated by streak or points (3.1.2(a)).
- **Never sell points,** codes or boosts through in-app purchase, and never create a subscription tier whose main value is merch discounts (3.1.1).
- **Clothes** are paid for only through Shopify checkout at unsetld.com, opened in Safari (3.1.3(e)). Discount codes for physical goods are fine.
- **No cash value.** Points and codes are not transferable and can't be sold, bought or exchanged for money. Codes are percent-off discounts, never store credit or gift cards (gift card law).
- **The tiers** (default, `src/content/rewards.json`): 5% off at 300 points, 10% off at 600 and 15% off at 1,000, each up to $25 off, one code per tier per collection, codes valid 30 days. unsetld.com's config can change them; the server checks every redeem against its own list and its own count of points.
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

- **No account needed** for missions, proof, points, the streak or levels. Everything lives on the phone, with a Keychain copy of the record (never photos) so a reinstall keeps the streak and points.
- **What leaves the phone without an account:** a time check against unsetld.com (no identifier), the public config and drops files, and purchases through Apple and RevenueCat (an anonymous app user ID).
- **Sign in with Apple** is optional and only for rewards and status. The server then gets an Apple user ID, an optional relay email, and the dates and counts of proven missions with their points. Never a photo, never the About you answers.
- **In-app account deletion** (5.1.1(v)): You → Account → Delete account removes the account and revokes the Sign in with Apple link.
- **Privacy label:** no tracking, no ads, no analytics. With sign-in: a user ID, an optional email, and the dates and counts of proven missions, linked to the account, for app functionality. Photos are not collected.
- **Under 13:** the app isn't directed at children under 13 and doesn't knowingly collect their information; the Privacy Policy says to email for deletion if a child has signed in.
- **Email** for rewards is always optional; codes show in the app (5.1.1).

## Paywall (subscriptions page, 3.1.2)

- The billed amount ($24.99/year) is the most prominent price. "Save 58%" and any per-month figure are smaller.
- Trial wording: "3 days free, then $24.99/year". It's shown only to eligible users.
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
