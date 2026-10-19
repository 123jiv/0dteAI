**Proposed — not implemented. Needs founder approval.**

> **Where this stands (19 Oct 2026, after the launch pass merged).** Not built, and not part of the launch. Since this was drafted, Delete data on this phone is merged (0321feb): it is local only and its test asserts it makes no network call, which section 13 must change (below). The analytics pipeline ships dormant. Source notes such as `audits/*.md`, `audit/...`, `decisions.md` and "plan §6" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan, what shipped and every founder decision with its assumed default.

# Lock in with a friend

This is a future feature. It is not built, and nothing in the repo changes until you approve it.

It needs a backend that doesn't exist yet. On 19 Oct 2026 the two files the app reads under `/api/app` on www.unsetld.com, `config.json` and `drops.json`, returned 404, and none of the rewards routes are built (launch audit). The plan puts it at P2, after the rewards backend is live (plan §6 decision 33).

Sources:
- the brand audit (`audits/brand.md` §3D, §5 and §7), which drafted the model;
- the brief's "Future feature" section and its non-negotiable product rules;
- the launch plan: §6 decision 33 and §7 item 5;
- the data, analytics, safety, onboarding and launch audits, for deletion, measurement, age and backend facts;
- the repo at `575e63b` (store version 8).

"Lock in together" is the working name, from the founder's example. Section 15 has other names. The plan's default is "Two of you".

---

## Open decisions

The sections below explain each one. Questions for counsel are in section 12.

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| 1 | Build it, and when | Yes, as P2, after the rewards backend is live | Build a backend just for this first; or drop it |
| 2 | Price | Free | UNSETLD+ only |
| 3 | Length | Fixed 7 days, two people | Open-ended shared streak (`RECORD.md:114-116`) |
| 4 | Identity | A random token for each side of a pair. No account | Sign in with Apple, which adds an Apple user ID and ties the marks to a person |
| 5 | Friend's name | Typed by each person, kept on their own phone | Sent through the server |
| 6 | Today's status | Live: the friend sees "Proven" the next time they open the app | Shown only after the day ends |
| 7 | Marks | The Record's day mark, cut to three looks; the check icon with "Proven" on Today | The selection square; the ✓ character |
| 8 | Off Days | Don't count. The day shows as not shown up | Count a covered day as shown up |
| 9 | Days sent late (phone was offline) | Accepted for any of the seven days until the lock in closes | Only within a day of the server's date (brand audit) |
| 10 | Minimum age | 13, the app's minimum. 16 if counsel advises | 16 or 18 |
| 11 | Where the token lives | App storage, so deleting the app removes it | Keychain (brand audit) |
| 12 | The finish | A card on Today and Plans with each person's count. No full-screen moment | A full-screen moment when no other is due; no counts |
| 13 | Privacy label | User ID and Product Interaction, "Linked to you", App Functionality | "Not linked", if counsel agrees |
| 14 | Measurement | Server daily totals plus four count-only app events | Also a `lock` yes/no on `day_closed`; or nothing |
| 15 | Name | "Two of you" (plan default) | "Lock in together", "With a friend", "Side by side", "Pair week" |
| 16 | Garment label on the finish | None in version 1 | `PAIR 01 · 7 DAYS · 19–25 OCT` (brand audit), added to the label rules |

---

## 1. Summary

- One person makes a code and sends it to one friend. The friend enters it. Day 1 starts at the next 4:00 AM, the app's day boundary.
- For seven days, each person sees one thing about the other: whether they proved a mission that day.
- Nothing else crosses. No missions, photos, points, streak, goal, areas, names, times or messages.
- It lives on the Plans screen, plus one card on Today while it runs. No new tab.
- It earns nothing: no points, rewards, achievements or status. It doesn't touch the streak or the Record.
- Either person can end it at any time. It ends on its own after day 7.
- The server holds a hash of a random token for each side, a start date and up to fourteen day marks. It deletes the day marks at once if the lock in ends early, and everything 30 days after day 7 at the latest.
- Effort: roughly 1–2 weeks once the rewards backend exists.

---

## 2. Why seven days, not an open-ended shared streak

`RECORD.md:114-116` describes a shared streak with no end. The brief describes a fixed 7-day commitment. This proposal follows the brief, for four reasons.

- **Monitoring.** An open-ended link lets one person watch another quietly for months. A fixed week ends on its own, and starting again needs a new code from one of them.
- **Pressure.** A shared streak puts the friend's streak at risk when you miss. A week with an end has nothing to lose.
- **Deletion.** The deletion date is known on day 1: 30 days after day 7.
- **Fit.** Seven days matches the free 7 Day Lock In plan and the weekly review. It gives one clean finish.

---

## 3. How it fits the product rules

| Brief rule | How this design keeps it |
|---|---|
| Proof photos stay private and on the device | No photo, thumbnail or photo data is sent. The server can't tell a photo proof from a timer proof |
| No public feed, leaderboards, followers, comments, chat or public proof | Two people only. No feed, ranking, profile, search, comments, reactions or messages. Nothing is public |
| No buying points; UNSETLD+ never raises earning | It awards nothing, so there is nothing to buy or earn |
| Core features stay free | Free (decision 2) |
| No random prizes or contests | No prizes. The finish names no winner |
| No slop, emoji or "!" | The copy passes the repo's voice lists (section 6.6) |
| No new tabs | Plans screen plus one Today card |
| Teen-safety rules not weakened | Section 12 |
| Missions, reminders and widgets aren't ads | No shop links on any screen or on the web page for links |

---

## 4. What each person sees and never sees

| | You see about yourself | You see about your friend | Your friend sees about you | The server keeps |
|---|---|---|---|---|
| Whether a mission was proven, each of the seven days | Yes | Yes | Yes | Yes, as day numbers 1–7 |
| Today: proven or not yet | Yes | Yes, as of the last refresh | Yes | Yes |
| Which missions, their titles, areas or minutes | On Today, as now | Never | Never | Never |
| How many missions were proven, or a perfect day | In your Record | Never | Never | Never |
| Proof photos | In your Record | Never | Never | Never |
| Points, streak, Off Days, achievements, plans | Elsewhere in the app | Never | Never | Never |
| Goal, weekly focus, missions you wrote | In You and on Today | Never | Never | Never |
| The time a mission was proven | In your Record | Never | Never | Never stored |
| Names | You pick what to call them, on your phone | — | They pick what to call you, on their phone | Never |
| Age, account, UNSETLD+, device | — | Never | Never | Never |
| That it ended early | Yes | Yes: "Ended early.", with no reason | Yes | Until the other phone reads it, or 30 days |

Never, for either person: proof photos, mission details, messages, followers, a leaderboard or a public page.

Two details:
- **Off Days.** An Off Day keeps your streak. One is earned every 7 active days, up to 2 banked (`core/streak.ts:2`, `rules.json`). The pair view still shows that day as not shown up, because showing it would tell the friend about your streak. Your own streak is unaffected (decision 8).
- **Missions you wrote count.** A proven own mission counts, the same as for the streak (`isProven`, `core/progress.ts:25`; `activeDays`, `:48`). Its title never leaves the phone.

---

## 5. Flow

### 5.1 States

| State | Plans screen | Today | Server |
|---|---|---|---|
| None | The entry row | Nothing | Nothing |
| Code made | The code, "Waiting for your friend to join.", "Cancel this code" | Nothing | A waiting pair, the code's hash and its expiry |
| Code expired | "Your code expired. Make a new one any time." | Nothing | Deleted |
| Joined, before day 1 | "Your friend joined. Day 1 starts tomorrow." | Nothing | An active pair and its start date |
| Days 1–7 | The detail view | The card | Day marks |
| Ended early | "Ended early." and Clear | "Ended early." on that day | The state only, until read or 30 days |
| Finished | "Seven days." with counts, and Clear | The finish card on the day after day 7 | Kept until 30 days after day 7 |

### 5.2 Making a code

1. Plans › "Lock in with a friend". The intro says what each person sees (copy in 6.5).
2. "Make a code". The app calls `lock/create` and shows a 6-character code in two groups: "K7Q 4MX". The characters come from Crockford base32 (the digits and 22 capital letters, no I, L, O or U), as in the brand audit.
3. "Send" opens the iOS share sheet with the code and a link. The app never reads contacts. The person picks who gets it, in their own messaging app.
4. The code works for 48 hours, for one friend.
5. When the friend joins, Plans shows "Your friend joined. Day 1 starts tomorrow." and asks "What do you call them?". The creator learns nothing about who joined.

### 5.3 Joining

- **App installed and set up:** the link opens the app on the join screen with the code filled in.
- **No app yet:** the link opens a plain page on unsetld.com with the code and an App Store button. iOS doesn't carry a link through an App Store install. So after setting up the app, the friend types the code under Plans. That's why the code is short and the share text includes it.
- **Setup not finished:** today, links are ignored until onboarding ends (`App.tsx:49`). The app should hold the code and open the join screen after onboarding, so the 13+ age gate always comes first.
- **Confirm:** "Lock in with this friend for seven days?" / "It starts tomorrow. Either of you can end it any time." / Start, Cancel. The app calls `lock/join`, then asks "What do you call them?".
- "Tomorrow" means the next UNSETLD day, from 4:00 AM. Plans already uses the word this way ("Day 1 starts tomorrow.", `copy/programs.ts`).

### 5.4 Days 1 to 7

- When the first mission of a day is proven, the app sends that day's number with `lock/day`. Later proofs that day send nothing.
- If the phone is offline, the day waits and is sent on the next return to the app (decision 9).
- The friend's marks refresh when the app comes to the foreground and when the detail view opens. No push notification is ever sent about the friend.
- Misses are never notified, labeled or counted until the end.
- The pair has one start date: the joiner's next day. Each person's day N is that date plus N−1, in their own local days. With a US-only launch (plan §6 decision 25), the two phones are at most a few hours apart. Day numbers come from dates, so the 1 Nov 2026 clock change doesn't move them.

### 5.5 Ending early

- "End early" on the detail view, then "End it for both of you?" / "Alex will see that it ended. Nothing else is shared." / End, Stay.
- The server deletes the days at once. The other phone shows "Ended early." with no reason, and Clear.
- Delete data on this phone also ends it (section 9).

### 5.6 The finish

- On the day after day 7, Today and Plans show "Seven days." and "You showed up on 7 of 7. Alex showed up on 6 of 7.", with Clear.
- No full-screen moment. This pass keeps one full-screen moment a day (decisions file, P1-8), and a plan finish or milestone can land on the same day.
- After Clear, nothing about the lock in stays on the phone. It adds nothing to the Record.

---

## 6. Screens and copy

### 6.1 The founder's example, adapted

The example: `LOCK IN TOGETHER / YOU ✓ / ALEX ✓ / DAY 4 / 7`.

| Example | Proposed | Why |
|---|---|---|
| LOCK IN TOGETHER | Kicker "Lock in together", shown in capitals by the kicker style | Kickers are written in sentence case so VoiceOver reads words, not letters (`copy/programs.ts:1-3`) |
| YOU ✓ | "You" with the check icon and "Proven". "Not yet" before a proof | The app's copy never uses the ✓ character. It marks a proven mission with its line check icon next to "Proven" (`home/parts.tsx:501`, `PlansScreen.tsx:87`) |
| ALEX ✓ | The friend's name as this person typed it, with the same marks | — |
| DAY 4 / 7 | "Day 4 of 7", in meta with tabular figures | The wording of the active-plan card on Today (`copy/home.ts:66`). Mono capitals stay reserved for the garment-label system (brand audit §3A) |

### 6.2 Marks

| Option | Showed up | Not shown up | To come | Verdict |
|---|---|---|---|---|
| A. The Record's day mark (`ui/DayDot.tsx`), cut to three looks | The ring with the small dot | The empty ring | The dash | **Recommended.** It's how the app already draws a day: on the Record, the week row and the done screen. Today wears its outer ring |
| B. The selection square (`Square`, `ui/kit.tsx:136`) | Filled bone | Ash outline | — | The brand audit's draft. The code calls it "the only selection mark": it's the tick box on Areas, Time, Weekly focus and the paywall, and the Off Days count on Stats. A filled square next to a name reads as "selected" |
| C. The ✓ character | ✓ | — | — | Nowhere in the app's copy. This would be the only one |

With A, the pair view never uses the bigger dot, the solid disc (a perfect day) or the Off Day bar. Those would tell the friend how many missions you proved, or about your streak. Your own row is drawn the same way, so the two rows compare like for like.

No red. `signal` is reserved for today's barcode bar and week square (`ui/tokens.ts:15`).

### 6.3 Today card

- It goes after the active-plan card and before the weekly review card (`HomeScreen.tsx:356-372`), in the same card style as `ActivePlanCard` (`home/parts.tsx:608`).
- It shows on days 1–7, on the day it ends early, and on the day after day 7.
- Never above the missions.

```
LOCK IN TOGETHER
You     [check] Proven
Alex    Not yet
Day 4 of 7                              Open >
```

VoiceOver: "Lock in together, day 4 of 7. You: proven today. Alex: not yet."

### 6.4 Detail view, on Plans

```
LOCK IN TOGETHER
Day 4 of 7

          1    2    3    4    5    6    7
You       ◉    ◉    ◉   (◉)   –    –    –
Alex      ◉    ○    ◉   (○)   –    –    –

Alex sees these two rows and nothing else.

End early
```

- ◉ showed up, ○ not shown up, – to come, ( ) today. The glyphs stand in for the DayDot looks.
- Days are numbered 1–7, not weekday letters, because a lock in rarely starts on a Monday.
- VoiceOver reads each row, for example: "Alex. Proven on days 1 and 3. Day 2 not proven. Day 4 not yet."

### 6.5 Copy deck

Kickers are written in sentence case. "Alex" stands for the name the person typed, or "Friend" if they skipped. "K7Q 4MX" is an example code.

| Where | Copy |
|---|---|
| Plans group kicker | With a friend |
| Plans row | Lock in with a friend |
| Plans row line | Seven days, two people. Each of you sees one thing: whether the other showed up. |
| Intro title | Lock in with a friend |
| Intro body | Pick one friend. For seven days, each of you sees whether the other proved a mission that day. Nothing else. |
| Intro kicker | What they see |
| Intro line | Whether you proved a mission each day, for seven days. |
| Intro kicker | What they never see |
| Intro line | Your missions, proof photos, points, streak, goal or areas. Not your name either. |
| Intro note | No points and no ranking. Either of you can end it any time. |
| Intro buttons | Make a code · Enter a code |
| Code kicker | Your code |
| Code lines | Send this code to one friend. / Works for 48 hours. One friend only. |
| Code buttons | Send · Cancel this code |
| Share text | Lock in with me on UNSETLD for seven days. Code: K7Q 4MX https://www.unsetld.com/lock#K7Q4MX |
| Waiting | Waiting for your friend to join. |
| Expired | Your code expired. Make a new one any time. |
| Joined | Your friend joined. Day 1 starts tomorrow. |
| Join title | Enter a code |
| Join field | 6 letters and numbers |
| Join errors | That code has expired or was already used. Ask for a new one. / You already have one running. It ends after day 7. / Too many tries. Try again in an hour. / Couldn't reach UNSETLD. Try again in a moment. |
| Confirm | Lock in with this friend for seven days? / It starts tomorrow. Either of you can end it any time. / Start · Cancel |
| Name | What do you call them? / Only on this phone. They never see it. |
| Today card | Lock in together (kicker) · You · Proven · Not yet · Day 4 of 7 · Open |
| Detail line | Alex sees these two rows and nothing else. |
| Offline | Not up to date. Check your connection. |
| End | End early / End it for both of you? / Alex will see that it ended. Nothing else is shared. / End · Stay |
| Ended, other phone | Ended early. · Clear |
| Finish | Seven days. / You showed up on 7 of 7. Alex showed up on 6 of 7. · Clear |
| Delete data, WHAT GOES | Your lock in with a friend. It ends for them too. |
| Web page for links | Open this link on an iPhone with UNSETLD, or get UNSETLD and enter the code under Plans. |

"Couldn't reach UNSETLD. Try again in a moment." follows the app's existing pattern ("Couldn't sign in. Try again in a moment.", `ACCESS.md:175`).

### 6.6 Checks run

- 63 strings were checked: this deck, the naming options in section 15, and the policy text in section 11.
  - Against the repo's voice lists: BANNED, NEVER and SWEAR from `scripts/validate-content.mjs` at HEAD.
  - Also for "!", emoji, check-mark characters, "AI", prices and percentages.
  - Result: 0 failed.
- The same strings went through the user-text safety prototype (`audit/safety/safety.ts`, `checkText(…, 'mission')`). Result: 0 flagged.
- The scripts and strings are in `/tmp/claude-0/-home-user-0dteAI/42d9bfc5-3018-5da4-a370-65096e99b77a/scratchpad/launch-pass/founder-work/lock-in/` (`check.mjs`, `strings.json`, `safety-run.ts`, with copies of the validator and the prototype: `validate-content.head.mjs`, `safety.proto.ts`).

---

## 7. Backend

### 7.1 What exists today

- Nothing for this. `www.unsetld.com` runs on Vercel/Next.js, but no `/api/app` route is live. `config.json`, `drops.json` and the app's privacy and terms pages (`/pages/app-privacy`, `/pages/app-terms`) all returned 404 on 19 Oct 2026 (launch audit).
- `ACCESS.md:168` plans the rewards routes "on the existing site (Vercel/Next.js), or on Supabase". Lock in needs the same pieces: hosting under `/api/app`, a database, a daily job and rate limits at the edge. That's why it waits for the rewards backend.
- `Web/` in the repo holds only `api/app/config.json` and `api/app/drops.json`.

### 7.2 Routes

All are under `apiBase` (`https://www.unsetld.com/api/app`, `config/app.ts:25`).

- The member token goes in `Authorization: Bearer <token>`. It is never the rewards session token.
- Lock requests never use the app's `post()` helper, which signs the phone out of its account on a 401 (analytics audit). They send no cookies.

| Route | Auth | Body | Returns | Does |
|---|---|---|---|---|
| `POST /lock/create` | none | `{}` | `{ code, token, expires }` | Makes a waiting pair. The code works for 48 hours. Rate-limited per IP |
| `POST /lock/join` | none | `{ code, dayKey }` | `{ token, startDay }`, or `{ error: "expired" \| "used" \| "tries" }` | Checks the code's hash and expiry. Sets the start date to the day after `dayKey`. Deletes the code hash. About 10 tries an hour per IP |
| `POST /lock/day` | member | `{ day }` (1–7) | `{ ok: true }` | Idempotent. Accepts a day the pair has reached, with one day of slack for time zones |
| `GET /lock/status` | member | — | `{ state, startDay, friend: boolean[7] }` | The friend's marks only. Your own row comes from your Record |
| `POST /lock/end` | member | `{}` | `{ ended: true }` | Ends it for both. Deletes the days at once |

- `dayKey` on join is the joiner's UNSETLD date. The server rejects one more than a day from its own date, the same rule `ACCESS.md:182` sets for `checkin`.
- A `401` on any lock route means the pair is gone. The app clears its lock data and nothing else.
- Other errors come back as `200` with `{ error }`, as `ACCESS.md:177` does for rewards.

### 7.3 Tables

| Table | Columns | Notes |
|---|---|---|
| `lock_pairs` | `id`, `code_hash` (null once joined), `code_expires`, `state` (waiting, active, ended, finished), `start_day` (a date), `purge_on` (a date) | `id` is random. No creation time beyond the code's expiry |
| `lock_members` | `pair_id`, `side` (a or b), `token_hash` | At most two rows a pair. Tokens are stored hashed, like the session token (`ACCESS.md:173`) |
| `lock_days` | `pair_id`, `side`, `day` (1–7) | One row per day shown up. The key is all three columns, so a repeat does nothing. No time of day |
| `lock_totals` | `date`, `created`, `joined`, `finished`, `ended_early` | Daily counts with no link to any pair |

Not stored anywhere: names, emails, Apple IDs, account IDs, device IDs, push tokens, RevenueCat IDs, ages, IP addresses, times of proof or mission data.

### 7.4 Rules the server enforces

- A code is single use and dies at 48 hours.
- A pair has two sides at most. A third join gets "used".
- `day` must be 1–7 and not ahead of the pair's calendar, with one day of slack.
- After day 7 plus that slack, the pair is finished and takes no more days.
- A daily job deletes expired codes, pairs past `purge_on`, and the state left by an early end.
- Rate limits live at the edge, counted by IP over a rolling hour. They aren't written to the tables.

"One lock in at a time" is a rule on the phone. The server can't enforce it per person, because it doesn't know who anyone is.

### 7.5 What leaves the phone

| Moment | Sent |
|---|---|
| Make a code | Nothing but the request |
| Join | The code and today's date |
| First proof of a day | The member token and the day's number |
| Refresh | The member token |
| End | The member token |

Never sent: the rewards session token, the install salt, the RevenueCat ID, the age range, anything typed, mission ids or photo data.

---

## 8. On the phone, when built

- **Data:** a new persisted slice: `{ state, startDay, friendName, friend: boolean[7], sent: number[], token }`.
  - It is not part of the Record, the Keychain record backup (`unsetld.record.v2`), the rewards sync or analytics.
  - `RECORD.md:114-116` already says nothing in the Record has to change.
- **Store version:** this pass ends at version 8. Any new migration after a v8 build reaches TestFlight is v9 (plan §4).
- **Token:** kept in app storage with the slice, so deleting the app removes it (decision 11). The brand audit suggested the Keychain. Keychain items survive deleting the app, which the data audit spent effort cleaning up after.
- **Sending a day:** from the accepted path of `completeMission` in `store.ts` (the analytics audit's call site), once a day.
  - Not while tester time travel is on (`dayOffset` not 0). Analytics uses the same rule.
- **Remote switch:** a `lock` flag in `config.json`, read as `json.lock === true`.
  - The entry row hides when the flag is off or the config can't be read.
  - A lock in already running finishes as normal.
- **Browser preview:** simulates a friend and never calls the server, the way it simulates sign-in (`ACCESS.md:164`).
- **Never on** widgets, the Lock Screen, reminders or share cards. The friend's name would show to anyone who sees the phone or the image.

---

## 9. Retention and deletion

| Data | Where | Deleted |
|---|---|---|
| Code (hashed) | Server | When joined, or at 48 hours |
| Pair, member token hashes, day marks | Server | Days at once on an early end. Everything 30 days after day 7 |
| "Ended early" state | Server | When the other phone reads it, or 30 days |
| Daily totals | Server | They point to no one. Proposed: kept 13 months, like analytics (analytics audit) |
| Request logs | Web host | The host's shortest retention (`STORE_METADATA.md` §7.1) |
| Rate-limit counts | Edge | Rolling hour |
| Token, friend's name, friend's marks, start date | This phone | On Clear, on an early end, on Delete data on this phone, or when the app is deleted |

**Delete data on this phone (P0-5)**
- Add one line to WHAT GOES: "Your lock in with a friend. It ends for them too."
- In `deleteLocalData()` (data audit §3), add a step after the Keychain gate: if a lock in is running, call `lock/end` with a short timeout, then drop the slice.
- The call is best effort and never blocks the delete. The data audit's rule that local delete works offline still holds.
- Offline, the server isn't told. The friend sees empty marks for the days left, and the server deletes everything 30 days after day 7.
- This is the only call local delete makes to unsetld.com. (The merged delete also re-reads UNSETLD+ from RevenueCat at the end, through `afterLocalDelete`.)
- **What this changes in the merged code:** `deleteLocalData()` in `src/services/wipe.ts` is local only today, and `src/services/__tests__/wipe.test.ts` asserts that it calls `fetch` never. Adding `lock/end` means changing that test to allow exactly this one call (and only while a lock in runs), keeping the delete's result independent of it, and updating the file's "no network call" comments and `copy/data.ts`'s header.

**Delete account.** No effect. A lock in isn't tied to the account.

**Deleting the app.** Removes the token. The server isn't told. The pair runs out and is deleted on schedule.

**Under 13.** Lock in only appears after onboarding, so after the age gate. The under-13 path runs the same local delete anyway.

---

## 10. Links and associated domains

Nothing for this exists in the repo. `app.json` has no `ios.associatedDomains`, and no Apple Team ID is configured there or in `eas.json`.

**App**
- Add `"associatedDomains": ["applinks:www.unsetld.com"]` under `ios` in `app.json`.
- Turn on the Associated Domains capability for the `com.unsetld.app` App ID.
- This needs a new native build. It can't ship as an over-the-air update.

**Site**
- Serve `https://www.unsetld.com/.well-known/apple-app-site-association` as JSON, over HTTPS, with no redirect. In the repo it could live at `Web/.well-known/apple-app-site-association`, next to `Web/api/app/`.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.com.unsetld.app"],
        "components": [{ "/": "/lock", "#": "*", "comment": "Lock in codes only" }]
      }
    ]
  }
}
```

- Only `/lock` opens the app. Every shop page stays in Safari.
- **The code goes in the fragment** (`/lock#K7Q4MX`), not the path. Browsers don't send the fragment to the server, so the code stays out of the host's request logs. The app reads it from the URL it receives.
- **One host.** Use `www.unsetld.com` everywhere, as `AppConfig` does. A universal link doesn't survive a redirect from the bare domain.
- **The page at `/lock`:** the code, one line ("Open this link on an iPhone with UNSETLD, or get UNSETLD and enter the code under Plans.") and an App Store button. No shop links, no analytics, no cookies, `noindex`.
- The custom scheme `unsetld://` (`app.json:5`) only works when the app is installed, so shared links don't use it. It's fine for testing.
- A link that arrives before onboarding ends is held (section 5.3).

---

## 11. Privacy label, manifest and policy

**Privacy label.** `STORE_METADATA.md` §7.1 lists only Purchase History at launch. Lock in adds two rows.

| Data type | Collected | Linked to you | Tracking | Purpose | What it is |
|---|---|---|---|---|---|
| Identifiers › User ID | Yes, only from people who make or join one | Yes (decision 13) | No | App Functionality | The random token for one side of one pair |
| Usage Data › Product Interaction | Yes, same | Yes | No | App Functionality | One yes or no a day, for seven days |

- "Linked" is the careful answer, because the marks are stored against a token. Counsel may accept "Not linked": the token is random, belongs to one pair, and is deleted 30 days after day 7.
- If analytics is on (PF-5), Product Interaction is also collected for Analytics, which `STORE_METADATA.md` §7.2 answers "Not linked". App Store Connect asks whether a data type is linked once per data type, not per purpose. So with "Linked" here, the one Product Interaction answer becomes Linked for both purposes, analytics included. "Not linked" (if counsel agrees) leaves §7.2 as it is.
- No Contacts row: the app never reads contacts.

**Privacy manifest** (`ios.privacyManifests` in `app.json`)
- `app.json` has no `ios.privacyManifests` today. PF-5 adds one for analytics. If lock in ships first, it adds the block.
- Add `NSPrivacyCollectedDataTypeUserID` and `NSPrivacyCollectedDataTypeProductInteraction`.
- Linked as decided in decision 13, tracking false, purpose `NSPrivacyCollectedDataTypePurposeAppFunctionality`.

**Age rating answers** (`STORE_METADATA.md` §8) stay the same.
- Messaging and Chat: No.
- User-Generated Content: No. Names never leave the phone.
- Social Media: No. Ask counsel to confirm this for a two-person feature.

**Privacy Policy** (`src/content/legal.json`), for counsel's review:
- **"The short version"**, add: "If you start a lock in with a friend, the app sends unsetld.com a random token and, for seven days, the number of each day you prove a mission. Nothing about the missions themselves."
- **"What leaves your phone"**, add: "Lock in with a friend, only if you make or enter a code: see Lock in with a friend."
- **New section, "Lock in with a friend":** "Only if you make or enter a code. To show each of you whether the other proved a mission each day, the app sends unsetld.com the code, the date you join, a random token for your side of the pair, and, for each of the seven days you prove a mission, that day's number. It never sends your name, what you call your friend, your missions, proof photos, points, streak, goal, areas or age, or a device or advertising ID, and it isn't joined to an account. Your friend sees only whether you proved a mission on each day. Either of you can end it at any time, and unsetld.com then deletes the days at once. Otherwise everything is deleted 30 days after day 7. A code nobody uses is deleted after 48 hours. Your IP address is used only to limit how many codes are made and tried, and isn't kept with the pair. We keep daily totals (codes made, lock ins started, finished and ended early) with nothing that points to a person or a pair. Delete data on this phone ends a lock in too."
- **"Deleting your data"**, add the WHAT GOES line from section 9.

---

## 12. Teen safety

**Rules for the build**
1. It appears only after onboarding, so only after the 13+ age gate.
2. Nothing a person types leaves the phone. No names, profiles, photos, bios or avatars.
3. No search, directory, suggested friends, contacts access or nearby discovery. The only way in is a code someone chose to send.
4. Joining is pull-only. Nobody can receive an invite inside the app.
5. One lock in at a time per phone. Seven days. No renewal and no "again" button.
6. Either side ends it at any time, without giving a reason. The other sees only "Ended early."
7. Misses are never notified, named or counted until the finish.
8. No notifications about the friend. The friend never appears on widgets, the Lock Screen, reminders or share cards.
9. It earns nothing and changes nothing else in the app.
10. If counsel advises 16+, the phone hides the entry for the 13–15 range. The age range stays on the phone either way.
11. The friend's name isn't run through the user-text check. Only the person who typed it ever sees it, and it appears nowhere else.

**Questions for counsel**
- Does a two-person feature change anything under the Texas, Utah and Louisiana app-store age laws for 13–17-year-olds (launch audit, decision 3)?
- Does adding it count as a "significant change" that needs the Declared Age Range acknowledgment (`showSignificantUpdateAcknowledgmentAsync`, iOS 26.4+)? Parental consent for that needs PermissionKit, which the Expo module doesn't cover (onboarding audit).
- COPPA: the token is a persistent identifier. The app is 13+, has a neutral age gate and isn't directed at children. Is that enough?
- Minimum age: 13 or 16?
- Should pairs that mix adults and minors be refused? Recommended: no.
  - The server would need an age signal. That breaks the age gate's promise: "Only an age range is kept, on this phone." (onboarding audit).
  - What crosses is already only seven yes-or-no marks.

---

## 13. Abuse cases

| Case | What could happen | Mitigation |
|---|---|---|
| Guessing codes | Someone joins a pair they weren't invited to | 32^6 = 1,073,741,824 possible codes. Single use, a 48-hour life, about 10 join tries an hour per IP, codes stored hashed |
| Code forwarded or posted | A stranger joins first | The first join wins and spends the code. If the friend says it didn't work, end it and make a new one. The share text says "one friend". The stranger sees seven yes-or-no marks and nothing else |
| Farming | Gaming it for points or status | Nothing to farm: no points, rewards, achievements or status |
| Modified app | False marks | The only effect is a wrong mark for one friend. The server checks the day number, and nothing else reads it |
| Late days | A day sent after it happened | Accepted until the pair closes (decision 9). Harmless, and fair to phones that were offline |
| Pressure or shaming | Feeling watched, or blamed for a miss | No miss is notified or labeled. No ranking, no comparison until the finish, no nudges |
| Repeated invites | Harassment through the app | Can't happen. Invites are pull-only and there is no inbox |
| Monitoring by a partner or parent | Ongoing checking on someone | Seven-day cap, no times stored, refresh only when the app opens, silent end. Another week needs a new code |
| Live status shows timing | A friend who keeps opening the app can tell roughly when you proved | No times stored or shown. Decision 6 can switch to "after the day ends" |
| Adult paired with a minor | A new contact channel | None exists: no names, text or photos cross. Counsel can set 16+ |
| Messages hidden in the marks | Using the pattern to signal | Seven yes-or-no marks a week. Not usable |
| Code spam | Filling the database | Making codes is rate-limited per IP. Codes die at 48 hours. Rows are tiny |
| Pressured to join | An unwanted lock in | Either side ends it any time, with no reason shown |
| Lost or shared phone | Someone else sees the marks | They see no more than the owner: seven marks and a local name. End it, or let it run out |
| Screenshot shared | The pair view posted publicly | It shows only the name the owner typed and the marks. Never on share cards |
| Server breach | Data exposed | Only token hashes, a start date and day marks. No names, ages or contact details |
| Probing the status route | Reading other pairs | Needs a member token. Pair ids are random. There is no listing route |

---

## 14. Measurement, count only

The analytics pipeline ships dormant in this pass. It sends nothing until PF-5 (the consent switch and policy text) is approved.

**Server daily totals** (`lock_totals`): codes made, pairs joined, finished and ended early. Counts only, with no link to any pair. They need no app event.

**App events**, sent only if the person allowed usage counts. Four names, with no properties beyond the standard stamps (`day`, `dn`, `cohort`; analytics audit):

| Event | Sent when |
|---|---|
| `lock_created` | A code is made |
| `lock_joined` | This phone joins with a code |
| `lock_finished` | Day 7 passes. Each phone sends its own, so count pairs from the server totals |
| `lock_ended_early` | This phone ends it |

- This takes the analytics allowlist from 17 events to 21.
- Never sent: the code, the token, the pair id, the friend's marks or name, the day number, or whether the friend showed up.

**What to read**
- Join rate: joined ÷ codes made.
- Finish rate: finished ÷ joined.
- Early-end rate: ended early ÷ joined.

**Optional (decision 14):** a `lock` yes/no on `day_closed`, meaning "a lock in was running that day".
- It shows whether people prove more on lock-in days.
- It's observational. People who start one may simply be keener.

---

## 15. Naming

"Lock in" already names three things in the app:
- the middle intensity on the time step: Start easy, Lock in, Push me;
- the timer screen's heading, "Lock in for 30 minutes" (`copy/mission.ts:74`);
- the free plan "7 Day Lock In". "14 Day Lock In" is proposed in `PLANS.md`.

Someone on the 7 Day Lock In plan with a friend would see two "Lock in" cards on Today.

| Name | Today kicker | Clash | Note |
|---|---|---|---|
| Lock in together | LOCK IN TOGETHER | The intensity, the timer heading and two plans | The founder's words. Strong, but overloaded |
| Two of you | TWO OF YOU | None | Plan §6 decision 33's default. Says who, plainly |
| With a friend | WITH A FRIEND | None | The plainest. Generic |
| Side by side | SIDE BY SIDE | None | Describes the view: two rows |
| Pair week | PAIR WEEK | None | Says the length. "Pair" reads a little technical |

- The name ("Lock in with a friend" or "Lock in together") appears in the Plans row, the intro title, the Today and detail kickers, the Today VoiceOver label, the confirm question, the share text, the WHAT GOES line, and three places in the Privacy Policy (the heading and the two added lines).
- The rest of the copy works with any of them ("End it for both of you?", "Ended early.").
- All five names pass the voice check (section 6.6).

---

## 16. Effort

Roughly 1–2 weeks of build once the rewards backend exists (brand audit). Sizes use the plan's scale: S is under a day, M is 1–3 days.

| Part | Size |
|---|---|
| Server: four tables, five routes, rate limits, the daily purge job, daily totals | M |
| Association file, the `/lock` page, `ios.associatedDomains`, the capability, a native build | S |
| App core: day numbers across 4:00 AM, states, the persisted slice and its migration, the remote flag | M |
| App screens: Plans group, intro, code, join, confirm, name, detail view, Today card, end, finish | M |
| Wiring: send the day on the first proof, refresh on foreground, links before onboarding, local delete, the preview simulation | S |
| Privacy label, manifest, policy text, store answers | S, plus counsel's time |
| Testing on two real phones | S |

**Before it can start**
- The rewards backend is live under `/api/app`: hosting, a database and deploys.
- The app's privacy and terms pages are published. Both return 404 today.
- Counsel has answered section 12.
- A native build is planned, because associated domains can't ship over the air.

---

## 17. Tests, when built

- **Core:**
  - day numbers across 4:00 AM and across the 1 Nov 2026 clock change;
  - the start is the joiner's next day;
  - every state;
  - a proven own mission counts; an Off Day doesn't.
- **Service:**
  - no rewards session token and no cookies on lock requests;
  - a lock `401` clears the lock data and never signs the phone out of its account;
  - a "nothing leaks" test, like the analytics audit's: no request body contains a mission id, title, goal, focus text or name.
- **Store:**
  - the first proof sends the day once;
  - offline days wait and send later;
  - nothing is sent under time travel;
  - local delete calls `lock/end` once and still finishes offline.
- **Copy:** the voice test (no "!", emoji or banned words).
- **Server:** single-use codes, the 48-hour expiry, a third join refused, the day range, an early end deleting the days, the purge job, rate limits.
- **Two real phones:**
  - the link with the app installed, without it, and before onboarding;
  - airplane mode on a proof day;
  - both sides across 4:00 AM;
  - an early end;
  - local delete during a lock in;
  - reinstalling during a lock in.

---

## 18. Changes from the brand audit's draft

| Brand audit §3D | This document | Why |
|---|---|---|
| The `Square` for each person | The Record's day mark, and the check icon with "Proven" on Today | `Square` is the app's selection mark |
| Mono `DAY 4 / 7` | "Day 4 of 7" in meta | Matches the active-plan card. Mono stays with the label system |
| Member token in the Keychain | App storage | Deleting the app should end your side. Leftover Keychain items were a data-audit finding |
| `dayKey` within a day of server time | Any of the seven days until the pair closes | Fair to offline phones. A modified app can fake a day either way |
| `lock/day` sends a date | Sends the day number, 1–7 | Less data. The server already has the start date |
| Link `unsetld.com/lock/K7Q4MX` | `https://www.unsetld.com/lock#K7Q4MX` | Keeps the code out of request logs. Universal links don't follow a redirect from the bare domain |
| "End this lock in?" / "This lock in ended." | "End it for both of you?" / "Ended early." | Works with any name |
| Finish: "SEVEN DAYS." with an optional `PAIR 01` label | A card with "Seven days.", no full-screen moment and no label in version 1 | One full-screen moment a day. Labels stay on their five surfaces (decision 16) |
| — | Server daily totals, a remote flag, the best-effort end in local delete | Measurement without consent-gated events, an off switch, and a delete that tells the friend's phone |

---

## 19. Left out on purpose

- Groups bigger than two.
- Chat, reactions, nudges or "remind them" buttons.
- Push notifications about the friend.
- Profiles, avatars, usernames or a friends list.
- Contacts access, QR codes or nearby discovery.
- A history of past lock ins, or stats across them.
- An "again" button after the finish.
- Lock in on widgets, the Lock Screen, reminders or share cards.
- Points, achievements or status for finishing.

---

## 20. What changes once you approve

Nothing changes until the rewards backend exists. Then:
- `app.json`: `ios.associatedDomains` and the privacy manifest entries.
- `Web/.well-known/apple-app-site-association`, and the `/lock` page on the site.
- New `src/core/lock.ts`, `src/services/lock.ts`, `src/content/copy/lock.ts` and screens under `src/screens/plans/`, plus a Today card in `src/screens/home/parts.tsx`.
- `deleteLocalData()` gains the best-effort end, and WHAT GOES gains one line.
- `src/content/legal.json`, `docs/COMPLIANCE.md` and `docs/METRICS.md` (four events).
- `RECORD.md` §8 (Not built) changes from "shared streak" to the seven-day model.
- `config.json` gains `"lock": false` until launch day.
