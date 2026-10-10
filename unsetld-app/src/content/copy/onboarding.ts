// Onboarding (MISSIONS_SPEC section 3): Areas, About you, Pace and Reminders, and
// the same screens in edit mode from Settings. Every user-facing string for the group.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.
import type { Profile, SkillId } from '../../core/types';

const WORDS = ['None', 'One', 'Two', 'Three', 'Four'];

/** VoiceOver gets names in sentence case: an all-caps word can be spelled out letter by letter. */
const spoken = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

/** Onboarding runs Areas, About you, Pace, Reminders, Widget. */
export const ONBOARDING_STEPS = 5;

/** The most areas a user can pick. */
export const MAX_AREAS = 4;

export const ONBOARDING = {
  /** "01 / 05" in the nav row. */
  step: (n: number) => `${String(n).padStart(2, '0')} / ${String(ONBOARDING_STEPS).padStart(2, '0')}`,
  continue: 'Continue',
  save: 'Save',

  tracks: {
    title: 'What are you trying to improve right now?',
    body: 'Pick up to four.',
    counter: (n: number) => `${n} OF ${MAX_AREAS}`,
    a11yCounter: (n: number) => `${WORDS[n] ?? n} of four chosen`,
    /** A fifth tap. Read out by VoiceOver; the counter flashes on screen. */
    full: 'Four is the most. Take one off first.',
    /** School chosen after a No to "In school or college?": the answer is changed in About you. */
    schoolOff: "You said you're not in school, so School won't get missions. Change that in About you.",
    a11yTile: (name: string, scope: string) => `${spoken(name)}. ${scope}`,
    tileNo: (i: number) => String(i + 1).padStart(2, '0'),
  },

  about: {
    title: 'A few quick ones.',
    body: 'So the missions fit your life. Skip anything.',
    yes: 'Yes',
    no: 'No',
    school: 'In school or college?',
    /** Shown after a Yes to school; skipping it leaves both kinds of school mission open. */
    schoolLevel: 'High school or college?',
    schoolLevels: { high: 'High school', college: 'College' } satisfies Record<NonNullable<Profile['schoolLevel']>, string>,
    /**
     * School is one of the user's areas and they answered No: every School mission needs
     * a yes, so School comes off their areas when they continue (or save). `last`: School
     * is their only area, so there's nothing to continue with until they pick another.
     */
    schoolConflict: (edit: boolean, last: boolean) =>
      last
        ? 'School missions need a yes here. Answer Yes, or pick another area first.'
        : `School missions need a yes here. ${edit ? 'Save' : 'Continue'} and School comes off your areas.`,
    changeAreas: 'Change areas',
    work: 'Working?',
    project: 'Building a business or project?',
    projectHint: 'A brand, a channel, an app, art.',
    gym: 'Gym access?',
    age: 'Age',
    ages: { u16: '13–15', '16to17': '16–17', '18plus': '18+' } satisfies Record<NonNullable<Profile['age']>, string>,
    a11yAges: { u16: '13 to 15', '16to17': '16 to 17', '18plus': '18 or older' } satisfies Record<NonNullable<Profile['age']>, string>,
    learning: 'What are you learning?',
    learningHint: 'Pick any that apply.',
    skills: {
      coding: 'Coding',
      design: 'Design',
      video: 'Video editing',
      writing: 'Writing',
      language: 'A language',
      music: 'Music',
    } satisfies Record<SkillId, string>,
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
    /**
     * Under How hard? when the time chosen sets the day's shape (core/missions slotsFor):
     * with 5–15 or 15–30 minutes every intensity gets the same day.
     */
    shortDay: {
      15: 'With 5–15 minutes, you get three short missions a day, whatever you pick.',
      30: 'With 15–30 minutes, you get two short missions and one focused one a day, whatever you pick.',
    },
    a11yShortDay: {
      15: 'With 5 to 15 minutes, you get three short missions a day, whatever you pick.',
      30: 'With 15 to 30 minutes, you get two short missions and one focused one a day, whatever you pick.',
    },
    /**
     * `body` with 30 minutes or more; `later` on a 5–15 or 15–30 day, where every card
     * gets the same day: what it will do once there's more time.
     */
    intensity: {
      easy: { name: 'START EASY', body: 'Three missions a day, shorter ones.', later: 'With more time a day: three missions, shorter ones.' },
      lockin: {
        name: 'LOCK IN',
        body: 'Three missions a day: one easy, two that take real focus.',
        later: 'With more time a day: one easy, two that take real focus.',
      },
      push: { name: 'PUSH ME', body: 'Four missions a day, longer sessions.', later: 'With more time a day: four missions, longer sessions.' },
    } satisfies Record<Profile['intensity'], { name: string; body: string; later: string }>,
    a11yIntensity: (name: string, body: string) => `${spoken(name)}. ${body}`,
  },

  /** Reminders: onboarding, and Settings › Reminders. */
  day: {
    title: 'Set your day.',
    remindersTitle: 'Reminders',
    notificationTitle: 'unsetld',
    /** The preview names today's missions, as the first reminder of the day will. */
    previewBody: (titles: string[]) =>
      `Today: ${(titles.length ? titles : ['Study for 30 Minutes', 'Complete Your Workout', 'Plan Tomorrow']).join(', ')}.`,
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
