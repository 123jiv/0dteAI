// Home (spec section 5) and the colorway sheet it opens. Every user-facing string for the group.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.

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

/** A no-break space: keeps "45 min" together when a line wraps. */
const NBSP = '\u00a0';

/** "1,340" */
const num = (n: number) => n.toLocaleString('en-US');

export const HOME = {
  brand: 'UNSETLD',
  day: (n: number) => `DAY ${String(n).padStart(3, '0')}`,
  a11yDay: (n: number) => `Day ${n}`,
  num,

  stats: {
    streak: 'DAY STREAK',
    points: 'POINTS',
    offDays: (n: number) => (n === 1 ? '1 OFF DAY BANKED' : `${n} OFF DAYS BANKED`),
    a11yStreak: (n: number, off: number) =>
      [n === 1 ? '1 day streak' : `${n} day streak`, off ? (off === 1 ? '1 Off Day banked' : `${off} Off Days banked`) : null]
        .filter(Boolean)
        .join('. '),
    a11yPoints: (n: number) => (n === 1 ? '1 point' : `${num(n)} points`),
    a11yPointsHint: 'Opens Rewards',
  },

  reward: {
    toGo: (need: number, title: string) => `${num(need)} ${need === 1 ? 'POINT' : 'POINTS'} TO ${title.toUpperCase()}`,
    ready: (title: string) => `${title.toUpperCase()} IS READY`,
    a11yToGo: (need: number, title: string) => `${need === 1 ? '1 point' : `${num(need)} points`} to ${title}`,
    a11yReady: (title: string) => `${title} is ready`,
    a11yHint: 'Opens Rewards',
  },

  today: {
    label: 'TODAY',
    count: (done: number, all: number) => `${done} / ${all}`,
    a11yCount: (done: number, all: number) => `${done} of ${all} done`,
  },

  /** The line under TODAY. */
  status: (done: number, all: number) => {
    if (all === 0) return 'Nothing fits today. Check your plan in Settings.';
    if (done >= all) return 'Perfect day. Every mission proven.';
    if (done === 0) return all === 1 ? 'One mission today.' : `${word(all)} missions today.`;
    return `${all - done} to go.`;
  },
  /** Said once, after the status line, while a mission can still be swapped. */
  swapsLeft: (n: number) => (n === 1 ? '1 swap left.' : `${n} swaps left.`),

  program: (title: string, day: number, days: number) => `${title} · DAY ${day} OF ${days}`,
  programA11y: (title: string, day: number, days: number) => `${title}, day ${day} of ${days}`,
  programA11yHint: 'Opens Programs',

  /**
   * "School · 30 min · +15", with "Timer" or "Before + after" when the proof needs one.
   * No-break spaces inside each part and before each dot, so a narrow row wraps only
   * after a dot ("Organization · 45 min ·" / "+20 · Before + after"), never inside "45 min".
   */
  meta: (area: string, minutes: number, points: number, badge: string | null) =>
    [area || null, `${minutes}${NBSP}min`, `+${points}`, badge ? badge.replace(/ /g, NBSP) : null].filter(Boolean).join(`${NBSP}· `),
  badge: { timer: 'Timer', beforeAfter: 'Before + after' },

  action: {
    start: 'START',
    timer: (clock: string) => `TIMER ${clock}`,
    timerDone: 'TAKE PHOTO',
    /** A timer-only mission once its timer ends: no photo, just the tap. */
    markDone: 'MARK DONE',
    after: 'AFTER PHOTO',
  },

  proven: (time: string, points: number) => `PROVEN ${time} · +${points}`,

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
    a11y: (summary: string) => `Your week. ${summary}`,
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
    card: (title: string, rest: string) => `${title}. ${rest}`,
    /** "School, 30 minutes, 15 points, with the focus timer". */
    meta: (area: string, minutes: number, points: number, badge: string | null) =>
      [area || null, minutes === 1 ? '1 minute' : `${minutes} minutes`, points === 1 ? '1 point' : `${points} points`, badge].filter(Boolean).join(', '),
    badge: { timer: 'with the focus timer', beforeAfter: 'before and after photos' },
    proven: (time: string, points: number) => `Proven at ${time}, ${points} points`,
    hint: 'Opens the mission',
    timerRunning: (minutes: number) => `Timer running, ${minutes === 1 ? '1 minute' : `${minutes} minutes`} left`,
    timerPaused: (minutes: number) => `Timer paused, ${minutes === 1 ? '1 minute' : `${minutes} minutes`} left`,
    timerDone: 'Timer done, take the proof photo',
    timerDoneMark: 'Timer done, mark it done',
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
    previewFallback: 'Study for 30 Minutes',
  },
} as const;
