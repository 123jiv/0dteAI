// The Goal step hides its upbeat examples ("Get my GPA up", "Build muscle" ...) under the support
// line, which gives where to get help and nothing else (UX review 5). Other notes keep them.
import { describe, expect, it } from 'vitest';
import { checkText } from '../../../core/safety';
import { showsGoalExamples } from '../goalExamples';

describe('showsGoalExamples', () => {
  it('not under the support line', () => {
    const r = checkText('I want to kill myself', 'goal');
    expect(r.level).toBe('support');
    expect(showsGoalExamples(r)).toBe(false);
  });

  it('with nothing typed, an ordinary goal, a note or a refusal', () => {
    expect(showsGoalExamples(null)).toBe(true);
    expect(showsGoalExamples(checkText('Get my GPA up', 'goal'))).toBe(true);
    expect(showsGoalExamples({ level: 'note' })).toBe(true);
    expect(showsGoalExamples({ level: 'block' })).toBe(true);
  });
});
