// The 13+ age gate (launch pass P0-4): the Age step after Name, and the screen an under-13
// answer ends on. Neutral: nothing here says which answer lets someone in. Sentence case, no
// exclamation marks. Straight quotes become typographic at display time.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SAID = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const AGE = {
  title: 'What year were you born?',
  body: 'Only an age range is kept, on this phone.',
  /** The year wheel, for VoiceOver. */
  yearLabel: 'Birth year',
  /** Only on the one year where 13 falls either side of this year's birthday. */
  month: 'Which month?',
  /** 1–12. */
  monthShort: (m: number) => MONTHS[m - 1] ?? '',
  a11yMonth: (m: number) => MONTHS_SAID[m - 1] ?? '',
  continue: 'Continue',

  blocked: {
    title: 'UNSETLD is for 13 and over.',
    body: 'Nothing you entered was kept.',
    privacy: 'Privacy Policy',
  },
} as const;
