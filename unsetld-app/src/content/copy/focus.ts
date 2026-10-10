// "What matters most this week?" (Today, at the start of a week, and You). The plan leans
// toward the answer all week (core/personalize). Sentence case, no exclamation marks.
import type { FocusId } from '../../core/types';

export const FOCUS = {
  title: 'What matters most this week?',
  body: 'Your missions lean toward it all week.',
  options: {
    'school-catchup': 'Catch up in school',
    exam: 'Prepare for an exam',
    business: 'Work on my business',
    gym: 'Get back in the gym',
    project: 'Finish a project',
    routine: 'Improve my routine',
    save: 'Save money',
    skill: 'Learn a skill',
    other: 'Something else',
  } satisfies Record<FocusId, string>,
  /** Order on the screen. */
  order: ['school-catchup', 'exam', 'business', 'gym', 'project', 'routine', 'save', 'skill', 'other'] as FocusId[],
  otherPlaceholder: 'In a few words',
  save: 'Set this week',
  skip: 'Not this week',
  clear: 'Clear this week',
  /** The card on Today when it's a new week and nothing is set. */
  prompt: 'What matters most this week?',
  promptBody: 'Pick one and your missions lean toward it.',
  promptA11y: 'Set what matters most this week',
  /** The line on Today once it's set ("This week: Work on my business"). */
  current: (label: string) => `This week: ${label}`,
};
