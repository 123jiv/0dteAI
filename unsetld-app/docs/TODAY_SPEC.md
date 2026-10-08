# UNSETLD 2.1: Today (addendum to DESIGN_SPEC.md)

This addendum supersedes the parts of `DESIGN_SPEC.md` noted below. Everything else there (tokens, type, colorways, the walker, Record, Access, paywall layout, onboarding look, widgets) still applies.

**Founder decisions (8 Oct 2026)**
- The app is for doing the work, not scrolling quotes. The line feed is gone.
- Each day's work is the user's three rules plus one daily task from UNSETLD.
- There's one line a day, with no scrolling. It sits on Today, in reminders and on the widgets.
- Proof (a photo taken live in the app, kept on the phone) completes a task. Each proven task is worth 10 points, up to 4 a day.
- Points trade for codes at unsetld.com: 600 points for 10% off, 1,000 points for 15% off. The maximum is $25 off, one code each collection, and a code works for 30 days.

## 0. Product (replaces section 0's loop)

The daily loop:
1. **Morning.** One raw line, the same for everyone, on the lock screen and as the first notification.
2. **Today.** The day's work: your three rules, plus one task from UNSETLD picked from your chapters.
3. **Through the day.** Reminders name the work that's still open, each with a line about it. Proving a task with a photo ticks it off.
4. **Night.** One question: did you hold your standard?
5. **The record.** Opening the app puts the day on record. Days on record open access. Proof earns points, and points become codes.

The app still has to make sense for someone who never buys a hoodie.

## 1. Information architecture (replaces the Reader)

- The root screen is **Today**. The Reader pager, the mix feed, the end card, one-time pages, the chapter filter and the free 10-a-day limit are removed.
- Today's bottom bar keeps the reader's: Chapters (sheet), Colorway (sheet), and the walker (Record).
- Deep links: `unsetld://line/{no}` and `unsetld://today` open Today. `unsetld://night-check` opens Today scrolled to the night check. `unsetld://record` is unchanged.
- New full-screen modal **Task**: it's the proof screen with a task at the top.

## 2. Today screen

The background is the colorway layer, as in the reader. All text uses the colorway's ink and secondary.

- **Top row** (y = safeTop + 8, 44 tall):
  - left: label `WED 8 OCT`
  - right: mono `DAY 041`
  - On the first open of a day, the day goes on record: one soft haptic, and the walker in the bottom bar nudges.
- **The line** (top at 96):
  - a label with the chapter, and mono `No. 0412` on the right;
  - the line in Cormorant 500 at the reader's size steps × 0.82 (≤32 chars: 43; ≤56: 38; ≤80: 33; longer: 28), max 4 lines;
  - for a quote, its attribution label;
  - then the actions: Save (bookmark) and Share, 44 hit areas, as in the reader;
  - long-press on the line: Share, Copy line, Save / Remove from saved, Cancel. Double-tap saves.
- **Night check** (only when due and unanswered, i.e. after its time and before 4:00 AM):
  - It sits between the line and the work, behind a hairline.
  - Label `NIGHT CHECK`, the question (title.m), then Held (primary) and Not today (outline), side by side, 48 tall.
  - Once answered, the block shows `Held.` or `Noted.` and `Day 41 is on record.` until the next day.
- **Today's work:**
  - Header: label `TODAY'S WORK` on the left; mono `2 / 4` on the right, counting done tasks out of all of them.
  - **Rows**, 64 tall minimum, hairline above each:
    - mono `01`–`04` in a 40 column;
    - the task, Cormorant 23 (list), in ink, or secondary with strike-free reduced emphasis when done;
    - a second line in Inter 13 secondary:
      - rules: `Your standard`;
      - the daily task: `From UNSETLD · Focus`;
      - done: `Proven 9:47 AM` or `Done 9:47 AM`.
    - **Right side:**
      - not done: a 14pt square outlined in ink at 40%;
      - done with proof: a 28×35 thumbnail of the photo with a hairline border;
      - done without proof: a filled square in ink.
  - Tapping a row opens the **Task** modal. A finished task opens the same modal, showing its photo.
  - Full Edition: up to 3 more tasks of your own sit below the four (`Your task`).
    - Row: `+ Add a task` → an inline input, Cormorant 23, 40 characters maximum. The task stays until removed (long-press → Remove).
    - Free users see the same row with the label `FULL EDITION`, and tapping it opens the paywall.
- **Footer note**, Inter 13 secondary, under the list:
  - `Prove a task with a photo. Each one is 10 points, up to 40 a day.`
  - It shows only while Access is enabled, as a rewards mention on Today. This is the one exception to rule 5, because the points are what the tasks are for.
- The screen scrolls. The bottom bar stays fixed over a 24pt fade.

## 3. Task modal (from the proof screen)

- Header: close X; mono `DAY 041`.
- Label `YOUR STANDARD` or `FROM UNSETLD · FOCUS`, then the task in title.xl.
- For the daily task: `What to photograph: {proof}`, Inter 15 secondary.
- A line for this task, in Cormorant italic 20 secondary, picked from the task's chapter (from the mix for rules). It's the "line about it".
- **Buttons:**
  - primary `Take the photo` (`Choose a photo` in the preview);
  - then the text button `Done, no photo`, which marks it done with no points.
- **Review** (unchanged): the photo at 4:5 with the garment-tag stamp, then `Keep it` and `Retake`.
- **Done:** `Proven.`, `Train every day.`, and mono `+10 POINTS · 230 IN TOTAL` when points apply. Then `Done`.
  - Once 4 tasks are proven, more proof saves the photo but adds no points. The done screen then reads `Proven. Today's 40 points are in.`
- A finished task shows its photo and stamp, `Retake` (a replacement earns nothing new), and `Mark not done`.

## 4. Daily logic (replaces the feed rules in section 4)

- **Today's line:** unchanged (global, `schedule.json`, clean, ≤80 characters).
- **The daily task:**
  - Picked deterministically per install and day (install salt + day key) from the task library, in the chapters of the user's mix.
  - Never a task shown in the last 30 days; relaxed to 7 days, then to any.
  - Free mix: Discipline plus one chapter. Full Edition: every chosen chapter.
- **Work for a day:** the three rules, the daily task and, for Full Edition, the user's own tasks. Rule text is stored with each completion, so a later edit to the standard doesn't rewrite the past.
- **Points:**
  - 10 per proven task, up to 4 proven tasks a day.
  - Balance = Σ days × min(4, proven that day) × 10, minus points spent on codes.
- **Codes:** 600 points for 10% off, 1,000 points for 15% off. One code each collection, $25 maximum, valid 30 days. All of this lives in `points.json`.
- **Reminders:**
  - First reminder: today's line (unchanged).
  - Later reminders: a task nudge.
    - Subtitle: `Still open: Train every day.`
    - Body: a clean line from that task's chapter, or the mix for rules.
    - Today's nudges skip tasks already done, and are dropped when everything is done. Future days rotate through the rules and the daily task.
  - The schedule is rebuilt whenever a task is completed.
- **Night check:** unchanged. The notification's Held / Not today buttons still work.

## 5. Full Edition (replaces section 1's list)

| | Free | Full Edition |
|---|---|---|
| Daily task from | Discipline and one chapter | All seven chapters |
| Your own tasks | none | Up to 3 more a day |
| Colorways | Black | All ten, app and widgets |
| Reminders | Up to 3 a day | Up to 10 a day |
| Your lines (in reminders and on widgets) | none | Yes |
| Proof, points, codes, Record, Access, widgets, saved lines, sharing | Yes | Yes |

Paywall spec rows:
- `CHAPTERS — All seven, for your daily task and lines`
- `TASKS — Up to three more of your own, every day`
- `COLORWAYS — All ten, in the app and on your widgets`
- `REMINDERS — Up to ten a day`

Description: `Every chapter, every colorway, more of your own work.`

## 6. Copy changes

- **O2:**
  - caption `One line every morning. Then the work.`
  - The second page and the swipe are gone. `Continue` appears after 2.5 s.
- **O3** body: `Pick three. They're your work every day, and each night you'll mark whether you held them. Only you see this.`
- **O4** body: `Your daily task and lines come from these. Free includes Discipline and one more. Full Edition opens all seven.`
- **Day 3 note:** it appears once on Today under the work, not as a page. Label `ACCESS`, then: `Day 7 opens early access to every UNSETLD drop. Proven work earns points toward codes at unsetld.com.` Link: `See your record`.
- **Removed copy:** end card, swipe hints, library exhausted, new-volume page, `FOCUS ONLY`.

---

# UNSETLD 2.2: Everyday (supersedes the parts of 2.1 noted below)

**Founder decisions (8 Oct 2026, later)**
- "Make these tasks like every day tasks for kids who want to become successful like me. I want this to feel relatable and actually mean something." The app has to be useful, not read like a marketing tool.
- **Audience: 14 to 22.** Everything works for a 14-year-old in 9th grade and for a 21-year-old with a job who isn't in school.
- **Lines are rewritten for that audience**, and the day's line is tied to the day's task.
- **Your own tasks are free** for everyone (up to 3).
- **Codes are open to 13+.** Get the terms reviewed before launch.

## Tasks

- Every library task has `text`, `proof` (what to photograph), `when`, **`why`** (one or two sentences on why it matters, at most 170 characters), **`how`** (how to start right now, at most 120 characters) and **`lines`** (1–2 clean original lines from the same chapter that go with it).
- Tasks are everyday: they fit a school day or a work day, cost nothing, need no car, no gym and no special equipment, and are safe for a 14-year-old (no diets, weight, caffeine, cold exposure or stunts). The proof photo never needs anyone's face or anything private.
- The content brief and the review panels that wrote the library are kept in `docs/research/2026-10-08-everyday-content.md`.

## Today's line (replaces "Today's line: unchanged" in 4)

- The day's line is one of the daily task's paired lines (alternating by day when there are two). A day pinned in `schedule.json` still wins. If the task has no usable pair, the global rotation is the fallback.
- Because the daily task depends on the install and the user's chapters, the line is no longer the same for everyone on a given day. The morning notification, the Line widget and the proof stamp all use this line.
- Onboarding O2 shows a fixed opening line (`ONBOARDING_LINE` in `src/content/index.ts`).

## Today rows (replaces the second-line labels in 2)

- Rules: `Every day`.
- The daily task: `Today's task · Focus`.
- Your own: `Your task`.
- `+ Add a task` is open to everyone, up to 3. There's no `FULL EDITION` label in the list.

## Task modal (replaces the line block in 3)

For the daily task, under the title:
- the **why**, Inter 17, ink;
- label `HOW TO START`, then the **how**, Inter 15, secondary;
- label `PROOF`, then `A photo of {proof}`, Inter 15, secondary.

For rules and your own tasks there's no why: the modal keeps the italic line. A preset rule takes its line from its own chapter (`standard.json` gives each preset a chapter, e.g. `Work out for 30 minutes.` → Training), whatever chapters the user reads, and its reminders do the same; a written rule or your own task takes one from the mix.

## Full Edition (replaces the table in 5)

| | Free | Full Edition |
|---|---|---|
| Daily task and lines from | Discipline and one chapter | All seven chapters |
| Your own tasks | Up to 3 | Up to 3 |
| Colorways | Black | All ten, app and widgets |
| Reminders | Up to 3 a day | Up to 10 a day |
| Your lines (in reminders and on widgets) | none | Yes |

Paywall spec rows: `CHAPTERS`, `COLORWAYS`, `REMINDERS` (the `TASKS` row is removed). Description: `Every chapter, every colorway, more reminders.`

## Defaults

- **Strong language is off by default** (Settings → Strong language). The audience starts at 14.
