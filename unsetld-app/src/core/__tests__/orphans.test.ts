// Startup's sweep of the proof folder (core/proofs orphans): a file goes only when nothing points
// to it (the record's missions and 2.x tasks, the tester snapshot, a waiting before photo), matched
// by file name across container paths, and only once it's past the grace period. Nothing goes on
// an empty record or a state that couldn't be read.
import { describe, expect, it } from 'vitest';
import { ORPHAN_GRACE_MS, orphans, proofFileName, type ProofFile } from '../proofs';
import { emptyRecord } from '../record';
import type { MissionDone, RecordState } from '../types';

const NOW = new Date(2026, 9, 19, 12, 0, 0).getTime();
const OLD = NOW - 60 * 60_000;
// The container path the record was saved under, and this install's (after an update).
const BEFORE = 'file:///var/mobile/Containers/Data/Application/OLD/Documents/proof/';

const proven = (id: string, uri: string): MissionDone =>
  ({
    missionId: id,
    slot: 'main',
    track: 'school',
    points: 15,
    doneAt: 0,
    photos: [{ uri, takenAt: 0, kind: 'single', hash: `h-${id}` }],
    verification: { status: 'accepted', method: 'on-device', checks: [], at: 0 },
  }) as MissionDone;

function record(): RecordState {
  return {
    ...emptyRecord(),
    days: { '2026-10-18': { at: 0, verified: true } },
    missions: { '2026-10-18': { S1: proven('S1', `${BEFORE}2026-10-18-S1-single.jpg`) } },
    // A 2.x day: its tasks share one photo.
    work: { '2025-03-01': { a: { text: 'a', doneAt: 0, proof: { uri: `${BEFORE}2025-03-01.jpg`, takenAt: 0, lineNo: 1 } } } },
  } as RecordState;
}

const file = (name: string, modified: number | null = OLD): ProofFile => ({ name, modified });

describe('proof file names', () => {
  it('reads the name in a proof folder, whatever the container path, and nothing elsewhere', () => {
    expect(proofFileName(`${BEFORE}2026-10-18-S1-single.jpg`)).toBe('2026-10-18-S1-single.jpg');
    expect(proofFileName('file:///new/Documents/proof/2026-10-18-S1-single-2.jpg')).toBe('2026-10-18-S1-single-2.jpg');
    expect(proofFileName('file:///var/mobile/Library/Caches/ImagePicker/x.jpg')).toBeNull();
    expect(proofFileName('web-proof:2026-10-18-S1-single')).toBeNull();
    expect(proofFileName('')).toBeNull();
  });
});

describe('orphans', () => {
  const files = [
    file('2026-10-18-S1-single.jpg'),
    file('2025-03-01.jpg'),
    file('2026-10-17-D1-before.jpg'), // the app closed at review: nothing points to it
    file('2026-10-16-T1-single.jpg'), // kept by the tester snapshot
    file('2026-10-19-O1-before.jpg'), // a before photo waiting for its after
  ];
  const snapshot = { ...emptyRecord(), missions: { '2026-10-16': { T1: proven('T1', 'file:///x/proof/2026-10-16-T1-single.jpg') } } } as RecordState;

  it('finds only the files nothing points to, matched by name across container paths', () => {
    const gone = orphans({ files, record: record(), snapshot, waiting: 'file:///y/proof/2026-10-19-O1-before.jpg', now: NOW });
    expect(gone).toEqual(['2026-10-17-D1-before.jpg']);
  });

  it('counts the snapshot and the waiting before photo as pointing to their files', () => {
    const gone = orphans({ files, record: record(), now: NOW });
    expect(gone).toEqual(['2026-10-17-D1-before.jpg', '2026-10-16-T1-single.jpg', '2026-10-19-O1-before.jpg']);
  });

  it('keeps a file younger than the grace period (a photo not sent yet), and one with no time', () => {
    const fresh = [file('2026-10-19-D2-single.jpg', NOW - ORPHAN_GRACE_MS + 1000), file('2026-10-19-D3-single.jpg', null), file('2026-10-19-D4-single.jpg', NOW - ORPHAN_GRACE_MS)];
    expect(orphans({ files: fresh, record: record(), now: NOW })).toEqual(['2026-10-19-D4-single.jpg']);
    expect(ORPHAN_GRACE_MS).toBe(10 * 60_000);
  });

  it('deletes nothing on an empty record, or when the state came from defaults because storage could not be read', () => {
    expect(orphans({ files, record: emptyRecord(), now: NOW })).toEqual([]);
    expect(orphans({ files, record: record(), now: NOW, readFailed: true })).toEqual([]);
    // A 2.x record with only tasks still counts as a record.
    const twoX = { ...emptyRecord(), work: record().work } as RecordState;
    expect(orphans({ files: [file('2025-03-01.jpg'), file('stray.jpg')], record: twoX, now: NOW })).toEqual(['stray.jpg']);
  });
});
