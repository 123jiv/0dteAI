# Anonymous usage counts: what the app may measure, and how

Launch pass item P1-20, 19 Oct 2026, version 3.3.0. **Status: dormant.** The pipeline is built and tested, and it does nothing in this build. Nothing is recorded and nothing is sent: `track()` records only when the user has turned sharing on (`settings.shareUsage === true`), and nothing in this build can set that. There is no consent screen, no switch in You and no server endpoint yet. Turning it on is founder decision PF-5 (below), and it ships as one build with the switch, the policy text, the privacy label and the privacy manifest.

The code is `src/core/metrics.ts` (the allowlist and how each record is built, pure) and `src/services/metrics.ts` (the gate, the queue on the phone, sending). A test keeps the allowlist tables below equal to the code (`src/core/__tests__/metrics-doc.test.ts`).

## Principles

- **First party only.** Records go to unsetld.com and nowhere else. No analytics, ad, crash or attribution SDK, no cross-app tracking, no IDFA and no App Tracking Transparency prompt.
- **Opt-in, and off until unsetld.com says so.** Nothing is recorded unless the user turned sharing on, and nothing is sent unless unsetld.com's config says `"metrics": true`. A config that says anything else stops recording and deletes what waits.
- **An allowlist, not a filter.** Each event has a fixed list of properties, and each property a fixed type and range. Anything else (an unknown event, an unknown property, a value outside its spec) is dropped on the phone before it is stored (`sanitize`).
- **Categories and small numbers only.** Never text the user wrote, never a photo or anything about one, never an About you answer or an age, never a name, email, Apple ID, device ID or advertising ID.
- **No ID for the person or the phone.** Retention is counted from stamps the phone works out (the day, days since setup, the setup week), so no record can be joined to another by an ID. The request carries no session token, no cookie and no Authorization header.
- **Only what Apple and RevenueCat can't already see** (below): no app opens, sessions, installs, crashes, OS or device events.
- **Release builds on an iPhone only.** Never the browser preview, never a dev build, never during tester time travel.

## The gate

`track()` records an event only when all of these hold:

| Check | Where |
|---|---|
| The app runs on iOS (`Platform.OS === 'ios'`). | `services/metrics` `recording()` |
| It is a release build (`!IS_PREVIEW`: not `__DEV__`, not the web preview). | the same |
| The tester clock is real (`getDayOffset() === 0`). | the same |
| The user turned sharing on (`settings.shareUsage === true`). `null` (never asked, every install today) and `false` record nothing. | the store, read through `connectMetrics` (`state/lifecycle`) |
| unsetld.com hasn't switched it off (`remote.metrics !== false`). | the same |

Sending needs one more: `remote.metrics === true`. While the switch is unknown (no config yet, or the live 404), records wait on the phone and are not sent.

## What a request holds

`POST https://www.unsetld.com/api/app/events`, `Content-Type: application/json`, `credentials: 'omit'`, no Authorization header, an 8-second timeout. Its own `fetch`, never `services/access` `post()` (a 401 there signs the phone out).

```json
{
  "s": 1,
  "app": "3.3.0",
  "batch": "6f1c1f5e-1b7e-4d2c-9a55-3f0a3c6f8d21",
  "events": [
    { "e": "mission_proven", "day": "2026-10-21", "dn": 2, "cohort": "2026-10-19",
      "p": { "mission": "S1", "area": "school", "proof": "TIMER_AND_PHOTO", "n_today": 1, "planned": 2,
             "first_today": true, "first_this_week": false, "streak": "2-3", "plan": "none",
             "swapped_in": false, "clock": true, "part": "evening" } }
  ]
}
```

- `s`: the format version (1).
- `app`: the app version.
- `batch`: a random id for this batch only, so the server can drop a retried batch it already has. It is new for every batch, names nothing else, and the server doesn't store it with the rows.
- `events`: at most 100.

Every record carries three stamps, worked out on the phone:

| Stamp | Type | Meaning |
|---|---|---|
| `day` | a date, YYYY-MM-DD | The UNSETLD day it happened (the 4:00 AM day). Never a time. |
| `dn` | whole number 0-400, or null | Days since setup on this install (0 = the day setup finished). null when sharing started after setup. |
| `cohort` | a date, or `pre` | Monday of the setup week. `pre` when sharing started after setup. |

The setup day is set by the first record ever kept on the phone: when it is a setup event (`onboarding_*`), that day; otherwise null, and it stays null. It lives only in the metrics key, never in the app's state or the Keychain copy, so a reinstall or Delete data on this phone starts it again.

## The allowlist

Sixteen events. Each table lists every property that can ever be sent. A property can be missing (a call site that has no value for it sends nothing for it); it is never anything else. Mission ids are the approved ones in `content/missions.json` ("S1"); a mission of the user's own is always `custom`, never its id (which holds a timestamp) or its title. Plan ids are the ones in `content/programs.json`.

### onboarding_started

The user tapped Begin on the brand intro (`NameScreen` `begin`). No properties.

| Property | Type | Meaning |
|---|---|---|

### onboarding_step

A setup step finished, not when editing from You (`TracksScreen` `done`, `PaceScreen` `done`). The Goal step finishing is `onboarding_completed`.

| Property | Type | Meaning |
|---|---|---|
| `step` | one of areas, pace | Which step. |

### onboarding_completed

Setup finished (`store` `completeOnboarding`, from the Goal step's Continue or Skip). Once per install.

| Property | Type | Meaning |
|---|---|---|
| `areas` | list of up to 4: discipline, school, fitness, money, career, skills, projects, organization | The areas picked, sorted. |
| `minutes` | one of 15, 30, 45, 60 | The daily time picked (60 is "60+"). |
| `intensity` | one of easy, lockin, push | "How hard?", sent only with 60 (below that it is never asked and changes nothing). |
| `goal` | one of none, matched, picked, unmatched | none: no goal. matched: its words reach one of the user's areas. picked: the user picked the area the app asked about. unmatched: words that reach no area and no area picked (one area only, so no question). Never the words. Never whether a goal was refused by the safety check. |
| `returning` | true or false | The record already had days (a reinstall that brought the record back from the Keychain). |

### first_mission_started

The first mission ever started on this record: the timer started, the before photo taken, or the proof photo taken (`MissionScreen` `beginTimer`, `takeBefore`, `takeProof`). Never once anything has been proven. Once per install.

| Property | Type | Meaning |
|---|---|---|
| `mission` | approved mission id, or custom | The mission. |
| `area` | one of discipline, school, fitness, money, career, skills, projects, organization | The area it's in the day for. |
| `proof` | one of PHOTO, PHOTO_AFTER, BEFORE_AFTER, TIMER_AND_PHOTO, TIMER | Its proof type. |

### first_mission_proven

The first accepted proof ever on this record (`store` `completeMission`). Once per install.

| Property | Type | Meaning |
|---|---|---|
| `mission` | approved mission id, or custom | The mission. |
| `area` | one of discipline, school, fitness, money, career, skills, projects, organization | Its area. |
| `proof` | one of PHOTO, PHOTO_AFTER, BEFORE_AFTER, TIMER_AND_PHOTO, TIMER | Its proof type. |

### mission_proven

Every accepted proof (`store` `completeMission`).

| Property | Type | Meaning |
|---|---|---|
| `mission` | approved mission id, or custom | The mission. |
| `area` | one of discipline, school, fitness, money, career, skills, projects, organization | The area it's in the day for. |
| `proof` | one of PHOTO, PHOTO_AFTER, BEFORE_AFTER, TIMER_AND_PHOTO, TIMER | Its proof type. |
| `n_today` | whole number 1-9 | Missions of today's plan proven, this one included. |
| `planned` | whole number 0-9 | Missions in today's plan. |
| `first_today` | true or false | This proof put today on the record. |
| `first_this_week` | true or false | Nothing was proven earlier this week (Monday to today). |
| `streak` | one of 1, 2-3, 4-6, 7-13, 14-29, 30+ | The streak after this proof, bucketed. |
| `plan` | Plan id, or none | The Plan this mission came from, if any. |
| `swapped_in` | true or false | It came into today's plan by a swap. |
| `clock` | true or false | The proof's time was checked against unsetld.com's clock. |
| `part` | one of morning, afternoon, evening, night | Part of the day (4-11, 12-16, 17-21, 22-3). Never the time. |

### proof_rejected

A proof the on-phone checks didn't accept (`MissionScreen` `reject`). Nothing about the photo itself.

| Property | Type | Meaning |
|---|---|---|
| `mission` | approved mission id, or custom | The mission. |
| `proof` | one of PHOTO, PHOTO_AFTER, BEFORE_AFTER, TIMER_AND_PHOTO, TIMER | Its proof type. |
| `failed` | list of up to 5: photos, fresh, order, timer, duplicate | The checks that failed (`core/verify` ids). |

### mission_swapped

A swap from the swap sheet (`store` `replaceMission`, when it returns ok).

| Property | Type | Meaning |
|---|---|---|
| `from` | approved mission id, or custom | The mission swapped out. |
| `to` | approved mission id, or custom | The one swapped in (custom for one of the user's own). |
| `reason` | one of not-relevant, cant-today, too-easy, too-hard, already-did, another | The reason tapped. |
| `used` | whole number 1-9 | Swaps used today, this one included. |
| `max` | whole number 1-9 | Swaps the user has a day (1 free, more with UNSETLD+). |

### perfect_day

Every mission in today's plan proven, once a day (`store` `completeMission`).

| Property | Type | Meaning |
|---|---|---|
| `planned` | whole number 1-9 | Missions in the plan. |
| `minutes` | one of 15, 30, 45, 60 | The daily time chosen. |

### day_closed

How a planned day ended. Sent for each day that had a plan, the first time the app runs on a later day (`state/lifecycle` `ensureToday`, `services/metrics` `closeDays`). Only days after the first record (never days from before sharing), at most 30 days back.

| Property | Type | Meaning |
|---|---|---|
| `planned` | whole number 0-9 | Missions in the day's plan. |
| `proven` | whole number 0-9 | Of those, proven. |
| `swaps` | whole number 0-9 | Swaps used. |
| `planned_min` | whole number 0-240 | The planned missions' minutes added up, rounded to 5. |
| `minutes` | one of 15, 30, 45, 60 | The daily time chosen. |
| `plan` | true or false | A Plan mission was in the day. |

### plan_started

A Plan started (`store` `startProgram`).

| Property | Type | Meaning |
|---|---|---|
| `plan` | Plan id | The Plan. |
| `free` | true or false | It is one of the free Plans. |

### plan_left

A Plan stopped before its end (`store` `leaveProgram`, `startProgram` when another was running). Clearing a finished Plan isn't leaving it and sends nothing.

| Property | Type | Meaning |
|---|---|---|
| `plan` | Plan id | The Plan (missing for one the library no longer has). |
| `at_day` | whole number 0-14 | Its days already done. |
| `why` | one of left, switched, unavailable | left: Leave plan. switched: another Plan started. unavailable: the library no longer has it. |

### plan_completed

The proof that finished a Plan (`store` `completeMission`). Once per finish.

| Property | Type | Meaning |
|---|---|---|
| `plan` | Plan id | The Plan. |
| `days_over` | whole number 0-30 | Days it took beyond its length (0 = no day missed). |

### weekly_focus_set

"What matters most this week?" answered (`store` `setFocus`, `skipFocus`).

| Property | Type | Meaning |
|---|---|---|
| `focus` | one of school-catchup, exam, business, gym, project, apply, routine, organize, save, skill, other, none, skip | The choice. other: "Something else", never what was typed or the area it led to. none: cleared. skip: "Not this week". |
| `week` | one of this, next | This week's, or next week's from Sunday's review. |

### paywall_viewed

The UNSETLD+ page opened (`PaywallScreen`, which now reads `route.params.from`).

| Property | Type | Meaning |
|---|---|---|
| `from` | one of colorway, settings, reminders, programs, swaps, other | What opened it. other: nothing said. |

### purchase_completed

A purchase the store confirmed (`PaywallScreen` `buy`). Never a price, currency or receipt.

| Property | Type | Meaning |
|---|---|---|
| `product` | one of annual, monthly, lifetime | What was bought. |
| `trial` | true or false | It started a free trial. |
| `from` | one of colorway, settings, reminders, programs, swaps, other | What opened the paywall. |

## Never sent

- Proof photos, anything about them (file names, fingerprints, sizes, contents) or whether one was taken with the camera.
- Anything the user typed: the goal, their own missions' titles, Weekly Focus "Something else", their name.
- A custom mission's id (it holds when it was made); a custom mission is only `custom`.
- About you answers (school, school level, work, gym, project, skills) and the age bucket.
- Safety-check results: whether a goal, focus or own mission was refused, or why.
- Any ID: no install ID, the planner's salt, RevenueCat's app user ID, the account ID, IDFV or IDFA.
- Points, rewards, codes, the record's days, the Keychain copy.
- Time of day beyond `part`, the time zone, location, language, OS, device model.
- Prices, currency, receipts or store transaction ids.
- Notification permission and reminder settings (not in v1; see the changes below).

## Retention without an ID

Every record carries `dn` and `cohort`, so:

- **Setups per week:** `onboarding_completed` per `cohort` (with `returning` false for new people).
- **D-n "showed up" retention:** in a cohort, `mission_proven` with `first_today` true and `dn = n`, divided by that cohort's `onboarding_completed`. D1, D7 and D30 this way are retention measured by proof, not by app opens.
- **W-n retention:** `mission_proven` with `first_this_week` true, by `cohort` and week since setup (`floor(dn / 7)`).
- **Activation:** `first_mission_proven` per cohort over `onboarding_completed`; the time to it is its `dn`.

No cohort with fewer than 20 setups is reported on its own.

## Queue, flush and retry

- **Where:** AsyncStorage key `unsetld.metrics.v1`, apart from the app's state (`unsetld-v2`) and never in the Keychain copy. It holds the setup day, the once-only flags, the last day closed, the queue, when its oldest record was made, and a batch waiting for an answer. It is only ever written while recording is allowed. An unreadable value starts again empty.
- **Cap:** 500 records (about 100 KB). Past it, the oldest repeatable records go first; the once-only ones (`onboarding_started`, `onboarding_completed`, `first_mission_started`, `first_mission_proven`) stay.
- **Age:** a record not sent within 30 days goes, a waiting batch's too.
- **When:** at startup, on every return to the app and at the 4:00 AM rollover (`state/lifecycle` `ensureToday`), when 20 records wait or the oldest is 6 hours old. At most one try every 15 minutes. No background sending in v1.
- **Batches:** up to 100 records. Before it is sent a batch is saved as waiting, so a crash or a kill mid-request loses nothing.
- **Answers:** 2xx, 400, 413 or 422: the batch is done (taken, or refused for good) and goes. Anything else (5xx, 404, 401, a timeout, no network): it stays and is retried later with the same batch id. A 401 never signs anyone out: no session is involved.
- **Offline:** records wait, up to the cap and the age limit.
- **Measured volume** (30 simulated days, 5 days of 7 active, about 70% of each day proven, one swap every other day): 60 records at 30 or 45 minutes (2.0 a day), 82 at 15 or 60 minutes (2.7 a day), 104 at 60+ with Push me (3.5 a day). 170 to 230 bytes a record, so 12 to 24 KB a month. The cap is never reached in normal use.

## Turning it off, and deleting

- **unsetld.com's switch off** (`"metrics"` false or missing in a config that loads): recording stops and `stopMetrics()` deletes every record not sent (`state/lifecycle` `applyConfig`).
- **The user turns sharing off** (PF-5's switch): the switch calls `stopMetrics()`. What stays is the setup day and the once-only flags, so turning it on again never counts a first proof twice. `day_closed` starts again from the first record after it's back on, so no day from while it was off is ever sent.
- **Delete data on this phone** (`services/wipe`): the key goes whole (`clearMetrics()`), once-only flags included. Records already sent carry no ID, so they can't be found or deleted per person; the policy says so.
- **Under 13:** the age gate runs Delete data on this phone, so nothing recorded survives it, and nothing can be recorded before the gate passes (sharing can't be on yet).

## The remote switch

- `config.json` at `https://www.unsetld.com/api/app/config.json` gets `"metrics": false` now, and `"metrics": true` the day the endpoint and the build with the switch are live.
- `services/access` `fetchConfig` reads it with `core/metrics` `parseMetricsSwitch`: only a literal `true` is on; missing, `false` or anything else is off. It is stored as `remote.metrics` (store v8, no migration: absent reads as unknown).
- A config that can't be fetched (today: a 404) changes nothing. Unknown means recorded-if-allowed, never sent.
- It is unsetld.com's kill switch too: setting it to false stops every phone at its next launch or return to the app, and deletes what waits there.

## Consent: placement and defaults (proposed, PF-5)

App Review Guideline 5.1.1(ii): apps that collect user or usage data must secure the user's consent, even for anonymous data, and give an easily accessible way to withdraw it. So the switch ships with the build that turns it on, never before.

Proposed (orchestrator defaults, founder decision 24; for the lawyer to confirm):

- **Where:** a switch row on the Goal step (onboarding's last), above Continue, and the same switch in You › PRIVACY (`src/screens/you/PrivacySection.tsx`, its own component, added to `YouScreen` with one line).
- **Default:** on for 18+, off for 13-17 (the age bucket from the age gate). Off for everyone if the store is ever sold in the EU or UK, where it must be strict opt-in.
- **Existing installs:** stay `null` (nothing recorded) until they choose in You. No card on Today, no prompt.
- **Copy (proposed, in the app's voice):**
  - Goal step row: "Share anonymous usage" / "Counts like a mission proven. Never photos, never what you write. Change it any time in You."
  - You › PRIVACY: section "PRIVACY"; row "Share anonymous usage"; note "Counts like a mission proven or a plan finished. Never photos, never what you write."
- **What setup can measure:** with the switch on the Goal step, `onboarding_started` and the areas and pace steps happen before the answer and are never recorded; `onboarding_completed` is the first record. App Store Connect's first-time downloads are the top of the setup funnel. (If the founder wants the earlier steps, PF-5 could hold them in memory only, never on disk, until the answer, and drop them if it's off. Not built.)

## When it's turned on: the exact text, label and manifest

All of this ships in the same build as the switch (PF-5), with the endpoint live first and `"metrics": true` last.

### Privacy Policy (`src/content/legal.json`, Stream I owns the file)

Set `updated` to the ship date, and replace "There are no ads, no tracking and no analytics SDKs, and the app doesn't collect data about how you use it." with "There are no ads, no tracking and no analytics SDKs."

- **The short version**, add: "If you allow it, the app also sends anonymous usage counts to unsetld.com: never photos and never what you write."
- **What leaves your phone**, add: "Usage counts, only if you allow them: see Anonymous usage counts."
- **New section, "Anonymous usage counts":** "Only if you allow it. The app sends unsetld.com short records of what happens in it, so we can see what works and fix what doesn't: setup finished, a mission started for the first time, a mission proven, a proof that wasn't counted, a swap, a perfect day, a day's plan and how much of it was proven, a plan started, left or finished, a weekly focus picked, and UNSETLD+ opened or bought. Each record holds only fixed categories and numbers: the mission's id and area, the swap reason you picked, your areas, daily time and intensity, the day's counts, the part of the day, the date, the week you set the app up and how many days ago that was. It never holds proof photos or anything about them, anything you type (your goal, your own missions, Something else), your About you answers or age, your name, email or Apple ID, a device or advertising ID, or your location. Records carry no ID, aren't joined to an account, and we don't keep IP addresses with them, so they can't be tied to you. They're used only to improve UNSETLD, never for ads, never sold or shared, and deleted after 13 months. Until they're sent, records wait on your phone for up to 30 days. Turn this off any time in You, under Privacy; records not yet sent are deleted."
- **Deleting your data**, add: "Usage counts already sent carry no ID, so we can't find or delete one person's."

### App Store privacy label (App Store Connect)

- Tracking: No.
- Data Not Linked to You:
  - Usage Data › Product Interaction: Analytics.
  - Purchases › Purchase History: Analytics (`purchase_completed`), added to the App Functionality and Analytics answers RevenueCat already needs (COMPLIANCE.md). Check the linked or not-linked answer against RevenueCat's guidance.
- Data Linked to You: unchanged (only with sign-in, which stays off at launch).

### Privacy manifest (`app.json` › `expo.ios.privacyManifests`)

Merge into whatever the build already declares (keep its required-reason API entries):

```json
{
  "NSPrivacyTracking": false,
  "NSPrivacyTrackingDomains": [],
  "NSPrivacyCollectedDataTypes": [
    {
      "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeProductInteraction",
      "NSPrivacyCollectedDataTypeLinked": false,
      "NSPrivacyCollectedDataTypeTracking": false,
      "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAnalytics"]
    },
    {
      "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePurchaseHistory",
      "NSPrivacyCollectedDataTypeLinked": false,
      "NSPrivacyCollectedDataTypeTracking": false,
      "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAnalytics", "NSPrivacyCollectedDataTypePurposeAppFunctionality"]
    }
  ]
}
```

Also update `docs/COMPLIANCE.md` (Privacy) and `README.md` to say usage counts are on, opt-in.

### PF-5 build checklist

1. Endpoint live (below), with the allowlist and retention in place.
2. `PrivacySection.tsx` in You and the Goal step row, writing `settings.shareUsage`; turning it off calls `stopMetrics()`.
3. Policy text, label answers and manifest above.
4. A test that the switch's copy matches the policy.
5. Ship the build; then set `"metrics": true` in `config.json`.

## The endpoint (P2; the host is a founder decision)

- `POST /api/app/events`. Body at most 64 KB, at most 100 events, `s` must be 1.
- It checks every event against the same allowlist (this file) and stores only what passes. Replies: 204 when taken (a batch id seen in the last 7 days is taken again without storing it twice); 400 for a body that isn't JSON or isn't this shape; 413 too large; 422 an unknown `s`. Never 401: it needs no account.
- It stores neither the IP address nor the user agent with the rows, sets no cookies, keeps the batch id only for those 7 days and never with the rows, and uses the hosting platform's shortest request-log retention. Rate limiting, if any, holds IPs in memory only.
- Rows: the event, its properties, its three stamps, the app version and the date received. Kept 13 months, then deleted.
- Reports never show a cohort or a breakdown with fewer than 20 setups.
- Access: the founder and named people only; never sold, never shared, never joined to accounts, RevenueCat or order data.

## What Apple and RevenueCat already cover (not duplicated)

- **App Store Connect › App Analytics, all users:** impressions, product page views and conversion, sources and campaigns, first-time downloads and redownloads, in-app purchase and subscription proceeds and paying users, download-to-paid conversion, cohorts by download date and source, peer benchmarks.
- **App Store Connect, users who share with developers:** sessions, active devices, D1, D7 and D28 open retention, crashes and deletions. Crash logs come through the Xcode Organizer.
- **RevenueCat Charts:** trial starts and conversion, renewals, churn, refunds, revenue by product.

So the app sends no app-open, session, install, OS, device or crash events. It adds what neither can see: the setup funnel inside the app, missions, proofs, swaps, Plans and the weekly focus, where the paywall was opened from, and retention measured by proof.

## What each priority is measured by

| Brief priority | Measured by |
|---|---|
| 1. The time promise | `day_closed` `planned_min` against `minutes` (inside the band for the time chosen: core/missions `DAY_SHAPE`), and `proven` against `planned`. |
| 2. Setup | `onboarding_completed` per cohort against App Store Connect first-time downloads; `areas`, `minutes`; `first_mission_proven` and its `dn`. |
| 3. Goal fallback | `onboarding_completed` `goal` (matched, picked, unmatched), and the share of `weekly_focus_set` that is `other`. |
| 4. Completion | `day_closed` proven over planned; `perfect_day` per active day. |
| 5. Plans | `plan_started`, `plan_left` (`at_day`, `why`), `plan_completed` (`days_over`). |
| 6. Weekly focus coverage | The spread of `weekly_focus_set` `focus`, and `skip`. |
| 7. Library repetition | `mission_swapped` by `from` and `reason` (already-did, not-relevant); `swapped_in` on proofs. |
| 10. UNSETLD+ | `paywall_viewed` by `from`, then `purchase_completed` by `from` and `product`. |
| 11. Retention | D-n and W-n from `mission_proven`, as above. |
| Proof friction | `proof_rejected` `failed` against `mission_proven` by `proof`; `clock` false share. |

## Changes from the analytics audit

The audit (19 Oct, before the launch pass merged) proposed 17 events. The app changed under it, so v1 has 16:

- **`notifications_asked` is left out.** The setup reminders step is gone (P1-3), and the remaining asks (the reminders card on Today, You › Reminders, the timer start) live in files and a service outside this item, where the prompt's answer isn't surfaced. P2: a `reminders_offer` event on the Today card (on, not now, granted).
- **`onboarding_step`** is areas and pace only: About you left setup (P1-2), and the Goal step's finish is `onboarding_completed`.
- **`onboarding_completed`** drops `about` (no longer in setup), `reminders` (no longer asked in setup) and `took` (it needs a start time kept before consent). `intensity` is sent only with 60, where it is asked.
- **`onboarding_started`** has no `returning`: the Keychain restore may not have finished on the brand intro, so `returning` is on `onboarding_completed`.
- **`first_mission_proven`** drops `when`: it is the record's `dn`.
- **`plan_completed`** sends `days_over` (a number) instead of `took` buckets; **`plan_left`** gains `switched` and loses `profile` (a Plan ended by changed answers isn't recorded in v1).
- **`weekly_focus_set`** drops `from` (the store doesn't know the screen).
- **`day_closed`** sends `planned_min` rounded to 5 instead of buckets, so the time-promise bands can be checked exactly.
- **`mission_proven`** keeps `first_this_week`, which the prototype had left out.
- The setup day is set by the first record (a setup event), not at first launch, so nothing is written to the phone while the pipeline is dormant.
