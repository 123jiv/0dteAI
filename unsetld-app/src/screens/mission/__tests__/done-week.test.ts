// The done stage's record moment: this week's row of dots, and today's dot before the proof
// just made, which the screen moves from (ring → small dot → large → solid).
import { describe, expect, it } from 'vitest';
import { emptyRecord } from '../../../core/record';
import type { DayKey } from '../../../core/time';
import type { DayPlan, MissionDone, RecordState } from '../../../core/types';
import { doneWeek, levelBefore } from '../levels';

const accepted = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };
const proof = (id: string): MissionDone => ({ missionId: id, slot: 'main', track: 'school', points: 10, doneAt: 1, photos: [], verification: accepted });

function rec(days: Record<DayKey, string[]>, extra: Partial<RecordState> = {}): RecordState {
  const missions = Object.fromEntries(Object.entries(days).map(([d, ids]) => [d, Object.fromEntries(ids.map(id => [id, proof(id)]))]));
  return { ...emptyRecord(), missions, ...extra };
}

const plan = (day: DayKey, ids: string[]): DayPlan => ({ day, missions: ids.map(id => ({ slot: 'main', missionId: id, area: 'school' })), rerolls: 0, replaced: [] });

// Wednesday 14 October 2026; its week starts Monday the 12th.
const WED = '2026-10-14';

describe('the week row', () => {
  it('Day 1 on a Wednesday: the days before the record are faint, not missed; today has one; the rest are to come', () => {
    const week = doneWeek(rec({ [WED]: ['a'] }), { [WED]: plan(WED, ['a', 'b', 'c']) }, WED);
    expect(week.map(d => d.mark.day)).toEqual(['2026-10-12', '2026-10-13', WED, '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(week.map(d => d.before)).toEqual([true, true, false, false, false, false, false]);
    expect(week.map(d => d.mark.when)).toEqual(['past', 'past', 'today', 'future', 'future', 'future', 'future']);
    expect(week[2].mark.level).toBe('one');
    expect(levelBefore(week, 1)).toBe('none');
  });

  it('a missed day after the record started reads as missed', () => {
    const week = doneWeek(rec({ '2026-10-12': ['x', 'y'], [WED]: ['a', 'b'] }), {}, WED);
    expect(week[0]).toMatchObject({ before: false, mark: { level: 'two' } });
    expect(week[1]).toMatchObject({ before: false, mark: { level: 'none', proven: 0 } });
    expect(week[2].mark.level).toBe('two');
    expect(levelBefore(week, 2)).toBe('one');
  });

  it('the last of three: today turns solid, and was two before', () => {
    const r = rec({ [WED]: ['a', 'b', 'c'] }, { bonuses: { [WED]: 15 } });
    const week = doneWeek(r, { [WED]: plan(WED, ['a', 'b', 'c']) }, WED);
    expect(week[2].mark.level).toBe('perfect');
    expect(levelBefore(week, 3)).toBe('two');
  });

  it('a 2.x day on record counts as on the record, not before it', () => {
    const r = rec({ [WED]: ['a'] }, { days: { '2026-10-12': { verified: true } } });
    const week = doneWeek(r, {}, WED);
    expect(week[0]).toMatchObject({ before: false, mark: { legacy: true, level: 'one' } });
    expect(week[1].before).toBe(false);
  });

  it('falls back to the count when today is somehow not in the week', () => {
    expect(levelBefore([], 2)).toBe('one');
    expect(levelBefore([], 0)).toBe('none');
  });
});
