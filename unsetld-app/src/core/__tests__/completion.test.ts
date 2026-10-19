// Completion (launch pass P1-7): how much of each day you showed up was done. Counted from the
// record (record.planned first), only on days with a proof, never "0%" and never a rounded 100%.
// Also the weekly review on damaged records, and the 8th achievement, "First plan" (PF-3).
import { describe, expect, it } from 'vitest';
import { PROGRESS } from '../../content/copy/progress';
import { DEFAULT_PROFILE } from '../missions';
import { achievementsView, completionIn, completionPercent, finishedPlans, MILESTONES_30, milestones } from '../progress';
import { recordPlanFinish } from '../programs';
import { emptyRecord } from '../record';
import { weeklyReview } from '../review';
import type { DayKey } from '../time';
import type { DayPlan, MissionDone, RecordState } from '../types';

const MON: DayKey = '2026-10-12';
const TUE: DayKey = '2026-10-13';
const WED: DayKey = '2026-10-14';
const THU: DayKey = '2026-10-15';
const SUN: DayKey = '2026-10-18';

const ok = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };
const done = (id: string, extra: Partial<MissionDone> = {}): MissionDone => ({ missionId: id, slot: 'main', track: 'school', points: 10, doneAt: 1, photos: [], verification: ok, ...extra });

/** A record with the given missions proven on each day. */
function rec(days: Record<DayKey, string[]>, extra: Partial<RecordState> = {}): RecordState {
  const missions = Object.fromEntries(Object.entries(days).map(([d, ids]) => [d, Object.fromEntries(ids.map(id => [id, done(id)]))]));
  return { ...emptyRecord(), missions, ...extra };
}

const plan = (day: DayKey, ids: string[]): DayPlan => ({ day, missions: ids.map(id => ({ slot: 'main', missionId: id, area: 'school' })), rerolls: 0, replaced: [] });

describe('completionIn', () => {
  it('counts each proven day at its own size, the record first', () => {
    const r = rec({ [MON]: ['a', 'b'], [TUE]: ['c'], [WED]: ['d', 'e', 'f'] }, { planned: { [MON]: 3, [TUE]: 2, [WED]: 3 }, bonuses: { [WED]: 15 } });
    expect(completionIn(r, {}, MON, SUN)).toEqual({ days: 3, proven: 6, planned: 8, perfect: 1, percent: 75 });
  });

  it('reads the same once the plans are gone: pruned after six weeks, or a restore', () => {
    const r = rec({ [MON]: ['a'], [TUE]: ['b'] }, { planned: { [MON]: 3, [TUE]: 3 } });
    const plans = { [MON]: plan(MON, ['a', 'x', 'y']), [TUE]: plan(TUE, ['b', 'x', 'y']) };
    // Before 3.3 a restore read 2 of 2, "100%".
    expect(completionIn(r, {}, MON, SUN)).toMatchObject({ proven: 2, planned: 6, percent: 33 });
    expect(completionIn(r, {}, MON, SUN)).toEqual(completionIn(r, plans, MON, SUN));
  });

  it('falls back to the plan, then counts a day with neither as complete', () => {
    const r = rec({ [MON]: ['a'], [TUE]: ['b'], [WED]: ['c', 'd'] }, { bonuses: { [WED]: 15 } });
    const plans = { [MON]: plan(MON, ['a', 'x', 'y']) };
    // Monday's plan says 3; Tuesday has no size kept (1 of 1); Wednesday's bonus says it was all of it.
    expect(completionIn(r, plans, MON, SUN)).toEqual({ days: 3, proven: 4, planned: 6, perfect: 1, percent: 67 });
  });

  it('leaves out days with nothing proven: missed, covered by an Off Day, or opened and left', () => {
    const r = rec({ [MON]: ['a', 'b', 'c'], [THU]: ['d'] }, { planned: { [MON]: 3, [THU]: 2 } });
    // Tuesday was opened (a plan was made) and nothing was proven; Wednesday wasn't opened.
    const opened = { [TUE]: plan(TUE, ['x', 'y', 'z']) };
    expect(completionIn(r, opened, MON, SUN)).toEqual({ days: 2, proven: 4, planned: 5, perfect: 0, percent: 80 });
    expect(completionIn(r, {}, MON, SUN)).toEqual(completionIn(r, opened, MON, SUN));
  });

  it('counts today only once something is proven, at its full size', () => {
    const before = rec({}, { planned: {} });
    const plans = { [MON]: plan(MON, ['a', 'b', 'c']) };
    // Monday morning: nothing to count, so nothing is shown (never "0%" or "0 of 3").
    expect(completionIn(before, plans, MON, MON)).toEqual({ days: 0, proven: 0, planned: 0, perfect: 0, percent: null });
    const after = rec({ [MON]: ['a'] }, { planned: { [MON]: 3 } });
    expect(completionIn(after, plans, MON, MON)).toEqual({ days: 1, proven: 1, planned: 3, perfect: 0, percent: 33 });
  });

  it("counts a mission of the user's own like the mission it replaced", () => {
    // Two planned; one swapped for the user's own and proven. The day stays two.
    const r = rec({ [MON]: ['custom-k1'] }, { planned: { [MON]: 2 } });
    const plans = { [MON]: { ...plan(MON, ['custom-k1', 'S1']), replaced: ['P1'], rerolls: 1 } };
    expect(completionIn(r, plans, MON, MON)).toMatchObject({ proven: 1, planned: 2, percent: 50 });
  });

  it('never counts rejected or damaged entries, and never plans less than was proven', () => {
    const r: RecordState = {
      ...rec({ [MON]: ['a', 'b'] }, { planned: { [MON]: 1 } }),
    };
    r.missions[MON].bad = { ...done('bad'), verification: { ...ok, status: 'rejected' } } as MissionDone;
    r.missions[MON].none = null as unknown as MissionDone;
    r.missions[TUE] = null as unknown as Record<string, MissionDone>;
    expect(completionIn(r, {}, MON, SUN)).toEqual({ days: 1, proven: 2, planned: 2, perfect: 0, percent: 100 });
  });

  it('shows 100 only when complete, and 1 to 99 otherwise', () => {
    expect(completionPercent(3, 3)).toBe(100);
    expect(completionPercent(299, 300)).toBe(99);
    expect(completionPercent(1, 300)).toBe(1);
    expect(completionPercent(13, 17)).toBe(76);
    expect(completionPercent(0, 0)).toBeNull();
  });
});

describe('the weekly review', () => {
  it('shows missions proven out of what the proven days held', () => {
    const r = rec({ [MON]: ['a', 'b'], [WED]: ['c'] }, { planned: { [MON]: 3, [WED]: 2 } });
    expect(weeklyReview(r, {}, DEFAULT_PROFILE, MON)).toMatchObject({ missions: 3, planned: 5, activeDays: 2 });
  });

  it('reads damaged entries as nothing instead of crashing (Today reads it Sunday to Tuesday)', () => {
    const r = rec({ [MON]: ['a'] });
    r.missions[MON].gone = null as unknown as MissionDone;
    r.missions[MON].bare = { missionId: 'bare', slot: 'main', track: 'school', doneAt: 1 } as unknown as MissionDone;
    r.missions[TUE] = { nopoints: { ...done('nopoints'), points: undefined, timerSeconds: Number.NaN } as unknown as MissionDone };
    r.missions[WED] = null as unknown as Record<string, MissionDone>;
    const plans = { [MON]: { ...plan(MON, ['a']), missions: [null, { slot: 'main', missionId: 'a', area: 'fitness' }] } as unknown as DayPlan };
    const w = weeklyReview(r, plans, DEFAULT_PROFILE, MON);
    expect(w).toMatchObject({ missions: 2, points: 10, focusMinutes: 0, activeDays: 2 });
    expect(w.byTrack).toEqual({ fitness: 1, school: 1 });
    expect(Number.isNaN(w.points)).toBe(false);
  });
});

describe('the first plan (the 8th achievement)', () => {
  const r = rec({ [MON]: ['a'] });

  it('comes after the 7-day streak, so the row reads "x of 8"', () => {
    expect(MILESTONES_30).toHaveLength(8);
    const keys = MILESTONES_30.map(m => m.key);
    expect(keys.indexOf('plan-1')).toBe(keys.indexOf('streak-7') + 1);
    const ms = milestones(r, MON);
    expect(PROGRESS.record.achievementsValue(achievementsView(ms).reached.length, ms.length)).toBe('1 of 8');
  });

  it("is reached on the first Plan's finish day, and no other way", () => {
    expect(milestones(r, MON).find(m => m.key === 'plan-1')).toMatchObject({ reached: null, progress: 0 });
    let done2 = recordPlanFinish(r, 'get-organized', THU);
    done2 = recordPlanFinish(done2, 'lock-in-7', SUN);
    expect(milestones(done2, SUN).find(m => m.key === 'plan-1')).toMatchObject({ kind: 'plan', reached: THU, progress: 1 });
    // Next to reach, it says what it takes and shows no count.
    expect(PROGRESS.achievements.byKey['plan-1']).toEqual({ title: 'First plan', how: 'Prove every day of one plan.' });
    expect(PROGRESS.achievements.progress('plan', 0, 1)).toBe('');
  });

  it('reads the finishes oldest first and skips damaged ones', () => {
    const odd = { ...r, plansFinished: [{ id: 'b', finished: SUN }, null, { id: '', finished: MON }, { id: 'a', finished: TUE }, { id: 'c' }] } as unknown as RecordState;
    expect(finishedPlans(odd)).toEqual([
      { id: 'a', finished: TUE },
      { id: 'b', finished: SUN },
    ]);
    expect(finishedPlans(emptyRecord())).toEqual([]);
  });
});
