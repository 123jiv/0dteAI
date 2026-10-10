// Today (docs/UX_REDESIGN.md §3, §4) and the colorway sheet it opens. Every user-facing string for the group.
// Sentence case except kickers and the primary button, no exclamation marks.
// Straight quotes become typographic at display time.
import { PROOF_KIND } from './proof';
import type { ProofType } from '../../core/types';

/** "4h 20m", "25m", "0m". */
function focused(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** A no-break space: keeps "45 min" together when a line wraps. */
const NBSP = ' ';

/** "1,340" */
const num = (n: number) => n.toLocaleString('en-US');

const pts = (n: number) => `${num(n)}${NBSP}pts`;
const points = (n: number) => (n === 1 ? '1 point' : `${num(n)} points`);
const minutesSaid = (n: number) => (n === 1 ? '1 minute' : `${n} minutes`);

export const HOME = {
  brand: 'UNSETLD',
  day: (n: number) => `DAY ${n}`,
  a11yDay: (n: number) => `Day ${n}`,
  num,

  stats: {
    /** After the serif number: "12 day streak". */
    streak: 'day streak',
    /** After the serif number: "380 pts". */
    points: 'pts',
    /** Day 1, in place of a zero. */
    first: 'Your first mission starts your streak.',
    /** A streak that ran out: in place of the zero, and what brings it back. */
    restart: 'Your next mission starts a new streak.',
    a11yStreak: (n: number) => (n === 1 ? '1 day streak' : `${n} day streak`),
    a11yPoints: (n: number) => points(n),
    a11yPointsHint: 'Opens Rewards',
  },

  reward: {
    label: 'NEXT REWARD',
    toGo: (need: number, title: string) => `${pts(need)} to ${title}`,
    /** Day 1: the first reward, said as one. */
    first: (need: number, title: string) => `${pts(need)} to ${title} — your first reward.`,
    ready: (title: string) => `${title} is ready`,
    a11yToGo: (need: number, title: string) => `Next reward. ${points(need)} to ${title}`,
    a11yReady: (title: string) => `Next reward. ${title} is ready`,
    a11yHint: 'Opens Rewards',
  },

  today: {
    label: 'TODAY',
    count: (done: number, all: number) => `${done} / ${all}`,
    a11yCount: (done: number, all: number) => `${done} of ${all} done`,
    perfect: 'Perfect day.',
    share: 'Share today',
    a11yShareHint: 'Opens your share card',
    /** No mission fits the day's answers (a rare edge: every area ruled out). */
    noneTitle: 'Nothing fits today.',
    noneBody: 'Your areas and time leave no mission for today. Change them in You.',
    noneAction: 'Open You',
  },

  plan: {
    label: 'ACTIVE PLAN',
    day: (day: number, days: number) => `Day ${day} of ${days}`,
    go: 'Continue',
    a11y: (title: string, day: number, days: number) => `Active plan. ${title}, day ${day} of ${days}`,
    a11yHint: 'Opens Plans',
    /** No plan running: the quiet row at the bottom. */
    link: 'Plans',
    linkDetail: 'Guided 5–7 day runs',
  },

  /**
   * "School · 30 min · +15" (the widgets' line; `badge` adds a word such as "Timer").
   * No-break spaces inside each part and before each dot, so a narrow row wraps only
   * after a dot, never inside "45 min".
   */
  meta: (area: string, minutes: number, points: number, badge: string | null) =>
    [area || null, `${minutes}${NBSP}min`, `+${points}`, badge ? badge.replace(/ /g, NBSP) : null].filter(Boolean).join(`${NBSP}· `),

  /** The mission card's meta row, around the proof (ProofMeta): "30 min ·" … "· +15 pts". */
  card: {
    minutes: (n: number) => `${n}${NBSP}min`,
    points: (n: number) => `+${n}${NBSP}pts`,
  },

  action: {
    start: 'START',
    timer: (clock: string) => `TIMER ${clock}`,
    timerDone: 'TAKE PHOTO',
    /** A timer-only mission once its timer ends: no photo, just the tap. */
    markDone: 'MARK DONE',
    after: 'AFTER PHOTO',
  },

  proven: (time: string, points: number) => `Proven ${time} · +${points}`,

  swap: {
    button: 'Swap',
    a11y: (title: string) => `Swap ${title}`,
    left: (n: number) => (n === 0 ? 'No swaps left today' : n === 1 ? '1 swap left today' : `${n} swaps left today`),
    done: (title: string) => `Swapped. ${title} is in.`,
    confirmTitle: (title: string) => `Swap ${title}?`,
    /** `area`: the mission's area, "School". A swap stays in it when another one fits today. */
    confirmBody: (left: number, area: string) =>
      [
        area ? `You’ll get another ${area} mission if one fits today.` : 'You’ll get a different mission.',
        'This one stays away for a while.',
        left === 1 ? 'This is your last swap today.' : `You have ${left} swaps left today.`,
      ].join(' '),
    yes: 'Swap',
    no: 'Cancel',
    noneTitle: 'Nothing else fits today.',
    noneBody: (area: string) =>
      `${area ? `Every other ${area} mission` : 'Every other mission'} is resting or doesn’t fit your day. Your swap wasn’t used.`,
    limitTitle: 'No swaps left today.',
    limitFree: 'UNSETLD+ gives you three a day.',
    limitFull: 'Three a day. More tomorrow.',
    seeFull: 'See UNSETLD+',
    ok: 'OK',
  },

  week: {
    label: 'YOUR WEEK',
    /** Monday and Tuesday: the card is about the week before. */
    lastLabel: 'LAST WEEK',
    summary: (missions: number, focusMinutes: number) =>
      [missions === 1 ? '1 mission' : `${missions} missions`, focusMinutes > 0 ? `${focused(focusMinutes)} focused` : null]
        .filter(Boolean)
        .join(' · '),
    link: 'See the week',
    a11y: (summary: string, last: boolean) => `${last ? 'Last week' : 'Your week'}. ${summary}`,
    a11yHint: 'Opens the weekly review',
  },

  a11y: {
    card: (title: string, rest: string) => `${title}. ${rest}`,
    /** The card's words: "School, 30 minutes, 15 points, proven with the timer and a photo". */
    cardMeta: (area: string, minutes: number, pointsN: number, proof: ProofType) =>
      [area || null, minutesSaid(minutes), pointsN === 1 ? '1 point' : `${pointsN} points`, (PROOF_KIND[proof] ?? PROOF_KIND.PHOTO).a11y]
        .filter(Boolean)
        .join(', '),
    proven: (area: string, time: string, points: number) => [area || null, `proven at ${time}`, `${points} points`].filter(Boolean).join(', '),
    hint: 'Opens the mission',
    timerRunning: (minutes: number) => `Timer running, ${minutesSaid(minutes)} left`,
    timerPaused: (minutes: number) => `Timer paused, ${minutesSaid(minutes)} left`,
    timerDone: 'Timer done, take the proof photo',
    timerDoneMark: 'Timer done, mark it done',
    afterWaiting: 'Before photo saved, after photo next',
    provenThumb: 'Proof photo',
  },

  colorway: {
    title: 'Colorway',
    locked: 'UNSETLD+',
    lockedA11y: ', UNSETLD+',
    lockedBar: (name: string) => `${name} comes with UNSETLD+.`,
    seeFull: 'See UNSETLD+',
    /** Swatch text when there is no plan to borrow a mission title from. */
    previewFallback: 'Study for 30 Minutes',
  },
} as const;
