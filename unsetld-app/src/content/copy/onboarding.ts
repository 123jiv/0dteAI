// Onboarding (docs/UX_REDESIGN.md section 12): Areas, About you, Time, Goal and Reminders,
// and the same screens in edit mode from You. Every user-facing string for the group.
// Sentence case, no exclamation marks. Straight quotes become typographic at display time.
import type { Profile, SkillId } from '../../core/types';

const WORDS = ['None', 'One', 'Two', 'Three', 'Four'];

/** VoiceOver gets names in sentence case: an all-caps word can be spelled out letter by letter. */
const spoken = (name: string) => name.charAt(0) + name.slice(1).toLowerCase();

/** Onboarding runs Areas, About you, Time, Goal, Reminders. */
export const ONBOARDING_STEPS = 5;

/** The most areas a user can pick. */
export const MAX_AREAS = 4;
/** The fewest in onboarding. Someone who already had one from an earlier version can keep one. */
export const MIN_AREAS = 2;

/** The goal's longest answer, in characters (Profile.goal). */
export const GOAL_MAX = 80;

export const ONBOARDING = {
  /** "01 / 05" in the nav row. */
  step: (n: number) => `${String(n).padStart(2, '0')} / ${String(ONBOARDING_STEPS).padStart(2, '0')}`,
  continue: 'Continue',
  save: 'Save',
  skip: 'Skip',

  tracks: {
    title: 'What do you want to improve?',
    body: 'Pick two to four.',
    /** Edit mode, for someone who has only one area from an earlier version. */
    bodyEdit: 'Up to four. Your missions come from these.',
    counter: (n: number) => `${n} OF ${MAX_AREAS}`,
    a11yCounter: (n: number) => `${WORDS[n] ?? n} of four chosen`,
    /** Under the counter while there's one to go. */
    oneMore: 'Pick one more to continue.',
    oneMoreEdit: 'Pick one more to save.',
    /** A fifth tap. Read out by VoiceOver; the counter flashes on screen. */
    full: 'Four is the most. Take one off first.',
    /** School chosen after a No to "In school or college?": the answer is changed in About you. */
    schoolOff: "You said you're not in school, so School won't get missions. Change that in About you.",
    /** Edit mode saves straight away, so School stays off until About you says yes. */
    schoolOffEdit: "You said you're not in school, so School stays off. Answer Yes in About you to add it.",
    aboutYou: 'Go to About you',
    a11yTile: (name: string, scope: string) => `${spoken(name)}. ${scope}`,
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
     * a yes, so School comes off their areas when they continue (or save). `short`: without
     * School there would be too few areas left, so they answer Yes or pick another first.
     */
    schoolConflict: (edit: boolean, short: boolean) =>
      short
        ? 'School missions need a yes here. Answer Yes, or add another area first.'
        : `School missions need a yes here. ${edit ? 'Save' : 'Continue'} and School comes off your areas.`,
    changeAreas: 'Change areas',
    work: 'Working?',
    project: 'Building a business or project?',
    projectHint: 'A brand, a channel, an app, art.',
    gym: 'Gym access?',
    age: 'Age',
    ages: { u16: '13–15', '16to17': '16–17', '18plus': '18+' } satisfies Record<NonNullable<Profile['age']>, string>,
    a11yAges: { u16: '13 to 15', '16to17': '16 to 17', '18plus': '18 or older' } satisfies Record<NonNullable<Profile['age']>, string>,
    /** Only asked when Skills, Projects or Career is one of the areas. */
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
  },

  pace: {
    title: 'How much time do you realistically have each day?',
    minutes: { 15: '15', 30: '30', 45: '45', 60: '60+' } satisfies Record<Profile['minutes'], string>,
    minutesUnit: 'MIN',
    a11yMinutes: {
      15: '15 minutes',
      30: '30 minutes',
      45: '45 minutes',
      60: 'An hour or more',
    } satisfies Record<Profile['minutes'], string>,
    hard: 'How hard?',
    /**
     * Under How hard? when the time chosen sets the day's shape (core/missions slotsFor):
     * with 15 or 30 minutes every intensity gets the same day; with 45 the shape is set
     * and intensity only changes how long the focused ones run (dayBudget, MAIN_MAX_MINUTES).
     */
    timeNote: {
      15: 'With 15 minutes, you get three short missions a day, whatever you pick.',
      30: 'With 30 minutes, you get two short missions and one focused one a day, whatever you pick.',
      45: 'With 45 minutes, you get one short mission and two focused ones a day. Your pick here sets how long the focused ones run.',
    },
    /**
     * `body` with an hour or more; `later` on a 15 or 30 minute day, where every card
     * gets the same day (what it does once there's more time); `at45` on a 45 minute day.
     */
    intensity: {
      easy: {
        name: 'Start easy',
        body: 'Three missions a day, shorter ones.',
        later: 'With more time a day: three missions, shorter ones.',
        at45: 'The focused ones stay shorter.',
      },
      lockin: {
        name: 'Lock in',
        body: 'Three missions a day: one easy, two that take real focus.',
        later: 'With more time a day: one easy, two that take real focus.',
        at45: 'The focused ones take real focus.',
      },
      push: {
        name: 'Push me',
        body: 'Four missions a day, longer sessions.',
        later: 'With more time a day: four missions, longer sessions.',
        at45: 'The focused ones run a little longer.',
      },
    } satisfies Record<Profile['intensity'], { name: string; body: string; later: string; at45: string }>,
    a11yIntensity: (name: string, body: string) => `${spoken(name)}. ${body}`,
  },

  goal: {
    title: 'What are you working toward?',
    body: 'Optional. A few words, and your missions lean toward it.',
    placeholder: 'In your own words',
    a11yInput: "What you're working toward",
    count: (n: number) => `${n} / ${GOAL_MAX}`,
    a11yCount: (n: number) => `${GOAL_MAX - n} characters left`,
    examplesLabel: 'Or start from one of these',
    examples: ['Get my GPA up', 'Launch my clothing brand', 'Get an internship', 'Build muscle', 'Learn coding', 'Save $1,000'],
    a11yExample: (text: string) => `Use ${text}`,
    clear: 'Clear',
    /** Under the field when what's typed matches nothing the plan can lean toward (core/personalize goalLean). Each word named here does. */
    noMatch: "This doesn't match any missions yet. Words like gym, grades, job, savings or coding steer them.",
  },

  /** Reminders: onboarding, and You › Reminders. */
  day: {
    title: 'When should we remind you?',
    body: 'Only about your missions, never more than you set. Change them any time in You.',
    remindersTitle: 'Reminders',
    notificationTitle: 'unsetld',
    /** The preview names today's missions, as the first reminder of the day will. */
    previewBody: (titles: string[]) =>
      `Today: ${(titles.length ? titles : ['Study for 30 Minutes', 'Complete Your Workout', 'Plan Tomorrow']).join(', ')}.`,
    a11yPreview: (time: string, body: string) => `Notification preview. unsetld, ${time}. ${body}`,
    /** You › Reminders: the switch that turns them all off. */
    toggle: 'Remind me',
    perDay: 'Reminders a day',
    /** You › Reminders only, under the locked counts. Onboarding shows just the counts the user can pick. */
    perDayNote: 'More than 3 a day comes with UNSETLD+.',
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
