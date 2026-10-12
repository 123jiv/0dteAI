// Proof history by date, mission and area, and a proof's title and area wherever it shows.
import { describe, expect, it } from 'vitest';
import { dayDetail } from '../../../core/history';
import { proofMonths } from '../../../core/progress';
import { emptyRecord } from '../../../core/record';
import type { DayKey } from '../../../core/time';
import type { MissionDone, ProofPhoto, RecordState, TrackId } from '../../../core/types';
import { fromDay, fromEntry, proofSections, proofTitle } from '../proofView';

const accepted = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };
const photo = (uri: string, kind: ProofPhoto['kind'] = 'single'): ProofPhoto => ({ uri, kind, takenAt: 1, hash: uri || kind });

function done(id: string, track: TrackId, doneAt: number, extra: Partial<MissionDone> = {}): MissionDone {
  return { missionId: id, slot: 'main', track, points: 10, doneAt, photos: [], verification: accepted, ...extra };
}

function rec(days: Record<DayKey, MissionDone[]>): RecordState {
  const missions = Object.fromEntries(Object.entries(days).map(([d, list]) => [d, Object.fromEntries(list.map(m => [m.missionId, m]))]));
  return { ...emptyRecord(), missions };
}

const r = rec({
  '2026-09-29': [done('custom-read', 'skills', 1, { title: 'Read 20 pages' }), done('gone-old-thing', 'fitness', 2)],
  '2026-10-01': [done('custom-read', 'skills', 3, { title: 'Read 20 pages', photos: [photo('')] }), done('x-1', 'school', 4, { title: 'Study for 30 Minutes' })],
  '2026-10-02': [done('x-1', 'school', 5, { title: 'Study for 30 Minutes', timerSeconds: 1500 })],
  '2026-10-03': [done('x-1', 'school', 6, { title: 'Study for 30 Minutes' }), done('lost', 'chapters' as TrackId, 7, { title: 'An old one' })],
});

describe('a proof, the same everywhere', () => {
  it('keeps the title it was proven with, else finds one', () => {
    expect(proofTitle('custom-read', 'Read 20 pages', 'skills')).toBe('Read 20 pages');
    // Not in the library and no title kept: one made from its id.
    expect(proofTitle('gone-old-thing', undefined, 'fitness')).toBe('Old thing');
  });

  it('reads the same from Proof history and from the day', () => {
    const entry = proofMonths(r)[0].entries.find(e => e.key === '2026-10-02:x-1')!;
    const fromHistory = fromEntry(entry);
    const day = dayDetail(r, {}, '2026-10-02');
    const fromDayPage = fromDay('2026-10-02', day.proven[0]);
    expect(fromHistory).toEqual(fromDayPage);
    expect(fromHistory).toMatchObject({ title: 'Study for 30 Minutes', area: 'School', timerSeconds: 1500, cover: null });
  });

  it('keeps a cleared photo as a cover with no uri (a placeholder, never a broken image)', () => {
    const p = fromEntry(proofMonths(r)[0].entries.find(e => e.key === '2026-10-01:custom-read')!);
    expect(p.cover?.uri).toBe('');
  });
});

describe('Proof history, organised', () => {
  const months = proofMonths(r);

  it('by date: a section a month, newest first, with its counts', () => {
    const s = proofSections('date', months, '2026');
    expect(s.map(x => x.title)).toEqual(['October', 'September']);
    expect(s[0].meta).toBe('3 active days · 5 missions proven');
    expect(s[0].proofs[0].day).toBe('2026-10-03');
  });

  it('by mission: most proven first, each newest first', () => {
    const s = proofSections('mission', months, '2026');
    expect(s.map(x => [x.title, x.meta])).toEqual([
      ['Study for 30 Minutes', '3'],
      ['Read 20 pages', '2'],
      ['An old one', '1'],
      ['Old thing', '1'],
    ]);
    expect(s[0].proofs.map(p => p.day)).toEqual(['2026-10-03', '2026-10-02', '2026-10-01']);
    expect(s[0].said).toBe('Study for 30 Minutes, 3 proofs');
  });

  it("by area: the app's order, an area it no longer has last", () => {
    const s = proofSections('area', months, '2026');
    expect(s.map(x => [x.title, x.meta])).toEqual([
      ['School', '3'],
      ['Fitness', '1'],
      ['Skills', '2'],
      ['Other', '1'],
    ]);
  });

  it('every proof is in exactly one section, whichever way', () => {
    for (const by of ['date', 'mission', 'area'] as const) {
      const keys = proofSections(by, months, '2026').flatMap(x => x.proofs.map(p => p.key));
      expect(keys.sort()).toEqual(months.flatMap(m => m.entries.map(e => e.key)).sort());
    }
  });
});
