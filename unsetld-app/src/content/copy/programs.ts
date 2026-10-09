// Programs (MISSIONS_SPEC section 11). Sentence case, no exclamation marks.

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
  missionMeta: (track: string, minutes: number, points: number) => `${track.toUpperCase()} · ${minutes} MIN · +${points} PTS`,
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
  days: (n: number) => (n === 1 ? '1 DAY' : `${n} DAYS`),
  meta: (days: string, tracks: string[]) => [days, ...tracks.map(t => t.toUpperCase())].join(' · '),
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
  started: 'Day 1 is in your missions today.',
  startsTomorrow: "Today's missions were already set. Day 1 starts tomorrow.",
  fullNote: 'Full Edition opens every program, and new ones each season.',
  missionA11y: (title: string, meta: string, state?: string) => (state ? `${title}. ${meta}. ${state}` : `${title}. ${meta}`),
  openHint: 'Opens the mission',
  progressA11y: (done: number, of: number) => `${done} of ${of} days proven`,
  rowA11y: (title: string, short: string, days: number, tracks: string[], free: boolean) =>
    `${title}. ${short} ${days === 1 ? '1 day' : `${days} days`}, ${tracks.join(', ')}. ${free ? 'Free' : 'Full Edition'}.`,
  missionSaid: (track: string, minutes: number, points: number) => `${track}, ${minutes} minutes, ${points} points`,
} as const;
