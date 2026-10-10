// Programs (MISSIONS_SPEC section 11). Sentence case, no exclamation marks.
// A program's mission rows use Home's line and its VoiceOver words (HOME.meta, HOME.a11y.meta).

export const PROGRAMS_COPY = {
  title: 'Programs',
  body: 'A few days with a plan. A program day moves on when you prove one of its missions, so missing a day never fails it.',

  // The active program
  active: 'YOUR PROGRAM',
  dayOf: (n: number, of: number) => `DAY ${n} OF ${of}`,
  dayOfA11y: (n: number, of: number) => `Day ${n} of ${of}`,
  today: 'TODAY',
  tomorrow: 'TOMORROW',
  doneToday: "Today's day is proven. The next one comes tomorrow.",
  joinsTomorrow: "Today's missions were already set. This day joins your missions tomorrow.",
  swapped: 'You swapped it out today. This day comes back tomorrow.',
  swappedLabel: 'SWAPPED OUT',
  proven: 'PROVEN',
  leave: 'Leave program',
  leaveTitle: (title: string) => `Leave ${title}?`,
  leaveBody: 'The days you proved stay on your record. The program stops here.',
  leaveYes: 'Leave',
  leaveNo: 'Stay',

  // A finished program
  finished: 'FINISHED',
  finishedLine: (days: number) => `${days} days, each one proven.`,
  clear: 'Clear',

  // The list
  all: 'ALL PROGRAMS',
  days: (n: number) => (n === 1 ? '1 day' : `${n} days`),
  /** "7 days · School", with each area the program counts toward. */
  meta: (days: string, areas: string[]) => [days, ...areas].join(' · '),
  free: 'FREE',
  full: 'FULL EDITION',
  start: 'Start',
  running: 'ACTIVE',
  startA11y: (title: string) => `Start ${title}`,
  lockedA11y: (title: string) => `${title} is part of Full Edition`,
  switchTitle: (next: string) => `Start ${next}?`,
  switchBody: (current: string) => `One program at a time. ${current} stops here; the days you proved stay on your record.`,
  switchYes: 'Start',
  switchNo: 'Cancel',
  /** Under a program whose missions need a yes the user hasn't given (School Reset for someone not in school). */
  needsSchool: 'Needs a yes to In school or college? in About you.',
  started: 'Day 1 is in your missions today.',
  startsTomorrow: "Today's missions were already set. Day 1 starts tomorrow.",
  fullNote: 'Full Edition opens every program, and new ones each season.',
  missionA11y: (title: string, meta: string, state?: string) => (state ? `${title}. ${meta}. ${state}` : `${title}. ${meta}`),
  openHint: 'Opens the mission',
  progressA11y: (done: number, of: number) => `${done} of ${of} days proven`,
  rowA11y: (title: string, short: string, days: number, areas: string[], free: boolean) =>
    `${title}. ${short} ${days === 1 ? '1 day' : `${days} days`}, ${areas.join(', ')}. ${free ? 'Free' : 'Full Edition'}.`,
} as const;
