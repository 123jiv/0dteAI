# UNSETLD copy deck

> **3.0 note (9 Oct 2026):** UNSETLD 3.0 supersedes this deck's lines, quotes, chapters, the standard (three rules), the night check, Today, Record and the paywall rows. The 3.0 strings live in `src/content/copy/*.ts` (and `src/content/copy.ts`), specified in [MISSIONS_SPEC.md](MISSIONS_SPEC.md); where they disagree with this file, they win. The App Store listing below is updated for 3.0; the rest of this file is kept as the 2.x record, so check `src/content/copy/` before reusing a string from it.

UNSETLD 2.0: COPY DECK (final wording; build exactly; sentence case; no exclamation marks)

Since 2.1/2.2 the Today screen, task modal and their strings are specified in `TODAY_SPEC.md`; where the two disagree, `TODAY_SPEC.md` and `src/content/copy.ts` win. Daily tasks and lines are written to `docs/research/2026-10-08-everyday-content.md`.

GLOBAL
- App name (store, 3.0): UNSETLD: Daily Missions
- Subtitle (3.0): Do the mission. Prove it.
- Wordmark: unsetld (lowercase, Cormorant)
- Notification title: unsetld
- Brand in prose: UNSETLD

ONBOARDING
O1 The name
- Top-right: VOL. 001
- Figure caption: FIG. 01
- Headword: unsettled (the second t and the e greyed out) · adj.
- 1  Not finished.
- 2  Not willing to settle for less.
- Button: Begin

O2 First line
- Running head: DISCIPLINE · No. 0006
- Line: Count how many times you've started this. Now finish it once.
- Caption: One line every morning. Then the work.
- Button: Continue (appears after 2.5 s)

O3 Standard (01 / 04)
- Title: Set your standard.
- Body: Pick three. They're your work every day, and each night you'll mark whether you held them. Only you see this.
- Rules:
  01 Up on the first alarm.
  02 No phone for the first hour.
  03 Work out for 30 minutes.
  04 Homework before scrolling.
  05 Read 10 pages of a book.
  06 No phone in bed.
  07 Make something every day.
  08 Write down what I spend.
- Write your own:
  - row: + Write your own
  - placeholder: Say it plainly.
- Counter: 0 OF 3 CHOSEN / 1 OF 3 CHOSEN / 2 OF 3 CHOSEN / 3 OF 3 CHOSEN
- Button: Set the standard

O4 Chapters (02 / 04)
- Title: Choose your chapters.
- Body: Your daily task and lines come from these. Free includes Discipline and one more. Full Edition opens all seven.
- Rows (name — scope):
  01 Discipline — The alarm, chores, keeping your word. [ALWAYS]
  02 Focus — Your phone, homework, reading, practice.
  03 Training — Workouts, sports, sleep, real food.
  04 Money — Earning, saving, where your money goes.
  05 Confidence — Speaking up, asking, showing your work.
  06 Vices — Scrolling, gaming, vapes, late nights.
  07 Stoic — What you control, failing, bad days.
- Button: Continue

O5 Your day (03 / 04)
- Title: Set your day.
- Preview: unsetld · 7:00 AM / Every time you check your phone, you pay to get back in.
- Rows:
  - Reminders a day [1 | 3 | 5 | 10]
    - Footnote: More than 3 a day is part of Full Edition.
  - First reminder · 7:00 AM
  - Last reminder · 10:00 PM
  - Night check · 9:30 PM
    - Footnote: One question at night: did you hold your standard?
- Time sheet titles: First reminder / Last reminder / Night check. Button: Done
- Button: Allow reminders
- Text button: Not now

O6 Widget (04 / 04)
- Title: Put it on your lock screen.
- Segmented: Lock Screen | Home Screen
- Lock steps:
  1 Touch and hold your lock screen, then tap Customize.
  2 Tap Lock Screen, then the space under the clock.
  3 Choose unsetld, then Line.
- Home steps:
  1 Touch and hold an empty spot on your home screen.
  2 Tap Edit, then Add Widget.
  3 Search unsetld and choose a size.
- Button: Done
- Text button: Later

READER
- Running head (chapter labels): DISCIPLINE · FOCUS · TRAINING · MONEY · CONFIDENCE · VICES · STOIC · YOUR LINE · NIGHT CHECK. Right side: No. 0412
- First view of the day: DAY 41 (then crossfades to the chapter)
- Filtered: FOCUS ONLY ×  /  SAVED ×
- Bottom bar: Chapters
- Day 1 hint: Swipe up for the next line.
- Long-press menu:
  - Share
  - Copy line
  - Save / Remove from saved
  - Don't show this line again
  - Cancel
- Copy confirmation (label swap in the share sheet): Copied
- Accessibility labels:
  - Save line / Remove from saved
  - Share line
  - Chapters
  - Colorway
  - Your record
  - Close
  - Back

NIGHT CHECK (in pager)
- Label: NIGHT CHECK · Day 41
- Question: Did you hold your standard today?
- Rules: 01 / 02 / 03 (the user's three)
- Buttons: Held / Not today
- After Held:
  - Held.
  - Day 41 is on record.
- After Not today:
  - Noted.
  - Day 41 is still on record.

END CARD (free tier)
- You've read enough lines like this one.
- Go do the work.
- Sub: Ten more tomorrow.
- Link: Read more with Full Edition

ONE-TIME PAGES
- Day 3:
  - Label: ACCESS
  - Title: The days add up to something.
  - Body: Day 7 opens early access to every UNSETLD drop. Proof of the work earns points toward codes at unsetld.com. None of it can be bought.
  - Link: See your record
- New volume:
  - Label: VOLUME 002
  - Title: Forty new lines.
  - Body: Across all seven chapters, starting today.
  - Link: Read them
- Library exhausted:
  - Title: You've read every line in your chapters.
  - Body: Add a chapter, or start again from the first line.
  - Links: Chapters · Start again

CHAPTERS SHEET
- Title: Chapters
- Header: VOLUME 001 · 83 LINES
- Rows:
  - All my chapters · Discipline, Focus
  - (index as in O4)
  - Saved · 12
  - Your lines · 3 (or FULL EDITION)
- Locked tag: FULL EDITION
- Locked ActionSheet:
  - Title: Money is part of Full Edition.
  - Options: Make Money my free chapter / See Full Edition / Cancel

COLORWAY SHEET
- Title: Colorway
- Names and preview lines:
  - BLACK — Ten pages a night is about a book a month.
  - BONE — Write the numbers down. Memory flatters you.
  - SNOW WASH — Not everything that buzzes is yours to answer.
  - SUN FADE — A bad day is enough. Don't add a bad night to it.
  - CONCRETE — The first time you say a price out loud, it sounds too high.
  - CHARCOAL — Delete it on a good day. You won't on a bad one.
  - PLUM — Make the phone call you keep turning into texts.
  - COFFEE — It's not a reward if you need it every night.
  - OLIVE — Complaining is the work you do instead of the work.
  - MIDNIGHT — Go to bed the first time you think about going to bed.
- Locked tag: FULL EDITION
- Locked bar: Sun Fade is part of Full Edition.  [See Full Edition]

SHARE SHEET
- Segmented: Story | Post
- Button: Share
- Text button: Copy line → Copied
- Card text: No. 0412 · unsetld

SAVED
- Title: Saved
- Row meta: No. 0233 · FOCUS
- Long-press: Remove from saved
- Empty state:
  - Nothing saved yet.
  - Double-tap a line to keep it here.

YOUR LINES
- Title: Your lines
- Row: + Write a line
- Placeholder: Write the line you need to read.
- Counter: 0 / 110
- Long-press: Edit / Delete
- Footnote: Your lines stay on this phone. They show up in your daily lines and can go on your widgets.
- Free state:
  - Your lines are part of Full Edition.
  - Write the lines you need to read. They show up in your daily lines and on your widgets.
  - [See Full Edition]

RECORD
- Nav: Settings
- Label: RECORD
- 41 days on record (singular: 1 day on record)
- Barcode: 23 AUG … TODAY
- Stats: RUN 12 days · LONGEST 19 days · HELD 33 of 41
- Access header: Access · Details
- Note: Earned with days on record. It can't be bought.
- Rows:
  - 007 Early access — Every drop opens to you 24 hours early.
  - 090 The patch — Numbered. Free with your next order.
  - 365 The 365 piece — Made only for people who reach a year.
- Statuses: OPEN · USED · PAUSED · 49 DAYS (singular: 1 DAY)
- Paused note (Inter 13 stone, under the road): Early access is paused. Put 7 days on record to open it again.
- Proof: Proof · A photo of each task you prove, taken in the app. Each one is 10 points. · Today: 2 tasks proven. · See all
- Codes header: CODES
  - Tier rows: 10% off one order — 600 points. Up to $25 off at unsetld.com. · 15% off one order — 1,000 points. Up to $25 off at unsetld.com.
  - Statuses: READY · USED · 120 TO GO
  - Ready: You have enough points for a code. · Get your code
  - Confirm: Trade 600 points for 10% off? / One order at unsetld.com, up to $25 off. The code works for 30 days. / Cancel · Get the code
  - Got one: {CODE} · Works until 7 Nov. One order. · Use it at unsetld.com
  - Used this collection: One code each collection. The next one opens with the next collection.

MILESTONE DETAIL
- 007 Early access:
  - Every UNSETLD drop opens to you 24 hours before the public. When a drop is announced, open it from here.
  - Button: Turn on drop alerts
  - While a drop is open early (button, needs an account): Open Collection 004
  - Notifications off (under the button): Notifications are off for unsetld. · Open Settings
- 090 The patch:
  - A woven UNSETLD patch with your number. It ships free with your next order. One per person.
  - Button: Add it to my next order
- 365 The 365 piece:
  - A numbered piece made only for people who reach a year. Sold at full price. Never restocked.
  - Button: View at unsetld.com
- Footer link: Access terms
- Not signed in (Inter 13 stone above the button): Sign in to use access. It takes one tap.

MILESTONE LETTERS
- DAY 007 · Day 7.
  - A week of mornings. You came back every time.
  - Early access is open. Every UNSETLD drop opens to you 24 hours before the public.
  - [Turn on drop alerts] · Not now
  - Notifications off (under the buttons): Notifications are off for unsetld. · Open Settings
- DAY 090 · Day 90.
  - Ninety days. This isn't a phase anymore.
  - Your patch is numbered and waiting. It ships free with your next order.
  - [Add it to my next order] · Details
- DAY 365 · Day 365.
  - A full year. You didn't settle.
  - The 365 piece is open to you. Made only for people who reach a year, numbered, never restocked.
  - [View at unsetld.com] · Details
- Comeback · Day 52. (uses the current day)
  - You came back. That's the part that counts.
  - Early access is open again.
  - [Close]

HOW THE RECORD WORKS (Details)
- Title: How the record works
- On record: A day goes on record when you open the app that day, or open it from a widget or a reminder. One a day. A day runs from 4:00 AM to 3:59 AM, so late nights count.
- Today's work: Each day's work is your three rules, one task from UNSETLD and up to three of your own. Prove a task with a photo taken in the app; the photo stays on this phone. Each proven task is 10 points, up to 40 a day.
- It only goes up: Missed days don't erase the ones on record.
- The night check: It's between you and you. Saying Not today keeps the day on record.
- Access:
  - Day 7: every UNSETLD drop opens to you 24 hours before the public.
  - Day 90: a woven patch with your number, free with your next order.
  - Day 365: the 365 piece, made only for people who reach a year. It's sold at full price and never restocked.
- Keeping it: Once early access is open, if 14 days pass with nothing on record, it pauses until you put 7 more days on record. Your count, points and milestones stay.
- Limits: One code each collection. Up to $25 off an order. Codes don't combine with other codes, including the 10% first-order code, and exclude the 365 piece. One patch per person.
- It can't be bought: Full Edition doesn't change any of this. Points and access are the same for everyone.
- Account: To use a code or access you need a free account, made with Sign in with Apple, so we can hold your place.

ACCESS TERMS (legal page, lawyer review before launch)
- For US residents 13 and over. If you're under 18, get a parent's or guardian's OK before you place an order.
- No cash value.
- Not transferable.
- Codes are single use.
- We may change or end the program with 30 days' notice in the app.
- Contact unsetldclothing@gmail.com.

ACCOUNT
- Title: Account
- Body: You only need an account to use codes and access: discount codes, early access and the patch. Your record, proof photos, saved lines and your lines stay on this phone.
- Legal line: By signing in you confirm you're 13 or over and live in the US. If you're under 18, check with a parent first.
- Button: Sign in with Apple (system button)
- Signed in: Signed in as {relay email} · Sign out
- Signed in, no email from Apple: Signed in with Apple
- Under Sign out: Delete account
- Delete confirm: Delete your account? / This removes your account and what unsetld.com holds for it: your days and proof counts. Your record and proof photos stay on this phone. / Cancel · Delete
- Delete error: Couldn't delete your account. Try again in a moment.
- Delete, but the server signed the phone out (under the sign-in button): Sign in again to delete your account.
- Error: Couldn't sign in. Try again in a moment.

PAYWALL
- Header: Restore
- Label: UNSETLD
- Title: Full Edition
- Description: Every chapter, every colorway, more reminders.
- Spec rows:
  - CHAPTERS — All seven, for your daily task and lines
  - COLORWAYS — All ten, in the app and on your widgets
  - REMINDERS — Up to ten a day. Write your own lines.
- Plans:
  - Annual — 3 days free, then billed yearly — $24.99 / year — $2.08 a month
  - Monthly — Billed monthly — $4.99 / month
  - Lifetime — One payment — $39.99 once
- Trial-ineligible Annual sub-line: Billed yearly
- Timeline:
  - TODAY — Everything opens
  - DAY 2 — We remind you
  - DAY 3 — $24.99 billed
- CTA:
  - Annual: Start free trial
  - Annual, trial-ineligible: Subscribe for $24.99 a year
  - Monthly: Subscribe for $4.99 a month
  - Lifetime: Buy for $39.99
- Fine print:
  - Annual: 3 days free, then $24.99 per year. Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends.
  - Annual, trial-ineligible: $24.99 per year. Renews automatically. Cancel any time in Settings.
  - Monthly: $4.99 per month. Renews automatically. Cancel any time in Settings.
  - Lifetime: One payment of $39.99. No subscription.
- Links: Terms of Use · Privacy Policy
- Loading price: —
- Price error: Prices couldn't load. Check your connection. · Try again
- Purchase failed alert: Purchase didn't go through. / Nothing was charged. Try again in a moment.
- Restore:
  - success: Full Edition restored.
  - none: Nothing to restore. / We couldn't find Full Edition on this Apple ID.
  - error: Couldn't reach the App Store. Try again in a moment.
- Preview builds only: Preview build. No charge.
- All prices are localized from StoreKit.

SETTINGS
- Title: Settings
- DAILY
  - Reminders · 3 a day, 7:00 AM to 10:00 PM
  - Night check · 9:30 PM (switch)
  - Your standard · Up before 7. +2
- READING
  - Chapters · Discipline, Focus
  - Colorway · Black
  - Strong language (switch, off)
    - Footnote: Some lines swear. They never appear on your lock screen, widgets or notifications.
  - Saved · 12
  - Your lines · Full Edition
- WIDGETS
  - Add a widget
  - Wallpapers
- UNSETLD
  - Drop alerts (switch, off)
    - Footnote: Tells you when a collection opens. Separate from your daily reminders. Off unless you turn it on.
    - Notifications off (the switch stays off): Notifications are off for unsetld. · Open Settings
  - Account · Not signed in
- FULL EDITION
  - Plan · Free (or: Annual, renews 10 Oct 2027 / Monthly, renews 7 Nov 2026 / Lifetime)
  - Restore purchases
- ABOUT
  - How the record works
  - Access terms
  - Contact · unsetldclothing@gmail.com
  - Terms of Use
  - Privacy Policy
- Footer: unsetld · version 2.0.0 · volume 001

Sub-pages
- Your standard: title Set your standard. · button Save
- Reminders:
  - title Reminders · button Save
  - permission-off row: Notifications are off for unsetld. · Open Settings
- Wallpapers:
  - title Wallpapers
  - FIG. 01 · Evolution
  - Button: Save to Photos
  - Body: Set it as your lock screen, then add the Line widget under the clock.

NOTIFICATIONS (title always: unsetld)
- Morning: the day's line (from the day's task) as the body, and the task as the subtitle, e.g. A bad day is enough. Don't add a bad night to it. / Today: Read one chapter of a book about what you want to do.
- Later reminders: subtitle Still open: {task}, body a line from that task's chapter.
- Slot prompts (fallback body when no line fits):
  - Morning:
    - Alarm off. Feet on the floor before you open a single app.
    - Before school or your shift, write down the one thing that has to get done today.
    - Pick the thing you're dreading today and the time you'll do it. Write both down.
  - Midday:
    - Eat real food at lunch and drink a full glass of water before you open your phone.
    - Half the day is gone. Look at your list and start the next thing on it.
    - Free period or break coming up. Give ten minutes of it to the thing you keep putting off.
  - Evening:
    - When you get home, put your phone in another room until the hard thing is done.
    - If you haven't moved today, get a 20-minute walk or run in before it gets dark.
    - Look at what's still open today. Finish the smallest one before dinner.
  - Night:
    - Write tomorrow's first task on paper before bed. One line is enough.
    - Count back nine hours from your alarm. Be in bed by then, phone across the room.
- Night check:
  - Did you hold your standard today?
  - Actions: Held · Not today
- Trial day 2: Your free trial ends tomorrow. $24.99 for the year starts then. Cancel any time in Settings.
- Drop alerts (opt-in only):
  - Day ≥7: Collection 004 is open to you now. Everyone else gets it tomorrow at 9:00 PM.
  - Below Day 7: Collection 004 opens tomorrow at 9:00 PM.

WIDGET GALLERY (app.json)
- Line — Today's line, then a new one with each reminder.
- Record — Your days on record and this week.
- Standard — Your three rules, where you'll see them.
- Inline: Day 41
- Record small: RECORD · 41 · days on record
- Medium/large header: LONER-style chapter label · No. 0412 · WED 7 OCT

ERRORS AND EMPTY STATES
- Access claim network error: Couldn't reach unsetld.com. Try again in a moment.
- Access paused claim: Access is paused. Put 7 days on record to open it again.
- Code used this collection: USED (row) / One code each collection. The next one opens with the next collection.
- No toasts anywhere. Confirmations are haptics or inline label swaps.

APP STORE LISTING (3.0)
- Name: UNSETLD: Daily Missions
- Subtitle: Do the mission. Prove it.
- Promotional text: Three missions a day, picked for what you want to improve. Do them for real, prove them with the camera, and keep the streak going.
- Description:
  UNSETLD gives you three missions a day for what you're working on: focus, fitness, school, money, skills, a reset or confidence.
  Do each one in real life, then prove it with the camera in the app. Proven missions earn points, keep your streak going and move your levels up.
  Pick up to three tracks and how much time you have. Swap a mission that doesn't fit. Run a program when you want a push: a 7 Day Lock In, a school reset, a week to build something.
  Points trade for rewards at unsetld.com. Nothing can be bought.
  Your proof photos stay on your phone. The checks run on the phone, and they never look at what's in a photo.
  Never settle for less.
- Screenshots (proof photos show objects, never people, faces, documents or screens with personal details):
  1. Three missions a day, built around your life. (Home with today's missions)
  2. Do it for real. Prove it with the camera. (a mission page with PROVE IT)
  3. Every proven mission earns points. (the done screen)
  4. A streak that means you showed up. (Progress: streak, levels, milestones)
  5. Your next mission, on your lock screen. (lock screen with the Next mission and Streak widgets)
  6. Trade points for rewards at unsetld.com. (Rewards)
- Never in the listing: prices, discount percentages, "free", or anything that makes the app read as a store.

LINE LIBRARY, VOLUME 001
Numbers are permanent.
- [RAW] = explicit: never on public surfaces, never in a user's first 10 lines.
- [LOCK] = clean and ≤60 characters, eligible for the lock-screen widget.

DISCIPLINE (01, free, always on)
0001 [LOCK] That restless feeling isn't a problem. It's an instruction.
0002 Settling rarely feels like a decision. It feels like a normal evening.
0003 [LOCK] Pick a pace you can still keep three months from now.
0004 [LOCK] Do the part of the job nobody would notice you skipped.
0005 [LOCK] Most of the real work happens alone, at bad hours. Go.
0006 Count how many times you've started this. Now finish it once.
0007 You have time for this. You've been spending it somewhere else.
0008 [RAW] You've had the same plan for two years. Do the fucking plan.
0009 [LOCK] Lowering the standard feels like relief for about a day.
0010 [LOCK] Lost is fine. Lost and sitting still is the problem.
0011 [LOCK] What you promised yourself at midnight still counts at six.
0012 Finish the set, the shift, the page. Have your feelings after.
(Reserved, unnumbered, end card only: You've read enough lines like this one. Go do the work.)

FOCUS (02)
0013 You've thought about it for months. Thinking is the safe part.
0014 The important thing gets your morning. Email gets what's left.
0015 [LOCK] Every time you check your phone, you pay to get back in.
0016 [LOCK] Not everything that buzzes is yours to answer.
0017 [LOCK] An hour with the door shut beats a day with it open.
0018 [LOCK] Hard problems feel like boredom at first. Stay in it.
0019 You've rebuilt the system three times. The system was never the problem.
0020 [RAW] Close the tabs. You know damn well you're not reading them.
0021 The conversation you keep replaying is over. You're the only one still in it.
0022 [LOCK] Your best hours keep going to whoever interrupts first.
0023 Give it twenty minutes before you decide you're not in the mood.

TRAINING (03)
0024 [LOCK] Write the numbers down. Memory flatters you.
0025 [LOCK] Strength is the same few lifts, done properly, for years.
0026 [LOCK] Give a program twelve weeks before you call it useless.
0027 [LOCK] Missed a week. Take ten percent off the bar and start again.
0028 [LOCK] Sleep is part of the program. Treat tonight like a session.
0029 Lay out the gym clothes tonight. Give the morning one less excuse.
0030 [RAW] Ego lifting is bullshit. Drop the weight and do the full rep.
0031 [LOCK] Eat like you plan to train tomorrow.
0032 Train for the man you'll be at fifty, not the photo this summer.
0033 Keep training after you like what you see. That's when most people stop.
0034 [LOCK] You don't need to love it. You need to be there Thursday.

MONEY (04)
0035 [LOCK] Want more. Then learn something someone will pay you for.
0036 [LOCK] If he's showing you the car, he's selling you the course.
0037 [LOCK] Before you buy it, count how many days of work it costs.
0038 [LOCK] Know four numbers by heart: income, rent, debt and savings.
0039 [LOCK] Charge what it's worth. Say the number and stop talking.
0040 [LOCK] Ask for the raise with a list, not a feeling.
0041 [RAW] A real skill is boring as hell for the first year. Do the year.
0042 [LOCK] If you can't say where last month's money went, start there.
0043 [LOCK] A bad week is the most expensive time to go shopping.
0044 [LOCK] Read every monthly charge on your statement. Cancel two.
0045 [LOCK] Your friends' budget isn't yours. Sit this trip out.

CONFIDENCE (05)
0046 Wear the calm face if you have to. Don't lie to yourself behind it.
0047 [LOCK] Say it in the room, not in the car on the way home.
0048 Failing costs you less respect than always being about to start.
0049 [LOCK] Stop asking for opinions on decisions you've already made.
0050 Quiet is fine. Hiding isn't. Be honest about which one this is.
0051 [LOCK] Take \"just\" and \"sorry\" out of the email. Then hit send.
0052 [LOCK] Being average out loud beats being brilliant in your head.
0053 [RAW] Acting like you don't give a damn is the oldest mask there is.
0054 [LOCK] The first time is always ugly. You still need a first time.
0055 [LOCK] When you mess up, say so first and say it plainly.
0056 [LOCK] Make the phone call you keep turning into texts.
0057 Finish your sentence. Don't trail off and wait for someone to rescue it.

VICES (06)
0058 Skip it tonight and see what thought shows up. That's the one.
0059 [LOCK] Every night you give it is a morning it takes.
0060 [LOCK] You went backwards for a week. Fine. Walk forward today.
0061 [LOCK] Delete it on a good day. You won't on a bad one.
0062 [LOCK] It's not a reward if you need it every night.
0063 [LOCK] Thirty days without it. Then decide if you want it back.
0064 The betting app did the math before you placed your first bet.
0065 You clear the history for a reason. Be honest about the reason.
0066 [RAW] Four hours of scrolling and you feel like shit. That's your answer.
0067 [LOCK] It's 2am. Whatever you're looking for isn't on that screen.
0068 Quitting is boring. Most nights it's just not doing it again.

STOIC (07)
0069 [LOCK] The result isn't up to you. The next hour is. Start there.
0070 You'll die with some plans never started. Don't let this be one.
0071 [LOCK] Rehearse the worst outcome once. Then stop flinching at it.
0072 Choose small discomforts on purpose so the big ones don't own you.
0073 [LOCK] Complaining is the work you do instead of the work.
0074 [LOCK] Nobody will remember your name on it. Make it right anyway.
0075 If it's out of your hands, put it down. Your hands have work.
0076 Tonight, count what you actually did. Intentions don't go on the list.
0077 [RAW] Half of what's pissing you off today won't matter Friday. Ignore that half.
0078 Most of what you're scared to lose, you didn't have a year ago.
0079 Someone will always have more. Keeping count just costs you the day.
0080 We suffer more often in imagination than in reality. — SENECA · LETTERS 13 (trans. Gummere 1917). Verified against Wikisource.
0081 [VERIFY before shipping] No longer talk at all about the kind of man that a good man ought to be, but be such. — MARCUS AURELIUS · MEDITATIONS X.16 (trans. Long)
0082 [VERIFY] In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being. — MARCUS AURELIUS · MEDITATIONS V.1 (trans. Long)
0083 [VERIFY] No man is free who is not master of himself. — EPICTETUS · FRAGMENTS

Library rules:
- 79 original lines + 4 attributed quotes.
- 7 explicit lines (8.9% of the originals).
- 46 lock-eligible lines.
- VERIFY lines stay excluded from the feed until they are checked against the source text.
- Volume 001 must reach at least 40 lines per chapter before launch, written to the voice guide and originality-searched.
