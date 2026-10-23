# Mission library audit

**Proposed — nothing is added to missions.json until approved.**

> **Where this stands (23 Oct 2026, after the launch pass merged).** Measured on `claude/charming-thompson-92eslx` at `0f68f79`, with the merged planner (day shapes, model J). This document changes no code, content or test. `missions.json` still holds exactly the 66 approved missions, and none of them is renamed, reworded or removed here. Source notes such as `audits/plus.md`, `decisions.md` and "plan §7" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan and every founder decision with its assumed default. The simulation harness for this audit is a working file too; its planning loop is the one in `src/core/__tests__/day-shape.sim.test.ts`.

This is the brief's Priority 7 (plan §7 item 1). It reports, for each of the eight areas, how many missions there are, what they look like, how much variety the planner can actually give from them at each time choice, and how often the same mission comes back over 7, 14 and 30 days. It then lists 30 proposed missions for your review, with the minutes, proof, points, frequency, near-twin group and safety note for each, and what each would change.

Sources:
- the brief, Priority 7 and the non-negotiable product rules;
- the launch plan, §7 item 1 and §6 decision 21 ("approve none until the library audit is reviewed");
- the UNSETLD+ audit (`audits/plus.md`), whose 5 candidate missions are included here (D10, C13, C14, C15, C16);
- [PLANS.md](PLANS.md), which holds Money Reset, Resume Week, Interview Week and Creator Week until new missions exist;
- the repo: `src/content/missions.json`, `src/core/missions.ts` (`generatePlan`, `DAY_SHAPE`), `src/core/safety.ts` (`checkText`), `scripts/validate-content.mjs`.

---

## 1. Summary

- **The four thin areas are thin in different ways.**
  - **Money (5 missions).** Four of the five are weekly or rarer. Only M1 (Track Everything You Spend Today, 5 min) can come back within a week, and nothing runs over 15 minutes. At 30 minutes and with an hour or more, M1 is 55–59% of all Money missions a user sees in a month (41% at 45 minutes), and in 72–100% of those setups it is at least half of them. With "Save money" as the weekly focus it is 50–60% at every time choice.
  - **Organization (5 missions).** Everything is 10–15 minutes, and two of the five (O1, O8) are near-twins. A user with Organization sees the whole library every month (4.9–5.0 different missions in 30 days at 30 minutes or more). Someone who picks only Money and Organization gets about 19 minutes on a 45-minute day and 28 minutes on an hour's day, because neither area has a longer mission. Not one of their 45-minute days falls inside the promised 40–55 minutes.
  - **Fitness (7 missions).** Nothing is shorter than 20 minutes. On a 15-minute day only F3 and F6 fit, and both are cardio. At 30 minutes the planner has to bend a rule for 42% of Fitness picks (the cardio near-twins run past four days in seven). A 17-year-old whose goal is "Build muscle" gets 20-minute cardio on almost every day of a 30-minute month, and the at-home workout once.
  - **Discipline (6 missions).** Nothing runs between 6 and 19 minutes. On a 15-minute day Discipline is D6 (Finish One Unfinished Task) 83% of the time: 1.6 different missions in 30 days. With "Improve my routine" as the focus, a 15-minute day alternates D6 with the 5-minute D4, so a third of those days come in under the promised 10 minutes.
- **The other four areas hold up.** School is the strongest (13 missions, 11–12.5 different in a month with an hour or more). Career, Skills and Projects run short of variety only at 15 and 30 minutes, where few of their missions fit.
- **30 proposals:** Money 7, Organization 6, Fitness 4, Discipline 4, Career 4, Skills 2, Projects 2 and School 1. The plus audit's 5 candidates are D10, C13, C14, C15 and C16. Every one passes `checkText(…, 'mission')` and the content validator: 96 missions, "Content OK", no warnings. None has face, body or voice proof, and none asks for a bank, card or account screen.
- **With all 30 (what-if, real planner), variety goes up in every area and the time promise gets better.**
  - Different missions in 30 days at 30 minutes: Money 5.0 → 9.6, Organization 4.9 → 9.1, Fitness 3.1 → 5.5, Discipline 4.5 → 7.4.
  - Days inside the promised minutes: 15 min 95.0% → 100%, 30 min 87.9% → 91.2%, 45 min 87.1% → 93.7%, and with an hour 81–88% → 87–94%.
  - Points a day move by less than one point either way.
- **One catch, and a fix to approve with it.**
  - The planner treats Money and Organization as all-short areas and gives their focused slot to another area. A single 20-minute-or-longer Money or Organization mission switches that off (`generatePlan`, `focusedIn`). With the Money and Organization proposals of 20 minutes or more (M8, M9, M12, O12, O13, O15), a "Save money" week at 45 minutes drops from 52.5% to 26.1% of days inside the band, and "Get my space in order" drops from 81.2% to 58.7%.
  - A one-line planner change fixes this in the what-if: an area keeps a focused slot only when it has a focused mission it can give that day. With it, those weeks reach 90.8% and 93.1%. On today's 66 missions the change moves 17 of 9,720 simulated persona days and leaves every time-promise figure the same to one decimal.
  - Recommended: approve those six missions only together with that change (decision 2).
- **One side effect to decide.** D9 and F12 are plan-the-week missions. On 15-minute days they double how often the one mission of the day is a weekly plan (14.8% → 25.9% of days). Recommended: hold both for now (decision 4).

---

## 2. How this was measured

**The engine.** The real `generatePlan` from `src/core/missions.ts` as merged, planned the way the store plans (`planInput`: `historyFrom` with the known-id filter, `learnFrom` and the hour of the day). Each setup plans 30 days from Monday 19 October 2026, and every planned mission is proven two hours after the plan is made. A second persona run proves only 70% of missions, so the swap-free "ignored" path is exercised too.

**Time choices (6).**
- 15, 30 and 45 minutes, at the default intensity. Below an hour, intensity changes nothing.
- An hour or more, at Start easy, Lock in and Push me.

**Setups (2,152 per library, 387,360 planned days).**
- **Grid:** every combination of two to four areas (154). Each runs on three installs that plan at 8 AM, 1 PM and 7 PM, with no goal (462).
- **Goals:** every combination with each of seven typed goals (1,078): "Improve my grades", "Build muscle", "Launch my clothing brand", "Save $1,000", "Get an internship", "Learn coding" and "Get organized".
- **Weekly focus:** for each area, every combination that includes it (63), with that area's focus set every week (504). The focuses are "Improve my routine", "Prepare for an exam", "Get back into training", "Save money", "Apply for jobs or internships", "Learn a skill", "Make progress on my project" and "Get my space in order".
- **Personas:** 18 profiles on three installs (54). Each runs twice, with all missions proven and with 70% proven. They cover the brief's A–E plus Money, Organization, Fitness and Discipline cases, for example "16, saving for a car: Money and Discipline, 'Save $2,000 this year'".

**What each measure means.**
- **Days with the area:** days in the first 7, 14 and 30 that include at least one mission from the area. Averaged over the setups that include the area.
- **Different missions:** how many of the area's missions appeared in the first 7, 14 and 30 days.
- **Most repeated:** in each setup, the area's most frequent mission over 30 days, with how many times it came and its share of the area's missions. The table names the mission that is most often on top across setups.
- **Effective missions:** what the month's mix is worth in equally used missions (inverse Simpson index). For example, 2.5 means the month feels like two or three missions on rotation, whatever the count.
- **Rule bent:** the share of the area's picks where the planner had to let something back in. That covers a cooldown, the shown-lately gap, a weekly mission inside its week, or four days in seven, either alone or counted with near-twins. These are the planner's last steps, used only when the area has nothing else left.
- **30-day ceiling:** the most mission slots an area's missions can fill in 30 days without bending a rule, counting only the missions that fit the time choice. It is a static count from each mission's frequency, cooldown and group.
- **Inside the band:** a day's planned minutes inside what the time choice promises. That is 10–20 at 15 minutes, 25–35 at 30, 40–55 at 45, 55–75 at Start easy, 60–80 at Lock in and 75–110 at Push me (the bands in `day-shape.sim.test.ts`). The baseline here matches that test's committed `MEASURED` figures to within a point.

**What-if libraries.** These are scratch copies only. Nothing was written to `missions.json`.
- **whatif:** the 66 missions plus the 30 proposals.
- **whatif-short:** the same, without the six Money and Organization proposals of 20 minutes or more (M8, M9, M12, O12, O13, O15).
- **whatif-fix:** the full set, run through a scratch copy of the planner with the one-line `focusedIn` change in §6.3.

**Checks on every proposal.**
- `checkText(…, 'mission')` from `src/core/safety.ts`, run on the title, the short line and the proof line, alone and together. The 66 approved missions were run the same way as a control.
- The real `scripts/validate-content.mjs`, run on a copy of the content with the proposals added to its approved list. That covers the voice rules, points by minutes, cooldown by frequency, proof and timer rules, tags and templates.
- The held plans, redrafted with the proposals (§7), run through the same validator's plan rules.

---

## 3. The library at a glance

| Area | Missions | Minutes (how many) | Proof | Frequency | Core habits | Near-twin groups | Can come back within 4 days |
|---|---|---|---|---|---|---|---|
| Discipline | 6 | 5×1, 20×1, 30×4 | photo 3, timer and photo 3 | high 3, medium 3 | D1, D2, D5 | deep-work (D1, D2, D5, all core); finish-it (D3, D6) | all 6 |
| School | 13 | 15×5, 20×3, 30×5 | photo 7, timer and photo 6 | high 8, medium 4, low 1 | S1, S5 | study-block (S1, S9, S11); recall (S2, S4, S10) | 12 |
| Fitness | 7 | 20×2, 30×3, 45×2 | photo 2, timer and photo 5 | high 7 | F1, F5 | workout (F1, F5 core; F7); cardio (F2, F3, F6, F8) | all 7 |
| Money | 5 | 5×1, 10×3, 15×1 | photo 5 (all written, never a bank or card screen) | high 1, low 4 | M1 | none | M1 only |
| Career | 10 | 15×4, 20×2, 30×4 | photo 9, timer and photo 1 | medium 6, low 4 | C2, C7 | portfolio (C4, C9) | 6 (C2 only with a job search) |
| Skills | 9 | 15×1, 20×2, 30×4, 45×2 | photo 6, timer and photo 2, before and after 1 | high 6, medium 3 | K1 | practice-block (K1, K3); lesson (K2, K9); make (K4, K6) | all 9 |
| Projects | 11 | 10×1, 15×1, 20×2, 30×7 | photo 8, before and after 2, timer and photo 1 | high 6, medium 4, low 1 | P1 | improve (P4, P11); draft (P7, P12) | 10 |
| Organization | 5 | 10×4, 15×1 | before and after 2, photo 3 | medium 4, low 1 | O2 | desk (O1, O8) | O1, O2, O5, O8 |

Cross-area groups: `planning` holds D4 and P6, and `planning-week` holds S12 and O9. Two missions from one group never share a day.

**30-day ceiling: what fits each time choice, and how many slots it can fill without bending a rule.**

The longest mission each time choice hands out in practice is 20 minutes at 15, 30 at 30 minutes (the 35-minute budget less the short slot's 5), 45 at 45 minutes, 30 at Start easy, 45 at Lock in and 60 at Push me. Ceilings for missions of 20 minutes or more are in brackets.

| Area | 15 min | 30 min and Start easy | 45 min, Lock in and Push me |
|---|---|---|---|
| Discipline | 2 missions, 20 (D4 and D6 only) | 6 missions, 58 (48) | 6 missions, 58 (48) |
| School | 8 missions, 78 | 13 missions, 131 (98) | 13 missions, 131 (98) |
| Fitness | 2 missions, 18 (F3 and F6, both cardio) | 5 missions, 36 (36) | 7 missions, 48 (48) |
| Money | 5 missions, 30 (M1 alone 18) | 5 missions, 30 (0) | 5 missions, 30 (0) |
| Career | 6 missions, 31 | 9 missions, 61 (45) | 9 missions, 61 (45) |
| Skills | 3 missions, 45 | 7 missions, 88 (73) | 9 missions, 104 (89) |
| Projects | 4 missions, 38 | 11 missions, 117 (102) | 11 missions, 117 (102) |
| Organization | 5 missions, 43 | 5 missions, 43 (0) | 5 missions, 43 (0) |

With the 30 proposals, those ceilings become:
- Discipline 48 / 63 / 63;
- Fitness 68 / 83 / 83;
- Money 64 / 67 / 67 (13 for 20 minutes or more);
- Organization 74 / 90 / 90 (19 for 20 minutes or more);
- Career 54 / 85 / 85;
- Skills 63 / 103 / 119;
- Projects 63 / 139 / 139;
- School 88 / 141 / 141.

---

## 4. Area by area

Each table covers every setup that includes the area: the grid and the goals together, 630 to 651 setups. The "Focus every week" column is the same area with its weekly focus set every week (63 setups). The last column is the what-if with all 30 proposals.

### 4.1 Money — 5 missions (depth area)

**Library.**

| ID | Title | Min | Frequency, cooldown | Notes |
|---|---|---|---|---|
| M1 | Track Everything You Spend Today | 5 | high, 1 day; core | evening |
| M2 | Review Your Spending From the Last 7 Days | 15 | low, 7 | |
| M3 | Make a Spending Plan for This Week | 10 | low, 7 | a plan for the week: Sunday to Tuesday |
| M5 | Check One Subscription or Recurring Charge | 10 | low, 30 | |
| M6 | Set One Savings Goal and Deadline | 10 | low, 45 | |

Every proof is written ("never a bank or card screen"; M5: "No account screenshots").

**Effective variety.**
- The same five missions fit at every time choice, because none is longer than 15 minutes.
- Without bending a rule, Money can fill 30 slots in 30 days, and M1 alone is 18 of them. M2 and M3 come once a week, M5 once a month and M6 once in 45 days.
- Money has no mission of 20 minutes or more, so it never holds a focused slot. The planner trades that slot to another area (`generatePlan`: "Money and Organization are all short missions").
- On a 30-minute day the short slot next to a 30-minute mission has 5 minutes, or 10 at most. M1 is Money's only 5-minute mission, so M1 takes that slot.

**Repetition.**

| Time | Days with Money, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 2.5 / 5.1 / 11.0 | 2.5 / 4.0 / 4.8 | M3, 4.0 (37%) | 3.7 | 0% | 5.0, M1 50% | 7.4, M10 22% |
| 30 min | 4.3 / 8.7 / 17.8 | 2.8 / 4.6 / 5.0 | M1, 10.1 (55%) | 2.7 | 1% | 5.0, M1 60% | 9.6, M8 29% |
| 45 min | 3.8 / 7.7 / 15.7 | 3.7 / 4.8 / 5.0 | M1, 6.8 (41%) | 3.5 | 0% | 5.0, M1 54% | 10.2, M8 25% |
| Hour, Start easy | 5.9 / 11.7 / 24.3 | 4.2 / 5.0 / 5.0 | M1, 14.3 (57%) | 2.6 | 6% | 5.0, M1 60% | 11.6, M8 21% |
| Hour, Lock in | 5.2 / 10.6 / 22.3 | 3.9 / 4.9 / 5.0 | M1, 12.7 (55%) | 2.7 | 6% | 5.0, M1 57% | 11.9, M8 22% |
| Hour, Push me | 6.3 / 12.4 / 25.8 | 4.6 / 5.0 / 5.0 | M1, 17.6 (59%) | 2.5 | 17% | 5.0, M1 59% | 12.0, M8 24% |

- At 15 minutes M1 comes less often (19% of Money's days). A one-mission day takes 10 minutes or more when it can, so Money's 15-minute days use up M2, M3, M5 and M6 first.
- With "Save money" as the focus at 15 minutes, half the days are M1 alone: a 5-minute day, under the promised 10.
- With an hour or more, M1 is half or more of Money's month in 85–100% of setups.

**What users see.**
- *16, saving for a car (Money and Discipline, "Save $2,000 this year"), 30 minutes:* Money on 26 of 30 days, 5 different missions, M1 17 times (65%). Proving only 70% gives the same picture: M1 63%. With the proposals: Money every day, 12 different missions, M1 8 times (27%).
- *21, Money and Organization, no goal:* the 45-minute day averages 19.4 minutes, and none of the 30 days falls inside 40–55. An hour's day averages about 28 minutes at Start easy and Lock in. With the proposals the 45-minute day averages 34.7 minutes, with 58% inside the band (66% with the planner change in §6.3). With an hour it is still short (28–42% inside). Two all-short areas need longer missions in both.

**Missing use cases.**
- **Anything longer than 15 minutes:** a monthly budget, a spending review by category, learning how money works.
- **A Money mission that can come back within days and isn't M1.** This includes one of 5 minutes for the 30-minute day's short slot.
- **Following up a savings goal.** M6 sets one every 45 days, and nothing checks on it.
- **Deciding before buying:** comparing prices, telling needs from wants.
- **Earning,** for users whose goal is to save but who have little coming in. This needs an age decision (decision 6).
- **A Plan:** Money is the only area with no Plan. Money Reset is held because M1 fills four of its five days ([PLANS.md](PLANS.md) §7).

**Proposed:** M7, M8, M9, M10, M11, M12, M13 (§5).

### 4.2 Organization — 5 missions (depth area)

**Library.**

| ID | Title | Min | Frequency, cooldown | Notes |
|---|---|---|---|---|
| O1 | Clear Your Desk | 10 | medium, 3 | desk group with O8; before and after |
| O2 | Do a 15-Minute Room Reset | 15 | medium, 3; core | before and after |
| O5 | Pack Everything You Need for Tomorrow | 10 | medium, 3 | evening |
| O8 | Reset Your Workspace for Tomorrow | 10 | medium, 3 | evening; desk group with O1 |
| O9 | Review Your Calendar for the Next 7 Days | 10 | low, 7 | a plan for the week: Sunday to Tuesday |

**Effective variety.**
- Five missions, really four kinds, since O1 and O8 are the same desk.
- Without bending a rule they can fill 43 slots in 30 days, and none is 20 minutes or more.
- Like Money, Organization never holds a focused slot.

**Repetition.**

| Time | Days with Organization, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 2.3 / 4.9 / 10.4 | 2.3 / 3.5 / 4.2 | O9, 4.7 (48%) | 3.1 | 0% | 5.0, O2 32% | 5.2, O9 38% |
| 30 min | 3.5 / 7.3 / 16.7 | 3.2 / 4.5 / 4.9 | O2, 5.0 (31%) | 4.4 | 0% | 5.0, O2 30% | 9.1, O2 22% |
| 45 min | 3.5 / 7.2 / 16.4 | 3.3 / 4.6 / 5.0 | O2, 4.9 (30%) | 4.4 | 0% | 5.0, O2 29% | 8.5, O12 23% |
| Hour, Start easy | 6.3 / 12.0 / 26.1 | 4.7 / 5.0 / 5.0 | O2, 7.8 (29%) | 4.6 | 3% | 5.0, O2 28% | 10.4, O2 21% |
| Hour, Lock in | 5.8 / 11.2 / 24.0 | 4.3 / 4.9 / 5.0 | O2, 7.5 (31%) | 4.5 | 5% | 5.0, O2 30% | 10.8, O12 18% |
| Hour, Push me | 6.7 / 13.6 / 29.4 | 4.7 / 5.0 / 5.0 | O2, 9.5 (26%) | 4.7 | 19% | 5.0, O2 27% | 11.0, O12 19% |

- Organization's mix is even: no one mission dominates, and the most repeated is about 30%. The problem is that the whole library shows every month. By day 14 a user has seen almost all of it, and from then on every Organization day is a repeat.
- At 15 minutes O9 is half of Organization's days. The one-mission day gives Sunday to Tuesday to a plan for the week that is due, and Organization holds only about 10 days a month.
- With Push me, 19% of Organization's picks bend a rule. The area runs out.

**What users see.**
- *15, student, Organization, School and Discipline, "Get organized", 45 minutes:* Organization on 20 days, 5 missions, O2 6 times (32%). With the proposals: 20 days, 6.7 different on average, O12 the most (33%).
- *21, Money and Organization, no goal:* see 4.1. The time promise fails for this pair at 45 minutes and up.

**Missing use cases.**
- **Anything longer than 15 minutes:** a deeper clean of one space, sorting a closet.
- **Digital organization:** files, folders, a computer desktop.
- **Storage beyond the desk:** a drawer, a shelf, a backpack or bag.
- **Everyday chores that are plainly organization,** such as laundry.
- **Decluttering:** a bag of things to donate or throw out.
- **A paid Organization Plan.** Get Organized (free) uses O2 twice and both desk twins. Its days can't change mid-run, so it stays as it is.

**Proposed:** O10, O11, O12, O13, O14, O15 (§5).

### 4.3 Fitness — 7 missions (depth area)

**Library.**

| ID | Title | Min | Group | Notes |
|---|---|---|---|---|
| F1 | Complete Your Workout | 45 | workout (core) | photo |
| F2 | Walk for 30 Minutes | 30 | cardio | timer and photo |
| F3 | Do 20 Minutes of Cardio | 20 | cardio | timer and photo |
| F5 | Complete a 30-Minute At-Home Workout | 30 | workout (core) | timer and photo |
| F6 | Get Outside and Move for 20 Minutes | 20 | cardio | timer and photo |
| F7 | Complete Your Planned Strength Workout | 45 | workout | photo |
| F8 | Do Your Planned Cardio Today | 30 | cardio | timer and photo |

All are high frequency with a 1-day cooldown. Every proof is the place or the gear, "Not your body" or "Not your face".

**Effective variety.**
- On a 15-minute day only F3 and F6 fit. They are near-twins (cardio), so together they can fill at most 18 slots in 30 days.
- At 30 minutes and Start easy the longest mission is 30 minutes, so F1 and F7 are out. When Fitness holds the short slot it again has only F3 and F6.
- Fitness has no strength work under 30 minutes, nothing for mobility, and nothing for a sport, though goals name all three.

**Repetition.**

| Time | Days with Fitness, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 1.8 / 3.7 / 8.0 | 1.5 / 1.9 / 2.0 | F3, 4.6 (59%) | 1.9 | 0% | 2.0, F3 52% | 4.7, F12 46% |
| 30 min | 4.4 / 8.8 / 18.3 | 2.4 / 2.8 / 3.1 | F3, 8.7 (48%) | 2.6 | 42% | 3.3, F3 47% | 5.5, F10 31% |
| 45 min | 4.4 / 8.7 / 18.2 | 3.4 / 5.0 / 5.9 | F5, 6.2 (34%) | 4.4 | 5% | 6.1, F5 35% | 8.5, F5 23% |
| Hour, Start easy | 5.9 / 12.0 / 25.7 | 3.3 / 3.9 / 4.2 | F3, 11.0 (41%) | 3.2 | 39% | 4.7, F5 43% | 8.2, F5 23% |
| Hour, Lock in | 6.0 / 12.3 / 26.2 | 4.5 / 6.0 / 6.5 | F5, 8.6 (31%) | 4.9 | 10% | 5.9, F5 30% | 10.2, F5 21% |
| Hour, Push me | 7.0 / 14.0 / 29.9 | 5.3 / 6.6 / 6.9 | F5, 10.5 (29%) | 5.3 | 20% | 6.3, F5 25% | 10.9, F5 19% |

- At 30 minutes and Start easy, the planner bends a rule for about 4 in 10 Fitness picks. The short slot asks for 20 minutes or less, and the only Fitness missions that size are the two cardio twins, which then run past four days in seven.
- With the proposals, rule-bending at 30 minutes falls from 42% to 7%, and at Start easy from 39% to 0%.

**What users see.**
- *17, gym, Fitness and Discipline, "Build muscle", 30 minutes:* after the at-home workout on Day 1, the month alternates D6 + F6 and D4 + F3 (first install). Across three installs Fitness shows 3 different missions in 30 days, with F3 at 49%. Only half the days fall inside 25–35 minutes. With the proposals: 9 different Fitness missions, the most repeated (F6) 18%, and 94% of days inside the band.
- *14, team sport, Fitness and School, "Make the soccer team", 15 minutes:* Fitness on 13 days, 2 missions (F6 51%), and nothing about the sport. With the proposals: 15 days, 6 missions, F11 (sport skill) among them.

**Missing use cases.**
- **10–15-minute sessions:** a short strength set, a stretch.
- **Mobility and stretching.** The goal words "stretch", "flexibility" and "mobility" point at Fitness and match no mission.
- **Sport practice.** Sport goals match no mission today: the "sport" and "training" tags have nothing to land on.
- **Making the plan** that F7 and F8 assume ("Your Planned Strength Workout", "Your Planned Cardio").

**Proposed:** F9, F10, F11, F12 (§5).

### 4.4 Discipline — 6 missions (depth area)

**Library.**

| ID | Title | Min | Group | Notes |
|---|---|---|---|---|
| D1 | Lock In for 30 Minutes | 30 | deep-work (core) | timer |
| D2 | Do Your Most Important Task for 30 Minutes | 30 | deep-work (core) | timer |
| D3 | Finish One Thing You've Been Avoiding | 30 | finish-it | medium, 3 days |
| D4 | Plan Tomorrow's Top 3 | 5 | planning | medium, 3 days; evening |
| D5 | Work With Your Phone Away for 30 Minutes | 30 | deep-work (core) | timer |
| D6 | Finish One Unfinished Task | 20 | finish-it | medium, 3 days |

**Effective variety.**
- On a 15-minute day only D4 (5 minutes) and D6 (20) fit.
- A one-mission day takes 10 minutes or more when it can, so D6 carries the area, while D4 is all that is left on D6's off days.
- At 30 minutes the short slot next to a 30-minute mission has 5 minutes (10 at most), and D4 is the only Discipline mission that fits it.
- The three core 30-minute missions are one group, so a day never holds two of them.

**Repetition.**

| Time | Days with Discipline, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 2.1 / 4.0 / 8.0 | 1.5 / 1.6 / 1.6 | D6, 6.5 (83%) | 1.4 | 1% | 2.0, D4 50% | 3.9, D9 43% |
| 30 min | 4.8 / 9.2 / 19.6 | 2.9 / 3.8 / 4.5 | D6, 9.0 (45%) | 3.0 | 4% | 5.2, D4 32% | 7.4, D6 36% |
| 45 min | 4.9 / 9.3 / 19.9 | 3.9 / 4.9 / 5.2 | D3, 6.2 (32%) | 4.4 | 0% | 4.8, D2 29% | 7.4, D2 23% |
| Hour, Start easy | 5.7 / 11.1 / 24.1 | 4.5 / 5.2 / 5.5 | D6, 8.0 (31%) | 4.5 | 6% | 5.6, D1 29% | 7.6, D7 22% |
| Hour, Lock in | 6.0 / 11.8 / 25.5 | 4.9 / 5.9 / 6.0 | D1, 6.9 (26%) | 5.3 | 1% | 6.0, D5 29% | 9.7, D2 19% |
| Hour, Push me | 7.0 / 13.9 / 29.8 | 5.5 / 6.0 / 6.0 | D1, 8.8 (24%) | 5.5 | 5% | 6.0, D5 27% | 10.0, D1 17% |

- With "Improve my routine" as the focus at 15 minutes, half of Discipline's days are D4 alone: 5 minutes, under the promised 10. Only 66.7% of that week's days are inside the band. With the proposals, 100%.

**What users see.**
- *18, Discipline and Organization, "Stop procrastinating", 15 minutes:* Discipline on 13 days with 2 missions, D6 7 times (54%). With the proposals: 15 days, 4 missions, D7 (Lock In for 15 Minutes) the most repeated (30%).
- *16, Discipline, School and Fitness, "Spend less time on my phone", 30 minutes:* D6 is half of Discipline's 20 days. D5 (phone away) is the only phone mission, and at 30 minutes long it never fits the short slot.

**Missing use cases.**
- **A 10–15-minute focus session:** the 30-minute lock-in, shorter.
- **A second short "finish it" mission** that isn't 20 minutes.
- **A weekly review.** Discipline has no weekly mission.
- **A longer block than 30 minutes.** Deep Work Week was rejected for lack of one ([PLANS.md](PLANS.md) §8).

**Proposed:** D7, D8, D9, D10 (§5).

### 4.5 School — 13 missions

| Time | Days with School, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 2.8 / 5.3 / 11.2 | 2.8 / 4.2 / 5.9 | S12, 4.7 (44%) | 4.0 | 0% | 8.0, S12 20% | 5.8, S12 43% |
| 30 min | 4.5 / 8.7 / 18.2 | 4.0 / 5.8 / 7.3 | S15, 4.6 (25%) | 6.0 | 0% | 8.0, S15 24% | 7.0, S9 24% |
| 45 min | 4.6 / 9.0 / 19.0 | 4.1 / 6.8 / 9.4 | S1, 4.2 (22%) | 7.4 | 0% | 8.7, S15 23% | 9.9, S1 20% |
| Hour, Start easy | 5.9 / 11.9 / 25.6 | 5.6 / 9.1 / 11.0 | S1, 5.0 (18%) | 8.9 | 0% | 8.0, S9 29% | 11.8, S12 17% |
| Hour, Lock in | 6.0 / 12.2 / 26.1 | 5.6 / 9.0 / 11.7 | S1, 5.4 (20%) | 8.7 | 0% | 11.7, S9 18% | 12.3, S1 18% |
| Hour, Push me | 7.0 / 14.0 / 30.0 | 7.2 / 10.6 / 12.5 | S1, 6.9 (18%) | 9.4 | 0% | 11.9, S9 18% | 13.2, S1 18% |

- **Variety:** the healthiest area. It never bends a rule, and with an hour it uses almost the whole library each month. At 15 minutes, S12 (Create Your Study Plan for the Week) takes the Sunday-to-Tuesday days, as designed.
- **Missing use case:** a first step for writing assignments (an outline). This is optional.
- **Proposed:** S16 (§5, tier 3).

### 4.6 Career — 10 missions

| Time | Days with Career, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 1.8 / 3.6 / 7.9 | 1.7 / 3.4 / 5.5 | C3, 2.2 (28%) | 4.9 | 0% | 6.0, C3 36% | 5.9, C1 23% |
| 30 min | 3.9 / 7.9 / 16.7 | 3.5 / 5.4 / 6.6 | C11, 5.4 (32%) | 5.0 | 1% | 7.9, C3 31% | 8.6, C3 25% |
| 45 min | 4.1 / 8.3 / 17.7 | 3.7 / 6.2 / 8.1 | C7, 4.4 (25%) | 6.4 | 0% | 9.0, C2 27% | 10.7, C14 19% |
| Hour, Start easy | 6.0 / 12.0 / 25.4 | 5.3 / 7.7 / 8.7 | C3, 6.7 (24%) | 6.5 | 5% | 8.8, C3 24% | 12.3, C3 16% |
| Hour, Lock in | 6.1 / 12.4 / 26.4 | 5.4 / 8.4 / 9.1 | C7, 5.9 (21%) | 7.2 | 1% | 8.6, C2 23% | 12.7, C7 18% |
| Hour, Push me | 7.0 / 13.9 / 29.8 | 6.4 / 8.7 / 9.1 | C3, 7.6 (21%) | 7.0 | 3% | 8.9, C2 22% | 12.8, C7 18% |

- **Variety:**
  - Reasonable everywhere.
  - C2 (Apply to One Job or Internship) only comes with a job search in the goal or focus, which is why the focus column runs higher.
  - Four of the six missions that fit a 15-minute day are weekly or rarer.
- **Missing use cases:**
  - a first resume (Resume Week assumes one exists);
  - interview preparation beyond C5 and C11;
  - researching a company.
- **Proposed:** C13, C14, C15, C16, the plus audit's candidates (§5).

### 4.7 Skills — 9 missions

| Time | Days with Skills, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 1.6 / 3.4 / 7.6 | 1.5 / 2.5 / 3.0 | K3, 3.4 (46%) | 2.7 | 0% | 3.0, K3 40% | 4.2, K11 35% |
| 30 min | 3.9 / 8.0 / 17.1 | 2.6 / 3.2 / 3.8 | K5, 8.0 (48%) | 2.9 | 0% | 4.8, K3 38% | 5.0, K11 32% |
| 45 min | 4.0 / 8.1 / 17.4 | 3.4 / 5.3 / 6.9 | K1, 5.2 (30%) | 5.2 | 0% | 7.0, K1 31% | 8.6, K1 24% |
| Hour, Start easy | 6.1 / 12.3 / 26.2 | 4.1 / 5.3 / 6.3 | K5, 8.6 (31%) | 4.6 | 1% | 6.3, K1 32% | 8.2, K11 22% |
| Hour, Lock in | 6.2 / 12.5 / 26.8 | 4.7 / 6.8 / 8.2 | K1, 8.6 (31%) | 5.6 | 0% | 8.0, K1 26% | 10.2, K1 25% |
| Hour, Push me | 6.9 / 13.9 / 29.9 | 5.7 / 7.9 / 8.8 | K1, 10.1 (28%) | 6.1 | 0% | 8.3, K1 22% | 10.8, K1 26% |

- **Variety:** only K5 (15 minutes) is under 20, so a 30-minute day's short slot is K5 about half the time.
- **Missing use cases:**
  - a short practice session;
  - reading, since "read" and "books" in a goal point at Skills and match nothing.
- **Proposed:** K11, K12 (§5).

### 4.8 Projects — 11 missions

| Time | Days with Projects, 7 / 14 / 30 | Different missions, 7 / 14 / 30 | Most repeated in 30 days | Effective | Rule bent | Focus every week | With the proposals |
|---|---|---|---|---|---|---|---|
| 15 min | 1.9 / 3.8 / 8.3 | 1.7 / 2.3 / 2.5 | P10, 4.3 (53%) | 2.3 | 0% | 3.0, P11 45% | 3.8, P13 39% |
| 30 min | 4.1 / 8.3 / 18.5 | 3.4 / 4.3 / 5.4 | P10, 6.9 (37%) | 4.0 | 0% | 8.3, P11 38% | 5.5, P10 32% |
| 45 min | 4.1 / 8.3 / 18.3 | 3.7 / 6.4 / 8.6 | P1, 6.2 (30%) | 5.8 | 0% | 10.0, P1 17% | 9.7, P1 25% |
| Hour, Start easy | 6.2 / 12.2 / 26.3 | 5.0 / 6.8 / 8.4 | P11, 8.6 (30%) | 5.5 | 2% | 10.4, P1 17% | 10.2, P13 23% |
| Hour, Lock in | 6.4 / 12.5 / 26.9 | 5.7 / 8.5 / 10.3 | P1, 8.3 (28%) | 6.8 | 0% | 10.0, P2 18% | 11.9, P1 24% |
| Hour, Push me | 7.0 / 14.0 / 30.0 | 6.7 / 9.6 / 10.8 | P1, 9.9 (27%) | 7.1 | 1% | 10.1, P2 18% | 12.7, P1 25% |

- **Variety:** at 15 minutes Projects has P9 (weekly), P10 and P11 (a follow-up). P6 never stands alone. The result is that P10 (Publish Something You Made) is half of a 15-minute Projects month, which is a lot of publishing for a 13–15-year-old.
- **Missing use cases:**
  - a short work session;
  - creator work that makes or prepares something without publishing it (Creator Week is held for this).
- **Proposed:** P13, P14 (§5).

---

## 5. Proposals

**Proposed — nothing is added to missions.json until approved.** IDs are provisional. Each continues after its area's last approved ID and never reuses a gap (S8, S14, F4, M4, C6, C8, P8, K8, O3, O4, O6 and O7 are missions you turned down).

**Points** follow the library's minutes rule: 5–10 minutes earn 5, 15–20 earn 10, 25–45 earn 15 or 20. **Frequency** follows the validator: high means a 1–2 day cooldown, medium 3–4, and low (weekly or rarer) 7 or more. **Tier 1** fixes a measured gap; **tier 2** serves a Plan or a named use case; **tier 3** needs a policy decision first.

| ID | Title | Area | Min | Proof type | Pts | Frequency, cooldown | Near-twin group | Safety and privacy | Day shape or Plan it serves | Tier |
|---|---|---|---|---|---|---|---|---|---|---|
| D7 | Lock In for 15 Minutes | Discipline | 15 | Timer and photo | 10 | high, 1 | deep-work (with D1, D2, D5 core; D10) | Photo of the work after the timer; no person | 15-minute day; "Improve my routine" at 15 and 30 min | 1 |
| D8 | Finish 3 Small Tasks You've Been Putting Off | Discipline | 15 | Photo | 10 | medium, 3 | finish-it (with D3, D6) | A written list; nothing personal needed | 15- and 30-minute days; Assignment Catch-Up | 1 |
| D9 | Review Your Week and Plan the Next One | Discipline | 20 | Photo | 10 | low, 7 | planning-week (with S12, O9; never the same day) | Written | "Improve my routine"; 14 Day Lock In variety. See decision 4 | 2 |
| D10 | Lock In for 45 Minutes | Discipline | 45 | Timer and photo | 20 | medium, 3 | deep-work | "Phone out of reach"; no late-night or no-sleep wording | 45-minute day, Lock in, Push me; Deep Work Week (rejected today for lack of it) | 2 |
| F9 | Stretch for 10 Minutes | Fitness | 10 | Timer and photo | 5 | high, 1 | mobility (new) | "Without pushing into pain"; proof is the mat or space, "Not your body" | 15-minute day; 30-minute short slot; stretch and mobility goals | 1 |
| F10 | Do a 10-Minute Bodyweight Workout | Fitness | 10 | Timer and photo | 5 | high, 2 | workout (with F1, F5 core; F7) | "At a pace you can keep"; no counts, no targets; "Not your body" | 15- and 30-minute days; "Get back into training"; Back Into Training | 1 |
| F11 | Practice a Sport Skill for 15 Minutes | Fitness | 15 | Timer and photo | 10 | high, 1 | none | Gear or place only, "Not your face"; no contact drills named | 15-minute day; sport goals | 1 |
| F12 | Plan Your Workouts for the Week | Fitness | 10 | Photo | 5 | low, 7 | planning-week | Written; no body measures, weights or food | "Get back into training"; makes the plan F7 and F8 assume. See decision 4 | 2 |
| M7 | Compare Prices for Something You Plan to Buy | Money | 10 | Photo | 5 | medium, 4 | none | Written prices, "No account or card screens" | 15- and 30-minute days; Money Reset | 1 |
| M8 | Learn One Money Topic and Explain It in Your Own Words | Money | 20 | Photo | 10 | medium, 3 | none | Written; topics named are interest, taxes and budgeting, never investing or trading | 30-minute focused slot; "Save money"; Money Reset. With decision 2 | 1 |
| M9 | Make a Budget for the Next 30 Days | Money | 30 | Photo | 15 | low, 28 | none | "Written, never a bank or card screen" | 45-minute and hour days; Money Reset. With decision 2 | 1 |
| M10 | Check Your Progress on Your Savings Goal | Money | 10 | Photo | 5 | low, 7 | none | "Never a bank or card screen" | "Save money"; follows M6 | 2 |
| M11 | Sort Your Last 5 Purchases Into Needs and Wants | Money | 5 | Photo | 5 | medium, 4 | none | "Written, never a bank or card screen" | The 5-minute slot next to a 30-minute mission (only M1 fits it today); Money Reset | 1 |
| M12 | Go Through Last Month's Spending by Category | Money | 30 | Photo | 15 | low, 30 | none | "Written, never a bank or card screen" | Hour days. With decision 2 | 2 |
| M13 | List 3 Ways You Could Earn Money This Month | Money | 15 | Photo | 10 | low, 14 | none | Written. Examples are chores, tutoring and selling something you made; no apps, no strangers named. Age question, decision 6 | "Save money"; Money Reset (optional) | 3 |
| O10 | Organize One Drawer or Shelf | Organization | 15 | Before and after | 10 | medium, 3 | none | "Cover anything private" (drawers hold papers) | 15- and 30-minute days; "Get my space in order" | 1 |
| O11 | Clean Out Your Backpack or Bag | Organization | 10 | Before and after | 5 | medium, 4 | none (near O5 in subject, not in task) | "Cover anything private" | 15- and 30-minute days | 2 |
| O12 | Sort the Files on Your Computer for 30 Minutes | Organization | 30 | Timer and photo | 15 | medium, 4 | none | A screen of folders, "Cover anything private"; no accounts or messages | 45-minute and hour days (Organization's first focused mission). With decision 2 | 1 |
| O13 | Deep Clean One Space | Organization | 30 | Before and after | 15 | medium, 4 | none | A space, like O2's room proof; no cleaning products named | 45-minute and hour days. With decision 2 | 1 |
| O14 | Fold and Put Away Your Laundry | Organization | 15 | Before and after | 10 | medium, 3 | none | "Before and after of the laundry basket. No people in the photo" (not the clothes themselves) | 15- and 30-minute days | 2 |
| O15 | Fill One Bag With Things to Donate or Throw Out | Organization | 20 | Photo | 10 | low, 14 | none | The filled bag | 15–45-minute days. With decision 2 | 2 |
| C13 | Write the First Draft of Your Resume | Career | 30 | Photo | 15 | low, 30 | none | "With personal details covered" | Resume Week | 2 |
| C14 | Prepare 3 Questions to Ask in an Interview | Career | 10 | Photo | 5 | low, 7 | interview-prep (new, with C16) | Written | Interview Week | 2 |
| C15 | Research One Company Before You Apply | Career | 15 | Photo | 10 | medium, 3 | none | Notes from public information | Interview Week; Resume Week | 2 |
| C16 | Write One Interview Answer Using a Real Example | Career | 15 | Photo | 10 | medium, 4 | interview-prep | "Hide anything personal" | Interview Week | 2 |
| K11 | Practice Your Skill for 15 Minutes | Skills | 15 | Timer and photo | 10 | high, 1 | practice-block (with K1 core, K3) | What was practiced | 15-minute day; Skill Week; "Learn a skill" | 1 |
| K12 | Read a Book for 20 Minutes | Skills | 20 | Timer and photo | 10 | high, 1 | none | The page reached; the book is the user's choice | Reading goals; 15- and 30-minute days | 2 |
| P13 | Work on Your Project for 15 Minutes | Projects | 15 | Timer and photo | 10 | high, 1 | build-block (with P1 core) | What was worked on | 15-minute day; Build Something, Launch Week | 1 |
| P14 | Plan Your Next Piece of Content | Projects | 15 | Photo | 10 | medium, 3 | none (tagged planning) | Written plan; nothing is posted | Creator Week | 2 |
| S16 | Outline One Essay or Report | School | 20 | Photo | 10 | medium, 3 | none | "Hide your name" | Assignment Catch-Up | 3 |

**Exact wording for review.** These are the lines that would go into the library (`scripts/missions/library.py`, which writes `missions.json`). The short line is one sentence under 120 characters, and the proof line is under 90.

| ID | Short | Proof | Tags |
|---|---|---|---|
| D7 | Set a timer for 15 minutes and work on one important thing without stopping. | What you worked on, after the timer. | discipline, focus, habits, routine |
| D8 | Pick three quick tasks you keep pushing back and finish all three. | Your list of three, each one crossed off. | discipline, habits, focus |
| D9 | Write what got done this week, what didn't, and the three things that matter most next week. | Your written review and plan. | discipline, planning, routine, habits |
| D10 | Spend 45 uninterrupted minutes on one important task, with your phone out of reach. | What you worked on, after the timer. | discipline, focus, habits |
| F9 | Stretch the main muscle groups slowly for 10 minutes, without pushing into pain. | Your mat or the space you used, after the timer. Not your body. | fitness, stretch, mobility |
| F10 | Do squats, push-ups, lunges or other bodyweight exercises you know, at a pace you can keep. | Your workout space, after the timer. Not your body. | fitness, workout, home, strength |
| F11 | Pick one skill from a sport or activity you do, like passing, footwork or jump rope, and practice it for 15 minutes. | Your ball, gear or where you practiced, after the timer. Not your face. | fitness, sport, training, practice |
| F12 | Write which days you will train this week and what you will do on each one. | Your written plan. | fitness, planning, workout, training |
| M7 | Find the same item in three places and write down the prices before you decide. | Your written prices. No account or card screens. | money, spending, budget, save |
| M8 | Read about one topic like interest, taxes or budgeting, then write a short explanation from memory. | Your written explanation. | money, learn, budget, save |
| M9 | Write what you expect to get and spend over the next 30 days, and how much you will save. | Your written budget. Written, never a bank or card screen. | money, budget, planning, save |
| M10 | Write how much you have saved so far and how much is left to reach your goal. | Your written amounts. Never a bank or card screen. | money, save, savings, goal |
| M11 | Write down the last five things you bought and mark each one as a need or a want. | Your list, each one marked. Written, never a bank or card screen. | money, spending, budget |
| M12 | Add up what you spent last month in each category and write the one you want to cut. | Your totals by category. Written, never a bank or card screen. | money, spending, budget |
| M13 | Write three realistic ways to earn money this month, like chores, tutoring or selling something you made. | Your list of three. | money, earn, save |
| O10 | Empty one drawer or shelf, throw out what you don't need, and put the rest back in order. | Before and after of the drawer or shelf. Cover anything private. | organization, organize, clean |
| O11 | Empty your bag, throw out the trash and put back only what you need. | Before and after of the bag. Cover anything private. | organization, clean, organize, school |
| O12 | Delete what you don't need and move the rest into clear folders for 30 minutes. | Your folders after the timer. Cover anything private. | organization, organize, digital |
| O13 | Pick one space, like your closet, a shelf or your desk area, and clean and sort all of it. | Before and after of the space. | organization, clean, organize, room |
| O14 | Fold your clean clothes and put every piece where it belongs. | Before and after of the laundry basket. No people in the photo. | organization, clean, room |
| O15 | Go through your things and fill one bag with what you no longer use. | The filled bag. | organization, declutter, clean |
| C13 | Write a one-page draft with your school, any work or volunteering, and your skills. | Your draft, with personal details covered. | career, resume, job, internship |
| C14 | Write three questions you would ask about the job, the team or what the first months look like. | Your three questions. | career, interview, job |
| C15 | Find out what one company does, who it serves and why you would want to work there. | Your notes on the company. | career, research, job, apply, internship |
| C16 | Pick a common question and write your answer around one real thing you did and how it turned out. | Your written answer. Hide anything personal. | career, interview, job |
| K11 | Set a timer for 15 minutes and practice the skill you are learning. | What you practiced, after the timer. | skills, practice, learn, skill |
| K12 | Read a book you chose for 20 minutes without your phone in reach. | The page you reached, after the timer. | skills, reading, learn |
| P13 | Set a timer for 15 minutes and move your project forward. | What you worked on, after the timer. | projects, build, project |
| P14 | Write the idea, the format and the first three steps for the next thing you will make. | Your written plan. | projects, content, planning, brand |
| S16 | Write the main point and the order of your sections for one essay or report you have due. | Your outline. Hide your name. | school, homework, assignment, writing |

**Other fields.**
- Every timed proposal has `timerMinutes` equal to its minutes.
- K11 and P13 are templates like their 30-minute versions: "Practice {skill} for 15 Minutes" and "Work on {project} for 15 Minutes". With nothing named, they read as the titles above.
- All are `source: "UNSETLD"`, `repeatable: true` and `active: true`, with no `requires`.
- None is a core habit. That keeps the core habits the approved ones and leaves `CORE_SHARE` as it is.

**Considered and left out.**
- **A no-spend day.** It can't be proven with a photo, and it reads as a challenge.
- **Selling or listing something online.** It means contact with strangers and listing screens.
- **Moving money into savings.** It needs a bank, and its proof would be a balance.
- **Cooking instead of buying food.** The launch pass removed the food keyword row, and food stays out of missions.
- **Waking up at a set time.** It is too close to sleep rules.
- **Clearing old photos from your phone.** The proof would be a photo of the gallery.
- **A 5-minute "write down one thing you didn't buy".** It is too close to M1.

---

## 6. What the proposals would change (what-if, real planner)

### 6.1 Variety

These figures are different missions in 30 days and the most repeated mission's share, averaged over the grid and goals setups that include the area. The first number is today; the second is with all 30 proposals.

| Area | 15 min | 30 min | 45 min | Hour, Start easy | Hour, Lock in | Hour, Push me |
|---|---|---|---|---|---|---|
| Money | 4.8 → 7.4 · 37% → 22% | 5.0 → 9.6 · 55% → 29% | 5.0 → 10.2 · 41% → 25% | 5.0 → 11.6 · 57% → 21% | 5.0 → 11.9 · 55% → 22% | 5.0 → 12.0 · 59% → 24% |
| Organization | 4.2 → 5.2 · 48% → 38% | 4.9 → 9.1 · 31% → 22% | 5.0 → 8.5 · 30% → 23% | 5.0 → 10.4 · 29% → 21% | 5.0 → 10.8 · 31% → 18% | 5.0 → 11.0 · 26% → 19% |
| Fitness | 2.0 → 4.7 · 59% → 46% | 3.1 → 5.5 · 48% → 31% | 5.9 → 8.5 · 34% → 23% | 4.2 → 8.2 · 41% → 23% | 6.5 → 10.2 · 31% → 21% | 6.9 → 10.9 · 29% → 19% |
| Discipline | 1.6 → 3.9 · 83% → 43% | 4.5 → 7.4 · 45% → 36% | 5.2 → 7.4 · 32% → 23% | 5.5 → 7.6 · 31% → 22% | 6.0 → 9.7 · 26% → 19% | 6.0 → 10.0 · 24% → 17% |
| School | 5.9 → 5.8 | 7.3 → 7.0 | 9.4 → 9.9 | 11.0 → 11.8 | 11.7 → 12.3 | 12.5 → 13.2 |
| Career | 5.5 → 5.9 | 6.6 → 8.6 | 8.1 → 10.7 | 8.7 → 12.3 | 9.1 → 12.7 | 9.1 → 12.8 |
| Skills | 3.0 → 4.2 | 3.8 → 5.0 | 6.9 → 8.6 | 6.3 → 8.2 | 8.2 → 10.2 | 8.8 → 10.8 |
| Projects | 2.5 → 3.8 | 5.4 → 5.5 | 8.6 → 9.7 | 8.4 → 10.2 | 10.3 → 11.9 | 10.8 → 12.7 |

- **Rule-bending.** It all but disappears: Fitness at 30 minutes falls from 42% to 7%, and Money and Organization at Push me from 17% and 19% to 2% and 0%.
- **The 70% proven persona runs** show the same direction. For example, for the Money-and-Discipline saver at 30 minutes, the most repeated Money mission goes from M1 at 63% to M8 at 31%.
- **What stays concentrated:**
  - **At 15 minutes,** a weekly plan is still the most repeated mission in Discipline, Fitness and Organization (D9, F12, O9). See 6.4.
  - **"Improve my routine" week at 30 minutes:** Fitness holds only the short slot next to Discipline's 30 minutes, which leaves 10 minutes or less. F9 (Stretch for 10 Minutes) is then 40% of Fitness's days (today F6 is the most repeated, at 31%).
  - **Money at 30 minutes without decision 2:** with Money's focused proposals left out, Money holds only the short slot. That slot has 5 minutes next to a 30-minute mission, so M1 stays the most repeated (37%). For a Money, Career and Organization user it is 83% of Money's days. M11 (5 minutes) is the only other mission that fits that slot.

### 6.2 The time promise

The share of days inside the promised band, over the grid and goals setups weighted by setups, followed by the mean minutes a day.

| Library | 15 min | 30 min | 45 min | Hour, Start easy | Hour, Lock in | Hour, Push me |
|---|---|---|---|---|---|---|
| Today (66 missions) | 95.0% · 15.7 | 87.9% · 34.1 | 87.1% · 43.9 | 81.4% · 57.3 | 82.1% · 65.1 | 87.9% · 87.8 |
| All 30 proposals | 100% · 15.2 | 91.2% · 33.8 | 93.7% · 44.1 | 86.9% · 57.3 | 87.8% · 64.3 | 94.2% · 89.2 |
| Without the six 20+ minute Money and Organization ones | 100% · 14.9 | 93.7% · 33.3 | 91.5% · 43.7 | 82.5% · 56.4 | 81.3% · 63.6 | 82.9% · 85.0 |
| All 30, with the planner change (6.3) | 100% · 15.2 | 91.2% · 33.9 | 96.9% · 44.7 | 88.5% · 57.7 | 87.9% · 64.5 | 93.3% · 88.9 |

- **No day gets longer.** The longest day is 20, 40, 60, 70, 80 and 115 minutes at the six time choices today, and 20, 40, 55, 70, 80 and 105 with the proposals. Every one of the 30 proposals is 45 minutes or shorter.
- **Points a day from missions** move by less than one point: 8.8 → 8.6, 18.8 → 18.7, 22.9 → 22.9, 30.8 → 31.1, 34.2 → 33.9 and 45.8 → 46.5. The most a day can earn is unchanged, and UNSETLD+ is untouched.

**Weekly focus weeks, the share inside the band:**

| Weekly focus | Library | 15 min | 30 min | 45 min | Hour, Start easy | Hour, Lock in | Hour, Push me |
|---|---|---|---|---|---|---|---|
| Save money | Today | 66.7% | 97.8% | 52.5% | 67.5% | 66.0% | 77.2% |
| | All 30 | 100% | 87.0% | **26.1%** | **27.9%** | 75.2% | 94.6% |
| | Without the six | 96.7% | 98.5% | 73.0% | 68.9% | 62.3% | 70.4% |
| | All 30, with the change | 100% | 94.7% | 90.8% | 66.2% | 73.7% | 89.2% |
| Get my space in order | Today | 99.8% | 91.7% | 81.2% | 66.7% | 74.6% | 80.9% |
| | All 30 | 100% | 72.5% | **58.7%** | **60.3%** | 86.8% | 92.2% |
| | Without the six | 100% | 92.9% | 82.2% | 77.3% | 76.0% | 74.8% |
| | All 30, with the change | 100% | 71.6% | 93.1% | 93.3% | 85.1% | 92.2% |
| Improve my routine | Today | 66.7% | 55.5% | 95.2% | 84.2% | 85.3% | 92.5% |
| | All 30 | 100% | 53.2% | 99.7% | 92.9% | 89.9% | 95.5% |
| Get back into training | Today | 99.8% | 73.5% | 93.7% | 78.9% | 94.2% | 96.9% |
| | All 30 | 100% | 73.9% | 98.1% | 84.8% | 92.8% | 95.8% |

- **The bold cells are the catch.** Once Money or Organization has a 20-minute-or-longer mission, the planner stops trading its focused slot away. In a focus week the focus area then holds the focused slot most days. Most days it has nothing of 30 minutes free (M9 and M12 are monthly; O12 and O13 come every 4 days), so a 45-minute day falls back to a 20-minute mission and ends near 30 minutes.
- **"Get my space in order" at 30 minutes** runs over rather than under: about 3 days in 10 fall outside 25–35, mostly at 40 minutes (30 + 10). The planner change doesn't fix this (71.6%), because the focus can hold both slots. Without the long Organization missions it stays as today (92.9%). It would need its own small rule (a focus week's second mission keeps to what's left), which is not proposed here.
- **"Improve my routine" at 30 minutes** stays at about 53–56% with or without the proposals, because 30 + 10 days run over. That is a planner matter, not a library one.

### 6.3 The planner change that goes with the long Money and Organization missions

This is engineering, for a separate approval (decision 2). Nothing here changes the app.

In `generatePlan` (`src/core/missions.ts`), today:

```ts
const focusedIn = (t: TrackId) => input.library.some(m => m.active && serves(m, t) && fitsSlot(m, 'main'));
```

What the what-if ran:

```ts
const focusedIn = (t: TrackId) =>
  input.library.some(m => m.active && serves(m, t) && fitsSlot(m, 'main') && m.minutes >= shape.focusedMin && available(m, input));
```

- **What it does:** an area keeps a focused slot only when it has a focused mission it can give today, at the day's focused length (30 minutes on a 45-minute day) and free under its cooldown. Otherwise the slot goes to an area that has one, as Money's and Organization's do today.
- **On today's 66 missions:** it changes 17 of 9,720 simulated persona days, all on one install of one persona (Money, Career and Organization) at Push me. Every time-promise figure in 6.2 stays the same to one decimal.
- **With the proposals:** "Save money" at 45 minutes goes from 26.1% to 90.8% inside the band, and "Get my space in order" at 45 minutes from 58.7% to 93.1%. The 45-minute day overall goes from 93.7% to 96.9%. "Save money" at Start easy recovers to about today's level (66.2% against 67.5%).
- **If you approve it,** the committed day-shape simulation (`SIM_FULL=1`) is rerun and its `MEASURED` figures updated in the same change, as that file asks.

### 6.4 Plans for the week on 15-minute days

D9 and F12 are tagged `planning` and are weekly, which makes them plans for the week (`weekPlan`). On a one-mission day the planner gives Sunday to Tuesday to an area whose weekly plan is due, and takes that plan whenever it is due (the share is 1 on a one-mission day, against `WEEK_PLAN_SHARE`, 0.8, on longer days).

In the persona runs, the share of 15-minute days whose one mission is a plan for the week goes from 14.8% (S12, O9, M3) to 25.9% with all 30 proposals. D9 and F12 alone are 14.1% of days. At 30 minutes it goes from 11.0% to 19.9%.

With 15 minutes, F12 comes about 4 times a month, out of the roughly 10 days a month that hold Fitness at all: 4 of 10 Fitness days spent writing a plan rather than training. D9 does the same in Discipline. Recommended: hold D9 and F12 (decision 4). Two other ways out:
- approve them without the `planning` tag, so they come round like M2, a weekly mission with no pull to Sunday;
- or a planner rule that allows at most one plan for the week a week on one-mission days.

Neither was simulated.

---

## 7. Plans the proposals would let through

[PLANS.md](PLANS.md) holds four plans until new missions exist. Below, each is redrafted with the proposals so the repeats it was held for are gone. All four pass the content validator's plan rules (one or two missions a day, no two from one group, 5–14 days, no duplicate days, overlap with any other plan under 0.8), with the proposals counted as approved.

These are sketches for PLANS.md to pick up after approval. `programs.json` doesn't change, and plan IDs stay as PLANS.md set them.

| Plan | Days | Minutes a day | Points (a day) | Most repeated | New missions in it |
|---|---|---|---|---|---|
| Money Reset · Money · 5 days | M2 + M11 · M8 · M5 + M7 · M6 + M1 · M3 + M1 | 20 / 20 / 20 / 15 / 15 | 55 (11.0) | M1 ×2 (was ×4) | M11, M8, M7 |
| Resume Week · Career · 5 days | C13 · C10 + C1 · C9 + C15 · C3 + C1 · C12 | 30 / 30 / 30 / 35 / 30 | 90 (18.0) | C1 ×2 (was ×4) | C13, C15 |
| Interview Week · Career · 5 days | C15 + C14 · C5 · C16 + C11 · C10 + C1 · C5 | 25 / 20 / 30 / 30 / 20 | 75 (15.0) | C5 ×2 (C5 and C11 were ×3) | C15, C14, C16 |
| Creator Week · Projects · 7 days | P14 + P13 · P3 · P11 · P7 · P4 · P3 · P10 + P9 | 30 / 30 / 20 / 30 / 30 / 30 / 35 | 110 (15.7) | P3 ×2; P10 once (was twice) | P14, P13 |

- **Money Reset** still fits a 15-minute day on every day (15–20 minutes). If M9 is approved, a longer variant could put "Make a Budget for the Next 30 Days" on day 4.
- **Resume Week** now pays 18.0 points a day, under the free 7 Day Lock In's 18.6. PLANS.md's draft was 19.0 and flagged.
- **Deep Work Week** can be looked at again with D10 and D7 ([PLANS.md](PLANS.md) §8). It isn't redrafted here, because it would still lean on the free Lock In's missions.
- **Get Organized** (free) is not changed: editing a shipped plan's days moves users who are mid-run. A new Organization plan could use O10–O15.
- **Age:** PLANS.md asks whether Resume Week and Interview Week follow the under-16 rule of the "Apply for jobs or internships" focus. The same question applies to C13–C16 (decision 6).

---

## 8. Safety and privacy review

**Rule-based checks, run.**
- **`checkText(…, 'mission')`** (`src/core/safety.ts`, the same check users' own missions get): 30 of 30 come back `ok` on the title, the short line, the proof line and all three together. The 66 approved missions come back `ok` too (the control).
- **`scripts/validate-content.mjs`,** on a copy of the content with the 30 added: "Content OK", 96 missions, no errors and no warnings. That covers the banned words (no "grind", "level up", "journey", "unlock" and the rest), no "!", "…" or emoji, no swearing, the NEVER list (dieting, fasting, weigh-ins, substances, gambling, trading, dares) and the sensitive-word list. It also covers points by minutes, cooldown by frequency, a timer for every title that names a length of time, one-sentence short lines under 120 characters, proof lines under 90, and missions never mentioning points or UNSETLD.

**Product rules applied by hand.**
- **No face, body or voice proof.** Every Fitness proof is the place, the mat or the gear, with "Not your body" or "Not your face". No proposal asks for a recording.
- **No bank, card or account screens.** Every Money proof is written, with "never a bank or card screen" or "No account or card screens". M8 names interest, taxes and budgeting, never investing, stocks or crypto.
- **Personal details covered:**
  - "Cover anything private" on O10, O11 and O12, since drawers, bags and folders hold papers and names;
  - "with personal details covered" on C13;
  - "Hide anything personal" on C16;
  - "Hide your name" on S16;
  - O14's proof is the basket, not the clothes, with "No people in the photo".
- **Nothing extreme.** No counts, targets, weights, food or sleep. F9 says "without pushing into pain" and F10 "at a pace you can keep". D10's 45 minutes carry no late-night or no-sleep wording.
- **No contact with strangers.** Nothing asks the user to message, post, sell online or meet anyone. P14 plans content and publishes nothing. C15 uses public information.
- **Proofs stay private and on the phone,** as every proof does. Nothing here changes that.

**What the checks can't judge, and is for you.**
- M13 suggests "selling something you made". For a 13–15-year-old, selling can mean online listings and strangers. Decision 6.
- The Career proposals (C13–C16) are about jobs and interviews. The "Apply for jobs or internships" focus is hidden for under-16s. Decision 6.
- F11 assumes the user does a sport or activity. Someone who doesn't can swap it. If you prefer, it could be tagged `niche` (weight 0.3) so it comes up mostly for goals that name a sport. That wasn't simulated.

---

## 9. Founder decisions

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| 1 | Approve the short missions (5–15 minutes) for the thin areas: D7, D8, F9, F10, F11, M7, M10, M11, O10, O11, O14, K11, P13 | Approve | Approve a subset. Each was simulated only as part of the full set |
| 2 | Approve Money's and Organization's longer missions: M8, M9, M12, O12, O13, O15 | Approve together with the one-line planner change (6.3), in one release | Approve them without the change. Variety still improves, but "Save money" and "Get my space in order" weeks at 45 minutes and Start easy fall to 26–60% inside the band. Or hold them. Without them Money and Organization stay all-short, and a Money-and-Organization user's 45-minute day stays near 20 minutes |
| 3 | Approve the missions that let the held plans through: C13, C14, C15, C16 (the plus audit's) and P14, with D10 for a second look at Deep Work Week | Approve. Then PLANS.md picks up the redrafted days in §7 | Approve only the Career ones (Resume Week, Interview Week) |
| 4 | D9 and F12, the plans for the week | Hold. On 15-minute days they make one day in four a planning day (6.4) | Approve without the `planning` tag, or with a one-plan-a-week rule (engineering, not simulated) |
| 5 | K12 (Read a Book for 20 Minutes) and S16 (Outline One Essay or Report) | Approve K12. S16 optional | Hold both |
| 6 | Under-16s: M13 (earning), and C13–C16 with Resume Week and Interview Week | Hold M13. Keep C13–C16 for all ages like C1–C12 today, and decide the age question on the plans (PLANS.md decision 6). The validator doesn't let a plan use a mission with an age requirement, so `requires: ["age16"]` on C13–C16 would keep them out of both plans | Approve M13 without "selling", or for all ages; or age-gate C13–C16 and drop them from the plans |
| 7 | C16's near-twin C5 (Practice 5 Interview Questions) has no group | Leave C5 as it is. Adding a group to an approved mission changes its metadata, which is your call. C14 and C16 share `interview-prep` | Put C5 in `interview-prep` too |
| 8 | F11 for everyone, or tagged `niche` | For everyone (as simulated) | `niche`, weight 0.3: mostly for sport goals |
| 9 | Wording | As in §5. Titles follow the approved style: plain, title case, no slogans | Edit any line. Rerun `checkText` and the validator on the edit |

---

## 10. If you approve: what changes in the repo

None of this is done.

- **`scripts/missions/library.py`:** the approved proposals after each area's last ID, and its `APPROVED` list. Then run `python3 scripts/missions/library.py` to regenerate `src/content/missions.json`, which is never edited by hand.
- **`scripts/validate-content.mjs`:** `APPROVED`, `APPROVED_TITLES`, and `LOW` for the weekly or rarer ones.
- **Tests that pin the library or exact plans:**
  - `library.test.ts` and `whitelist.test.ts` ("exactly the 66");
  - the persona and rotation tests that pin plans;
  - `day-shape.sim.test.ts` `MEASURED` (rerun with `SIM_FULL=1`). For the full set, with or without the planner change, every inside-the-band figure in 6.2 is at or above today's and no day gets longer. Its other gates (weekly missions coming round, the goal's areas) were not measured here.
- **Optionally `FOCUS_LEAN`** in `core/personalize.ts`, to name new IDs for a focus (for example F10 for "Get back into training", M7 and M11 for "Save money"). The what-if didn't change it. The tags already lean the focus.
- **No store migration.** History is kept by mission ID, and new IDs simply start appearing. Plans made before the update keep their missions.
- **With decision 2:** the `focusedIn` line in `generatePlan` (6.3), and its test.

## 11. What this document does not change

- `missions.json`, `programs.json`, the validator, the planner and every test are unchanged.
- None of the 66 approved missions is renamed, reworded, regrouped or removed.
- No points rule, no UNSETLD+ benefit and no reward changes. Nothing here adds AI, generated missions, social features, public proof, or face or body proof.
