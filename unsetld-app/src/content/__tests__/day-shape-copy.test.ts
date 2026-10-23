// The copy that states the day's shape says what the planner does (core/missions DAY_SHAPE): the
// line under the minutes on the Time step, the "How hard?" cards (an hour or more only), the
// record doc's "Your missions" paragraph, You › Time and intensity, and "N missions are waiting".
import { describe, expect, it } from 'vitest';
import { dayBudget, longestFor, slotsFor } from '../../core/missions';
import type { Profile } from '../../core/types';
import { ONBOARDING } from '../copy/onboarding';
import { PLATFORM } from '../copy/platform';
import legal from '../legal.json';

const NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
const MINUTES: Profile['minutes'][] = [15, 30, 45, 60];
const INTENSITIES: Profile['intensity'][] = ['easy', 'lockin', 'push'];
const PACE = ONBOARDING.pace;

/** The mission counts a line names ("Three or four missions" → [3, 4]). */
function counts(line: string): number[] {
  const m = /^([a-z]+)(?: or ([a-z]+))? missions?\b/i.exec(line);
  expect(m, line).not.toBeNull();
  return [m![1], m![2]].filter(Boolean).map(w => NUMBER[w!.toLowerCase()]);
}

describe('the day shape, as the copy states it', () => {
  it('the line under each time choice names as many missions as the day has, and its minutes', () => {
    for (const minutes of [15, 30, 45] as const) {
      const sizes = new Set(INTENSITIES.map(intensity => slotsFor({ minutes, intensity }).length));
      expect(sizes.size, `${minutes}: intensity changes nothing below an hour`).toBe(1);
      expect(counts(PACE.shape[minutes]), PACE.shape[minutes]).toEqual([...sizes]);
    }
    expect(PACE.shape[15]).toContain(`${dayBudget({ minutes: 15, intensity: 'lockin' })} minutes at most`);
    expect(longestFor({ minutes: 15, intensity: 'lockin' })).toBeLessThanOrEqual(20);
    // 30: the budget is 35 and most days come to 35 (the simulation: p10 30, p90 40), so the line
    // gives the range, not "about 30" (UX review 4).
    expect(PACE.shape[30]).toContain('About 30 to 40 minutes');
    const thirty = dayBudget({ minutes: 30, intensity: 'lockin' });
    expect(thirty).toBeGreaterThan(30);
    expect(thirty).toBeLessThanOrEqual(40);
    expect(PACE.shape[45]).toContain('About 45 minutes');
    // An hour or more: three or four, by how hard.
    expect(counts(PACE.shape[60])).toEqual([...new Set(INTENSITIES.map(intensity => slotsFor({ minutes: 60, intensity }).length))].sort());
  });

  it('VoiceOver hears each time choice with the day it gives (the shape line is not read on its own)', () => {
    expect(PACE.a11yMinutesOption(PACE.a11yMinutes[30], PACE.shape[30])).toBe('30 minutes. Two missions a day. About 30 to 40 minutes.');
    expect(PACE.a11yMinutesOption(PACE.a11yMinutes[60], PACE.shape[60])).toBe('An hour or more. Three or four missions a day, by how hard you want it.');
    for (const n of MINUTES) expect(PACE.a11yMinutesOption(PACE.a11yMinutes[n], PACE.shape[n])).toContain(PACE.shape[n]);
  });

  it('the "How hard?" cards name the missions each intensity gives with an hour or more', () => {
    for (const intensity of INTENSITIES) expect(counts(PACE.intensity[intensity].body), intensity).toEqual([slotsFor({ minutes: 60, intensity }).length]);
    // Start easy: shorter sessions (its longest mission is shorter than Lock in's); Push me: about an hour and a half.
    expect(longestFor({ minutes: 60, intensity: 'easy' })).toBeLessThan(longestFor({ minutes: 60, intensity: 'lockin' }));
    expect(PACE.intensity.push.body).toContain('an hour and a half');
    expect(dayBudget({ minutes: 60, intensity: 'push' })).toBeGreaterThanOrEqual(90);
  });

  it("the record doc's day paragraph says the same", () => {
    const p = legal.record.sections.find(x => x.h === 'Your missions')!.p;
    const said = /with 15 minutes, ([a-z]+); with 30 or 45, ([a-z]+) that fit in about that time; with an hour or more, ([a-z]+), or ([a-z]+) with Push me\./.exec(p);
    expect(said, p).not.toBeNull();
    const [, at15, at30and45, hour, push] = said!.map(w => NUMBER[w]);
    expect(at15).toBe(slotsFor({ minutes: 15, intensity: 'lockin' }).length);
    for (const minutes of [30, 45] as const) expect(at30and45).toBe(slotsFor({ minutes, intensity: 'lockin' }).length);
    expect(hour).toBe(slotsFor({ minutes: 60, intensity: 'lockin' }).length);
    expect(hour).toBe(slotsFor({ minutes: 60, intensity: 'easy' }).length);
    expect(push).toBe(slotsFor({ minutes: 60, intensity: 'push' }).length);
  });

  it('You › Time and intensity names the intensity only with an hour or more', () => {
    expect(PLATFORM.you.paceValue(45, 'push')).toBe('45 min a day');
    expect(PLATFORM.you.paceValue(15, 'easy')).toBe('15 min a day');
    expect(PLATFORM.you.paceValue(60, 'push')).toBe('60+ min a day · Push me');
  });

  it('"N missions are waiting" counts one mission as one (a 15-minute day)', () => {
    for (const waiting of [PLATFORM.widgets.waiting, PLATFORM.notifications.waiting]) {
      expect(waiting(1)).toBe('One mission is waiting.');
      expect(waiting(2)).toBe('Two missions are waiting.');
      expect(waiting(4)).toBe('Four missions are waiting.');
    }
    for (const minutes of MINUTES) for (const intensity of INTENSITIES) expect(PLATFORM.widgets.waiting(slotsFor({ minutes, intensity }).length)).not.toMatch(/One missions|missions is/);
  });

  it('the Time step copy keeps the voice: sentence case, no exclamation marks', () => {
    const lines = [...Object.values(PACE.shape), ...INTENSITIES.map(i => PACE.intensity[i].body), PACE.hard, PACE.title];
    for (const line of lines) {
      expect(line, line).not.toMatch(/!/);
      expect(line[0], line).toBe(line[0].toUpperCase());
    }
  });
});
