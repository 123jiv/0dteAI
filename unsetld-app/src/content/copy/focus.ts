// "What matters most this week?" (Today, at the start of a week, and You). The plan leans
// toward the answer all week (core/personalize). Sentence case, no exclamation marks.
import { usableText } from '../../core/safety';
import type { FocusId, WeeklyFocus } from '../../core/types';

const OPTIONS = {
  'school-catchup': 'Get caught up in school',
  exam: 'Prepare for an exam',
  business: 'Make progress on my business',
  gym: 'Get back into training',
  project: 'Finish my project',
  apply: 'Apply for jobs or internships',
  // Offered again since the launch pass, so Discipline, Organization and Skills don't need
  // "Something else" (ids and what they lean toward unchanged).
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
  /**
   * Order on the screen: the founder's eight, then routine, space and skill before "Something
   * else". The screen puts the ones in the user's own areas first (core/review focusChoices).
   */
  order: ['school-catchup', 'business', 'gym', 'project', 'exam', 'save', 'apply', 'routine', 'organize', 'skill', 'other'] as FocusId[],
  /** "Something else": the most they can type. */
  otherMax: 60,
  otherPlaceholder: 'In a few words',
  otherA11y: 'What matters most this week, in your words',
  otherCount: (n: number, max: number) => `${n} / ${max}`,
  /**
   * Under the field when what's typed names no area (core/personalize goalLean), or an area was
   * picked for it before: the area chips (core/areaChoice focusAreaChoices). A pick is needed
   * before an unmatched answer can be set.
   */
  otherArea: 'Which area is this about?',
  save: 'Set this week',
  skip: 'Not this week',
  clear: 'Clear this week',
  /** The card on Today when it's a new week and nothing is set: the question and Choose, nothing more. */
  prompt: 'What matters most this week?',
  /** The card's own call to action. */
  promptGo: 'Choose',
  promptA11y: 'What matters most this week?',
  /** VoiceOver only: why it's worth answering, which the card leaves unsaid. */
  promptHint: 'Opens the weekly focus. Your missions lean toward it.',
  skipA11y: 'Not this week. Hides the question until next week',
  /** The line on Today once it's set ("This week: Work on my business"). */
  current: (label: string) => `This week: ${label}`,
  currentHint: 'Change this week’s focus',
  /** An option as the user reads it. `gym` is kept for callers; "Get back into training" fits with or without one. */
  option: (id: FocusId, gym?: boolean | null): string => (void gym, OPTIONS[id]),
  /**
   * What a focus reads as: the option, or what they typed for "Something else" (just "Something
   * else" for text the safety check refuses, core/safety, so it never shows on Today).
   */
  label: (f: Pick<WeeklyFocus, 'id' | 'text'>, gym?: boolean | null): string =>
    (void gym, f.id === 'other' ? (usableText(f.text, 'focus') ? f.text?.trim() : null) || OPTIONS.other : (OPTIONS[f.id] ?? OPTIONS.other)),
};
