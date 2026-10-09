// Settings, Full Edition, tester tools, widgets and notifications (spec sections 12 and 13).
// Every user-facing string for the platform group. Sentence case, no exclamation marks.
// Straight quotes become typographic at display time.
import type { Profile } from '../../core/types';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

/** "Three" for 3, the digits past six. */
function word(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "1,340" */
const num = (n: number) => n.toLocaleString('en-US');

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${num(n)} ${many}`);

const MINUTES: Record<Profile['minutes'], string> = { 15: '5–15 min', 30: '15–30 min', 60: '30–60 min', 90: '60+ min' };
const INTENSITY: Record<Profile['intensity'], string> = { easy: 'Start easy', lockin: 'Lock in', push: 'Push me' };

export const PLATFORM = {
  wordmark: 'unsetld',
  a11y: { close: 'Close', back: 'Back' },

  settings: {
    title: 'Settings',
    sections: {
      plan: 'YOUR PLAN',
      reminders: 'REMINDERS',
      streak: 'STREAK',
      proof: 'PROOF PHOTOS',
      look: 'COLORWAY & WIDGETS',
      unsetld: 'UNSETLD',
      full: 'FULL EDITION',
      about: 'ABOUT',
      tester: 'TESTER',
    },

    tracks: 'Areas',
    /** "School, Fitness, Money"; when that runs long, "Organization and 3 more". */
    tracksValue: (names: string[]) => {
      if (!names.length) return 'None yet';
      const all = names.join(', ');
      return names.length === 1 || all.length <= 27 ? all : `${names[0]} and ${names.length - 1} more`;
    },
    /** VoiceOver hears every area: "Areas, Discipline, School, Fitness and Money". */
    tracksA11y: (names: string[]) =>
      `Areas, ${names.length ? (names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`) : 'None yet'}`,
    aboutYou: 'About you',
    aboutValue: (answered: number, all: number) => (answered === 0 ? 'Skipped' : `${answered} of ${all} answered`),
    pace: 'Pace & intensity',
    paceValue: (minutes: Profile['minutes'], intensity: Profile['intensity']) => `${MINUTES[minutes] ?? ''} · ${INTENSITY[intensity] ?? ''}`,
    planNote: "Changes shape tomorrow's missions, and today's too if you haven't proven or swapped one yet.",

    reminders: 'Reminders',
    remindersValue: (n: number, a: string, b: string) => (n === 0 ? 'Off' : `${n} a day, ${a} to ${b}`),
    remindersOff: 'Off',
    remindersNote: "The first one names today's missions. Later ones name what's left, and stop once everything is proven.",

    offDays: 'Off Days banked',
    offDaysValue: (n: number, max: number) => `${n} of ${max}`,
    offDayNote: 'Miss a day and an Off Day covers it. You earn one every 7 days you show up. You can bank two.',

    retentionLabel: 'Keep proof photos for',
    retention: { 30: '30 days', 365: '1 year', 0: 'Keep' } as Record<string, string>,
    retentionSpan: { 30: '30 days', 365: '1 year' } as Record<string, string>,
    retentionNote:
      'After that the photo is deleted from this phone. The mission, its points and your streak stay. Photos never leave your phone.',
    clearTitle: (n: number) => (n === 1 ? 'Delete 1 older photo?' : `Delete ${num(n)} older photos?`),
    clearBody: (span: string) => `Proof photos older than ${span} are deleted from this phone. The missions and their points stay.`,
    clearYes: 'Delete',
    clearNo: 'Cancel',
    gallery: 'Proof gallery',

    colorway: 'Colorway',
    addWidget: 'Add a widget',

    dropAlerts: 'Drop alerts',
    dropNote: 'Tells you when a collection opens. Separate from your mission reminders. Off unless you turn it on.',
    permOff: 'Notifications are off for unsetld.',
    openSettings: 'Open Settings',
    account: 'Account',
    notSignedIn: 'Not signed in',
    signedInApple: 'Signed in with Apple',

    plan: 'Plan',
    free: 'Free',
    planName: { annual: 'Annual', monthly: 'Monthly', lifetime: 'Lifetime' } as Record<string, string>,
    renews: (name: string, date: string) => `${name}, renews ${date}`,
    restore: 'Restore purchases',
    restored: 'Full Edition restored.',
    noneTitle: 'Nothing to restore.',
    noneBody: "We couldn't find Full Edition on this Apple ID.",
    restoreFailed: "Couldn't reach the App Store. Try again in a moment.",

    accessTerms: 'Rewards and access terms',
    contact: 'Contact',
    contactEmail: 'unsetldclothing@gmail.com',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    devTools: 'Tester tools',
    footer: (version: string) => `unsetld · version ${version}`,
  },

  paywall: {
    restore: 'Restore',
    label: 'UNSETLD',
    title: 'Full Edition',
    description: 'More programs, more swaps, every colorway.',
    spec: [
      ['PROGRAMS', 'Every program, and new ones each season'],
      ['SWAPS', 'Three a day'],
      ['COLORWAYS', 'All ten, in the app and on your widgets'],
      ['REMINDERS', 'Up to ten a day'],
    ] as const,
    freeNote: 'Daily missions, proof, points, the streak, levels, the weekly review and rewards are the same on every plan.',
    plans: {
      annual: 'Annual',
      monthly: 'Monthly',
      lifetime: 'Lifetime',
    },
    sub: {
      annualTrial: (days: number) => `${days} days free, then billed yearly`,
      annual: 'Billed yearly',
      monthly: 'Billed monthly',
      lifetime: 'One payment',
    },
    unit: { annual: '/ year', monthly: '/ month', lifetime: 'once' },
    a11yUnit: { annual: ' a year', monthly: ' a month', lifetime: ' once' },
    a11yPlan: (name: string, price: string, unit: string, sub: string) => `${name}, ${price}${unit}. ${sub}`,
    a11yLoading: 'loading',
    perMonth: (p: string) => `${p} a month`,
    save: (pct: number) => `Save ${pct}%`,
    timeline: (price: string) =>
      [
        ['TODAY', 'Everything opens'],
        ['DAY 2', 'We remind you'],
        ['DAY 3', `${price} billed`],
      ] as const,
    a11yTimeline: (price: string) => `Today, everything opens. Day 2, we remind you. Day 3, ${price} billed.`,
    cta: {
      trial: 'Start free trial',
      annual: (p: string) => `Subscribe for ${p} a year`,
      monthly: (p: string) => `Subscribe for ${p} a month`,
      lifetime: (p: string) => `Buy for ${p}`,
    },
    fine: {
      trial: (days: number, p: string) =>
        `${days} days free, then ${p} per year. Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends.`,
      annual: (p: string) => `${p} per year. Renews automatically. Cancel any time in Settings.`,
      monthly: (p: string) => `${p} per month. Renews automatically. Cancel any time in Settings.`,
      lifetime: (p: string) => `One payment of ${p}. No subscription.`,
    },
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    loading: '—',
    priceError: "Prices couldn't load. Check your connection.",
    tryAgain: 'Try again',
    failedTitle: "Purchase didn't go through.",
    failedBody: 'Nothing was charged. Try again in a moment.',
    restored: 'Full Edition restored.',
    ok: 'OK',
    noneTitle: 'Nothing to restore.',
    noneBody: "We couldn't find Full Edition on this Apple ID.",
    restoreFailed: "Couldn't reach the App Store. Try again in a moment.",
    preview: 'Preview build. No charge.',
  },

  /** O6, and Settings › Add a widget. */
  widgetGuide: {
    title: 'Put today on your lock screen.',
    pageTitle: 'Add a widget',
    body: "You look at your phone all day. Let it tell you what's next.",
    step: '05 / 05',
    tabs: ['Lock Screen', 'Home Screen'] as const,
    lockSteps: [
      'Touch and hold your lock screen, then tap Customize.',
      'Tap Lock Screen, then the space under the clock.',
      'Choose unsetld, then Next mission, Today or Streak.',
    ],
    homeSteps: [
      'Touch and hold an empty spot on your home screen.',
      'Tap Edit, then Add Widget.',
      'Search unsetld, then choose Next mission or Streak and a size.',
    ],
    kindsLabel: 'THE WIDGETS',
    kinds: [
      { name: 'NEXT MISSION', body: "The next mission you haven't proven, with its area, time and points. Tap it to start." },
      { name: 'TODAY', body: "Today's missions, ticked off as you prove them. Lock Screen only." },
      { name: 'STREAK', body: 'Your streak, your points and every day you showed up.' },
    ],
    a11yLock: 'A lock screen with the Next mission and Streak widgets under the clock',
    a11yHome: 'A home screen with the Next mission and Streak widgets',
    /** The drawn preview: an example day, not the user's. */
    preview: {
      date: 'Friday 9 October',
      time: '9:41',
      app: 'unsetld',
      streak: 16,
      points: 340,
    },
    done: 'Done',
    later: 'Later',
  },

  /** What the widgets show. Kept short: they're read at a glance. */
  widgets: {
    next: 'NEXT MISSION',
    today: 'TODAY',
    streak: 'STREAK',
    waiting: (n: number) => `${word(n)} missions are waiting.`,
    perfect: 'Perfect day.',
    proven: (n: number) => `${n} / ${n} PROVEN`,
    count: (done: number, all: number) => `${done} / ${all}`,
    streakUnit: (n: number) => (n === 1 ? 'day in a row' : 'days in a row'),
    points: (n: number) => `${num(n)} PTS`,
    inline: (n: number) => (n === 1 ? '1-day streak' : `${n}-day streak`),
  },

  notifications: {
    title: 'unsetld',
    /** First reminder of the day: "Today: Make Your Bed, Study for 30 Minutes, Complete Your Workout." */
    first: (titles: string[]) => `Today: ${titles.join(', ')}.`,
    /** Later ones: "2 missions left. Read 10 Pages takes 15 minutes." */
    left: (n: number, title: string, minutes: number) =>
      `${plural(n, 'mission', 'missions')} left. ${title} takes ${plural(minutes, 'minute', 'minutes')}.`,
    /** The evening one, only when nothing is proven yet. */
    lastCall: (streak: number) =>
      streak > 0 ? 'Last call: 1 mission left to keep the streak.' : 'Last call: 1 mission today starts a streak.',
    /** A day the app hasn't planned yet names no mission. */
    waiting: (n: number) => `${word(n)} missions are waiting.`,
    trial: (p: string) => `Your free trial ends tomorrow. ${p} for the year starts then. Cancel any time in Settings.`,
    dropEarly: (c: string, when: string) => `Collection ${c} is open to you now. Everyone else gets it ${when}.`,
    dropPublic: (c: string, when: string) => `Collection ${c} opens ${when}.`,
    whenToday: (time: string) => `today at ${time}`,
    whenTomorrow: (time: string) => `tomorrow at ${time}`,
    whenOn: (date: string, time: string) => `on ${date} at ${time}`,
  },

  devTools: {
    title: 'Tester tools',
    body: "Preview and dev builds only. Time travel changes the app's idea of today; notifications still use the real clock.",
    today: (day: string, offset: number) => `TODAY ${day}  (${offset >= 0 ? '+' : ''}${offset} DAYS)`,
    status: (streak: number, points: number, proven: number, all: number) =>
      `STREAK ${streak} · ${num(points)} POINTS · ${proven} / ${all} PROVEN TODAY`,
    active: (n: number) => (n === 1 ? '1 ACTIVE DAY' : `${num(n)} ACTIVE DAYS`),

    flags: 'FLAGS',
    full: 'Full Edition',
    fullNote: "This build asks the App Store: its answer replaces this switch on the next launch.",
    fast: 'Timers run 60× faster',
    fastNote: 'A 25-minute timer takes 25 seconds. Applies to timers started after you switch it.',
    access: 'Access enabled',

    missions: 'MISSIONS',
    prove: "Prove today's missions",
    proved: (n: number) => (n === 0 ? 'Nothing left to prove today.' : n === 1 ? '1 mission proven.' : `${n} missions proven.`),
    backfill: 'Add 20 days of proven missions',
    backfilled: (missions: number, days: number) =>
      missions === 0 ? 'Those days already have missions.' : `${plural(missions, 'mission', 'missions')} over ${plural(days, 'day', 'days')}.`,
    missionsNote: 'Proof made here skips the camera: it is accepted on this phone with a placeholder photo (timer-only missions get no photo). For testing only.',
    checkNote: 'Tester tools: no photo taken.',

    travel: 'TIME TRAVEL',
    next: 'Next day',
    jump: (n: number) => `Jump ${n} days, proving daily`,
    disappear: (n: number) => `Disappear for ${n} days`,
    back: 'Back to the real today',
    travelNote:
      "After a jump, go back to Home: it builds the new day's plan and shows any milestone or letter.",

    reset: 'RESET',
    restart: 'Restart onboarding',
    clear: 'Clear the record',
    clearTitle: 'Clear everything on record?',
    clearBody: 'Missions, points, streak, rewards taken and proof photos on this phone. Settings stay.',
    clearYes: 'Clear',
    clearNo: 'Cancel',
  },
} as const;
