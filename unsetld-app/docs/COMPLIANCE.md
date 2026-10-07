# Compliance notes (Apple, TikTok, rewards)

Checked 2026-10-07 against live sources: the App Review Guidelines (last updated 2026-06-08), the App Store Connect age-rating questionnaire, Apple's subscription page, and TikTok's Community Guidelines (effective 2026-09-24). Raw research is in `research/`. This isn't legal advice; have a lawyer review the rewards terms before launch.

## Age rating and swearing

- **Rating:** frequent profanity ("fuck", "shit", "bitch") rates the app **13+** on Apple's current scale (12+ on older iOS). Comparable apps ("toxic!", "Brutox") show 13+.
- **Higher rating:** you may choose **16+** to match the audience; that's my suggestion. 18+ adds age verification in Australia, Brazil and Singapore and shuts out 16–17 year-olds.
- **What keeps it at 13+:**
  - Store links open in a browser locked to unsetld.com. A free-roaming in-app browser makes it 16+.
  - Weed, vape and alcohol mentions stay *infrequent*. Frequent mentions make it 18+.
  - Sexual or porn-quitting themes stay *infrequent*. Frequent makes it 16+.
  - "Cut It Off" lines stay motivational, not treatment advice.
  - No spin wheels or mystery rewards.
- **Questionnaire answers:** Profanity = Frequent, Health/Wellness = Yes, Contests = Infrequent, User-Generated Content = No, Social Media = No, Unrestricted Web = No.
- **Guideline 1.1:** casual swearing aimed at the reader's excuses is fine. Never slurs, and never insults about gender, sexuality or race. "Don't be a bitch" is a gray area, so the library keeps "bitch" to two lines, both aimed at the snooze button or couch.
- **Guideline 1.4.5:** no XP or lines that glorify skipping sleep, extended fasting or training through injury.

## The App Store page must stay clean (2.3.7, 2.3.8)

- Icon, name, subtitle, keywords, screenshots, the preview video and its audio, subscription promo images and in-app event cards must all suit every age, even if the app is rated 16+.
- Screenshots use **Clean** lines.
- The description can mention the raw tone in mild words.

## Lock screen and notifications

- No Apple rule bans swearing in widgets or notifications. It's still a real problem, because a parent, boss or teacher sees the lock screen.
- So **"keep lock screen clean"** is on by default. Widgets and reminders then show only Clean lines.
- **Widgets show only the line, streak and rank.** No "new drop" or "15% off" banners in widgets (4.4, 2.5.16).
- **Two notification permissions:**
  - Reminders use the normal prompt.
  - Drop and discount alerts get their **own opt-in screen** plus an on/off switch, and are never marked Time Sensitive (4.5.4).
- Widgets and core features must work without notifications enabled (5.1.2(i)).

## Rewards and money

- **XP only for in-app actions** (3.2.2(x)).
- **Never** for:
  - App Store ratings or reviews (5.6.3, FTC review rule)
  - turning on notifications, tracking or location (5.1.2(i))
  - installing other apps
  - posting about UNSETLD on social media (that would make posts paid endorsements needing #ad)
- **Premium** is sold only through in-app purchase via RevenueCat. Everything Premium includes unlocks the moment someone subscribes, never gated by streak or rank (3.1.2(a)).
- **Clothes** are paid for only through Shopify checkout or Apple Pay (3.1.3(e)). Discount codes for physical goods are fine.
- **Never sell XP,** codes or "boosts" through in-app purchase. Never create a subscription tier whose main value is merch discounts.
- **No QR or NFC tag on clothing unlocks Premium** (3.1.1). Tags only add closet items and XP (v2).
- **Positioning (4.2.2, 4.3(b)):** an app that is mainly a storefront gets rejected, and plain quote-widget apps are a crowded category. Lead with what's different (ranks, missions, streaks, custom lines). Keep perks secondary. Explain the XP-to-perk flow in the App Review notes and give the reviewer a fast way to see a perk unlock.
- **Leaderboard prizes** turn the program into a contest (5.3): official rules, "Apple is not a sponsor", free entry. If prizes are ever added: adults only, $5,000 total or less (more needs registration in NY/FL), and a W-9 or 1099 above $2,000. **No prizes at launch.**
- **Use percent-off discount codes,** not store credit or gift cards (gift card law).
- **Rewards terms** (in the app and on unsetld.com, before launch):
  - who can join: US, 16+ or 18+
  - how XP works, the rank thresholds, and the exact perks
  - "no cash value, not transferable"
  - code expiry dates and one code per order
  - your right to change or end the program
- **US state app-store age laws** (Texas, Utah, Louisiana): add Apple's Declared Age Range API. Consider limiting real-value rewards to users 18+.

## Privacy

- **v1:** no accounts. Progress stays on the device and in the user's iCloud.
  - The app checks the date with unsetld.com.
  - Apple and RevenueCat process purchases under an anonymous ID.
  - The "How did you find us?" answer goes to RevenueCat as an anonymous attribute, if you approve.
- **v2:** adds Sign in with Apple and server-side check-ins. That means privacy-label updates and **in-app account deletion** (5.1.1(v)).
- **Email** for rewards is always optional; codes show in the app (5.1.1).

## Paywall (subscriptions page, 3.1.2)

- The billed amount ($24.99/year) is the most prominent price. "Save 58%" and any per-month figure are smaller.
- Trial wording: "3 days free, then $24.99/year". It's shown only to eligible users.
- Restore Purchases, Terms of Use and Privacy Policy links are visible on the paywall and in the App Store metadata.
- Annual and monthly are in one subscription group. Lifetime is a non-consumable with restore.
- No prices in the app name, subtitle or screenshots.

## TikTok

- **Swearing:** there's no blanket rule that swearing in captions, on-screen text or audio removes a video from For You. The risk is aiming insults at a real person or a group. Speak to the viewer's excuses.
- **Disclosure:** posts from @unsetld or @unsetldclo that push the app, a hoodie or a code need the commercial disclosure setting turned on ("Your brand").
- **Avoid:**
  - reposting clipped motivational speeches (both a For You and a copyright risk)
  - "follow + comment for a code" bait
  - claims like "30 days to shredded"
- Use commercial-cleared music on brand posts.
