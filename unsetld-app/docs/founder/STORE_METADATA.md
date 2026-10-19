**Proposed — not implemented. Needs founder approval.**

> **Where this stands (19 Oct 2026, after the launch pass merged).** Every app change this listing depends on is merged (version 3.3.0): the day shapes (P1-1), the completion measure (P1-7), swap parity (P0-2), Delete data on this phone (P0-5), the age gate (P0-4), the user-text check (P0-3), three-step onboarding and the reminders card (P1-2, P1-3), and 13+ in the Terms of Use (P0-7). So the "after the new day shapes" variants apply. The store name in code (`AppConfig.appStoreName`) still says "UNSETLD: Daily Discipline"; nothing in App Store Connect exists yet. Source notes such as `audits/*.md`, `audit/...`, `decisions.md` and "plan §6" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan, what shipped and every founder decision with its assumed default.

# App Store metadata

This is the proposed App Store listing for the first release. Nothing in App Store Connect has been created or changed. Nothing in the repo was changed for this document. The store name in code, `AppConfig.appStoreName`, still says "UNSETLD: Daily Discipline" and is not changed in this pass (section 1.3).

Sources: the brand audit (`audits/brand.md` §3C), the analytics audit (`audits/analytics.md`), the launch audit (`audits/launch.md`), the time audit (`audits/time.md`), the UNSETLD+ audit (`audits/plus.md`), plan §6 decisions 18, 19, 24, 25, 27 and 30, `decisions.md`, and the repo at `acea784`, rechecked at `575e63b` and the P0-4/P1-2 stream branch (`src/config/app.ts`, `app.json`, `src/content/missions.json`, `src/content/programs.json`, `src/content/rules.json`, `docs/COMPLIANCE.md`, `docs/NAME_AND_TRADEMARK.md`, `README.md`, `docs/COPY_DECK.md`). Apple's field limits are the ones given for this task: name and subtitle 30, keywords 100, promotional text 170, description 4,000. Every count below was measured with the script in section 12.

---

## Decisions in this document

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| 1 | App name | **UNSETLD: Daily Missions** | UNSETLD: Daily Discipline |
| 2 | Subtitle | **A: Do the mission. Prove it.** | B, C or D (section 2) |
| 3 | Keywords | **Set 1** (98/100) | Set 2 or 3 (section 3) |
| 4 | Promotional text | **The "sized to your time" version**, only in the build that ships the new day shapes | The fallback version |
| 5 | Description | **Approve the text in section 5** | Edit it |
| 6 | Screenshots | **Seven, in the Black colorway, no Rewards screen** | — |
| 7 | Support URL | **Publish `https://www.unsetld.com/pages/app-support`** | Another page you control |
| 8 | Rewards in the review notes | **Disclose the switched-off feature, and turn it on only with a reviewed update** | Don't mention it (not recommended, see section 10) |
| 9 | Age rating | **Override to 13+** | None. The Privacy Policy and rewards terms set 13 as the minimum; once the Terms of Use say it too, Apple requires the override (section 8) |
| 10 | Purchase History "linked to you" | **No** (anonymous RevenueCat ID) | — |
| 11 | Primary category | **Productivity** | Health & Fitness (narrows the app to one area, like "Daily Discipline") |

---

## 1. Name

| | UNSETLD: Daily Missions | UNSETLD: Daily Discipline |
|---|---|---|
| Characters | 23 / 30 | 25 / 30 |
| Describes | The product's mechanic: missions every day | One of the eight areas |
| Matches the app | Brand intro shows "66 MISSIONS" (`src/content/copy.ts:9`). Today, Plans and widgets are built around missions | Discipline is 6 of the 66 missions (D1–D6) |
| Already used in | `README.md:142`, `COMPLIANCE.md:42`, `COPY_DECK.md:14,400`, `NAME_AND_TRADEMARK.md:9` | `src/config/app.ts:7` (unused), `marketing/tiktok-slideshows.md:3`, `DESIGN_SPEC.md:52` (its 3.0 note calls the name out of date) |

### 1.1 Why "Daily Missions"

- It names what the app does that others don't: a few set missions a day, each one proven.
- A user picks two to four areas (`MIN_AREAS` 2, `MAX_AREAS` 4, `src/content/copy/onboarding.ts:15-17`). Discipline is optional. Someone who picks School and Projects would install an app whose name promises something they never see.
- "Discipline" is not lost for search. It goes in the keyword field (set 1), and the name, subtitle and keywords are searched together.
- "Daily Discipline" reads like the general self-improvement genre. "Daily Missions" is functional and fits the restrained voice.
- The name check on 7 Oct found no app named UNSETLD, UNSETTLD or UNSETLED (`NAME_AND_TRADEMARK.md`). App Store Connect confirms the name when the app record is created.
- "Never settle for less" stays out of the name and subtitle. That tagline is crowded with registered marks (`NAME_AND_TRADEMARK.md`). It is used only as the description's closing line.

### 1.2 Home Screen name

The name under the icon stays "UNSETLD" (`app.json:3`). It is not part of this decision.

### 1.3 Where the name lives in code

| Place | Value now | In this pass |
|---|---|---|
| `src/config/app.ts:7`, `AppConfig.appStoreName` | `'UNSETLD: Daily Discipline'` | **Not changed.** Nothing in the app reads it. |
| `app.json:3`, `expo.name` | `"UNSETLD"` | Not changed. This is the Home Screen name. |
| App Store Connect, app record | Not created yet (`NAME_AND_TRADEMARK.md`) | Not created. The listing's real name is set here, not in code. |

`decisions.md` keeps `appStoreName` out of this pass. After approval, plan item P1-19 sets it to `'UNSETLD: Daily Missions'` with a config test, and fixes `marketing/tiktok-slideshows.md:3`.

---

## 2. Subtitle

| Option | Text | Characters | Notes |
|---|---|---|---|
| **A (recommended)** | Do the mission. Prove it. | 25 / 30 | The two verbs of the loop. Already in `COMPLIANCE.md:42`, `README.md:143` and `COPY_DECK.md`. Repeats "mission" from the name, which costs nothing because the search terms sit in the keywords. |
| B | Real missions. Private proof. | 29 / 30 | Leads on privacy. Also repeats "missions". |
| C | Study, train, build. Prove it. | 30 / 30 | Names three of the eight areas, so it narrows the app the same way "Daily Discipline" does. |
| D | Do the work. Keep the record. | 29 / 30 | Names the Record. Leaves out proof, which is the app's distinct step. |

---

## 3. Keywords

Comma-separated, no spaces. None repeats a word from the name or subtitle A. No trademarks, no "free", "rewards" or "discount".

| Set | Keywords | Characters | Terms |
|---|---|---|---|
| **1 (recommended)** | `unsettled,discipline,habit,tracker,routine,streak,focus,study,timer,productivity,goals,consistency` | 98 / 100 | 12 |
| 2 | `unsettled,discipline,habit,tracker,routine,streak,focus,study,timer,self,improvement,consistency` | 96 / 100 | 12 |
| 3 | `unsettled,discipline,habit,routine,streak,focus,study,homework,workout,budget,goals,consistency` | 95 / 100 | 12 |

- "unsettled" is there because people will hear the name that way (`NAME_AND_TRADEMARK.md`, search tip).
- Set 2 swaps "productivity" and "goals" for "self" and "improvement".
- Set 3 drops "tracker", "timer" and "productivity" for words from the areas: homework, workout, budget.
- Keywords are for search only and never show on the page. "habit tracker" brings the app into those searches; the visible text never calls it one.

---

## 4. Promotional text

Promotional text can be changed at any time without a new build.

| Version | Text | Characters | Use when |
|---|---|---|---|
| **After the new day shapes** | One to four real missions a day, sized to the time you have. Do each one for real and prove it in the app. Your proof photos are never uploaded. | 144 / 170 | The build ships plan item P1-1 (model J: one mission at 15 minutes, two at 30 or 45, three or four at 60+) |
| Fallback | Pick the areas you want to work on. Get real missions every day, prove them in the app, and keep a private record of every day you showed up. | 141 / 170 | The build still has the old planner |

"Sized to the time you have" is honest only with the new shapes. Measured with the old planner, a 15-minute day has a median of 30 minutes and a 45-minute day a median of 65 (`audits/time.md`). With model J, as merged, the measured medians are 15, 35 and 45 at 15, 30 and 45 minutes (src/core/__tests__/day-shape.sim.test.ts). The fallback leaves time out on purpose.

---

## 5. Description

2,426 of 4,000 characters, including the two URLs. On the product page only the first few lines show before "more", below the promotional text, so the first paragraph (148 characters) is the part most people read.

```text
UNSETLD gives you real missions every day, from the areas you choose: discipline, school, fitness, money, career, skills, projects and organization.

Do each mission for real, then prove it in the app with the camera. Some missions start with the focus timer. Some take a before and after. Every day you prove a mission goes on your private Record.

The app never uploads your proof photos, and nobody else sees them. The checks run on your phone. They look at when and how the proof was taken, never at what's in the photo.

HOW A DAY WORKS
- Pick two to four areas and the time you have.
- Pick 15 minutes for one mission a day, 30 or 45 for two, an hour or more for three or four.
- Swap a mission that doesn't fit today for another one, or for one of your own.
- One proven mission keeps your streak. An Off Day, earned every seven days you show up, covers a day you miss.
- The day runs until 4:00 AM, not midnight.

WHAT'S IN IT
- 66 missions in a fixed library, each one approved by UNSETLD. The app never generates missions.
- Your Record: every day you showed up and every mission you proved. Stats show how many of your planned missions you proved on the days you showed up.
- A weekly focus and a short weekly review.
- Guided Plans, like the 7 Day Lock In and Get Organized. A Plan sets its own missions, so a Plan day can run longer than your usual time.
- Widgets for your Home Screen and Lock Screen: your next mission, today's missions and your streak.
- Up to three reminders a day.

UNSETLD+
UNSETLD+ is optional, as a subscription or a one-time purchase. It adds every Plan, all ten colorways, three swaps a day instead of one, and up to ten reminders a day. It never changes what you earn. Missions, proof, points, your streak and your Record work the same without it. Points come only from proven missions, and they can't be bought.

Payment is charged to your Apple Account. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel them in your Apple Account settings.

PRIVACY
- No account needed.
- No ads and no tracking.
- Proof photos are deleted after 30 days unless you choose to keep them longer.
- Delete the data UNSETLD keeps on your phone, any time, from the You tab.

For ages 13 and up.

Never settle for less.

Terms of Use: https://www.unsetld.com/pages/app-terms
Privacy Policy: https://www.unsetld.com/pages/app-privacy
```

### 5.1 What each claim rests on

| Line | Source | True at `acea784`? |
|---|---|---|
| Eight areas | `missions.json`: D6 S13 F7 M5 C10 P11 K9 O5 | Yes |
| "prove it in the app with the camera", timer, before and after | `missions.json` proof types: 43 photo, 18 timer then photo, 5 before and after. Every built-in mission ends in a photo | Yes |
| Checks look at timing, not content | `COMPLIANCE.md`, Photo proof; `rules.json` (`proofFreshMinutes` 30, `beforeAfterMinGapSeconds` 120) | Yes |
| "never uploads your proof photos" | The app's own wording (`platform.ts:85-88`). Not "never leave your phone": photos can be in the user's own iPhone backup | Yes |
| Two to four areas | `MIN_AREAS` 2, `MAX_AREAS` 4 | Yes |
| 15 → one, 30 or 45 → two, 60+ → three or four | Plan item P1-1, model J | Yes, merged (0a6edbb) |
| Plan days can run longer | Today Plan missions go in first and ignore the time budget (`audits/time.md`); after P1-1, Plan §6 decision 4 keeps every Plan mission | Yes, before and after P1-1 |
| Swap, own missions | `rules.json` `rerolls` free 1, full 3; `custom.ts` (an own mission only comes in by replacing a planned one, using a swap) | Yes |
| One proven mission keeps the streak; an Off Day every seven days shown up covers a missed day | `streak.ts:19-53`; `rules.json` `offDayEvery` 7, `offDayMax` 2 (at most two banked) | Yes |
| 4:00 AM day | `src/core/time.ts:1-21` (`DAY_START_HOUR` 4, `dayKeyOf`) | Yes |
| 66 missions, none generated | `missions.json`: 66 entries, all with `source: "UNSETLD"` | Yes. Update this line if the library changes |
| "Stats show how many of your planned missions you proved on the days you showed up" | Plan item P1-7 (completion card; it counts only days with a proof) | Yes, merged (27cfee9) |
| Weekly focus and review | `WeeklyFocusScreen`, `WeeklyReviewScreen` | Yes |
| 7 Day Lock In and Get Organized | `programs.json`: both `free: true` | Yes |
| Widgets | `app.json`: Next mission, Streak, Today; Home Screen and Lock Screen families | Yes |
| Three reminders free, ten with UNSETLD+ | `reminders.ts:10-11`, `features.ts` | Yes |
| UNSETLD+ list and order | `features.ts`; order from plan item P1-11 (plans, colorways, swaps, reminders) | Yes. The order matches the paywall after P1-11 |
| "It never changes what you earn" | Plan item P0-2 (swap parity). Before it, extra swaps raised members' daily points by up to +15 (`audits/plus.md`) | Yes, merged (c75eca5) |
| No account needed | Account row hidden while rewards are off (`YouScreen.tsx:268`) | Yes |
| No ads, no tracking | No ad, analytics or crash SDK (`audits/analytics.md`) | Yes, and still true with first-party analytics on |
| Photos deleted after 30 days | `rules.json` `proofRetentionDays` 30; options 30 days, 1 year, Always (`platform.ts:83`) | Yes. Fully accurate after P1-16 also clears camera caches |
| Delete data from You | Plan item P0-5, Delete data on this phone | Yes, merged (0321feb) |
| Ages 13 and up | Privacy Policy ("Age"), the Terms of Use ("Age", added in the legal pass) and the rewards terms in `legal.json`; the age gate (P0-4, 275823f) | Yes |
| Terms and Privacy URLs | `app.ts:26-27` | **Both return 404 today** (section 9) |

---

## 6. Screenshots

Seven screenshots, in this order. Proof photos in them show objects only: never people, faces, bodies, documents or screens with personal details (`COMPLIANCE.md`). Every screen uses the Black colorway, the only free one. The one thing shown that needs UNSETLD+ is the paid Plans under "With UNSETLD+" in screenshot 6, as the app shows them; the description says what UNSETLD+ adds. No Rewards screen, no paywall, no prices.

| # | Screen | Caption | Characters | Depends on |
|---|---|---|---|---|
| 1 | Today, a 30-minute day with two missions | Missions sized to the time you have. | 36 | P1-1. Fallback caption: "Real missions for the areas you pick." (37) |
| 2 | Mission page, "Study One Subject for 30 Minutes" with the timer button | Do it for real. Prove it in the app. | 36 | — |
| 3 | Proof review with the garment-tag ProofStamp on a photo of notes on a desk | Private proof. Never uploaded. | 30 | — |
| 4 | Record month grid | A private record of the days you showed up. | 43 | — |
| 5 | Stats completion card ("13 of 17 missions proven") | What you planned, and what you proved. | 38 | P1-7. Without it, drop this screenshot |
| 6 | Plans list, 7 Day Lock In and Get Organized at the top | Guided Plans, each day set for you. | 35 | — |
| 7 | Lock Screen with the Next mission and Streak widgets | Your next mission, on your Lock Screen. | 39 | — |

**Changes from the current list** (`README.md:147-153`, `COPY_DECK.md:411-417`):
- "Trade points for rewards at unsetld.com." (Rewards) is removed. Rewards are off at launch.
- "Every proven mission earns points." (done screen) is removed. Leading with points raises the question of what they are for, while rewards are hidden.
- "Progress with the streak and levels" becomes the Record grid. The tab is called Record now.
- Proof (3) and Plans (6) are new. Completion (5) is new with P1-7.

**Capture:** a dev build with the seeded Day 7 or Day 30 record is fine, as long as no tester label or travelled date shows on screen.

---

## 7. App Privacy (the privacy label)

### 7.1 At launch: analytics off, rewards off

| Data type | Collected | Linked to you | Used to track you | Purposes | Why |
|---|---|---|---|---|---|
| Purchases › Purchase History | Yes, by RevenueCat | No | No | App Functionality, Analytics | RevenueCat's own guidance (checked 19 Oct 2026) says every RevenueCat app selects both purposes, and "No" for linked when only anonymous app user IDs are used. The app calls `Purchases.configure` with the key only, with no `logIn` and no attributes (`purchases.ts:48`). This row is missing from the planned label today (`COMPLIANCE.md:83`, `README.md:145`) |
| Identifiers › User ID | No | — | — | — | No custom RevenueCat ID, no account |
| Identifiers › Device ID | No | — | — | — | No advertising ID, no IDFV |
| Contact Info | No | — | — | — | No sign-in in this version |
| Usage Data | No | — | — | — | Analytics ships dormant (plan item P1-20) |
| Photos or Videos | No | — | — | — | Proof photos are never uploaded |
| User Content | No | — | — | — | Goal text, own missions and "Something else" stay on the phone |
| Diagnostics | No | — | — | — | No crash SDK. Apple's own crash reports come through Xcode |
| Health and Fitness, Location, Financial Info, Contacts, Sensitive Info, Browsing, Search | No | — | — | — | — |

**Tracking:** No. **Data used to track you:** none.

Not "collection": the time check and the config files send no identifier (`trustedTime.ts`, `access.ts`). Keep the web host's request logs on its shortest retention so this stays true.

### 7.2 When analytics is turned on (decision PF-5)

Add one row. Everything else stays as in 7.1.

| Data type | Collected | Linked to you | Used to track you | Purposes |
|---|---|---|---|---|
| Usage Data › Product Interaction | Yes, first-party, only if the user allows it | No | No | Analytics |

- Purchase History needs no change. Analytics is already a purpose, and the first-party `purchase_completed` event is also not linked.
- No install ID is sent (plan §6 decision 24), so no Identifiers row is added. If an install ID is ever added, add Identifiers › Device ID, not linked.
- Ship in the same build: the consent switch, the "Anonymous usage counts" section of the Privacy Policy, and an app-level privacy manifest (`ios.privacyManifests` in `app.json`) with `NSPrivacyTracking: false` and ProductInteraction and PurchaseHistory, each not linked and not tracking (`audits/analytics.md`). Without these, analytics must stay off.

### 7.3 Later, when rewards turn on

Recheck the whole label. Sign-in adds an Apple user ID and an optional relay email, linked to the account for App Functionality, plus the dates and counts of proven missions and their points (`COMPLIANCE.md`, Privacy). If the RevenueCat ID is then tied to the account, Purchase History becomes linked.

---

## 8. Age rating

Answers to the App Store Connect questionnaire, using Apple's current categories (checked 19 Oct 2026). They follow `COMPLIANCE.md` with two corrections.

| Section | Question | Answer | Why |
|---|---|---|---|
| In-app controls | Parental Controls | No | — |
| | Age Assurance | Yes (the 13+ age gate is merged, P0-4) | Year-of-birth question, plus Apple's Declared Age Range where available |
| Capabilities | Unrestricted Web Access | No | Legal pages show in the app. Any store link opens Safari |
| | User-Generated Content | No | Nothing a user writes or photographs is shown to anyone else |
| | Social Media | No | No feed, followers or public proof |
| | Messaging and Chat | No | — |
| | Advertising | No | — |
| Mature themes | Profanity or Crude Humor | None | The content check fails swearing in missions and reminders |
| | Horror/Fear Themes | None | — |
| | Alcohol, Tobacco, or Drug Use or References | None | The app's content has none. The user-text check names nicotine, alcohol and drugs only to refuse them, after someone types them. If counsel calls that "Infrequent", the shown rating is still 13+ |
| Medical or wellness | Medical or Treatment Information | None | The 988 line is a referral, not medical information. Counsel reviews that copy |
| | Health or Wellness Topics | Yes | Seven Fitness missions: workouts, walks, cardio. `COMPLIANCE.md` used to cite stretching, sleep and food missions; the docs pass corrected it |
| Sexuality or nudity | All three | None | Missions never ask for bodies or faces |
| Violence | All four | None | — |
| Chance-based | Gambling | No | — |
| | Simulated Gambling | None | — |
| | Contests | None | No prizes, no chance, no ranking |
| | Loot Boxes | No | No random rewards |

**Result:** the questionnaire is likely to give 9+, because of Health or Wellness Topics. Choose **Override to Higher Age Rating → 13+**. Apple requires the override when the app's EULA sets a minimum age above the calculated rating. 13 is now set in the Privacy Policy, the Terms of Use and the rewards terms (`legal.json`, P0-7), so the override is required. It matches the audience and the age gate.

**Second correction (made in the docs pass):** `COMPLIANCE.md` said gym missions are only offered to people who said they have gym access. Nothing checks that (the only requirement in `missions.json` is C2's `jobsearch`), and the gym question left onboarding in this pass.

---

## 9. URLs

Checked 19 Oct 2026.

| App Store Connect field | URL | Status | Source |
|---|---|---|---|
| Privacy Policy URL (required) | https://www.unsetld.com/pages/app-privacy | **404** | `AppConfig.privacyUrl`, `app.ts:26` |
| Terms of Use (in the description; needed for subscriptions) | https://www.unsetld.com/pages/app-terms | **404** | `AppConfig.termsUrl`, `app.ts:27` |
| License Agreement | Apple's standard EULA | Live | `AppConfig.eulaUrl`, `app.ts:28` |
| Support URL (required) | Proposed: https://www.unsetld.com/pages/app-support | **404**. Not in `AppConfig` yet | New |
| Marketing URL (optional) | Leave empty | — | The site root is the clothing store; the brief asks for no more store links |

- The Privacy Policy and Terms pages publish the text in `src/content/legal.json`, after the accuracy pass (plan item P0-7) and counsel's review.
- The support page should hold: the contact email (`contactEmail`, `app.ts:30`, currently a Gmail address; a `support@unsetld.com` address would read better), how to delete data on the phone, how to restore or cancel UNSETLD+, and links to the Privacy Policy and Terms.
- All three pages must be live before submission. App Review opens them.

---

## 10. App Review notes

2,773 characters. Fill in the contact line.

```text
No account is needed. This version has no sign-in, and every feature works without one.

First launch asks for a birth year. Where Apple's Declared Age Range applies to the account (iOS 26.2 and later), Apple's age range prompt can answer instead. UNSETLD is for 13 and over, so choose a year that makes you 13 or older. A year under 13 blocks the app on that install by design. Deleting and reinstalling the app starts over.

To try a mission: pick two areas and a time, skip the goal, then tap START on a mission on Today. Every built-in mission is proven with a photo taken in the app's camera. Missions with a focus timer need the timer to finish first. The quickest way to see proof: tap Swap on any mission, pick any reason, choose "+ Create my own", type a short title, pick photo proof and add it to today, then prove it with a photo of any object.

Proof photos: the app opens only the camera, never the photo library. Photos are stored in the app on the phone and are never uploaded. The checks run on the phone and look only at timing (the photo is from the last 30 minutes, a before and after are at least 2 minutes apart, the timer finished) and whether the same photo was used before. They never look at what is in a photo. Missions never ask for faces or bodies.

Missions come from a fixed library of 66 that we approved. Nothing is generated. Seven titles can name the user's subject, project, skill or kind of job, taken from their goal or skills. Text people type (a goal, their own missions, a weekly focus) is checked on the phone against the same unsafe categories the library excludes, before it is used, and the app never sends it anywhere.

Setup doesn't ask for notifications. The app asks when a focus timer first starts, from a Reminders card on Today after the first proof, or when reminders are turned on in You. Everything works with notifications off.

UNSETLD+ is optional: Monthly and Annual are auto-renewable subscriptions in one group, and Lifetime is a non-consumable. Open it from You > UNSETLD+ or from a locked Plan. Restore is on the paywall and in You. It adds every Plan, all colorways, more swaps and more reminders. It never changes points.

Points: each proven mission earns points. Points can't be bought.

Rewards: the app contains a rewards feature (points toward discount codes for unsetld.com) and opt-in drop alerts for unsetld.com. Both are off in this version and cannot be seen or reached: there is no Rewards tab, no drop alerts switch and no sign-in. A server setting could switch them on. We will not do that without first submitting an app update with updated metadata and review notes.

Everything the app keeps on the phone can be deleted from You > Delete data on this phone.

Contact: [name], [phone], [email]
```

**Why the notes mention rewards.** The rewards code is in the binary, and a server setting (`accessEnabled` in `config.json`) would show it. App Review rejects hidden or dormant features (Guideline 2.3.1). Saying so in the notes, and turning rewards on only through a reviewed update, removes that risk. Turning it on by server setting alone would put a feature in front of users that App Review never saw, along with sign-in, account deletion and a new privacy label.

**Lines that depend on this pass:** the birth year and Apple's age range prompt (P0-4), the check on typed text and on goal words in titles (P0-3), setup without a notification ask and with a skippable goal step (P1-2) and the Reminders card (P1-3), "Delete data on this phone" (P0-5), "It never changes points" (P0-2). All are merged; if a build goes out without one of them, cut that line.

---

## 11. Left out on purpose

| Not in the listing | Why | Where it appears today |
|---|---|---|
| Rewards, discount codes, "trade points", unsetld.com shop, drops, collections | Off at launch (`accessDefault` false on iOS, `app.ts:37`). A listing must match the build (2.3.1) and not read as a storefront (4.2.2). The brief forbids clothing ads | `COPY_DECK.md:407,417`, `README.md:153` (screenshot 6) |
| "AI", or any claim the app uses it | Brief rule. Missions come from a fixed library; the checks don't look at content. The listing says "never generates missions" instead of naming the technology | — |
| Prices, "Save 58%", per-month figures | `COMPLIANCE.md`: no prices in name, subtitle, keywords, description or captions. The App Store shows prices itself | — |
| "free", "free trial" | `COMPLIANCE.md`. The trial is shown on the paywall, read from the store (plan item P1-10). The description says what works "without" UNSETLD+ instead | — |
| "and new ones each season" | No committed release schedule (plan §6 decision 19). Removed from the paywall in P1-11 | `platform.ts:120` |
| "Daily Discipline" | Decision 1 | `app.ts:7`, `marketing/tiktok-slideshows.md:3` |
| "Photos never leave your phone" | Photos can be in the user's own iPhone backup. The app says "never uploads" | The overview |
| "Verified" proof | The checks test timing and reuse, not what a photo shows | — |
| "Full Edition", "program", "two to four missions a day", "the same on every plan" | Old names and old day shapes | `COPY_DECK.md:404,409` |
| Slop words, "!", emoji | House voice (`BANNED` in `scripts/validate-content.mjs`) | — |
| "Never settle for less" in name, subtitle or keywords | Crowded tagline marks (`NAME_AND_TRADEMARK.md`) | Closing line of the description only |
| Lock in with a friend | Not built; needs a backend | — |

---

## 12. Checks run

Script and drafts: the launch pass's working folder `store-work/` (`check.mjs`, `strings.json`, `keywords.txt`, `description.txt`, `review-notes.txt`; not in the repo, and the counts below are its output). It follows the brand audit's `metadata-check.mjs` and reads `BANNED` from `scripts/validate-content.mjs` at `acea784`. It flags anything over its limit, banned words, "!", emoji, prices or percentages, "AI", "free", "each season", "reward", "discount", "code", "verified", "never leave", "Full Edition", "program" and "Daily Discipline". Run it with `node check.mjs` in that folder.

| Field | Count | Result |
|---|---|---|
| Name, recommended | 23 / 30 | Pass |
| Name, alternative | 25 / 30 | Pass |
| Subtitle A / B / C / D | 25 / 29 / 30 / 29 of 30 | Pass |
| Promotional text, after shapes / fallback | 144 / 141 of 170 | Pass |
| Keywords, set 1 / 2 / 3 | 98 / 96 / 95 of 100 | Pass. No repeats of name or subtitle words, no duplicates |
| Description | 2,426 / 4,000 | Pass. The two URLs are left out of the word checks |
| Screenshot captions (8, including the fallback) | 30–43 each | Pass |
| Review notes | 2,773 | No "!", emoji, "AI", "free" or "never leave". The script doesn't read this file; checked separately |

---

## 13. Before submitting

- [ ] Founder approves decisions 1–11.
- [ ] Privacy Policy, Terms and support pages are live (section 9).
- [x] The build includes P0-2, P0-3, P0-4 and P0-5, and P1-1 and P1-7 (all merged): use the "after shapes" promo text, caption 1 and screenshot 5.
- [ ] Privacy label entered as in 7.1, including Purchase History.
- [ ] Age rating answered as in section 8, with the 13+ override.
- [ ] Screenshots captured as in section 6.
- [ ] Review notes pasted, with the contact line filled in.
- [ ] If `PRICING.md` decision 1 ends with no Lifetime, cut "or a one-time purchase" from the description and the Lifetime clause from the review notes.
- [ ] After approval: `AppConfig.appStoreName`, `README.md` §5 and the `COPY_DECK.md` listing updated to match (P1-19 and the docs pass).
