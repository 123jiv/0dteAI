# UNSETLD 3.2: The Record

The loop: mission → do the work → prove it → it goes on your record → consistency → real rewards.
Internal principle (never printed in the app): build a record you can't fake.

3.2 doesn't add features around the loop. It makes the loop visible: every proof puts a day on
a record you can see, and that record gets more valuable every day you show up, with or without
clothing rewards. This document supersedes `UX_REDESIGN.md` §7 (Progress) where they differ.

## 1. Tabs

Today · **Record** · Rewards · You. Progress is renamed Record (route `Record`, deep link
`unsetld://record`; 3.1's `unsetld://progress` still opens it). No new tabs.

## 2. The rules the Record shows

- **One proven mission = you showed up.** The day is active, it starts or keeps the streak
  (core/streak), and it goes on the record.
- **Every mission in the day's plan proven = a perfect day**, with the perfect-day bonus
  (`rules.json` `perfectDayBonus`). The plan is about three missions (four on Push me with an
  hour or more).
- Missing one of three is not a failed day: it reads as "showed up" on the calendar.

## 3. Data (src/core/history.ts)

Everything the Record shows is built from the proofs on record (`record.missions`), never from
plans alone: plans are kept six weeks and aren't in the Keychain backup.

- `record.planned[day]`: how many missions the day's plan held, written with the day's first
  proof (core/complete). It keeps "2 / 3" on the record for good. Older days fall back to the
  plan while it's kept, then to the perfect-day bonus (all planned were proven), else unknown.
- `MissionDone.title`: each proof keeps its title (a mission of your own, a retired one).
- Day states (`DayLevel`): `none`, `one` (one mission proven), `two` (two or more, not every
  one), `perfect` (the bonus was paid; the same definition Stats and Achievements use). A missed
  day an Off Day covered is `covered`. A 2.x day on record (before missions) reads as `one`.
- `monthView`, `weekMarks`, `recordMonths`, `dayDetail`, `dayNumberOf`, `recordSummary`,
  `recentProofs`. Tests: src/core/__tests__/record-history.test.ts.
- A photo cleared by the retention setting keeps its entry (`uri: ''`): mission, date, area,
  completion and points stay; the image becomes a placeholder. History never breaks.

## 4. Screens

- **Record** (`screens/progress/RecordScreen.tsx`). The hero is the month: a grid of dots,
  Monday first, monochrome (src/ui/DayDot.tsx): an empty ring for a missed day, a small dot for
  one mission, a bigger dot for two, a solid disc for a perfect day, a dash for days to come;
  today has a second ring; days before the record began are a pinpoint, not a missed ring. Under
  it: the key (with Off Day when the month has one), the month's days proven and missions, the
  streak and the days on record (Today's DAY N), then your areas (level, a meter that starts over
  at each level, points into the level, missions and time), recent proof and View all proof.
  Stats (with the weekly review) and Achievements are quiet links: the page is not a dashboard.
- **Day 1**: this week's empty row, "Your first proven mission starts your record.", Start
  today, and each area at Level 1, 0 / 50. No zeros elsewhere, no dead end.
- **A day** (`RecordDay`): the date, 3 / 3 · Perfect day (or 2 / 3, or 1 mission proven), each
  proven mission with its photo (or a placeholder once cleared, or the timer), PROVEN and its
  points, missions left undone while the plan is kept, the bonus and the total.
- **Proof history**: private, on the phone only, by date, mission or area.
- **Today**: UNSETLD · DAY 12, 12 day streak · 380 pts, the next reward meter ("220 pts to next
  reward"), TODAY 0 / 3. No explanatory sentences.
- **Completion**: PROVEN., the points (secondary), the week's dots with today's filling in,
  "Day 12 added to your record.", 1 / 3 today, the streak, then the reward meter. Two of three
  says "One more for a perfect day."; a perfect day adds 3 / 3 and the bonus. Continue.
- **Weekly focus**: the question shows Monday to Wednesday (from the second active day), eight
  options, one tap.
- **START**: a timer mission's START opens the execution state straight away (Lock in for 30
  minutes, the clock, Stay here. Get it done., then Take proof). A photo mission's START opens the
  brief: Do it, then Prove it.

## 5. Swaps teach the plan

Swap opens a one-tap sheet: Why are you swapping? Not relevant · Can't do this today · Too easy
· Too hard · Already did this · Just give me another. The reason is stored with the swap
(`DayPlan.swaps`) and core/personalize `learnFrom` uses the last four weeks:

- Not relevant: that mission mostly stays away, and its kind (group, activity tags) is turned
  down after one swap.
- Too hard twice in an area: shorter missions there. Too easy twice: bigger ones.
- Can't do this today, Already did this: nothing is learned about the mission; Can't do this
  today doesn't keep it away beyond today.
- Just give me another: as before (repeated swaps of a kind turn it down).

Then RECOMMENDED FOR YOU: up to three missions of different kinds for that slot, picked the way
the generator picks (core/missions `replacementChoices`): shorter for Too hard, longer for Too
easy, another kind for Not relevant. This is rules over the user's own history; it's never
called AI.

## 6. Missions of your own

"+ Create my own" in the swap sheet: a title, an area, a proof type (Photo, Timer, Timer +
photo, Before & after) and a timer length. They can't be used to farm points (core/custom):

- one comes into a day only by replacing a planned mission (it uses a swap; the day never grows);
- a day holds one;
- it earns 5 (photo), 10 (before and after, or a 15-minute timer) or 15 (a timer of 30 minutes
  or more), and never more than the mission it replaced (every screen shows the capped amount);
- the timer must run to the end and photos go through the same on-device checks (fresh,
  duplicate); the planner never plans them on its own.

## 7. Rewards and status (unchanged systems, checked)

Points (from proven missions) buy rewards; status comes from days shown up (7 early access,
90 the patch, 365 the piece by default). Both stay configurable from unsetld.com (`rewards`
and `status` config). A 30-day tier can be added there as a display-only tier without an app
update; no new reward was invented in the app.

## 8. Not built (by design)

Public feeds, leaderboards, comments, followers, chat, AI coaching, journaling, mood tracking,
new tabs. **Lock in with a friend** is future work: a shared streak would read only each
person's active days (`activeDays`), never their proofs, so it needs a server for the pairing
and nothing in the Record has to change.
