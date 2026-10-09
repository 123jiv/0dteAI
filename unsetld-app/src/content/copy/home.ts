// Home (spec section 5) and the colorway sheet it opens. Every user-facing string for the group.
import type { MissionSlot } from '../../core/types';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** "Three" for 3, the digits past six. */
function word(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "4h 20m", "25m", "0m". */
function focused(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const HOME = {
  brand: 'UNSETLD',
  day: (n: number) => `DAY ${String(n).padStart(3, '0')}`,

  stats: {
    streak: 'DAY STREAK',
    points: 'POINTS',
    offDays: (n: number) => (n === 1 ? '1 OFF DAY BANKED' : `${n} OFF DAYS BANKED`),
    a11yStreak: (n: number) => (n === 1 ? '1 day streak' : `${n} day streak`),
    a11yPoints: (n: number) => `${n} points. Opens Rewards.`,
  },

  reward: {
    toGo: (need: number, title: string) => `${need} POINTS TO ${title.toUpperCase()}`,
    ready: (title: string) => `${title.toUpperCase()} IS READY`,
    a11yHint: 'Opens Rewards',
  },

  today: {
    label: 'TODAY',
    count: (done: number, all: number) => `${done} / ${all} COMPLETE`,
    a11yCount: (done: number, all: number) => `${done} of ${all} complete`,
  },

  /** The line under TODAY. */
  status: (done: number, all: number) => {
    if (all === 0) return 'Nothing fits today. Check your plan in Settings.';
    if (done >= all) return "Perfect day. That's how it's done.";
    if (done === 0) return all === 1 ? 'One mission. Finish it.' : `${word(all)} missions. Finish them.`;
    return `${all - done} left. Keep going.`;
  },

  program: (title: string, day: number, days: number) => `${title} · DAY ${day} OF ${days}`,
  programA11yHint: 'Opens Programs',

  slot: { quick: 'QUICK WIN', progress: 'PROGRESS', challenge: 'CHALLENGE' } satisfies Record<MissionSlot, string>,
  cardLabel: (slot: string, track: string) => `${slot} · ${track}`,
  meta: (minutes: number, points: number) => `${minutes} MIN · +${points} PTS`,
  badge: { timer: 'TIMER', beforeAfter: 'BEFORE + AFTER' },

  action: {
    start: 'START',
    timer: (clock: string) => `TIMER ${clock}`,
    timerDone: 'TAKE PHOTO',
    after: 'AFTER PHOTO',
  },

  proven: (time: string, points: number) => `PROVEN ${time} · +${points}`,

  swap: {
    button: '↻ Swap',
    a11y: (title: string) => `Swap ${title}`,
    left: (n: number) => (n === 0 ? 'No swaps left today' : n === 1 ? '1 swap left today' : `${n} swaps left today`),
    done: (title: string) => `Swapped. ${title} is in.`,
    noneTitle: 'Nothing else fits today.',
    noneBody: 'Every other mission for this slot is resting or doesn’t fit your plan. Your swap wasn’t used.',
    limitTitle: 'No swaps left today.',
    limitFree: 'Full Edition gives you three a day.',
    limitFull: 'Three a day. More tomorrow.',
    seeFull: 'See Full Edition',
    ok: 'OK',
  },

  comeBack: (n: number) => `Come back tomorrow for ${word(n).toLowerCase()} more.`,

  week: {
    label: 'YOUR WEEK',
    summary: (missions: number, focusMinutes: number) =>
      [missions === 1 ? '1 mission' : `${missions} missions`, focusMinutes > 0 ? `${focused(focusMinutes)} focused` : null]
        .filter(Boolean)
        .join(' · '),
    link: 'See the week →',
    a11yHint: 'Opens the weekly review',
  },

  access: {
    label: 'ACCESS',
    body: 'Seven days with a proven mission open early access to every UNSETLD drop. Points from proven missions trade for rewards at unsetld.com. None of it can be bought.',
    link: 'See Rewards',
  },

  bar: {
    progress: 'Progress',
    programs: 'Programs',
    rewards: 'Rewards',
    colorway: 'Colorway',
  },

  a11y: {
    card: (label: string, title: string, rest: string) => `${label}. ${title}. ${rest}`,
    meta: (minutes: number, points: number) => `${minutes} minutes, ${points} points`,
    proven: (time: string, points: number) => `Proven at ${time}, ${points} points`,
    hint: 'Opens the mission',
    timerRunning: (clock: string) => `Timer running, ${clock} left`,
    timerPaused: (clock: string) => `Timer paused, ${clock} left`,
    afterWaiting: 'Before photo saved, after photo next',
    provenThumb: 'Proof photo',
  },

  colorway: {
    title: 'Colorway',
    locked: 'FULL EDITION',
    lockedA11y: ', Full Edition',
    lockedBar: (name: string) => `${name} is part of Full Edition.`,
    seeFull: 'See Full Edition',
    /** Swatch text when there is no plan to borrow a mission title from. */
    previewFallback: '25-Minute Lock In',
  },
} as const;
