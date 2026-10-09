// Onboarding (MISSIONS_SPEC section 3): Tracks, About you, Pace and Reminders, and
// the same screens in edit mode from Settings. Every user-facing string for the group.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.
import type { Profile } from '../../core/types';

const WORDS = ['None', 'One', 'Two', 'Three', 'Four'];

/** VoiceOver gets names in sentence case: an all-caps word can be spelled out letter by letter. */
const spoken = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

/** Onboarding runs Tracks, About you, Pace, Reminders, Widget. */
export const ONBOARDING_STEPS = 5;

export const ONBOARDING = {
  /** "01 / 05" in the nav row. */
  step: (n: number) => `${String(n).padStart(2, '0')} / ${String(ONBOARDING_STEPS).padStart(2, '0')}`,
  continue: 'Continue',
  save: 'Save',

  tracks: {
    title: 'What are you trying to improve right now?',
    body: 'Pick up to three.',
    counter: (n: number) => `${n} OF 3`,
    a11yCounter: (n: number) => `${WORDS[n] ?? n} of three chosen`,
    /** A fourth tap. Read out by VoiceOver; the counter flashes on screen. */
    full: 'Three is the most. Take one off first.',
    a11yTile: (name: string, scope: string) => `${spoken(name)}. ${scope}`,
    tileNo: (i: number) => String(i + 1).padStart(2, '0'),
  },

  about: {
    title: 'A few quick ones.',
    body: 'So the missions fit your life. Skip anything.',
    yes: 'Yes',
    no: 'No',
    school: 'In school?',
    work: 'Working?',
    gym: 'Gym access?',
    project: 'Building something?',
    projectHint: 'A business, a brand, a channel, art, an app.',
    age: 'Age',
    ages: { u16: '13–15', '16to17': '16–17', '18plus': '18+' } satisfies Record<NonNullable<Profile['age']>, string>,
    a11yAges: { u16: '13 to 15', '16to17': '16 to 17', '18plus': '18 or older' } satisfies Record<NonNullable<Profile['age']>, string>,
    a11yChip: (question: string, answer: string) => `${question} ${answer}`,
    skip: 'Skip',
  },

  pace: {
    title: 'How much time a day?',
    minutes: { 15: '5–15', 30: '15–30', 60: '30–60', 90: '60+' } satisfies Record<Profile['minutes'], string>,
    minutesUnit: 'MIN',
    a11yMinutes: {
      15: '5 to 15 minutes',
      30: '15 to 30 minutes',
      60: '30 to 60 minutes',
      90: 'More than 60 minutes',
    } satisfies Record<Profile['minutes'], string>,
    hard: 'How hard?',
    /** Under How hard? when 5–15 is chosen: the day's budget keeps every mission short, Push me included. */
    shortDay: 'With 5–15 minutes, missions stay short whatever you pick.',
    a11yShortDay: 'With 5 to 15 minutes, missions stay short whatever you pick.',
    intensity: {
      easy: {
        name: 'START EASY',
        body: 'Shorter missions. Build the habit first.',
        a11yDay: 'Three a day: two quick wins and one progress mission.',
      },
      lockin: {
        name: 'LOCK IN',
        body: 'A quick win, real progress and one challenge a day.',
        a11yDay: 'Three a day: a quick win, a progress mission and a challenge.',
      },
      push: {
        name: 'PUSH ME',
        body: 'Longer, harder missions. Four a day.',
        a11yDay: 'Four a day: a quick win, a progress mission and two challenges.',
      },
    } satisfies Record<Profile['intensity'], { name: string; body: string; a11yDay: string }>,
    a11yIntensity: (name: string, body: string, day: string) => `${spoken(name)}. ${body} ${day}`,
  },

  /** Reminders: onboarding, and Settings › Reminders. */
  day: {
    title: 'Set your day.',
    remindersTitle: 'Reminders',
    notificationTitle: 'unsetld',
    /** The preview names today's missions, as the first reminder of the day will. */
    previewBody: (titles: string[]) =>
      `Today: ${(titles.length ? titles : ['25-Minute Lock In', '10 Pages', 'Make the Bed']).join(', ')}.`,
    a11yPreview: (time: string, body: string) => `Notification preview. unsetld, ${time}. ${body}`,
    perDay: 'Reminders a day',
    perDayNote: 'More than 3 a day is part of Full Edition.',
    first: 'First reminder',
    last: 'Last reminder',
    note: "The first names today's missions. The rest name what's left, and stop once it's all proven.",
    allow: 'Allow reminders',
    notNow: 'Not now',
    save: 'Save',
    permOff: 'Notifications are off for unsetld.',
    openSettings: 'Open Settings',
  },
} as const;
