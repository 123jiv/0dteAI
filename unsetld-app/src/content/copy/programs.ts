// Plans (docs/UX_REDESIGN.md section 10; "programs" in code and content). Sentence case, no
// exclamation marks. Kickers are written in sentence case: the kicker style sets them in capitals,
// and VoiceOver reads the words, not the letters.

const num = (n: number) => n.toLocaleString('en-US');

export const PROGRAMS_COPY = {
  title: 'Plans',
  body: 'Guided runs of five to seven days. A day moves on when you prove one of its missions.',

  // The active plan
  active: 'Active plan',
  dayOf: (n: number, of: number) => `Day ${n} of ${of}`,
  progressA11y: (done: number, of: number) => `${done} of ${of} days proven`,
  today: 'Today',
  /** Today's day is proven: the next one, by its number. */
  tomorrowDay: (n: number) => `Tomorrow · Day ${n}`,
  tomorrow: 'Tomorrow',
  /** "Today · Projects": the label above the missions, naming their area when they share one. */
  label: (when: string, area: string) => `${when} · ${area}`,
  doneToday: "Today's day is proven. The next one comes tomorrow.",
  joinsTomorrow: "Today's missions were already set. This day joins your missions tomorrow.",
  swapped: 'You swapped it out today. This day comes back tomorrow.',
  started: 'Day 1 is in your missions today.',
  startsTomorrow: "Today's missions were already set. Day 1 starts tomorrow.",
  leave: 'Leave plan',
  leaveTitle: (title: string) => `Leave ${title}?`,
  leaveBody: 'The days you proved stay on your record. The plan stops here.',
  leaveYes: 'Leave',
  leaveNo: 'Stay',

  // A plan mission row: "School · 30 min · Timer + photo · +15 pts", like a mission card on Today.
  minutes: (n: number) => `${n} min`,
  points: (n: number) => `+${num(n)} pts`,
  proven: 'Proven',
  swappedOut: 'Swapped out',
  missionA11y: (title: string, area: string, minutes: number, points: number, proof: string, state?: string) =>
    `${title}. ${area}, ${minutes === 1 ? '1 minute' : `${minutes} minutes`}, ${points === 1 ? '1 point' : `${num(points)} points`}, ${proof}.${state ? ` ${state}.` : ''}`,
  openHint: 'Opens the mission',

  // A finished plan
  finished: 'Finished',
  finishedLine: (days: number) => `${days} days, each one proven.`,
  clear: 'Clear',

  // The list
  /** Above the free plans when a plan card sits above them. */
  more: 'More plans',
  plus: 'With UNSETLD+',
  days: (n: number) => (n === 1 ? '1 day' : `${n} days`),
  /** "7 days · Discipline", with each area the plan counts toward. */
  meta: (days: string, areas: string[]) => [days, ...areas].join(' · '),
  start: 'Start',
  startA11y: (title: string) => `Start ${title}`,
  plusA11y: (title: string) => `Start ${title}. Comes with UNSETLD+`,
  cardA11y: (title: string, short: string, days: number, areas: string[]) => `${title}. ${short} ${days === 1 ? '1 day' : `${days} days`}, ${areas.join(', ')}.`,
  switchTitle: (next: string) => `Start ${next}?`,
  switchBody: (current: string) => `One plan at a time. ${current} stops here; the days you proved stay on your record.`,
  switchYes: 'Start',
  switchNo: 'Cancel',
  /**
   * On a plan whose missions need a yes the user hasn't given (School Reset for someone not in
   * school), instead of Start: "Needs a yes to In school or college? in About you.", About you a link.
   */
  needsSchool: { before: 'Needs a yes to "In school or college?" in ', link: 'About\u00a0you', after: '.' },
  needsSchoolHint: 'Opens About you',
} as const;
