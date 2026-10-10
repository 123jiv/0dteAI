# UNSETLD 3.1 — product design and UX pass

Status: the brief for the 3.1 redesign (10 Oct 2026). Where it disagrees with MISSIONS_SPEC.md on screens, layout or copy, this file wins; MISSIONS_SPEC.md still owns the mission model, the plan engine and proof.

## 0. What we're fixing

The app works, but it shows too much at once, puts zeros everywhere on day one, separates everything with hairlines, and spreads the core loop over a Home screen with its own bottom bar plus Progress, Programs, Rewards and Settings stacks. The redesign keeps every working system (missions, proof, points, streak, rewards, programs, migration, notifications, widgets) and changes how it's organised and how it looks.

Internal positioning (never pasted as-is into the UI): **UNSETLD — prove your progress.** Pick what you want to improve. Get three missions every day. Do the work. Prove it. Build your record. Earn rewards.

The product must be useful to someone who will never buy UNSETLD clothing. Rewards are a reward for progress, not the reason the app exists: no product promotion on Today, Progress or You; a user can spend minutes in the app without seeing apparel.

Principles:
1. **Progressive disclosure.** Show what matters now. Advanced numbers live one tap deeper (Stats). Day 1 shows the three missions, how each is proven, what each is worth, and the first reward — nothing else.
2. **Quiet.** Spacing, grouping and raised surfaces instead of rules. One kicker (spaced uppercase label) per card or section, not on every line.
3. **Serif for meaning, sans for utility.** Serif: screen titles, mission titles, important numbers. Sans/mono: descriptions, metadata, buttons, times, proof types, category labels.
4. **Proof is visible before you start.** Every mission row shows its proof method with an icon.
5. **No fake functionality.** If something needs a backend that doesn't exist, build the architecture, show nothing misleading, and say so in the changelog.

## 1. Information architecture

Bottom navigation, always on the four main screens: **Today · Progress · Rewards · You** (`@react-navigation/bottom-tabs`, custom `src/ui/TabBar.tsx`). The root native stack holds onboarding, `Main` (the tabs) and everything opened from a tab (those screens have no tab bar and a back arrow).

| Tab | What it is | Opens |
|---|---|---|
| Today (`Main › Today`) | The three missions, the next reward, the active plan, the weekly focus question, the weekly review card on Sundays | Mission, Plans, WeeklyFocus, WeeklyReview, Share |
| Progress (`Main › Progress`) | Streak, today, this week, your areas (levels) | ProofHistory, Achievements, Stats, Moment |
| Rewards (`Main › Rewards`) | Points, next reward, up next, status | AllRewards, RewardHistory, HowPoints, Status, Milestone, Account |
| You (`Main › You`) | Goals, profile, this week, reminders, membership, appearance, settings | Tracks/AboutYou/Pace/Goal (edit), Day, WeeklyFocus, Plans, Paywall, Widget, Account, Doc, DevTools |

Route names (src/navigation/types.ts): tabs `Today`, `Progress`, `Rewards`, `You` under `Main`; stack `Plans` (was Programs), `ProofHistory` (was ProofGallery), `Achievements`, `Stats`, `AllRewards`, `RewardHistory`, `HowPoints`, `Status`, `Share`, `WeeklyFocus`, `Goal` (onboarding + edit), plus the existing ones. From a tab, `navigation.navigate('Rewards')` reaches a sibling tab and `navigation.navigate('Plans')` a stack screen (`TabProps`). From a stack screen, reach a tab with `navigation.navigate('Main', { screen: 'Rewards' })`. There is no `Settings` route any more: Settings lives in You.

Moved: Programs → **Plans** (from Today's active-plan card and You; no longer in a bar). Colorway → You › Appearance (the sheet still opens over Today: `navigate('Today', { sheet: 'colorway', nonce })`). The access/drops note leaves Today. The paywall leaves onboarding (reached from You › Membership and from a limit, e.g. out of swaps).

## 2. Design system

Keep: black/ink, bone, the colorways on Today, Cormorant serif, Inter, IBM Plex Mono, square primary buttons, the 28pt margin.

New tokens (src/ui/tokens.ts): `color.card` (#151413, a raised surface on ink), `color.cardPressed`, `color.track` (empty meter), `radius.card` 12, `radius.meter` 2, `GAP` { tight 8, card 12, block 28, section 40 }. New text variants: `meta` (Inter 13, sentence case: "30 min · Timer + photo · +15 pts"), `kicker` (Inter Medium 11, 1.4 tracking, uppercase: one per card/section, e.g. "SCHOOL", "NEXT REWARD"), `stat` (serif 34: streak, points, level). Existing: `title.xl/l/m` (screen titles), `list`/`saved` (mission titles), `body`, `small`, `note`.

Blocks (src/ui/blocks.tsx): `Card` (raised surface, radius 12, padding 18, optional onPress), `Meter` (thin progress bar), `ProofMeta` (proof icons + "Timer + photo"), `LinkRow` (title, detail, value, chevron; no rule), `EmptyState` (title, one line, optional button), `StatBlock` (serif number + meta label), `SectionLabel` (kicker above a block). Icons (src/ui/icons.tsx): `camera`, `timer`, `before-after`, `check`, `tab-*`. Proof labels and icons: `PROOF_KIND` in src/content/copy/proof.ts — the one place a proof type is named.

Rules:
- **No hairline between list items.** Use `GAP` spacing, `Card`s, and `SectionLabel`s. `Rule`/`hairline` only where a real boundary exists (a sheet edge, the tab bar is borderless).
- **Uppercase tracking sparingly:** kickers and the primary button label. Body, meta, links and secondary buttons are sentence case.
- On Today (colorway backgrounds) a card's surface is translucent: dark colorways (`statusBar: 'light'`) `rgba(237,233,227,0.07)`, light ones `rgba(10,10,10,0.06)`; text uses `colorway.ink` / `colorway.secondary`.
- Buttons are obvious without being huge: the primary `Button` (54 tall) for the one main action of a screen; a small filled button (START) on cards; `TextButton`/`LinkRow` for the rest.
- Tab screens have no back arrow; their title is the first thing on the page (serif `title.l`), except Today, whose top row is the wordmark and the day.
- Motion: short, eased (`ease.out`), never bouncy; respect Reduce Motion. Haptics: `selection` on taps, `success` on a proof, `soft` on a perfect day.

## 3. Today

Hierarchy (not literal ASCII):

```
UNSETLD                                   DAY 12
12 day streak                             380 pts
NEXT REWARD
[meter ███████████░░░░]  220 pts to 10% off

TODAY                                      0 / 3
[mission card] [mission card] [mission card]

ACTIVE PLAN  Build Something · Day 4 of 7   Continue →
```

- Top row: `UNSETLD` wordmark (kicker) left, `DAY 12` right (mono). Day N = days with a proven mission (+1 if today has none yet).
- Stats row: streak (serif number + "day streak") left, points (serif number + "pts") right; tap points → Rewards tab. **Day 1 / streak 0:** no zero — "Your first mission starts your streak." in its place.
- Next reward: kicker `NEXT REWARD`, a `Meter`, "220 pts to 10% off" (or "10% off is ready" → Rewards). Shown when rewards are enabled. Day 1: "300 pts to 5% off — your first reward."
- `TODAY` kicker with `0 / 3` (mono). Below it the three mission cards (§4), `GAP.card` apart. Swaps left appear only on the card ("Swap") and in the confirm dialog, not as a separate line.
- Active plan card (when a plan runs): kicker `ACTIVE PLAN`, plan title (serif), "Day 4 of 7", `Continue →` → Plans. No plan: a quiet `LinkRow` "Plans" ("Guided 5–7 day runs") at the very bottom, after the missions.
- Weekly focus: from the user's second active day on, in a week with no focus set and not skipped, a compact card above the missions: "What matters most this week?" / "Pick one and your missions lean toward it." → WeeklyFocus; dismiss "Not this week". When set, one meta line under TODAY: "This week: Work on my business" (tap → WeeklyFocus).
- Sunday: the weekly review card (existing) after the missions.
- Perfect day: the TODAY row reads `3 / 3` with "Perfect day." and a `Share today` text button → Share.
- Removed from Today: the access/drops note, the colorway button, the old bottom bar, the separate swaps line.

## 4. Mission card

```
SCHOOL                                   (kicker, colorway.secondary)
Study for 30 Minutes                     (serif, list 23)
30 min · ⏱📷 Timer + photo · +15 pts      (meta row; ProofMeta for the middle)
                                   [ START ]   Swap
```

- Kicker: the planned area (`TodayMission.area`).
- Title: serif.
- Meta: time, `ProofMeta` (icons + label), points. Proof is always visible before START.
- Actions: small filled `START` (or the live state: `TIMER 12:04`, `MARK DONE`, `TAKE PHOTO`, `AFTER PHOTO`), and a quiet `Swap` text while swaps are left.
- Proven: the card dims (title in secondary), a check icon + "Proven 9:47 AM · +15", the proof thumbnail if there is one.
- Whole card opens the mission; accessibility label "Study for 30 Minutes. School, 30 minutes, 15 points, proven with the timer and a photo."

## 5. Mission page and completion

- Mission page: same order as the card: kicker area, serif title, the one-sentence instruction, then a **Proof** block (Card) with the icons, the proof label, the proof-type sentence and the mission's proof line, then the one button. No essays.
- Done (after an accepted proof), focused and calm:
  - `PROVEN.` (serif), the title, `+15 POINTS` counting up, `380 → 395`, a `Meter` toward the next reward and "205 pts to 10% off".
  - The streak line ("Streak started." / "Streak: 12 days.").
  - Perfect day (every mission in the plan proven): `3 / 3`, `PERFECT DAY`, `+15 BONUS`, the updated streak, and two buttons: `Share today` (→ Share) and `Done`.
  - `success` haptic on proof, `soft` on perfect day; a short fade/slide in; Reduce Motion = no movement.
- Rejected: unchanged behaviour (what failed, Try again).

## 6. Share card (Share)

A Story-size (9:16) card, the user's colorway as background: `UNSETLD`, `DAY 47`, `3 / 3 TODAY`, `47 DAY STREAK`, `2,420 POINTS EARNED` (all-time points earned, so spending a reward never shrinks the card; a line that would be zero is left off), `NEVER SETTLE FOR LESS.` **No proof photos, ever, by default.** Nothing leaves the phone unless the user taps Share. iOS: capture the card view (`react-native-view-shot`, already installed) and open the system share sheet (`Share.share({ url })`). Browser preview: no capture is possible — the screen says "Take a screenshot to share it." and has no Share button (never a fake one). Opened from the perfect-day Done state, from Today on a perfect day, and from Progress.

## 7. Progress

```
Progress
CURRENT STREAK 12 days            TODAY 2 / 3
THIS WEEK  M T W T F S S  (squares: proven / today / missed / ahead)
YOUR AREAS
  [School · Level 3 · meter · 120 / 150 XP · 18 missions · 8h 24m]
  [Fitness ...] [Projects ...]
Proof history      47 proofs  →
Achievements       4 of 12    →
Stats                          →
```

- XP = mission points in that area (core/progress `trackProgress`); no second currency. Area cards show level (serif), meter, "120 / 150 XP", missions completed and time invested (timer seconds + mission minutes for proven missions).
- **Day 1 (nothing proven):** one `EmptyState`: "Your record starts with your first mission." / "Prove one of today's missions and it shows up here." / `Go to today` → Today. Plus the areas list in a quiet "starts at level 1" form is NOT shown; no zeros.
- Achievements (milestones): reached ones with dates, then the next three with progress. Stats: longest streak, missions, points earned, focused time, this-week completion, active days, Off Days with their one-line explainer, per-area totals.
- Weekly review (modal, Sundays): keep, simplified; "Next week" chips are the weekly focus options (sets next week's focus).

## 8. Proof history

A private visual record, by month: `October` (serif), "19 active days · 47 missions proven" (meta), a 3-column grid of square thumbnails (radius 6). A photo the retention policy cleared shows a placeholder tile with the area kicker and the date — the history never breaks. Timer-only proofs show a timer tile. Tap → the existing viewer (title, area, date, proof stamp). Top line: "Only on this phone. Never posted anywhere." Empty: "Your proof builds up here."

## 9. Rewards

```
Rewards
380 points
NEXT REWARD
10% off                 [meter]  380 / 600 · 220 points left
UP NEXT   1,000  15% off     2,000  Special reward
All rewards  →   Reward history  →   How points work  →
UNSETLD STATUS  12 active days · Next: Early access at 7  →
```

- **Point rewards** (spent with points: discounts) and **UNSETLD status** (earned by active days: early access, the patch, the 365 piece) are separate. Status is a card linking to Status.
- When a reward is ready: the next-reward card says "Ready" with `Get the code` (existing redeem flow, Account sign-in if needed).
- No paragraphs of rules on the main page; HowPoints holds them.
- All values come from configuration: `content/rewards.json` and `content/milestones.json` as defaults, unsetld.com's `config.json` (`rewards`, `status`) as the override. Reward fields: `points` (pointsRequired), `type` (rewardType), `percent` (discountPercent), `maxOff` (maxDiscount), `minimumPurchase`, `redemptionCooldownDays`, `oneTimeOnly`, `active`, `inventory`, `availableFrom`/`availableUntil` (startDate/endDate), `codeValidDays`, `perCollection`. The parser also accepts the alias names. UI components never hardcode thresholds or prices.
- A tier with `active: false` is not listed anywhere (nothing is promised that can't be had); one outside its dates or sold out shows as Not available in All rewards.
- Status tiers: `id`, `title`, `day` (or `activeDays`), `active`. `active: false` hides a tier. The app's own ids (`early-access`, `patch`, `piece-365`) keep their action, pause and letter; any other id the config sends is display only (a page, no button, no letter). Early-access drop alerts follow the configured day.

## 10. Plans

"Programs" becomes **Plans** in every user-facing string. List: free plans first, then one section labelled `With UNSETLD+` (no per-card edition label). Each card: serif title, one line, "7 days · Discipline" meta, `Start`. Active plan at the top: "Day 4 of 7", today's plan missions as rows like Today's, `Leave plan`. Titles and lines: 7 Day Lock In "Build seven days of consistency." · School Reset "Get organized, catch up, and get ahead." · Build Something "Seven days toward shipping something real." · Fitness Reset (was Fitness Base) "Build momentum again." · Business Week "Seven days of meaningful work on your business." · Get Organized "Five days to clear your space and your files." A running plan puts at least one of its missions in each day's plan (the engine already places the plan day's missions first).

## 11. You

Sections (cards and link rows, no rules): **Your goals** (Areas, What you're working toward, This week's focus, About you, Time and intensity) · **Your day** (Plans, Reminders, Drop alerts when access is on) · **Membership** (UNSETLD+ → Paywall; Restore) · **Appearance** (Colorway → opens the sheet on Today; Widgets) · **Proof photos** (retention) · **Account** · **Help** (How missions work, Terms, Privacy, the rewards and status terms when access is on) · **Tester tools** (dev/preview only).

## 12. Onboarding

Name → **Areas** ("What do you want to improve?", pick two to four; someone with one area from an earlier version can keep one when editing) → **About you** (In school or college? + High school/College; Working?; Building a business or project?; Gym access?; Age; "What are you learning?" only when Skills, Projects or Career is chosen) → **Time** ("How much time do you realistically have each day?" 15 / 30 / 45 / 60+ min, then intensity) → **Goal** ("What are you working toward?", optional, up to 80 characters, example chips: Get my GPA up · Launch my clothing brand · Get an internship · Build muscle · Learn coding · Save $1,000) → **Reminders** → Today with the first plan built. Steps `01 / 05`…`05 / 05`. No widget guide and no paywall in onboarding.

## 13. Personalization (engine; core/personalize.ts, core/missions.ts)

Real, deterministic rules — never called AI. Inputs: areas, answers (school, level, work, project, gym, age, skills), time, intensity, recent plans, proofs, swaps, ignored missions, time of day, the active plan, the weekly focus, the goal text.
- **Weekly focus:** asked on Today from the second active day in a week with none set ("Not this week" skips it); also in You and in Sunday's review, which sets next week's (kept aside until Monday, so Sunday's missions don't change). Only options the user's answers can get missions for are offered. Each option leans the plan toward an area and specific missions (e.g. "Prepare for an exam" → practice tests, flashcards, study sessions; "Get back in the gym" → workouts).
- **Goal text:** keywords map to missions and areas ("GPA", "grades" → school study; "brand", "clothing" → business; "internship" → career applications; "muscle", "gym" → workouts; "coding", "app" → coding drills and project builds; "save" → savings).
- **Learning from behaviour** (last 28 days): missions swapped repeatedly come up less; missions planned and left undone (ignored) come up less; if long missions are mostly left undone while shorter ones get proven, the day prefers shorter missions; an area proven consistently gets slightly bigger missions; areas rarely completed keep their place (no punishment).
- **Staples first:** each area's staple missions (Complete Your Workout, Study for 30 Minutes ...) come up far more than niche ones (a 5-minute plank set appears only when nothing else fits). Day 1 is the areas' core habits wherever one fits.

## 14. Copy

"UNSETLD+" replaces "Full Edition". "Plans" replaces "Programs". Points on cards are "+15 pts"; on the done screen "+15 POINTS". Sentence case except kickers and the primary button. No exclamation marks, no motivational filler, never "AI".
