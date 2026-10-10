import { describe, expect, it } from 'vitest';
import { goalLean } from '../../core/personalize';
import { ONBOARDING } from '../copy/onboarding';

const steers = (text: string) => {
  const lean = goalLean(text);
  return lean.areas.length + lean.tags.length > 0;
};

describe('goal copy only promises what goalLean does', () => {
  it('every word the no-match note offers steers missions', () => {
    const named = ONBOARDING.goal.noMatch.match(/Words like (.+) steer them\./)?.[1];
    expect(named).toBeTruthy();
    const words = named!.split(/, | or /);
    expect(words.length).toBeGreaterThan(1);
    for (const w of words) expect(steers(w), w).toBe(true);
  });

  it('every example chip steers missions', () => {
    for (const e of ONBOARDING.goal.examples) expect(steers(e), e).toBe(true);
  });

  // Typed in the Goal step or as a weekly "Something else": none of these may get the no-match note.
  it('everyday goals steer missions, so the note stays hidden', () => {
    const everyday = [
      'work out more',
      'Get a better job',
      'save money',
      'get in shape',
      'get good grades',
      'study more',
      'make more money',
      'read more',
      'wake up earlier',
      'stop procrastinating',
      'get organized',
      'learn guitar',
      'Improve grades and work out consistently.',
      'Get in shape, save money and advance professionally.',
    ];
    for (const g of everyday) expect(steers(g), g).toBe(true);
  });

  it('text with no keyword steers nothing, so the note shows', () => {
    expect(steers('qwerty asdf')).toBe(false);
  });
});
