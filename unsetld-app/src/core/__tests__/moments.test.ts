// Today's full-screen moments (launch pass P1-8): a Plan finished today or yesterday comes first
// and stands in for the milestones reached with it; otherwise the newest milestone; one a day.
import { describe, expect, it } from 'vitest';
import { DONE_SAYS, dueMoment, momentDayKey, momentShownOn } from '../moments';
import { planMomentKey, recordPlanFinish } from '../programs';
import { emptyRecord } from '../record';
import { addDays, type DayKey } from '../time';
import type { MissionDone, RecordState } from '../types';

const ok = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };
const done = (id: string): MissionDone => ({ missionId: id, slot: 'main', track: 'discipline', points: 10, doneAt: 1, photos: [], verification: ok });

/** One mission proven a day for `n` days from `from`, a perfect day on each listed day. */
function daysFrom(from: DayKey, n: number, perfect: DayKey[] = []): RecordState {
  const missions: RecordState['missions'] = {};
  for (let i = 0; i < n; i++) missions[addDays(from, i)] = { [`m${i}`]: done(`m${i}`) };
  return { ...emptyRecord(), missions, bonuses: Object.fromEntries(perfect.map(d => [d, 15])) };
}

const D1 = '2026-10-12'; // Monday
const D7 = '2026-10-18';
const D10 = '2026-10-21';

describe('milestone moments', () => {
  it('nothing reached, nothing to show', () => {
    expect(dueMoment(emptyRecord(), D1, [])).toBeNull();
  });

  it('marks what the Done stage already said without a moment', () => {
    expect(DONE_SAYS).toEqual(['first-mission', 'perfect-day']);
    const r = daysFrom(D1, 1, [D1]);
    expect(dueMoment(r, D1, [])).toEqual({ moment: null, covers: ['first-mission', 'perfect-day'] });
  });

  it('shows the newest one reached, standing in for the rest (a restored record gets one)', () => {
    const r = daysFrom(D1, 10, [D1]);
    const due = dueMoment(r, D10, []);
    expect(due?.moment).toEqual({ kind: 'milestone', key: 'missions-10' });
    expect(due?.covers).toEqual(['first-mission', 'missions-10', 'perfect-day', 'streak-7', momentDayKey(D10)]);
    expect(dueMoment(r, D10, due!.covers)).toBeNull();
  });
});

describe('the Plan moment', () => {
  // Seven days in a row, the last a perfect day, finishing 7 Day Lock In.
  const r = recordPlanFinish(daysFrom(D1, 7, [D7]), 'lock-in-7', D7);
  const shownBefore = ['first-mission', 'perfect-day'];

  it('comes first, and stands in for the milestones reached with it', () => {
    const due = dueMoment(r, D7, shownBefore);
    expect(due?.moment).toEqual({ kind: 'plan', id: 'lock-in-7', day: D7 });
    expect(due?.covers).toEqual([planMomentKey('lock-in-7', D7), 'streak-7', 'plan-1', momentDayKey(D7)]);
    // Once shown: nothing else today, and nothing tomorrow either.
    const seen = [...shownBefore, ...due!.covers];
    expect(dueMoment(r, D7, seen)).toBeNull();
    expect(dueMoment(r, addDays(D7, 1), seen)).toBeNull();
  });

  it('shows the day after too, but never once the finish is older than yesterday', () => {
    expect(dueMoment(r, addDays(D7, 1), shownBefore)?.moment).toEqual({ kind: 'plan', id: 'lock-in-7', day: D7 });
    // Two days on (an update, a restore, a moment that waited too long): no Plan moment. Its
    // achievement is still new, so it shows as itself.
    const later = dueMoment(r, addDays(D7, 2), shownBefore);
    expect(later?.moment).toEqual({ kind: 'milestone', key: 'plan-1' });
    expect(later?.covers).not.toContain(planMomentKey('lock-in-7', D7));
  });

  it('a restored record with an old finish gets no Plan moment', () => {
    const old = recordPlanFinish(daysFrom('2026-09-01', 7), 'get-organized', '2026-09-05');
    const due = dueMoment(old, D7, []);
    expect(due?.moment?.kind).toBe('milestone');
  });

  it('is shown once: its key marked, it never comes back', () => {
    const seen = [...shownBefore, planMomentKey('lock-in-7', D7)];
    expect(dueMoment(r, D7, seen)?.moment).toEqual({ kind: 'milestone', key: 'plan-1' });
  });

  it('needs the Plan to still be in the app', () => {
    const due = dueMoment(r, D7, shownBefore, id => id !== 'lock-in-7');
    expect(due?.moment).toEqual({ kind: 'milestone', key: 'plan-1' });
  });

  it('every finish gets one: a second run of the same Plan too, keyed by its own day', () => {
    const again = recordPlanFinish(r, 'lock-in-7', '2026-10-25');
    const seen = [...shownBefore, planMomentKey('lock-in-7', D7), 'plan-1', 'streak-7', momentDayKey(D7)];
    const due = dueMoment(again, '2026-10-25', seen);
    expect(due?.moment).toEqual({ kind: 'plan', id: 'lock-in-7', day: '2026-10-25' });
    expect(due?.covers).toEqual([planMomentKey('lock-in-7', '2026-10-25'), momentDayKey('2026-10-25')]);
  });
});

describe('one full-screen moment a day', () => {
  it('a milestone reached after the day had its moment waits for the next day', () => {
    const r = daysFrom(D1, 10, [D1]);
    const seen = ['first-mission', 'perfect-day', 'streak-7', momentDayKey(D10)];
    expect(momentShownOn(seen, D10)).toBe(true);
    expect(momentShownOn(seen, addDays(D10, 1))).toBe(false);
    expect(dueMoment(r, D10, seen)).toBeNull();
    expect(dueMoment(r, addDays(D10, 1), seen)?.moment).toEqual({ kind: 'milestone', key: 'missions-10' });
  });

  it('so does a Plan finished after it, while still in its window', () => {
    const r = recordPlanFinish(daysFrom(D1, 7), 'lock-in-7', D7);
    const seen = ['first-mission', 'streak-7', momentDayKey(D7)];
    expect(dueMoment(r, D7, seen)).toBeNull();
    expect(dueMoment(r, addDays(D7, 1), seen)?.moment).toEqual({ kind: 'plan', id: 'lock-in-7', day: D7 });
  });

  it('still marks what Done said on such a day', () => {
    const r = daysFrom(D1, 1, [D1]);
    expect(dueMoment(r, D1, ['first-mission', momentDayKey(D1)])).toEqual({ moment: null, covers: ['perfect-day'] });
  });
});
