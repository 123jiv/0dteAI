// The share card (UX_REDESIGN 6): a Story-size card of the day, in the user's colorway.
// Kickers on the card are spaced uppercase; the lines around it are sentence case.
// Never proof photos. Nothing leaves the phone until the user taps Share.

/** "2,420" */
const num = (n: number) => n.toLocaleString('en-US');

export const SHARE = {
  brand: 'UNSETLD',
  day: (n: number) => `DAY ${n}`,
  num,
  /** Proven / planned today: "3 / 3", with the TODAY label beside it. */
  today: (done: number, all: number) => `${done} / ${all}`,
  todayLabel: 'TODAY',
  streakLabel: 'DAY STREAK',
  /** Points earned all time: what's been spent on rewards still counts, so it isn't the balance Today shows. */
  pointsLabel: (n: number) => (n === 1 ? 'POINT EARNED' : 'POINTS EARNED'),
  line: 'NEVER SETTLE FOR LESS.',

  /** The one button (iOS): captures the card and opens the share sheet. */
  share: 'Share',
  /** The browser preview can't capture the card or open a share sheet. */
  screenshot: 'Take a screenshot to share it.',
  /** Shown under the button when the capture or the share sheet failed. Nothing was sent. */
  failed: 'That didn’t work. Nothing was shared. Try again.',

  a11y: {
    card: (o: { day: number; done: number; all: number; streak: number; points: number }) =>
      [
        `Share card. Day ${o.day}.`,
        o.all > 0 && o.done > 0 ? `${o.done} of ${o.all} today.` : null,
        o.streak > 0 ? `${o.streak} day streak.` : null,
        o.points > 0 ? `${num(o.points)} ${o.points === 1 ? 'point' : 'points'} earned.` : null,
        'Never settle for less.',
      ]
        .filter(Boolean)
        .join(' '),
  },
} as const;
