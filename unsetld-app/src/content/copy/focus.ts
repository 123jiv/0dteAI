// "What matters most this week?" (Today, at the start of a week, and You). The plan leans
// toward the answer all week (core/personalize). Sentence case, no exclamation marks.
import type { FocusId, WeeklyFocus } from '../../core/types';

const OPTIONS = {
  'school-catchup': 'Get caught up in school',
  exam: 'Prepare for an exam',
  business: 'Make progress on my business',
  gym: 'Get back into training',
  project: 'Finish my project',
  apply: 'Apply for jobs or internships',
  // No longer offered (3.2 keeps the list to eight); a focus already set still reads.
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
  /** Order on the screen: eight, kept light. */
  order: ['school-catchup', 'business', 'gym', 'project', 'exam', 'save', 'apply', 'other'] as FocusId[],
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
  /** An option as the user reads it. `gym` is kept for callers; "Get back into training" fits with or without one. */
  option: (id: FocusId, gym?: boolean | null): string => (void gym, OPTIONS[id]),
  /** What a focus reads as: the option, or what they typed for "Something else". */
  label: (f: Pick<WeeklyFocus, 'id' | 'text'>, gym?: boolean | null): string => (void gym, f.id === 'other' ? f.text?.trim() || OPTIONS.other : (OPTIONS[f.id] ?? OPTIONS.other)),
};
