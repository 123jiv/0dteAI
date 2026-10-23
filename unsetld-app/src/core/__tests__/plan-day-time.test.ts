// A Plan day keeps every Plan mission, so it can run past the time the user chose (7 Day Lock In
// at 15 minutes: 35, 30, 35, 50, 30, 30, 35). The Plans list says so on the card ("Some days run
// up to 50 minutes.") whenever a real Plan day, as the planner builds it, runs past the user's
// day, and the number it gives is never under the Plan's own minutes for any day (UX review 3).
import { describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS, PROGRAMS } from '../../content';
import { PROGRAMS_COPY } from '../../content/copy/programs';
import { dayBudget, DEFAULT_PROFILE, generatePlan, historyFrom } from '../missions';
import { longestPlanDay } from '../programs';
import { addDays } from '../time';
import type { Profile } from '../types';

const minutesOf = (id: string) => MISSION_BY_ID[id]?.minutes;
const TIMES: Pick<Profile, 'minutes' | 'intensity'>[] = [
  { minutes: 15, intensity: 'lockin' },
  { minutes: 30, intensity: 'lockin' },
  { minutes: 45, intensity: 'lockin' },
  { minutes: 60, intensity: 'easy' },
  { minutes: 60, intensity: 'lockin' },
  { minutes: 60, intensity: 'push' },
];

describe('longestPlanDay', () => {
  it("is the longest day of the Plan's own missions", () => {
    const lock = PROGRAMS.find(p => p.id === 'lock-in-7')!;
    expect(lock.plan.map(d => d.reduce((s, id) => s + (minutesOf(id) ?? 0), 0))).toEqual([35, 30, 35, 50, 30, 30, 35]);
    expect(longestPlanDay(lock, minutesOf)).toBe(50);
    expect(longestPlanDay({ plan: [] }, minutesOf)).toBe(0);
    expect(longestPlanDay({ plan: [['gone']] }, minutesOf)).toBe(0);
  });

  it('the card line', () => {
    expect(PROGRAMS_COPY.overTime(50)).toBe('Some days run up to 50 minutes.');
    expect(PROGRAMS_COPY.cardA11y('7 Day Lock In', 'Build seven days of consistency.', 7, ['Discipline'], PROGRAMS_COPY.overTime(50))).toBe(
      '7 Day Lock In. Build seven days of consistency. 7 days, Discipline. Some days run up to 50 minutes.',
    );
    expect(PROGRAMS_COPY.cardA11y('7 Day Lock In', 'Build seven days of consistency.', 7, ['Discipline'], null)).toBe('7 Day Lock In. Build seven days of consistency. 7 days, Discipline.');
  });

  it("says so whenever a real Plan day runs past the user's day, for every plan and time", () => {
    const shown: string[] = [];
    for (const time of TIMES) {
      for (const p of PROGRAMS) {
        const tracks = p.tracks.length >= 2 ? p.tracks.slice(0, 2) : [p.tracks[0], p.tracks[0] === 'discipline' ? 'fitness' : 'discipline'];
        const profile: Profile = { ...DEFAULT_PROFILE, tracks, ...time };
        const budget = dayBudget(profile);
        const longest = longestPlanDay(p, minutesOf);
        let over = false;
        p.plan.forEach((ids, i) => {
          const day = addDays('2026-10-19', i);
          const plan = generatePlan({ library: MISSIONS, profile, day, salt: 'x', history: historyFrom({}, {}, {}, day, id => id in MISSION_BY_ID), hour: 8, program: { id: p.id, missionIds: ids } });
          const planned = plan.missions.filter(m => m.programId === p.id);
          const own = planned.reduce((s, m) => s + (minutesOf(m.missionId) ?? 0), 0);
          expect(own, `${p.id} day ${i + 1}`).toBeLessThanOrEqual(longest);
          if (own > budget) over = true;
        });
        if (over) expect(longest, `${p.id} at ${time.minutes}`).toBeGreaterThan(budget);
        if (longest > budget) shown.push(`${time.minutes}${time.minutes === 60 ? time.intensity : ''} ${p.id}`);
      }
    }
    // Every plan at 15 and 30 minutes; none with an hour or more.
    expect(shown.filter(s => s.startsWith('15 ')).length).toBe(PROGRAMS.length);
    expect(shown.some(s => s.startsWith('60'))).toBe(false);
  });
});
