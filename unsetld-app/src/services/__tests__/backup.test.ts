// The Keychain copy of the record (services/backup): nothing is written before startup's read of
// it is over (and the gate opens even when that read fails), suspending drops a write already
// waiting so a delete can't be undone by it, a record re-sent after resuming is written again,
// and an empty record deletes the item instead of writing one (never after a failed read).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Backup } from '../backup';

const kc = vi.hoisted(() => ({ map: new Map<string, string>(), writes: 0, deletes: 0, failRead: false, failDelete: false }));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => {
    if (kc.failRead) throw new Error('locked');
    return kc.map.get(k) ?? null;
  },
  setItemAsync: async (k: string, v: string) => {
    kc.writes++;
    kc.map.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    if (kc.failDelete) throw new Error('locked');
    kc.deletes++;
    kc.map.delete(k);
  },
}));

const KEY = 'unsetld.record.v2';
const rec = (days: string[]) => ({
  days: Object.fromEntries(days.map(d => [d, { at: 0, verified: true }])),
  missions: {},
  bonuses: {},
  redemptions: [],
  legacyPoints: 0,
});
const backup = (salt: string, days: string[]): Backup => ({ installSalt: salt, record: rec(days) as never });
const saved = () => (kc.map.has(KEY) ? (JSON.parse(kc.map.get(KEY)!) as Backup) : null);

/** A new launch: the module's state starts over. */
async function fresh() {
  vi.resetModules();
  return import('../backup');
}

describe('Keychain backup', () => {
  beforeEach(() => {
    kc.map.clear();
    kc.writes = 0;
    kc.deletes = 0;
    kc.failRead = false;
    kc.failDelete = false;
    vi.useFakeTimers();
  });

  it('writes nothing before startup has read the Keychain copy, then restores it and writes what the store holds', async () => {
    const b = await fresh();
    kc.map.set(KEY, JSON.stringify(backup('old-salt', ['2026-10-17', '2026-10-18'])));
    // A reinstall: the empty record is backed up as the app starts, before the read is over.
    b.backupRecord(backup('new-salt', []));
    await vi.advanceTimersByTimeAsync(5000);
    expect(kc.writes + kc.deletes).toBe(0);

    let restored: Backup | null = null;
    await b.openBackups({ read: true, restore: x => void (restored = x), current: () => restored ?? backup('new-salt', []) });
    expect(restored!.installSalt).toBe('old-salt');
    await vi.advanceTimersByTimeAsync(1600);
    // The restored record went back (unchanged), never the empty one.
    expect(kc.deletes).toBe(0);
    expect(Object.keys(saved()!.record.days)).toEqual(['2026-10-17', '2026-10-18']);
  });

  it('opens the gate when the read fails, but an empty record then leaves the item alone', async () => {
    const b = await fresh();
    kc.map.set(KEY, JSON.stringify(backup('old-salt', ['2026-10-18'])));
    kc.failRead = true;
    const restore = vi.fn();
    await b.openBackups({ read: true, restore, current: () => backup('new-salt', []) });
    expect(restore).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.deletes).toBe(0);
    expect(saved()!.installSalt).toBe('old-salt');
    // Something proven: that's written as usual.
    b.backupRecord(backup('new-salt', ['2026-10-19']));
    await vi.advanceTimersByTimeAsync(1600);
    expect(saved()!.installSalt).toBe('new-salt');
  });

  it('opens at once without reading when the record is not empty', async () => {
    const b = await fresh();
    await b.openBackups({ read: false, restore: () => {}, current: () => backup('s', ['2026-10-19']) });
    await vi.advanceTimersByTimeAsync(1600);
    expect(Object.keys(saved()!.record.days)).toEqual(['2026-10-19']);
  });

  it('suspending drops the write waiting, so deleting the item sticks', async () => {
    const b = await fresh();
    await b.openBackups({ read: false, restore: () => {}, current: () => backup('s', ['2026-10-18']) });
    await vi.advanceTimersByTimeAsync(1600);
    b.backupRecord(backup('s', ['2026-10-18', '2026-10-19']));
    await vi.advanceTimersByTimeAsync(500);
    b.suspendBackups();
    expect(await b.deleteBackup()).toBe(true);
    // A change while suspended isn't written either.
    b.backupRecord(backup('s', ['2026-10-18', '2026-10-19', '2026-10-20']));
    await vi.advanceTimersByTimeAsync(5000);
    expect(kc.map.has(KEY)).toBe(false);
  });

  it('after resuming, the same record sent again is written (nothing counts as already written)', async () => {
    const b = await fresh();
    const same = backup('s', ['2026-10-18']);
    await b.openBackups({ read: false, restore: () => {}, current: () => same });
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.writes).toBe(1);
    b.suspendBackups();
    await b.deleteBackup();
    b.resumeBackups();
    b.backupRecord(same);
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.writes).toBe(2);
    expect(saved()).toEqual(same);
  });

  it('an empty record deletes the item instead of writing one', async () => {
    const b = await fresh();
    await b.openBackups({ read: false, restore: () => {}, current: () => backup('s', ['2026-10-18']) });
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.map.has(KEY)).toBe(true);
    b.backupRecord(backup('s', []));
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.map.has(KEY)).toBe(false);
    expect(kc.writes).toBe(1);
    // Resuming with the reset (empty) record after a delete writes nothing back.
    b.suspendBackups();
    b.resumeBackups(backup('new', []));
    await vi.advanceTimersByTimeAsync(1600);
    expect(kc.map.has(KEY)).toBe(false);
    expect(kc.writes).toBe(1);
  });

  it('says so when the Keychain item could not be deleted', async () => {
    const b = await fresh();
    kc.failDelete = true;
    expect(await b.deleteBackup()).toBe(false);
  });

  it('isEmptyRecord: no days and no missions', async () => {
    const b = await fresh();
    expect(b.isEmptyRecord(rec([]) as never)).toBe(true);
    expect(b.isEmptyRecord(rec(['2026-10-18']) as never)).toBe(false);
    expect(b.isEmptyRecord({ days: {}, missions: { '2026-10-18': {} } } as never)).toBe(false);
    expect(b.isEmptyRecord(null)).toBe(true);
  });
});
