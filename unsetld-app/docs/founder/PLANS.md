# Guided Plans library

**Proposed — not implemented. Needs founder approval.**

> **Where this stands (19 Oct 2026, after the launch pass merged).** Merged and in the app now: Plan days keep every Plan mission at every day shape (0a6edbb, 0b6b842); a finish goes on the Record with one moment and the First plan achievement (27cfee9); "Learn a skill", "Improve my routine" and "Get my space in order" are offered again (4947e4e); the validator's three plan rules (9854d8d) as written, without the carve-out in section 9, so 14 Day Lock In fails today until the carve-out ships with it; and a test that every shipped plan finishes in exactly its days on every day shape, which will cover new plans as they're added. The new plans themselves (PF-2) are not added. Source notes such as `audits/*.md`, `audit/...`, `decisions.md` and "plan §6" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan, what shipped and every founder decision with its assumed default.

Nothing in this document is in the app. `programs.json`, the copy and the validator change only after you approve them. Every plan here is built only from the 66 approved missions. No mission is added, renamed or reworded, and `missions.json` does not change.

Sources:
- the UNSETLD+ audit (`audits/plus.md`) and its simulation (`audit/plus/plans-sim.txt`), which ran every plan through the real planner;
- the launch plan: §6 decision 20 (the recommended set), PF-2 (new Plans) and P1-12 (validator rules);
- the repo at `acea784`: `src/content/programs.json` and `src/content/missions.json`. Both are unchanged at `575e63b` (Step 0).

In the code, plans are called programs. Mission ids and titles below are the approved ones from `missions.json`. Minutes are the plan's own missions only, not the other missions the planner adds to the day.

---

## 1. Summary

- There are 6 plans today. 2 are free. Money, Career and Skills have none.
- Candidates: the 13 from the brief, plus Skill Week, which the audit added. Each was built from approved ids and run through the real planner. Every one finished in exactly its number of days at each of the five time settings tested, with every plan mission placed.
- Recommended:
  - ship 7;
  - hold 4 until new missions exist;
  - reject 3.
- **Ship, all UNSETLD+:** Exam Week, Assignment Catch-Up, Back Into Training, Portfolio Week, Launch Week, Skill Week and 14 Day Lock In.
- The 2 free plans stay free. The library goes from 6 plans to 13: 2 free and 11 UNSETLD+.
- **Hold:** Money Reset, Resume Week, Interview Week and Creator Week.
- **Reject:** Deep Work Week, Ship Something and Sunday Reset.
- Plans don't change points. No paid plan, existing or in the ship set, pays more per day than the free 7 Day Lock In.
- With the ship set, Money is the only area with no plan.

| Area | Missions | Plans today | With the ship set |
|---|---|---|---|
| Discipline | 6 | 7 Day Lock In (free) | adds 14 Day Lock In; Assignment Catch-Up also uses Discipline |
| School | 13 | School Reset | adds Exam Week and Assignment Catch-Up |
| Fitness | 7 | Fitness Reset | adds Back Into Training |
| Money | 5 | none | none |
| Career | 10 | none | Portfolio Week (shared with Skills) |
| Skills | 9 | none | Skill Week and Portfolio Week |
| Projects | 11 | Build Something, Business Week | adds Launch Week |
| Organization | 5 | Get Organized (free) | no change |

The "Learn a skill" weekly focus is offered again (PF-1, merged in 4947e4e). Skill Week gives it a matching plan. "Save money" and "Apply for jobs or internships" still have no plan.

---

## 2. How plans work now

**Structure**
- A plan is a fixed list of days, with 1 or 2 missions a day.
- A day moves on when one of its missions is proven, so a missed day never fails the plan.
- One plan runs at a time.

**Free and paid**
- 7 Day Lock In and Get Organized are free. The other plans need UNSETLD+.
- Membership is checked only when you tap Start (`PlansScreen.tsx:191-196`).
- A paid plan started as a member runs to its end if the membership lapses (MISSIONS_SPEC §11).

**Placement and time**
- A plan's missions go into the day first. Their placement ignores cooldowns by design (MISSIONS_SPEC §4), so a plan can repeat a mission sooner than the planner would.
- Before this pass, plan missions ignored the daily time. At 15 minutes, the existing plans ran 25–50 minutes a day (time audit).

**Under the new day shapes** (decision 4, the default; merged in 0a6edbb)
- Plans run on their own time, and every plan mission is kept.
- Other missions fill only what's left of the day's time, and only while 10 minutes or more remain.
- The plan card says "About N min a day" (section 11).

**Finishing** (P1-8, merged in 27cfee9)
- A finished plan is recorded on the Record and gets one moment, with no points:

  > 7 DAY LOCK IN.
  > Seven days. Each one proven.
  > Never settle for less.

---

## 3. Points

- A plan mission pays what it pays anywhere. Plans carry no bonus.
- The perfect-day bonus (+15) and the daily maximum of 95 points (`docs/ACCESS.md:55`) don't change.
- Plans can't push a day past four missions.

Points from plan missions alone, without the perfect-day bonus:

| Plan | Free or paid | Points over the run | Per day |
|---|---|---|---|
| 7 Day Lock In | Free | 130 | 18.6 |
| Get Organized | Free | 40 | 8.0 |
| Exam Week | Paid | 130 | 18.6 |
| Portfolio Week | Paid | 130 | 18.6 |
| Skill Week | Paid | 120 | 17.1 |
| 14 Day Lock In | Paid | 240 | 17.1 |
| Assignment Catch-Up | Paid | 85 | 17.0 |
| Back Into Training | Paid | 105 | 15.0 |
| Launch Week | Paid | 95 | 13.6 |

- The best paid plan per day equals the free 7 Day Lock In.
- One held plan would break this as drafted: Resume Week pays 95 over 5 days, 19.0 a day. Check it again before it ships.
- A plan day can hold more minutes than a 15-minute day. A free user gets the same by running a free plan, or by choosing 30 or 45 minutes.
- Paid plans add choice, not earning power.
- The "First plan" achievement (PF-3) and the "Plans finished" count are reached with the free plans too. A free user can also run a free plan again.

---

## 4. The existing six plans

These don't change. They are listed so you can compare them with the candidates.

| Plan (id) | Area | Days | Free | Plan minutes by day | Median | Distinct missions | Repeats | Closest other plan |
|---|---|---|---|---|---|---|---|---|
| 7 Day Lock In (`lock-in-7`) | Discipline | 7 | Free | 35, 30, 35, 50, 30, 30, 35 | 35 | 6 | D4 ×3, D1 ×3, D2 ×2 | none |
| Get Organized (`get-organized`) | Organization | 5 | Free | 10, 25, 10, 10, 15 | 10 | 5 | O2 ×2 | none |
| School Reset (`school-reset`) | School | 7 | Paid | 15, 30, 45, 30, 35, 20, 35 | 30 | 10 | none | none |
| Build Something (`build-something`) | Projects | 7 | Paid | 40, 30, 30, 30, 30, 50, 20 | 30 | 7 | P1 ×3 | Business Week, 0.40 |
| Fitness Reset (`fitness-base`) | Fitness | 7 | Paid | 30, 30, 20, 30, 20, 30, 30 | 30 | 4 | F5 ×3, F2 ×2 | none |
| Business Week (`business-week`) | Projects | 7 | Paid | 40, 15, 30, 30, 30, 30, 20 | 30 | 7 | P1 ×2 | Build Something, 0.40 |

Each day's missions, with that day's minutes in brackets:

- **7 Day Lock In:** D4 + D1 (35) · D2 (30) · D5 + D4 (35) · D6 + D1 (50) · D3 (30) · D1 (30) · D4 + D2 (35)
- **Get Organized:** O1 (10) · O2 + O5 (25) · O8 (10) · O9 (10) · O2 (15)
- **School Reset:** S12 (15) · S5 (30) · S1 + S7 (45) · S11 (30) · S9 + S2 (35) · S3 (20) · S15 + S10 (35)
- **Build Something:** P6 + P1 (40) · P1 (30) · P2 (30) · P7 (30) · P5 (30) · P1 + P11 (50) · P10 (20)
- **Fitness Reset:** F2 (30) · F5 (30) · F3 (20) · F5 (30) · F6 (20) · F5 (30) · F2 (30)
- **Business Week:** P6 + P1 (40) · P9 (15) · P3 (30) · P4 (30) · P1 (30) · P7 (30) · P10 (20)

---

## 5. Every candidate at a glance

**Columns**
- **Minutes a day:** the median day, with the range in brackets.
- **Days ≤ 20 min:** 20 minutes is the new 15-minute day's budget (P1-1). Longer plan days run past that promise, and the card line says so before Start.
- **Overlap:** the share of distinct missions two plans have in common: shared ÷ all distinct missions across both. 1.00 means the same missions. The column shows the closest existing plan.

| Plan | Area | Days | Minutes a day | Days ≤ 20 min | Overlap | Repeats | Verdict | Free or paid |
|---|---|---|---|---|---|---|---|---|
| Exam Week | School | 7 | 35 (30–35) | 0 of 7 | 0.73, School Reset | S4, S9, S11 ×2 | Ship | Paid |
| Assignment Catch-Up | School, Discipline | 5 | 30 (30–35) | 0 of 5 | 0.33, 7 Day Lock In | S5 ×2 | Ship | Paid |
| Back Into Training | Fitness | 7 | 30 (20–45) | 2 of 7 | 0.57, Fitness Reset | none | Ship | Paid |
| Portfolio Week | Career, Skills | 7 | 35 (30–45) | 0 of 7 | none | C4, C9, C11 ×2 | Ship | Paid |
| Launch Week | Projects | 7 | 30 (15–40) | 3 of 7 | 0.50, Build Something and Business Week | none | Ship | Paid |
| Skill Week | Skills | 7 | 30 (30–45) | 0 of 7 | none | K5 ×2 | Ship | Paid |
| 14 Day Lock In | Discipline | 14 | 32.5 (20–35) | 1 of 14 | 1.00, 7 Day Lock In | D4 ×8, D1 ×4 | Ship | Paid |
| Money Reset | Money | 5 | 15 (15–20) | 5 of 5 | none | M1 ×4, M2 ×2 | Hold | Open (section 7) |
| Resume Week | Career | 5 | 30 (30–35) | 0 of 5 | none | C1 ×4 | Hold | Paid |
| Interview Week | Career | 5 | 30 (20–35) | 1 of 5 | none | C5 ×3, C11 ×3 | Hold | Paid |
| Creator Week | Projects | 7 | 30 (20–40) | 2 of 7 | 0.56, Business Week | P3, P10 ×2 | Hold | Paid |
| Deep Work Week | Discipline | 7 | 35 (30–35) | 0 of 7 | 0.67, 7 Day Lock In | D4 ×4, D5 ×3 | Reject | — |
| Ship Something | Projects | 7 | 30 (20–50) | 1 of 7 | 1.00, Build Something | P1 ×3 | Reject | — |
| Sunday Reset | Organization | 1 | 25 | 0 of 1 | 0.40, Get Organized | none | Reject | — |

**Where the plan and the audit differ**
- The audit marked Money Reset and Resume Week "build". The plan (§6, decision 20) holds them because one mission fills four of their five days. This document follows the plan.
- The audit left Launch Week and Creator Week as one or the other. The plan ships Launch Week and holds Creator Week.

**About the simulation**
- It ran on the planner before the new day shapes (model J, merged in 0a6edbb).
- Under the new shapes, every plan mission is kept by rule (P1-1).
- The merged tests (0b6b842, 9854d8d) run every plan in `programs.json` through the real planner on every day shape, so a new plan is checked as soon as it is added.

---

## 6. Ship: day by day

All seven are UNSETLD+. Proposed ids follow the validator's pattern. Short lines are proposed copy for your approval; the limit is 90 characters.

### Exam Week · `exam-week` · School · 7 days

- **Short line:** "Seven days of testing yourself before it counts." (48 characters)
- **Card line:** "About 35 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | S12 Create Your Study Plan for the Week + S4 Write Everything You Remember About One Topic | 30 |
| 2 | S11 Spend 30 Minutes on Your Hardest Class | 30 |
| 3 | S9 Test Yourself on Flashcards for 20 Minutes + S2 Test Yourself Without Looking at Your Notes | 35 |
| 4 | S3 Complete 10 Practice Problems + S7 Turn Today's Notes Into 10 Questions | 35 |
| 5 | S15 Review a Topic You Learned Earlier This Week + S10 Explain One Difficult Concept From Memory | 35 |
| 6 | S11 Spend 30 Minutes on Your Hardest Class | 30 |
| 7 | S9 Test Yourself on Flashcards for 20 Minutes + S4 Write Everything You Remember About One Topic | 35 |

- 9 distinct missions. S4, S9 and S11 come twice each.
- **Overlap with School Reset is 0.73.** School has 13 missions, so some sharing can't be avoided.
  - Exam Week is built on testing yourself: S2, S4, S9 and S10.
  - School Reset is built on assignments and study blocks.
- It fits the "Prepare for an exam" weekly focus.
- This is the audit's revised version, with every day at 30–35 minutes. The first version had a 45-minute day 6 (S11 + S2).

### Assignment Catch-Up · `assignment-catch-up` · School and Discipline · 5 days

- **Short line:** "Five days to clear what is due and get ahead of what is next." (61 characters)
- **Card line:** "About 30 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | S12 Create Your Study Plan for the Week + D6 Finish One Unfinished Task | 35 |
| 2 | S5 Finish One Assignment | 30 |
| 3 | D3 Finish One Thing You've Been Avoiding | 30 |
| 4 | S5 Finish One Assignment + D4 Plan Tomorrow's Top 3 | 35 |
| 5 | S6 Start an Assignment Before It's Urgent | 30 |

- 6 distinct missions. S5 comes twice.
- Overlap is 0.33 with 7 Day Lock In and 0.14 with School Reset.
- It fits the "Get caught up in school" weekly focus.
- **Privacy:** S5's proof says "Hide your name and any grades."

### Back Into Training · `back-into-training` · Fitness · 7 days

- **Short line:** "Seven days from moving again to full sessions." (46 characters)
- **Card line:** "About 30 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | F6 Get Outside and Move for 20 Minutes | 20 |
| 2 | F3 Do 20 Minutes of Cardio | 20 |
| 3 | F5 Complete a 30-Minute At-Home Workout | 30 |
| 4 | F2 Walk for 30 Minutes | 30 |
| 5 | F1 Complete Your Workout | 45 |
| 6 | F8 Do Your Planned Cardio Today | 30 |
| 7 | F7 Complete Your Planned Strength Workout | 45 |

- 7 distinct missions, one a day, with no repeats.
- **Overlap with Fitness Reset is 0.57.**
  - Fitness Reset uses 4 missions, with F5 three times.
  - Back Into Training builds from 20 minutes to full sessions.
- Its name comes from the "Get back into training" weekly focus.
- **Safety:** it uses only existing missions, and the 45-minute days are the library's own workouts. The proofs show the place or the equipment: "Not your body", "Not your face".

### Portfolio Week · `portfolio-week` · Career and Skills · 7 days

- **Short line:** "Seven days to make one piece worth showing and put it where it counts." (70 characters)
- **Card line:** "About 35 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | C4 Improve One Part of Your Portfolio | 30 |
| 2 | K6 Create Something You Can Put in a Portfolio | 45 |
| 3 | K7 Improve Something You Created Before + C11 Practice Explaining One Project You've Built | 35 |
| 4 | C9 Add One Project or Accomplishment to Your Resume or Portfolio + K3 Practice One Weak Part of Your Skill for 20 Minutes | 35 |
| 5 | K4 Build a Small Project Using Your Skill | 45 |
| 6 | C4 Improve One Part of Your Portfolio | 30 |
| 7 | C9 Add One Project or Accomplishment to Your Resume or Portfolio + C11 Practice Explaining One Project You've Built | 30 |

- 7 distinct missions. C4, C9 and C11 come twice each.
- C9 has a 21-day cooldown in the daily planner. Inside the plan it comes on days 4 and 7.
- It shares no missions with an existing plan. It is the first plan for Career and for Skills.
- **Privacy:** the C4 and C9 proofs say "Hide anything personal."

### Launch Week · `launch-week` · Projects · 7 days

- **Short line:** "Seven days from last fixes to something people can see." (55 characters)
- **Card line:** "About 30 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | P6 Write Your Next 3 Project Actions + P2 Finish One Small Part of Your Project | 40 |
| 2 | P5 Fix One Problem With Your Project | 30 |
| 3 | P4 Improve One Page, Screen, Product, or Listing | 30 |
| 4 | P3 Create One Piece of Content | 30 |
| 5 | P11 Improve Something You Made Yesterday | 20 |
| 6 | P10 Publish Something You Made | 20 |
| 7 | P9 Review One Important Metric and Make One Decision From It | 15 |

- 8 distinct missions, with no repeats.
- **Overlap is 0.50 with both Build Something and Business Week.**
  - Projects has 11 missions and already has 2 plans.
  - Ship either Launch Week or Creator Week, not both. With both, Projects would have 4 plans from 11 missions.
- It fits the "Finish my project" weekly focus.
- **Safety:** it publishes once, with P10 on day 6. P9's proof says "No customer or financial details."
- P2 and P5 show the user's project name, as they do today ("Fix One Problem With {project}").

### Skill Week · `skill-week` · Skills · 7 days

Skill Week isn't in the brief. The audit proposes it to cover the "Learn a skill" weekly focus.

- **Short line:** "Seven days of practice that ends in something you made." (55 characters)
- **Card line:** "About 30 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | K9 Watch One Tutorial and Apply One Thing From It | 30 |
| 2 | K1 Practice Your Skill for 30 Minutes | 30 |
| 3 | K3 Practice One Weak Part of Your Skill for 20 Minutes + K5 Explain One Thing You Learned From Memory | 35 |
| 4 | K2 Complete One Lesson, Then Use What You Learned | 30 |
| 5 | K10 Recreate Something Without Following the Tutorial | 30 |
| 6 | K7 Improve Something You Created Before + K5 Explain One Thing You Learned From Memory | 35 |
| 7 | K4 Build a Small Project Using Your Skill | 45 |

- 8 distinct missions. K5 comes twice.
- It shares no missions with an existing plan. Overlap with Portfolio Week, also proposed, is 0.25.
- K1 shows the user's skill ("Practice {skill} for 30 Minutes").

### 14 Day Lock In · `lock-in-14` · Discipline · 14 days

- **Short line:** "Fourteen days, each one proven." (31 characters) It is close to the finish moment's line, "Fourteen days. Each one proven." Approve it, or ask for a different one.
- **Card line:** "About 35 min a day."

| Day | Missions | Min |
|---|---|---|
| 1 | D4 Plan Tomorrow's Top 3 + D1 Lock In for 30 Minutes | 35 |
| 2 | D2 Do Your Most Important Task for 30 Minutes | 30 |
| 3 | D5 Work With Your Phone Away for 30 Minutes + D4 Plan Tomorrow's Top 3 | 35 |
| 4 | D6 Finish One Unfinished Task | 20 |
| 5 | D1 Lock In for 30 Minutes + D4 Plan Tomorrow's Top 3 | 35 |
| 6 | D3 Finish One Thing You've Been Avoiding | 30 |
| 7 | D2 Do Your Most Important Task for 30 Minutes + D4 Plan Tomorrow's Top 3 | 35 |
| 8 | D5 Work With Your Phone Away for 30 Minutes | 30 |
| 9 | D6 Finish One Unfinished Task + D4 Plan Tomorrow's Top 3 | 25 |
| 10 | D1 Lock In for 30 Minutes | 30 |
| 11 | D3 Finish One Thing You've Been Avoiding + D4 Plan Tomorrow's Top 3 | 35 |
| 12 | D2 Do Your Most Important Task for 30 Minutes | 30 |
| 13 | D5 Work With Your Phone Away for 30 Minutes + D4 Plan Tomorrow's Top 3 | 35 |
| 14 | D1 Lock In for 30 Minutes + D4 Plan Tomorrow's Top 3 | 35 |

- 6 distinct missions, the same six as 7 Day Lock In.
- D4 (5 minutes, an evening list) is on 8 of the 14 days, always paired with another mission.
- **Overlap with 7 Day Lock In is 1.00.** It is the paid next step after the free plan, not a different plan. Discipline has only 6 missions.
- Three changes must ship with it:
  1. "five to fourteen days" in the copy (section 10);
  2. the overlap rule's carve-out (section 9);
  3. the finish moment's number words must reach fourteen (already true: `copy/programs.ts` spells days out to twenty).

### The finish moment for each

There is one moment per finish (P1-8). The title is the plan's title in capitals. The line spells out the number of days, and the footer is "Never settle for less."

| Plan | Title | Line |
|---|---|---|
| Exam Week | EXAM WEEK. | Seven days. Each one proven. |
| Assignment Catch-Up | ASSIGNMENT CATCH-UP. | Five days. Each one proven. |
| Back Into Training | BACK INTO TRAINING. | Seven days. Each one proven. |
| Portfolio Week | PORTFOLIO WEEK. | Seven days. Each one proven. |
| Launch Week | LAUNCH WEEK. | Seven days. Each one proven. |
| Skill Week | SKILL WEEK. | Seven days. Each one proven. |
| 14 Day Lock In | 14 DAY LOCK IN. | Fourteen days. Each one proven. |

---

## 7. Hold until new missions exist

Each of these can be built today, and each passes the validator. Each is held because one or two missions carry most of its days. These are the versions possible with the current ids. When the new missions are approved, they replace the repeats.

### Money Reset · `money-reset` · Money · 5 days

- **Short line:** "Five days to see where it goes and decide where it should." (58 characters)

| Day | Missions | Min |
|---|---|---|
| 1 | M2 Review Your Spending From the Last 7 Days + M1 Track Everything You Spend Today | 20 |
| 2 | M5 Check One Subscription or Recurring Charge + M1 Track Everything You Spend Today | 15 |
| 3 | M3 Make a Spending Plan for This Week + M1 Track Everything You Spend Today | 15 |
| 4 | M6 Set One Savings Goal and Deadline + M1 Track Everything You Spend Today | 15 |
| 5 | M2 Review Your Spending From the Last 7 Days | 15 |

**Why hold**
- It uses all 5 Money missions in 5 days, and M1 is on 4 of them.
- M1 is the only Money mission that can come back the next day. The others have cooldowns of 7 to 45 days.
- A paid plan shouldn't be mostly the same 5-minute list.

**What it does well**
- It is the only plan that fits a 15-minute day on every day.

**What it needs**
- At least one more Money mission that can repeat within a few days, so M1 isn't on four days.
- One longer Money mission. No Money mission today runs over 15 minutes.
- Money is a focus area of `MISSION_LIBRARY_AUDIT.md`, so its proposals belong there. None is titled here.

**Other notes**
- **Free or paid: open.** The audit asked whether Money Reset should be free, as the free plan for a 15-minute day. The default when it ships is paid, like the others, unless you choose otherwise.
- It fits the "Save money" weekly focus.
- **Privacy:** the M1, M2 and M3 proofs are written, "never a bank or card screen". M5's says "No account screenshots."

### Resume Week · `resume-week` · Career · 5 days

- **Short line:** "Five days to get your resume ready to send." (43 characters)

| Day | Missions | Min |
|---|---|---|
| 1 | C10 Research 3 Skills Required for a Job You Want + C1 Improve One Resume Bullet | 30 |
| 2 | C1 Improve One Resume Bullet + C9 Add One Project or Accomplishment to Your Resume or Portfolio | 30 |
| 3 | C3 Find 3 Opportunities Worth Applying To + C1 Improve One Resume Bullet | 35 |
| 4 | C11 Practice Explaining One Project You've Built + C1 Improve One Resume Bullet | 30 |
| 5 | C12 Complete One Part of an Application | 30 |

**Why hold**
- C1 is on 4 of the 5 days. Its cooldown in the daily planner is 14 days.
- The plan assumes a resume already exists. No approved mission writes the first one, and many users aged 13–25 won't have one.

**What it needs** (proposed in the plus audit; not approved, and reviewed with the other additions in the library review)
- "Write the First Draft of Your Resume": Career, 30 min, a photo with personal details covered, 15 pts, low frequency.

**Age question for you**
- The "Apply for jobs or internships" weekly focus is hidden for under-16s (`core/review.ts` `focusChoices`).
- Days 3 (C3) and 5 (C12) are about applying. Decide whether this plan follows the same rule.

### Interview Week · `interview-week` · Career · 5 days

- **Short line:** "Five days of saying it out loud before it matters." (50 characters)

| Day | Missions | Min |
|---|---|---|
| 1 | C10 Research 3 Skills Required for a Job You Want + C5 Practice 5 Interview Questions | 35 |
| 2 | C11 Practice Explaining One Project You've Built + C1 Improve One Resume Bullet | 30 |
| 3 | C5 Practice 5 Interview Questions | 20 |
| 4 | C11 Practice Explaining One Project You've Built + C9 Add One Project or Accomplishment to Your Resume or Portfolio | 30 |
| 5 | C5 Practice 5 Interview Questions + C11 Practice Explaining One Project You've Built | 35 |

**Why hold**
- Only C5 and C11 are interview practice, and each comes 3 times in 5 days.

**What it needs** (proposed in the plus audit; not approved, and reviewed in the library review)
- "Prepare 3 Questions to Ask in an Interview": Career, 10 min, a written list, 5 pts.
- "Research One Company Before You Apply": Career, 15 min, notes, 10 pts.
- "Write One Interview Answer Using a Real Example": Career, 15 min, a written answer, 10 pts.

**Age question for you**
- The same under-16 question as Resume Week.

### Creator Week · `creator-week` · Projects · 7 days

- **Short line:** "Seven days of making, finishing and publishing." (47 characters)

| Day | Missions | Min |
|---|---|---|
| 1 | P6 Write Your Next 3 Project Actions + P12 Turn One Idea Into a First Draft | 40 |
| 2 | P3 Create One Piece of Content | 30 |
| 3 | P10 Publish Something You Made | 20 |
| 4 | P7 Create One New Design, Prototype, or Draft | 30 |
| 5 | P11 Improve Something You Made Yesterday | 20 |
| 6 | P3 Create One Piece of Content | 30 |
| 7 | P10 Publish Something You Made + P9 Review One Important Metric and Make One Decision From It | 35 |

**Why hold**
- P3 and P10 come twice each, so the plan publishes twice in 7 days.
- Overlap is 0.56 with Business Week and 0.50 with Launch Week. With Launch Week shipping, Projects would have 4 plans from 11 missions.
- The audit asked you to check how hard it pushes publishing for 13–15-year-olds.

**What it needs**
- Creator missions that make or prepare something without publishing it, so P10 comes once.
- These are to be proposed in `MISSION_LIBRARY_AUDIT.md`. None is titled here.

**If you prefer Creator Week**
- Swap it with Launch Week. Don't ship both on the current library.

---

## 8. Reject

### Deep Work Week · `deep-work-week` · Discipline · 7 days

Days, with minutes: D4 + D5 (35) · D2 (30) · D5 + D4 (35) · D1 (30) · D2 + D4 (35) · D5 (30) · D1 + D4 (35)

- 4 distinct missions: D4 4 times, D5 3 times.
- Overlap with the free 7 Day Lock In is 0.67.
- Discipline's 3 deep-work missions share one group, so a day holds only one of them.
- It would sell a near-copy of a free plan.
- It passes every validator rule. Rejecting it is a judgment, not a rule.
- Look at it again only as a new proposal, if "Lock In for 45 Minutes" is approved (Discipline, 45 min, timer and photo, 20 pts, from the plus audit).

### Ship Something · `ship-something` · Projects · 7 days

Days, with minutes: P6 + P1 (40) · P1 (30) · P2 (30) · P7 (30) · P5 (30) · P1 + P11 (50) · P10 (20)

- Its day lists are the same as Build Something's.
- The new duplicate rule would fail it.

### Sunday Reset · `sunday-reset` · Organization · 1 day

Day, with minutes: O9 Review Your Calendar for the Next 7 Days + O2 Do a 15-Minute Room Reset (25)

- It is one day long.
- Plans are runs of days and aren't tied to weekdays, so a "Sunday" plan can't be made to land on a Sunday.
- Get Organized already covers it. So do the planner's weekly planning missions (S12, M3, O9), which are due Sunday to Tuesday.
- The new length rule would fail it.

---

## 9. Validator rules

### Current rules

These are in `scripts/validate-content.mjs`, in the programs section, at `acea784`.

**The plan itself**
- The id is lowercase words joined by hyphens, and unique.
- The title is 1–24 characters, and the short line is 1–90.
- Its areas are known areas, and `free` is true or false.

**Each day**
- There is one entry per day, with 1–2 missions.
- Every mission is approved, known and active.
- No mission needs anything but school. So C2, which needs a job search, can't be in a plan.
- No mission appears twice in a day, and no two missions in a day share a group.
- A day can't be all morning-only missions. No approved mission is morning-only.
- A warning, not an error: a day whose missions are all tied to weekdays, or a niche mission.

**Across plans**
- At least two plans are free.

### Merged in this pass (9854d8d)

P1-12, approved and in `scripts/validate-content.mjs`:
1. No two plans have the same day lists.
2. Overlap with any other plan is under 0.8.
3. A plan runs 5 to 14 days.

### The conflict to resolve

- As written, rule 2 fails 14 Day Lock In, whose overlap with 7 Day Lock In is 1.00.
- **Recommended carve-out:** the rule skips a pair of plans in the same area when one is at least twice as long as the other. That allows a longer run of the same plan and nothing else.
- **Alternative:** an explicit `extends: "lock-in-7"` field on the longer plan. It is clearer, but it changes the content schema and the `Program` type.
- The carve-out ships in the same change that adds 14 Day Lock In.

### How every plan fares

| Plan | Current rules | Same day lists | Overlap under 0.8 | 5–14 days |
|---|---|---|---|---|
| The 6 existing plans | Pass | Pass | Pass (highest 0.40) | Pass |
| Exam Week, Assignment Catch-Up, Back Into Training, Portfolio Week, Launch Week, Skill Week | Pass | Pass | Pass (highest 0.73, Exam Week) | Pass |
| 14 Day Lock In | Pass | Pass | Fails at 1.00; passes with the carve-out | Pass |
| Money Reset, Resume Week, Interview Week, Creator Week | Pass | Pass | Pass (highest 0.57, Resume Week and Interview Week) | Pass |
| Deep Work Week | Pass | Pass | Pass (0.67) | Pass |
| Ship Something | Pass | Fail | Fail (1.00) | Pass |
| Sunday Reset | Pass | Pass | Pass (0.40) | Fail (1 day) |

### An optional warning

This one isn't in the plan, so it is your choice.

**The rule:** warn when one mission is on more than half of a plan's days. It is a warning only, so it never blocks a build. It puts thin plans in front of a reviewer.

| Plan | Mission | Days |
|---|---|---|
| Money Reset | M1 | 4 of 5 |
| Resume Week | C1 | 4 of 5 |
| Interview Week | C5 and C11 | 3 of 5 each |
| Deep Work Week | D4 | 4 of 7 |
| 14 Day Lock In | D4 | 8 of 14 |

- No existing plan would be flagged. The highest today is 3 of 7.
- 14 Day Lock In would be flagged as a known exception: D4 is a 5-minute list beside the day's main mission.

### Tests

- Merged: every plan in `programs.json` finishes in exactly its number of days through the real planner, at every time choice, with one of its missions in each day (9854d8d), and every Plan mission of every day is in the plan (0b6b842). New plans are covered as soon as they're added.
- Merged: the validator passes the shipped plans and rejects a duplicate plan, a reshuffled one, and plans of 4 and 15 days, while the audit's Exam Week (0.73 overlap) passes.
- With PF-2: a fixture for the carve-out (14 Day Lock In passes, a same-area plan under twice as long still fails) and, if approved, the warning.

---

## 10. "five to fourteen days"

Three lines give the length today. Two say "five to seven days", and the Plans row on Today says "5–7". The launch plan (PF-2) lists only the first two.

| Where | Now | Proposed |
|---|---|---|
| `src/content/copy/programs.ts:9`, the Plans screen | "Guided runs of five to seven days. A day moves on when you prove one of its missions." | "Guided runs of five to fourteen days. A day moves on when you prove one of its missions." |
| `src/content/copy/platform.ts:55`, the You › Plans row | "Guided runs of five to seven days" | "Guided runs of five to fourteen days" |
| `src/content/copy/home.ts:74`, the Plans row at the bottom of Today when no plan runs (also its VoiceOver label) | "Guided 5–7 day runs" | "Guided 5–14 day runs" |

- Change these only if 14 Day Lock In ships. Without it, keep "five to seven days" and "5–7".
- **The paywall's plans line** (`platform.ts:120`):
  - It reads "All six plans, and new ones each season" today.
  - P1-11 changes it to "All {n} plans instead of two", dropping "and new ones each season" (decision 19).
  - The number helper spells out numbers up to six (`platform.ts:6-11`), so 13 plans reads "All 13 plans instead of two".

---

## 11. "About N min a day"

- **The line:** a new line on each plan card, under "7 days · Discipline". This is decision 4, the default.
- **N:** the median of the plan's daily minutes, counting plan missions only, rounded up to the nearest 5.
  - Only 14 Day Lock In needs the rounding. It has an even number of days, so its median falls between 30 and 35 (32.5). The line shows 35.
  - Rounding up never shows less time than the plan takes.

| Plan | Line |
|---|---|
| 7 Day Lock In | About 35 min a day |
| Get Organized | About 10 min a day |
| School Reset | About 30 min a day |
| Build Something | About 30 min a day |
| Fitness Reset | About 30 min a day |
| Business Week | About 30 min a day |
| Exam Week | About 35 min a day |
| Assignment Catch-Up | About 30 min a day |
| Back Into Training | About 30 min a day |
| Portfolio Week | About 35 min a day |
| Launch Week | About 30 min a day |
| Skill Week | About 30 min a day |
| 14 Day Lock In | About 35 min a day |

**Why it matters**
- Someone on a 15-minute day sees the real number before Start.
- Only Get Organized has most of its days within the 15-minute day's 20 minutes. Money Reset would too, but it is held.

**Option: show the longest day**
- When the longest day runs 15 minutes or more past N, add it: "About 30 min a day, up to 45".
- That applies to:
  - 7 Day Lock In (up to 50)
  - Get Organized (up to 25)
  - School Reset (up to 45)
  - Build Something (up to 50)
  - Back Into Training (up to 45)
  - Skill Week (up to 45)
- The default is the median only, as planned.

---

## 12. Plan ids are permanent

**The rule:** never rename a plan id, never reuse one, and never change a shipped plan's days.

**Where a plan id is saved**
- `program.id`: the running plan, in the saved state (`unsetld-v2`).
- `programId` on every mission proven as part of a plan (`core/complete.ts:56`). It lives in the Record, which the Keychain backup copies.
- From P1-8: each entry in `record.plansFinished`, and the moment key `plan:<id>:<finished>`, where `<finished>` is the finish date (`recordPlanFinish` and `planMomentKey` in `core/programs.ts`, added in Step 0).
- The analytics events `plan_started`, `plan_left`, `plan_completed` and `mission_proven` carry the id as a category. They ship dormant (P1-20).

**What breaks**

| Change | What the user sees |
|---|---|
| An id renamed or removed | A running plan stops without a word, because the store finds no plan for the saved id. Record entries keep an id that no longer points at a plan. |
| An id reused | Old Record entries and finishes count toward a different plan. This was avoided once: when an earlier build's Project Mode (`project-mode`) was replaced by Business Week, a different plan, Business Week got a new id and the old id was cleared (MISSIONS_SPEC §11). |
| A shipped plan's days edited | Someone in the middle of the plan sees the days shift under them. A plan that gets shorter shows as finished (`programFinished`). |

**So:**
- New plans are added to the end of `programs.json`. Existing entries aren't edited.
- A changed plan is a new plan with a new id.
- Held plans keep their proposed ids for when they ship. Rejected ids were never shipped and carry no data.
- A plan that has to stop being offered needs a retire path first. `legacy-missions.json` does this for missions, keeping retired missions readable. Plans have no retire path today.
- Titles and short lines can be corrected without breaking saved data. They are still founder-approved copy.

---

## 13. Decisions for you

| # | Decision | Default |
|---|---|---|
| 1 | Ship Exam Week, Assignment Catch-Up, Back Into Training, Portfolio Week, Launch Week, Skill Week and 14 Day Lock In, with the ids, titles and short lines above | Yes |
| 2 | All seven are UNSETLD+. 7 Day Lock In and Get Organized stay free | Yes |
| 3 | Launch Week rather than Creator Week | Launch Week |
| 4 | Hold Money Reset, Resume Week, Interview Week and Creator Week. Send the missions they need to the library review | Yes |
| 5 | Money Reset free or paid, once it ships | Paid; open |
| 6 | Resume Week and Interview Week for under-16s, once they ship | Decide when they ship |
| 7 | Reject Deep Work Week, Ship Something and Sunday Reset | Yes |
| 8 | The overlap carve-out: same area, and at least twice as long | Yes |
| 9 | The optional warning: one mission on more than half of a plan's days | Yes, as a warning only |
| 10 | "five to fourteen days" in all three lines ("5–14" on Today) | Yes, only with 14 Day Lock In |
| 11 | The card line: the median only, or with "up to M" | Median only |
| 12 | Write the id rule into MISSIONS_SPEC §11 | Yes |

### What changes in the app once you approve

This is PF-2, in Stream E, size M.

**Content and copy**
- Seven entries are added to the end of `programs.json`.
- The three length lines change to "five to fourteen days" ("5–14" on Today).
- The finish moment's number words already reach twenty (`copy/programs.ts`); nothing to change.

**Screens and checks**
- The "About N min a day" line goes on the plan cards (`PlansScreen.tsx`).
- The validator gets the carve-out, plus the warning if you approve it.

**Tests**
- Every plan finishes in its number of days.
- Each validator rule has a fixture that fails it.
- The copy passes the copy lint.

**What doesn't change**
- `missions.json` and the mission titles.
- The existing six plans.
