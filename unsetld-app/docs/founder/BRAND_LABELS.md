# Brand labels

**Proposed — not implemented. Needs founder approval.**

> **Where this stands (19 Oct 2026, after the launch pass merged).** None of the label system is built. What it builds on is merged: `record.plansFinished` written by the finishing proof, and the Plan moment ("Finished 18 Oct" / "7 DAY LOCK IN." / "Seven days. Each one proven.", 27cfee9). The barcode consolidation (`activeBarcode`) and `core/serial.ts` in this spec are not built either: they were kept out of the launch pass and belong to PF-4. Source notes such as `audits/*.md`, `audit/...`, `decisions.md` and "plan §6" refer to the launch pass's working files, which aren't in the repo: [../LAUNCH_PASS_PLAN.md](../LAUNCH_PASS_PLAN.md) carries the plan, what shipped and every founder decision with its assumed default.

This is the visual spec for PF-4: a small garment-label system on five surfaces, plus the Streak widget later. None of it is in the app. The launch pass does not build it (`decisions.md`: "PF-4 brand labels UI" and the "barcode/serial refactor" are documents only). No mission, title or store setting changes.

Sources:
- the brand audit (`audits/brand.md`, sections 1, 3A, 3B, 5, 6 and 7) and its string prototypes (`audit/brand/strings.json`, `audit/brand/serial.test.ts`);
- the launch plan: §6 decisions 14, 15 and 28, PF-4, P1-8 and the P2 brand items;
- the repo at `575e63b` (step 0): `src/ui/tokens.ts`, `src/ui/ProofStamp.tsx`, `src/core/typography.ts`, `src/core/programs.ts`, `src/core/types.ts`, `src/content/colorways.json`, `src/content/programs.json`, and the screens named below;
- example strings computed from the seeded `day7` and `day30` records the brand audit used, and from the repo fixture `src/state/__tests__/fixtures/v33-state.json` (which holds a finished Get Organized plan).

---

## 1. Summary

- One label system, borrowed from garment labels: small mono capitals, a hairline box or a bone woven tag, and only numbers from the user's own record.
- Five surfaces: Record, the share card, the Plan completion moment, milestone moments and the finished Plans card. The Streak widget comes later (P2).
- "No." always means a day on record. "No. 0029" is the 29th day with a proven mission.
- Labels never appear while a mission is being done. Today, mission cards, the mission screen, the timer, the camera, notifications and the paywall stay as they are.
- Excluded: collection and drop numbers, store data, random serials, points, percentages, membership marks, names and any user-written text.
- Everything a label shows can be computed from data the app keeps, except one optional field (`first`, the first proven day of a finished plan; section 12).
- Size M (1–3 days) for the five surfaces. The widget is a separate P2 item that needs device testing.

---

## 2. What already exists

The 2.x "catalogue" direction left a few label pieces in the build (brand audit §1). They stay as they are.

| Piece | Where | Today |
|---|---|---|
| ProofStamp | `src/ui/ProofStamp.tsx:15-51` | The woven label on every proof photo: bone background, ink mono text, mission label, time and date. Used in mission review and the proof viewer. |
| FIG. 01 | `copy.ts:12`, `NameScreen.tsx:115` | Mono caption under the walker on the brand intro. |
| 66 MISSIONS | `copy.ts:9`, `NameScreen.tsx:98` | Mono, top right of the brand intro. Replaced 2.x's "VOL. 001". |
| `catalogueNo()`, `milestoneNo()` | `src/core/typography.ts:41-49` | "No. 0412" and "007". Nothing calls them. |
| Colorway names | `src/content/colorways.json` | Ten colorways. Two names, Snow Wash and Sun Fade, are the garments' washes: unsetld.com sells a snow-washed polo and a sun-fade hoodie. The other eight are plain color names. |
| Activity barcode | Stats, the Streak widget, the Widget screen | Three separate implementations (`StatsScreen.tsx:30-40`, `widgets.ios.ts:375-386`, a hard-coded example at `WidgetScreen.tsx:44`). |

`DESIGN_SPEC.md:45-47` already names catalogue numbers, colorways cut from the washes, and "a record drawn like a garment-tag barcode". This proposal keeps that direction and makes every number real.

---

## 3. The brief's references: what is used

| Reference | Used? | How |
|---|---|---|
| Garment labels | Yes | The printed label (Record) and the woven label (Plan completion). The woven style is the existing ProofStamp. |
| Item IDs, serial marks | Yes, as real counts only | "No. 0029" is the user's 29th day on record. "PLAN 01" is their first finished plan. |
| Technical garment specs | Yes | Spec lines such as `PLAN 01 · 5 DAYS · ORGANIZATION` and `24 OF 28 DAYS · BLACK`. |
| Product tags | Yes | The share card's barcode block reads as a hang tag. |
| Care-label typography | Yes | Mono 10pt capitals. The Record's last line, `PROOF PHOTOS STAY ON THIS PHONE`, is its care instruction. |
| Editorial catalog spacing | Yes | On Record the label sits at the end of the page with `GAP.section` (40) above it. Elsewhere a label takes the place of an existing kicker or sits in the screen's existing spacing (section 7). |
| Collection numbering | No | It is the store's drop number. See section 9. |
| Washed textile texture | No new texture | The paid colorway plates keep their washes. Black stays flat. |

---

## 4. The four rules

1. **Only on the label surfaces.** Record, the share card, the Plan completion moment, milestone moments and the finished Plans card. Later, the Streak widget. Nowhere else (section 8).
2. **At most one label per screen.** A label is one boxed label, or one line in tag type. The Plan moment therefore has a label and no tag-type kicker (section 7.3).
3. **Every number comes from the user's own record.** Days on record, dates, counts, the plan number and the colorway name. Never product names, collections, drops, prices, percentages, points, codes or URLs. Never a random or decorative number.
4. **Tag type is used only in labels, and VoiceOver reads a sentence.** Lines are written in capitals and never read letter by letter. Each label is one accessible element with its own sentence: "No. 0029" is read as "29 days on record".

Rule 4 covers the new `TYPE.tag` style only. Existing mono text outside labels stays as it is, for example ProofStamp, FIG. 01 and "66 MISSIONS" on the brand intro, "DAY N" in the Today header, the focus timer, the Stats barcode dates and the widget's points.

---

## 5. Type and the two label styles

### The `TYPE.tag` token

Added to `TYPE` in `src/ui/tokens.ts`, next to `mono` (11/14) and `mono.s` (10/13).

| Property | Value |
|---|---|
| Font | IBM Plex Mono 400 (`font.mono`) |
| Size / line height | 10 / 14 |
| Letter spacing | 1.2 |
| Case | Written in capitals in the copy file, not transformed. This keeps "No." as `catalogueNo()` writes it. |
| Figures | Tabular |
| Text size | `maxFontSizeMultiplier` 1.3 |
| Separators | " · " between fields, " – " (spaced en dash) in date ranges. No full stops except in "No." |

### Printed and woven

| | Printed | Woven |
|---|---|---|
| Looks like | A label printed inside a garment | A woven tag sewn in |
| Background | None (the page) | `bone` #EDE9E3 |
| Text | `stone` #8F8A83 | `ink` #0A0A0A |
| Edge | Hairline in `ruleStrong` #3A3633 | None |
| Padding | 10 horizontal, 8 vertical | 8 × 4 for one line (as ProofStamp), 8 × 6 for two or three |
| Corners | 0 | 0 |
| Lines | 1 to 3 | 1 to 3 |
| Used on | Record | Plan completion moment (and the existing ProofStamp) |

Tag-type lines with no box (milestone kicker, Plans card, share card, widget) use the printed text color for the surface: `stone` on ink, `secondary` on a colorway.

### Contrast

Computed from the token and colorway hex values. Small text needs 4.5:1.

| Pair | Ratio | Note |
|---|---|---|
| `stone` on `ink` (printed label, kickers) | 5.78:1 | Passes |
| `stone` on `card` #151413 (Plans card kicker) | 5.37:1 | Passes |
| `ink` on `bone` (woven label) | 16.37:1 | Passes |
| `ruleStrong` hairline on `ink` | 1.65:1 | Decorative. The text carries the content. |
| Colorway `secondary` on its `bg` (share card caption) | 5.17:1 (Concrete) to 9.48:1 (Sun Fade) | All 10 colorways pass |

The colorway figures use the flat `bg` (and `bgEnd` for gradients). The plates add texture, so the captured card should be checked on a device. The red today bar is covered in section 10.

### The 32-character line cap

- Every label line is 32 characters or fewer, counted on the written string. A test enforces it.
- Why 32: at 130% text size each character is about 9.4pt wide (brand audit). 32 characters need about 301pt.
- On a 390pt-wide iPhone the content width is 334pt (390 − 2 × 28). Inside the printed label's padding that leaves 314pt, so 32 characters fit.
- On a 375pt-wide iPhone such as an SE the content width is 319pt and the inside is 299pt, about 2pt short at 130%. Each line therefore gets `numberOfLines={1}` and `adjustsFontSizeToFit` with `minimumFontScale` 0.9. It never truncates and never wraps.
- Where a variable part could pass 32, the line drops its least important field (section 7.3).

---

## 6. Components and functions

### `src/ui/Tag.tsx` (new)

```ts
<Tag lines={string[]} a11y={string} variant="printed" | "woven" | "line" />
```

- `lines`: 1 to 3 lines, each 32 characters or fewer. More than 3 is a development error.
- `a11y`: the VoiceOver sentence. The tag is one element (`accessible`) with this label. The lines themselves are never read.
- `line`: tag type with no box, for kickers.

### `src/core/serial.ts` (new, pure)

| Function | Returns |
|---|---|
| `dayNo(n)` | "No. 0029". Reuses `catalogueNo()`. |
| `planNo(n)` | "PLAN 01". Two digits, growing past 99: "PLAN 100". |
| `tagDate(day)` | "8 OCT 2026". Always with the year. No leading zero on the day. |
| `tagRange(a, b)` | "5 OCT – 9 OCT 2026" in one year, "28 DEC 2026 – 3 JAN 2027" across two. |
| `saidDate(day)`, `saidRange(a, b)` | "8 October 2026", "5 to 9 October 2026". |
| `saidDays(n)` | "29 days on record", "1 day on record". |

### One barcode

`activeBarcode(active, covered, day, n)` in core returns the string the widget already uses: `o` proven, `t` today proven, `p` today not yet, `c` an Off Day covered it, `-` missed, a space before the first day. Stats, the widget, the Widget screen example and the share card all read it. The dead 2.x `barcode`, `barcodeGeometry` and `week` in `core/record.ts` go.

The day30 seed gives `o-ooooooocoooooooooooocoooct`. The day7 seed gives 21 spaces, then `oooo-ot`.

---

## 7. Surfaces

### 7.1 Record

**Where:** the last item on the Record tab, `GAP.section` (40) below the last link row (`RecordScreen.tsx:227-234`): Stats, Achievements and, while rewards are off and the user has points (the launch default), "How points work". Hidden on Day 1, so the Record still shows no zeros before the first proof.

**Style:** printed, 3 lines.

| Line | Source | day30 seed | Fixture (one plan finished) |
|---|---|---|---|
| 1 | `UNSETLD RECORD · ` + `dayNo(days on record)` | `UNSETLD RECORD · No. 0029` | `UNSETLD RECORD · No. 0009` |
| 2 | `SINCE ` + first proven day, then ` · N PLAN(S)` only when at least one plan is finished | `SINCE 25 SEP 2026` | `SINCE 5 OCT 2026 · 1 PLAN` |
| 3 | Fixed | `PROOF PHOTOS STAY ON THIS PHONE` | `PROOF PHOTOS STAY ON THIS PHONE` |

- "Days on record" is `recordSummary(record).days`, the same number as the Record's own line "29 days on record". Today's DAY N is one higher until today's first proof (`HomeScreen.tsx:254`; the share card's DAY N is the same, `ShareScreen.tsx:48`), then the same.
- Line 3 follows the app's existing wording ("Your missions, proof photos and points stay on this phone", `copy.ts:27`). It avoids "never leave", which the app avoids on purpose because photos can be in the user's own iPhone backup (`copy/platform.ts:85`).
- The longest line 2 a real record can produce is about 28 characters (`SINCE 28 SEP 2026 · 12 PLANS`).

```
  Stats                                    >
  Achievements                      5 of 8 >
  How points work             1,010 points >

  +---------------------------------+
  | UNSETLD RECORD · No. 0029       |
  | SINCE 25 SEP 2026               |
  | PROOF PHOTOS STAY ON THIS PHONE |
  +---------------------------------+
                         hairline box, stone text
```

**VoiceOver:** "Record label. 29 days on record, since 25 September 2026. Proof photos stay on this phone." With a finished plan: "… since 5 October 2026. 1 plan finished. Proof photos stay on this phone."

### 7.2 Share card

**Today** (`ShareScreen.tsx:116-163`): `UNSETLD` at the top; `DAY N` in the serif; the TODAY, DAY STREAK and POINTS EARNED rows, each left out at zero; `NEVER SETTLE FOR LESS.` at the bottom. Captured at 1080 × 1920. All sizes below are in u, the card width divided by 100.

**Change:** one new block, the hang tag, between the rows and the closing line. The block and the closing line form one bottom group, so the card keeps its three parts (top, middle, bottom, spaced apart as now). Because the bottom group is taller, the DAY N block sits a little higher; nothing else changes. The brand audit put the date top right; here it sits in the block, so the card carries one label.

| Part | Spec |
|---|---|
| Barcode | 28 slots, the last 28 days ending today. Bars 1.4u wide with 1.0u gaps: 66.2u in all, inside the card's 82u content width. Bottom-aligned. |
| Bar heights | Proven 7u. Off Day 3.5u. Missed 1.2u. Today not yet proven 1.2u. Empty slot before the first day. Close to the widget's proportions (18, 9 and 3pt; exact would be 7, 3.5 and 1.17u). |
| Bar colors | Proven: colorway `ink`. Off Day and missed: colorway `secondary`. Today: `signal` red, as on the widget and Stats (but see section 10). |
| Caption line 1 | 1.6u below the bars. Mono 2.4u, letter spacing 0.12em, colorway `secondary`. Proven days in the window, the days the window covers since the first proof, and the colorway name. |
| Caption line 2 | Today's date, same style. |
| Closing line | `NEVER SETTLE FOR LESS.`, unchanged, now 5u below the caption in the same bottom group. |

Examples:
- day30 seed (Black, its last day 27 Oct 2026): `24 OF 28 DAYS · BLACK` / `27 OCT 2026`.
- day7 seed: the bars start 21 slots in, and the caption reads `6 OF 7 DAYS · BLACK`.
- The longest colorway name gives `28 OF 28 DAYS · SNOW WASH` (25 characters).
- Today not yet proven is not counted, so the caption never claims a day that hasn't happened.

```
+------------------------------------+
| UNSETLD                            |
|                                    |
|                                    |
| DAY 29                             |
| 3 / 3    TODAY                     |
| 23       DAY STREAK                |
| 1,010    POINTS EARNED             |
|                                    |
|                                    |
| █▁███████▄████████████▄███▄█       |
| 24 OF 28 DAYS · BLACK              |
| 27 OCT 2026                        |
|                                    |
| NEVER SETTLE FOR LESS.             |
+------------------------------------+
  █ proven   ▄ Off Day   ▁ missed
  the last bar (today) is red
```

The day30 seed's top half is DAY 29, 3 / 3 today, a 23 day streak and 1,010 points earned. Those rows are unchanged.

**VoiceOver:** the card's existing sentence gains one sentence before "Never settle for less.": "Last 28 days: 24 proven." For the day7 seed: "Last 7 days: 6 proven." The colorway and the date are not read; the card's look already depends on the colorway and the user picked it.

### 7.3 Plan completion moment

P1-8 built the moment in this pass (merged, 27cfee9): `MomentScreen` with "7 DAY LOCK IN." / "Seven days. Each one proven." / "Never settle for less.", a kicker "Finished 18 Oct", no points, once per finish. PF-4 changes only its top and adds the label.

**Change:**
- The kicker "Finished 18 Oct" goes. Its date moves into the label, so the screen keeps one label (rule 2).
- A woven label sits 32pt below "Never settle for less.", and the Close button 40pt below the label.

| Line | Source | Fixture (Get Organized) | 7 Day Lock In |
|---|---|---|---|
| 1 | `planNo(place in plansFinished)` · plan days · the plan's first area | `PLAN 01 · 5 DAYS · ORGANIZATION` | `PLAN 01 · 7 DAYS · DISCIPLINE` |
| 2 | `tagRange(first day, finish day)` | `5 OCT – 9 OCT 2026` | `12 OCT – 18 OCT 2026` (brand audit example) |

- The plan number counts the user's own finishes, oldest first, across all plans. Finishing 7 Day Lock In again later is a new number. It is not a catalogue number for the plan.
- Days come from `programs.json` (`days`). The area is the first of the plan's `tracks`.
- If line 1 would pass 32 characters, the area is dropped: `PLAN 100 · 14 DAYS · ORGANIZATION` (33) becomes `PLAN 100 · 14 DAYS`. Today's six plans never reach it.
- Line 2 needs the plan's first day, which `PlanFinish` does not store yet (section 12). Without it, line 2 reads `FINISHED 9 OCT 2026`.
- The brand audit also had a third line, "11 MISSIONS PROVEN". It is left out: the fixture's plan days hold 6 plan missions and 9 proven missions in all, and one line can't say which it counts without being misread.

```
  x

  GET ORGANIZED.

  Five days. Each one proven.

  Never settle for less.

  +---------------------------------+
  | PLAN 01 · 5 DAYS · ORGANIZATION |
  | 5 OCT – 9 OCT 2026              |
  +---------------------------------+
           bone tag, ink text

  [            CLOSE            ]

               (walker)
```

**VoiceOver:** the moment reads as P1-8 sets it, "Get Organized, finished. Five days. Each one proven.", then the label: "Plan 1. 5 days, Organization. 5 to 9 October 2026."

### 7.4 Milestone moments

**Today:** a stone kicker "Reached 8 Oct" above the title (`MomentScreen.tsx:71-75`, `copy/progress.ts:335`).

**Change:** the kicker becomes one tag line: `dayNo(n) · tagDate(day)`, where n is that day's place among the user's active days. Stone, no box. Everything else stays.

| Moment | Seed | Reached | Kicker |
|---|---|---|---|
| 30 MISSIONS. | day30 | 8 Oct 2026, the 13th day on record | `No. 0013 · 8 OCT 2026` |
| 10 MISSIONS. | day30 | 29 Sep 2026, the 5th | `No. 0005 · 29 SEP 2026` |
| 10 MISSIONS. | day7 | 26 Oct 2026, the 5th | `No. 0005 · 26 OCT 2026` |
| FIRST MISSION. | day30 | 25 Sep 2026, the 1st | `No. 0001 · 25 SEP 2026` |

```
  x

  No. 0013 · 8 OCT 2026
  30 MISSIONS.

  Thirty proven. This is what you do now.

  Never settle for less.

  [            CLOSE            ]
```

When a milestone isn't reached (a stale link), no kicker shows, as now. The first-plan achievement (`plan-1`, approved in this pass) uses this kicker when reopened from Achievements.

**VoiceOver:** "Reached 8 October 2026, day 13 on record."

### 7.5 Plans card (finished)

**Today:** a stone kicker "Finished", the plan title, a full meter, "5 days, each one proven." and Clear (`PlansScreen.tsx:332-349`).

**Change:** the kicker becomes one tag line, `planNo · FINISHED · tagDate`. This also covers the P2 item "Finished 18 Oct on plan cards".

- Fixture: `PLAN 01 · FINISHED 9 OCT 2026` (29 characters). The longest possible is `PLAN 100 · FINISHED 28 SEP 2026` (31).

```
+-----------------------------------+
| PLAN 01 · FINISHED 9 OCT 2026     |
| Get Organized                     |
| ================================= |
| 5 days, each one proven.          |
| Clear                             |
+-----------------------------------+
```

**VoiceOver:** "Plan 1, finished 9 October 2026."

### 7.6 Streak widget, small size (P2, later)

- Under the barcode, 4pt below it: mono 9pt in the widget's `secondary`, `dayNo(days on record)`. day30 seed: `No. 0029`.
- It comes from a new optional `serial` prop. When the prop is missing nothing shows, so placed widgets keep working.
- The Next mission, Today and Lock Screen widgets don't change.
- Why later: the small widget is already full (label, points, a 52pt number, a unit line, 28 bars), and "No. 0029" next to a 23 day streak may read as a second streak. It needs a look on real devices first. VoiceOver: "29 days on record."

```
+--------------------+
| STREAK   1,010 PTS |
|                    |
| 23                 |
| days in a row      |
| █▁███████▄████...  |
| No. 0029           |
+--------------------+
```

---

## 8. Where labels never go

Mission execution stays quiet and functional. No new label, tag type or serial on:

- Today, its header, mission cards and the active-plan card;
- the mission screen, the focus timer, the camera and the proof review (ProofStamp stays exactly as it is);
- notifications and reminders;
- onboarding (FIG. 01 and "66 MISSIONS" stay; nothing is added);
- the paywall and You;
- the Next mission, Today and Lock Screen widgets.

---

## 9. What's excluded, and why

| Excluded | Why |
|---|---|
| Random or decorative serials ("No. 0412", "VOL. 001") | A number that means nothing is a fake. Every number on a label can be checked against the user's record. |
| Collection or drop numbers ("COLLECTION 004") | It's the store's drop number from remote config. The default `'004'` (`defaultCollection`, every platform) is hard-coded (`app.ts:39`) and tied to rewards, which are off at launch. It means nothing to someone who never buys, and it reads as a clothing ad. |
| Product names, SKUs, prices, codes, URLs, "SHOP", "DROP" | The brief: no turning surfaces into clothing ads, and the app stays useful without the clothing. |
| A season mark ("FW26") | It could be derived from the date with no config, but it records nothing the user did. Not recommended. |
| Points, percentages, levels | Labels record what happened, not a score. The share card's points row stays as it is, outside the label. |
| "UNSETLD+" or any membership mark | UNSETLD+ must not add status. Labels look the same for free and paid users. |
| Name, age, school, areas picked, goal text, custom mission titles | Teen privacy. The share card is a public image, and user-written text never goes on a label. |
| A scannable code (QR or a real product barcode) | The barcode is a picture of days. It encodes nothing and links nowhere. |
| New textures | The washes stay on the paid plates. Black stays flat. |

---

## 10. The share card is a public image

Once shared, the card can be seen by anyone. What the label block adds:

- **The 28-day barcode.** It shows which of the last 28 days had a proof. No times, missions, areas or photos. The DAY N and streak rows already say much of this.
- **The colorway name.** On a paid colorway it tells others the user has UNSETLD+. The card's background already shows the colorway, so the name adds little. Two names, Snow Wash and Sun Fade, are garment washes and work as a quiet brand reference; the other eight are plain color names. None names a product, price or link.
- **The date.** The day the card was made, which the person sharing it already knows.

**The red today bar.** Against each colorway's flat background, `signal` #C41E1E measures:

| 3:1 or more | Under 3:1 |
|---|---|
| Bone 4.89, Black 3.35, Midnight 3.24, Snow Wash 3.03 | Charcoal 2.85, Sun Fade 2.48, Plum 2.12–2.44, Coffee 2.06–2.39, Olive 1.81–2.14, Concrete 1.73 |

The bar is always the last one, so its position says "today" without the color. But on the six low-contrast colorways a proven today can look like a missing bar. The Streak widget has the same issue now.

- Plan default (decision 28): red on every colorway.
- Recommended refinement: red on the four colorways at 3:1 or more, and the colorway `ink` for today's bar on the other six.

---

## 11. VoiceOver sentences

| Surface | Shown | Read |
|---|---|---|
| Record | `UNSETLD RECORD · No. 0029` / `SINCE 25 SEP 2026` / `PROOF PHOTOS STAY ON THIS PHONE` | "Record label. 29 days on record, since 25 September 2026. Proof photos stay on this phone." |
| Record, with a plan | `… · 1 PLAN` | "… 1 plan finished. …" |
| Share card | Barcode, `24 OF 28 DAYS · BLACK`, `27 OCT 2026` | Adds "Last 28 days: 24 proven." to the card's sentence |
| Plan moment | `PLAN 01 · 5 DAYS · ORGANIZATION` / `5 OCT – 9 OCT 2026` | "Plan 1. 5 days, Organization. 5 to 9 October 2026." |
| Plan moment, no first day | `… / FINISHED 9 OCT 2026` | "Plan 1. 5 days, Organization. Finished 9 October 2026." |
| Milestone | `No. 0013 · 8 OCT 2026` | "Reached 8 October 2026, day 13 on record." |
| Plans card | `PLAN 01 · FINISHED 9 OCT 2026` | "Plan 1, finished 9 October 2026." |
| Streak widget (P2) | `No. 0029` | "29 days on record." |

Rules for the sentences: plain words, full month names, numbers as numerals, never "zero zero" or spelled-out letters. "UNSETLD" is left out of them because VoiceOver may spell it.

---

## 12. Data, migration and risks

- **No new data except one optional field.** Labels read days on record, active days, the Off Days covered, plan finishes, `programs.json` and the colorway.
- **`plansFinished`** arrived in step 0 (`575e63b`) as `{id, finished}`, written by `recordPlanFinish()`. At `575e63b` only `toV8` called it, to backfill a saved finished plan; P1-8 added the call in `completeMission` (merged, 27cfee9). Plans cleared before the v8 update can't be recovered (the v7 store, also 3.3, kept no list), so numbering starts with whatever the backfill finds.
- **Proposed: `PlanFinish.first?: DayKey`**, the plan's first proven day (`ProgramState.doneDays[0]`), written at finish. It is optional, so old records and Keychain backups load as they are and the label falls back to `FINISHED <date>`. If PF-4 lands before the first v8 build ships, `toV8` can fill it from the saved plan (the fixture has `doneDays` from 5 Oct) with no new store version. PF-4 is not in the launch pass, so if the launch build ships v8 first, plans finished in between keep the `FINISHED <date>` fallback unless a later migration fills `first` from a plan that is still saved.
- **`momentsShown`** keys are unchanged. The plan moment keeps P1-8's key `plan:<id>:<finished>`.
- **Widget (P2):** the `serial` prop is optional and widget kinds don't change, so placed widgets stay. Timelines are rewritten when the app comes to the foreground. The layout needs a device check.
- **Barcode consolidation** removes the 2.x code that only the "draws the barcode and week" case in `core.test.ts:59-68` calls; that case goes.

---

## 13. Tests

- `src/core/__tests__/serial.test.ts`: `dayNo`, `planNo` (including "PLAN 100"), `tagDate`, `tagRange` within a year and across 28 Dec–3 Jan, and each VoiceOver sentence.
- One barcode fixture shared by Stats, the widget and the share card: the day7 and day30 strings in section 6.
- `src/content/__tests__/brand-copy.test.ts`: every label line is 32 characters or fewer, written in capitals (except "No."), passes the validator's BANNED list, and contains no `!`, emoji, `%`, `$`, "+", "CODE", "SHOP", "DROP" or "COLLECTION".
- Plan label: number by place in `plansFinished`; the same plan finished twice gets PLAN 01 and PLAN 02; the area drops past 32 characters; the fallback without `first`.
- Record label: hidden on Day 1; the number equals the Record's "days on record"; " · 1 PLAN" only when a plan is finished.
- Share caption: today not yet proven isn't counted; a short record counts only the days since the first proof.
- Store: a v7 state with a finished plan gets `first` from the saved plan; a backup without `first` restores.

---

## 14. Effort and files

Size M (1–3 days) for the five surfaces, stream G (P1-8, which it builds on, is merged).

- New: `src/ui/Tag.tsx`, `src/core/serial.ts`, the barcode function in core, the label strings (a new `copy/tag.ts` or the existing copy files).
- Changed: `src/ui/tokens.ts`, `RecordScreen.tsx`, `ShareScreen.tsx` and `copy/share.ts`, `MomentScreen.tsx` and `copy/progress.ts` (the milestone kicker and its VoiceOver line, `:335-338`), `PlansScreen.tsx` and `copy/programs.ts`, `StatsScreen.tsx`, `services/widgets.ios.ts` (`barsFor`) and `WidgetScreen.tsx` (its example) for the one barcode only, `core/types.ts` and `core/programs.ts` (`first`), `state/store.ts` (`toV8` and the `recordPlanFinish` call in `completeMission`), `core/record.ts` (dead code) and `core/__tests__/core.test.ts`.
- P2 (the widget serial): `widgets/UnsetldRecord.tsx`, `services/widgets.ios.ts` (`serial` prop), `WidgetScreen.tsx`.
- Docs: the four rules and the token go into `DESIGN_SPEC.md` and `UX_REDESIGN.md`.

---

## 15. Decisions for you

| # | Decision | Default |
|---|---|---|
| 1 | Labels on Record, the share card, the Plan moment, milestone moments and the finished Plans card | Yes (decision 28) |
| 2 | "No." means a day on record | Yes (decision 28) |
| 3 | Season or collection mark: none, a date-based "FW26", or the store's "COLLECTION 004" | None (decision 28) |
| 4 | Share card shows the 28-day barcode, the colorway name and the date | Yes (decision 28 names the barcode and the colorway name; the date is added here, moved from the brand audit's top-right spot) |
| 5 | Red today bar on the share card | Red on the four colorways at 3:1 or more, colorway ink on the other six (refines decision 28) |
| 6 | Plan moment label style | Woven, the only bone label besides proof photos. The alternative is printed. |
| 7 | Add `first` to finished plans so the label shows a date range | Yes. Without it the label shows the finish date only. |
| 8 | The Record's care line | `PROOF PHOTOS STAY ON THIS PHONE` |
| 9 | Streak widget serial | Later (P2), after a look on real devices |

Once approved, PF-4 is built as specified here. Nothing changes in missions, mission titles, points or store metadata.
