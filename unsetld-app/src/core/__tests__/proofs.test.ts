// Proof photo retention: 3.x missions' photos and 2.x tasks' photos (record.work) both follow
// the Proof photos setting; and which stored photos give way first when the preview runs out of space.
import { describe, expect, it } from 'vitest';
import { clearPhotos, oldestPhotos, photosToClear, photoUris, usedHashes } from '../proofs';
import { legacyBalance } from '../legacy';
import { emptyRecord } from '../record';
import type { MissionDone, RecordState, TaskDone } from '../types';

const proven = (id: string, uri: string, hash: string): MissionDone =>
  ({
    missionId: id,
    slot: 'main',
    track: 'school',
    points: 15,
    doneAt: 0,
    photos: [{ uri, takenAt: 0, kind: 'single', hash }],
    verification: { status: 'accepted', method: 'on-device', checks: [], at: 0 },
  }) as MissionDone;

/** 2.x saved one photo a day; every task proven that day points to it. */
const task = (text: string, uri: string | null): TaskDone => ({ text, doneAt: 0, proof: uri === null ? null : { uri, takenAt: 0, lineNo: 100 } });

function record(): RecordState {
  return {
    ...emptyRecord(),
    missions: {
      '2026-08-20': { 'S1': proven('S1', 'file:///proof/2026-08-20-S1-single.jpg', 'h1') },
      '2026-10-10': { 'S1': proven('S1', 'file:///proof/2026-10-10-S1-single.jpg', 'h2') },
    },
    work: {
      '2026-08-01': { 'rule:0': task('Phone away for an hour', 'file:///proof/2026-08-01.jpg'), 'rule:1': task('Train', 'file:///proof/2026-08-01.jpg'), own: task('Stretch', null) },
      '2026-08-02': { 'rule:0': task('Phone away for an hour', 'web-proof:2026-08-02') },
      '2026-09-30': { 'rule:0': task('Read', 'file:///proof/2026-09-30.jpg') },
      '2026-08-03': { 'rule:0': task('Read', '') },
    },
  };
}

describe('proof photo retention', () => {
  it('clears 2.x photos older than the setting too, each file once', () => {
    const clear = photosToClear(record(), 30, '2026-10-14');
    expect(clear.map(c => c.uri)).toEqual([
      'file:///proof/2026-08-20-S1-single.jpg',
      'file:///proof/2026-08-01.jpg',
      'web-proof:2026-08-02',
    ]);
    expect(clear[1]).toEqual({ day: '2026-08-01', missionId: 'rule:0', uri: 'file:///proof/2026-08-01.jpg' });
  });

  it('blanks the 2.x photo and keeps the task, so the old balance stays', () => {
    const r = record();
    const after = clearPhotos(r, photosToClear(r, 30, '2026-10-14'));
    expect(after.work['2026-08-01']['rule:0']).toEqual({ ...r.work['2026-08-01']['rule:0'], proof: { uri: '', takenAt: 0, lineNo: 100 } });
    expect(after.work['2026-08-01']['rule:1'].proof?.uri).toBe('');
    expect(after.work['2026-08-01'].own.proof).toBeNull();
    expect(after.work['2026-08-02']['rule:0'].proof?.uri).toBe('');
    // A newer one stays.
    expect(after.work['2026-09-30']['rule:0'].proof?.uri).toBe('file:///proof/2026-09-30.jpg');
    expect(after.missions['2026-08-20']['S1'].photos[0]).toMatchObject({ uri: '', hash: 'h1' });
    expect(after.missions['2026-10-10']['S1'].photos[0].uri).toContain('2026-10-10');
    expect(legacyBalance(after)).toBe(legacyBalance(r));
    expect(usedHashes(after)).toEqual(usedHashes(r));
    expect(photosToClear(after, 30, '2026-10-14')).toEqual([]);
  });

  it('keeps everything when set to Keep', () => {
    expect(photosToClear(record(), 0, '2026-10-14')).toEqual([]);
    expect(clearPhotos(record(), [])).toEqual(record());
  });

  it("lists every photo a record points to, 2.x tasks' included", () => {
    expect([...photoUris(record())].sort()).toEqual([
      'file:///proof/2026-08-01.jpg',
      'file:///proof/2026-08-20-S1-single.jpg',
      'file:///proof/2026-09-30.jpg',
      'file:///proof/2026-10-10-S1-single.jpg',
      'web-proof:2026-08-02',
    ]);
  });
});

describe('making room in the preview', () => {
  const keys = [
    'web-proof:2026-10-14-S1-single',
    'web-proof:2026-09-02-fitness-gym-single',
    'web-proof:2026-08-30',
    'web-proof:2026-08-30-school-read-before',
    'web-proof:2026-08-30-school-read-after',
    'web-proof:2026-09-01-school-read-single',
    'web-proof:odd',
  ];

  it("gives up the oldest day's photos first, never today's or one kept", () => {
    expect(oldestPhotos(keys, new Set(), '2026-10-14')).toEqual(['web-proof:2026-08-30', 'web-proof:2026-08-30-school-read-before', 'web-proof:2026-08-30-school-read-after']);
    const kept = new Set(['web-proof:2026-08-30', 'web-proof:2026-08-30-school-read-before', 'web-proof:2026-08-30-school-read-after']);
    expect(oldestPhotos(keys, kept, '2026-10-14')).toEqual(['web-proof:2026-09-01-school-read-single']);
    expect(oldestPhotos(['web-proof:2026-10-14-S1-single', 'web-proof:odd'], new Set(), '2026-10-14')).toEqual([]);
  });
});
