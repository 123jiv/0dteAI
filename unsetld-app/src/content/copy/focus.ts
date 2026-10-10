// "What matters most this week?" (Today, at the start of a week, and You). The plan leans
// toward the answer all week (core/personalize). Sentence case, no exclamation marks.
import type { FocusId, WeeklyFocus } from '../../core/types';

const OPTIONS = {
  'school-catchup': 'Catch up in school',
  exam: 'Prepare for an exam',
  business: 'Work on my business',
  gym: 'Get back in the gym',
  project: 'Finish a project',
  routine: 'Improve my routine',
  organize: 'Get my space in order',
  save: 'Save money',
  skill: 'Learn a skill',
  other: 'Something else',
} satisfies Record<FocusId, string>;

export const FOCUS = {
  title: 'What matters most this week?',
  body: 'Your missions lean toward it all week.',
  options: OPTIONS,
  /** Order on the screen. */
  order: ['school-catchup', 'exam', 'business', 'gym', 'project', 'routine', 'organize', 'save', 'skill', 'other'] as FocusId[],
  /** "Something else": the most they can type. */
  otherMax: 60,
  otherPlaceholder: 'In a few words',
  otherA11y: 'What matters most this week, in your words',
  otherCount: (n: number, max: number) => `${n} / ${max}`,
  /** Under the field when what's typed matches nothing the plan can lean toward (core/personalize goalLean). */
  otherNoMatch: "This doesn't match any missions yet. Pick an option above to steer them.",
  save: 'Set this week',
  skip: 'Not this week',
  clear: 'Clear this week',
  /** The card on Today when it's a new week and nothing is set. */
  prompt: 'What matters most this week?',
  promptBody: 'Pick one and your missions lean toward it.',
  /** The card's own call to action. */
  promptGo: 'Choose',
  promptA11y: 'What matters most this week? Pick one and your missions lean toward it.',
  promptHint: 'Opens the weekly focus',
  skipA11y: 'Not this week. Hides the question until next week',
  /** The line on Today once it's set ("This week: Work on my business"). */
  current: (label: string) => `This week: ${label}`,
  currentHint: 'Change this week’s focus',
  /** An option as the user reads it: "Get back in the gym" only for someone with a gym. */
  option: (id: FocusId, gym?: boolean | null): string => (id === 'gym' && gym !== true ? 'Get back to working out' : OPTIONS[id]),
  /** What a focus reads as: the option, or what they typed for "Something else". */
  label: (f: Pick<WeeklyFocus, 'id' | 'text'>, gym?: boolean | null): string =>
    f.id === 'other' ? f.text?.trim() || OPTIONS.other : f.id === 'gym' && gym !== true ? 'Get back to working out' : (OPTIONS[f.id] ?? OPTIONS.other),
};
