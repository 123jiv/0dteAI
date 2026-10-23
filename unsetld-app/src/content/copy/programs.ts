// Plans (docs/UX_REDESIGN.md section 10; "programs" in code and content). Sentence case, no
// exclamation marks. Kickers are written in sentence case: the kicker style sets them in capitals,
// and VoiceOver reads the words, not the letters.

const num = (n: number) => n.toLocaleString('en-US');

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

/** "Seven days. Each one proven." in words up to twenty, digits past it; "One day. Proven." for one. */
function daysProven(days: number): string {
  const word = WORDS[days] ?? num(days);
  const said = word.charAt(0).toUpperCase() + word.slice(1);
  return days === 1 ? `${said} day. Proven.` : `${said} days. Each one proven.`;
}

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

  /**
   * The moment a plan is finished (Today, once, full screen; no points): "Finished 18 Oct",
   * "7 DAY LOCK IN.", "Seven days. Each one proven.", then the moment's footer. The days need
   * not have been in a row: a missed day doesn't fail a plan.
   */
  moment: {
    /** Kicker: "Finished 18 Oct" (`date` as the Record writes it). */
    finished: (date: string) => `Finished ${date}`,
    /** "7 DAY LOCK IN.": three words or more keep the last two together ("LOCK IN." never leaves "IN." alone). */
    title: (title: string) => {
      const words = title.toUpperCase().split(' ');
      return words.length > 2 ? `${words.slice(0, -1).join(' ')}\u00A0${words[words.length - 1]}.` : `${words.join(' ')}.`;
    },
    line: (days: number) => daysProven(days),
    /** One label for VoiceOver, in sentence case: "7 Day Lock In, finished. Seven days. Each one proven." */
    a11y: (title: string, days: number) => `${title}, finished. ${daysProven(days)}`,
  },

  // The list
  /** Above the free plans when a plan card sits above them. */
  more: 'More plans',
  plus: 'With UNSETLD+',
  days: (n: number) => (n === 1 ? '1 day' : `${n} days`),
  /** "7 days · Discipline", with each area the plan counts toward. */
  meta: (days: string, areas: string[]) => [days, ...areas].join(' · '),
  /** Under a plan whose longest day runs past the user's day (a Plan day keeps every Plan mission). */
  overTime: (minutes: number) => `Some days run up to ${minutes} minutes.`,
  start: 'Start',
  startA11y: (title: string) => `Start ${title}`,
  plusA11y: (title: string) => `Start ${title}. Comes with UNSETLD+`,
  cardA11y: (title: string, short: string, days: number, areas: string[], over?: string | null) =>
    `${title}. ${short} ${days === 1 ? '1 day' : `${days} days`}, ${areas.join(', ')}.${over ? ` ${over}` : ''}`,
  switchTitle: (next: string) => `Start ${next}?`,
  switchBody: (current: string) => `One plan at a time. ${current} stops here; the days you proved stay on your record.`,
  switchYes: 'Start',
  switchNo: 'Cancel',
} as const;
