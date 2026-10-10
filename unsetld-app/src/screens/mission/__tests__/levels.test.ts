// The done stage's area line (R31): a proof that takes its area to a new level, or the XP it added.
import { describe, expect, it } from 'vitest';
import { emptyRecord } from '../../../core/record';
import type { MissionDone, RecordState, TrackId } from '../../../core/types';
import { areaGain } from '../levels';

const proof = (missionId: string, track: TrackId, points: number, accepted = true): MissionDone => ({
  missionId,
  slot: 'main',
  track,
  points,
  doneAt: 0,
  photos: [],
  verification: { status: accepted ? 'accepted' : 'rejected', method: 'on-device', checks: [], at: 0 } as MissionDone['verification'],
});

const record = (days: Record<string, MissionDone[]>): RecordState => ({
  ...emptyRecord(),
  missions: Object.fromEntries(Object.entries(days).map(([d, ms]) => [d, Object.fromEntries(ms.map(m => [m.missionId, m]))])),
});

describe('areaGain', () => {
  it('a proof that crosses a level: School 40 → 55 is level 1 → 2', () => {
    const r = record({ '2026-10-14': [proof('school-a', 'school', 40)], '2026-10-21': [proof('school-practice-problems', 'school', 15)] });
    const g = areaGain(r, '2026-10-21', 'school-practice-problems');
    expect(g).toMatchObject({ track: 'school', points: 15, up: true });
    expect(g?.before).toEqual({ level: 1, into: 40, span: 50 });
    expect(g?.after).toEqual({ level: 2, into: 5, span: 100 });
  });

  it('landing exactly on the threshold is the new level', () => {
    const r = record({ '2026-10-14': [proof('school-a', 'school', 140)], '2026-10-21': [proof('school-b', 'school', 10)] });
    expect(areaGain(r, '2026-10-21', 'school-b')).toMatchObject({ up: true, after: { level: 3, into: 0, span: 150 } });
  });

  it('no new level: the XP it added and where the area stands', () => {
    const r = record({ '2026-10-21': [proof('school-a', 'school', 15), proof('school-b', 'school', 10)] });
    const g = areaGain(r, '2026-10-21', 'school-b');
    expect(g).toMatchObject({ track: 'school', points: 10, up: false, after: { level: 1, into: 25, span: 50 } });
  });

  it('counts only the area the proof was credited to', () => {
    const r = record({ '2026-10-21': [proof('school-a', 'school', 45), proof('fitness-a', 'fitness', 20)] });
    expect(areaGain(r, '2026-10-21', 'fitness-a')).toMatchObject({ track: 'fitness', up: false, after: { level: 1, into: 20 } });
  });

  it('nothing for a mission that is not proven, or an area the app no longer has', () => {
    const r = record({ '2026-10-21': [proof('school-a', 'school', 15, false), proof('old-a', 'mindset' as TrackId, 15)] });
    expect(areaGain(r, '2026-10-21', 'school-a')).toBeNull();
    expect(areaGain(r, '2026-10-21', 'old-a')).toBeNull();
    expect(areaGain(r, '2026-10-21', 'missing')).toBeNull();
    expect(areaGain(emptyRecord(), '2026-10-21', 'school-a')).toBeNull();
  });
});
