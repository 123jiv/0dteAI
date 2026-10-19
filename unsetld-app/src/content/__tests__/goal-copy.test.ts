import { describe, expect, it } from 'vitest';
import { focusNeedsArea, goalQuestion } from '../../core/areaChoice';
import { DEFAULT_PROFILE } from '../../core/missions';
import { goalLean } from '../../core/personalize';
import { checkText } from '../../core/safety';
import type { Profile } from '../../core/types';
import { MISSIONS } from '..';
import { FOCUS } from '../copy/focus';
import { ONBOARDING } from '../copy/onboarding';

/** Someone with Fitness and Discipline: the example below names neither. */
const ME: Profile = { ...DEFAULT_PROFILE, tracks: ['fitness', 'discipline'], school: null };

const steers = (text: string) => {
  const lean = goalLean(text);
  return lean.areas.length + lean.tags.length > 0;
};

describe('goal copy only promises what goalLean does', () => {
  it('every example chip steers missions, and passes the text check', () => {
    for (const e of ONBOARDING.goal.examples) {
      expect(steers(e), e).toBe(true);
      expect(checkText(e).level, e).toBe('ok');
    }
  });

  // Typed in the Goal step or as a weekly "Something else": each of these names something.
  it('everyday goals steer missions', () => {
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
      // Launch pass keyword fixes.
      'Pass calculus',
      'Get promoted',
      'Lock in',
      'Grow my TikTok',
      'Pay off my credit card',
    ];
    for (const g of everyday) expect(steers(g), g).toBe(true);
  });

  it('text with no keyword steers nothing, so the area question shows instead of a dead end', () => {
    expect(steers('qwerty asdf')).toBe(false);
    expect(goalQuestion(MISSIONS, ME, 'qwerty asdf', '2026-10-21').ask).toBe(true);
    expect(focusNeedsArea('qwerty asdf')).toBe(true);
  });

  it('text the check refuses never gets the area question or a hint', () => {
    for (const t of ['I want to die', 'kms', 'Starve myself', 'Buy a vape', 'Win at the casino']) {
      expect(goalQuestion(MISSIONS, ME, t, '2026-10-21').ask, t).toBe(false);
      expect(focusNeedsArea(t), t).toBe(false);
    }
  });

  it('a "Something else" the check refuses reads as "Something else" on Today and in You', () => {
    expect(FOCUS.label({ id: 'other', text: 'Sort my room' })).toBe('Sort my room');
    expect(FOCUS.label({ id: 'other', text: 'Win at the casino' })).toBe('Something else');
    expect(FOCUS.label({ id: 'other', text: 'kms' })).toBe('Something else');
    expect(FOCUS.label({ id: 'other', text: '  ' })).toBe('Something else');
    expect(FOCUS.label({ id: 'gym' })).toBe('Get back into training');
  });
});

describe('the area question keeps the voice', () => {
  it('no "!", no emoji, sentence case', () => {
    for (const t of [ONBOARDING.goal.area, ONBOARDING.goal.outside('School'), FOCUS.otherArea]) {
      expect(t, t).not.toMatch(/!|\p{Extended_Pictographic}/u);
      expect(t.charAt(0), t).toBe(t.charAt(0).toUpperCase());
    }
    expect(ONBOARDING.goal.outside('School')).toBe("School isn't one of your areas.");
  });
});
