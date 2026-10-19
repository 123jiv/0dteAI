// Delete data on this phone (services/wipe) against the real store, backup writer and notification
// queues, with the native modules faked: the four Keychain items go, the record's first and before
// the store is reset; only the trial reminder stays pending and delivered ones are dismissed; the
// proof folder, the caches and the widgets are cleared; nothing goes over the network. When the
// Keychain record can't be deleted, nothing else is touched.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import v33 from '../../state/__tests__/fixtures/v33-state.json';

const m = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return {
    storage: new Map<string, string>(),
    keychain: new Map<string, string>(),
    pending: [] as { identifier: string; date: number }[],
    log: [] as string[],
    dismissed: 0,
    failRecordDelete: false,
    photosDeleted: 0,
    imageCaches: 0,
    widgetsReset: 0,
  };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../../state/storage', () => ({
  appStorage: {
    getItem: (k: string) => m.storage.get(k) ?? null,
    setItem: (k: string, v: string) => void m.storage.set(k, v),
    removeItem: (k: string) => void m.storage.delete(k),
  },
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => m.keychain.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => {
    m.log.push(`write:${k}`);
    m.keychain.set(k, v);
  },
  deleteItemAsync: async (k: string) => {
    if (k === 'unsetld.record.v2' && m.failRecordDelete) throw new Error('locked');
    m.log.push(`delete:${k}`);
    m.keychain.delete(k);
  },
}));
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  DEFAULT_ACTION_IDENTIFIER: 'default',
  getAllScheduledNotificationsAsync: async () => m.pending.map(p => ({ identifier: p.identifier })),
  cancelScheduledNotificationAsync: async (id: string) => {
    m.pending = m.pending.filter(p => p.identifier !== id);
  },
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: false }),
  requestPermissionsAsync: async () => ({ granted: true }),
  dismissAllNotificationsAsync: async () => {
    m.dismissed++;
  },
  scheduleNotificationAsync: async ({ identifier, trigger }: { identifier: string; trigger: { date: Date } }) => {
    m.pending = [...m.pending.filter(p => p.identifier !== identifier), { identifier, date: new Date(trigger.date).getTime() }];
    return identifier;
  },
}));
vi.mock('expo-image', () => ({
  Image: {
    clearDiskCache: async () => {
      m.imageCaches++;
      return true;
    },
    clearMemoryCache: async () => {
      m.imageCaches++;
      return true;
    },
  },
}));
vi.mock('../proof', () => ({
  deletePhoto: () => {},
  webPhotoKeys: () => [],
  deleteAllPhotos: () => {
    m.log.push('photos');
    m.photosDeleted++;
  },
}));
vi.mock('../widgets', () => ({
  resetWidgets: async () => {
    m.log.push('widgets');
    m.widgetsReset++;
  },
}));

const NOW = new Date(2026, 9, 19, 10, 0, 0);
const KEYS = ['unsetld.record.v2', 'unsetld.session', 'unsetld.apple.identityToken', 'unsetld.rank.v1'];
const fetchSpy = vi.fn(async () => {
  throw new Error('offline');
});

/** A phone in use: onboarded with ten days on record, every Keychain item, and notifications of every kind pending. */
async function setUp() {
  m.storage.clear();
  m.storage.set('unsetld-v2', JSON.stringify(v33));
  m.keychain.clear();
  for (const k of KEYS) m.keychain.set(k, k === 'unsetld.record.v2' ? JSON.stringify({ installSalt: 's', record: v33.state.record }) : 'x');
  const at = (days: number) => NOW.getTime() + days * 86_400_000;
  m.pending = [
    { identifier: 'rem-2026-10-19-1', date: at(0.2) },
    { identifier: 'rem-2026-10-20-0', date: at(1) },
    { identifier: 'drop-d1', date: at(9) },
    { identifier: 'timer-done', date: at(0.01) },
    { identifier: 'trial-end', date: at(5) },
    { identifier: 'night-2026-10-19', date: at(0.5) },
  ];
  m.log = [];
  m.dismissed = 0;
  m.failRecordDelete = false;
  m.photosDeleted = 0;
  m.imageCaches = 0;
  m.widgetsReset = 0;
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
  vi.resetModules();
  const store = await import('../../state/store');
  const wipe = await import('../wipe');
  const backup = await import('../backup');
  await vi.advanceTimersByTimeAsync(0);
  // Startup has read the Keychain (the record isn't empty, so no read) and opened the writer.
  const current = () => ({ installSalt: store.useApp.getState().installSalt, record: store.useApp.getState().record });
  await backup.openBackups({ read: false, restore: () => {}, current });
  // Every store reset is logged, in order with the Keychain.
  const reset = store.useApp.getState().resetLocalData;
  store.useApp.setState({
    resetLocalData: () => {
      m.log.push('reset');
      reset();
    },
  });
  return { ...store, ...wipe, ...backup };
}

describe('Delete data on this phone', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(NOW);
  });

  it('deletes all four Keychain items, the record first and before the store reset', async () => {
    const { useApp, deleteLocalData } = await setUp();
    expect(useApp.getState().settings.onboarded).toBe(true);
    expect(await deleteLocalData()).toBe('done');
    for (const k of KEYS) expect(m.keychain.has(k), k).toBe(false);
    const order = m.log.filter(x => x.startsWith('delete:') || x === 'reset');
    expect(order[0]).toBe('delete:unsetld.record.v2');
    expect(order.indexOf('reset')).toBeGreaterThan(order.indexOf('delete:unsetld.session'));
    // The store is a new install's.
    const s = useApp.getState();
    expect(s.settings.onboarded).toBe(false);
    expect(s.record.days).toEqual({});
    // The writer runs again and never puts the record back: the empty record deletes.
    await vi.advanceTimersByTimeAsync(5000);
    expect(m.keychain.has('unsetld.record.v2')).toBe(false);
    expect(m.log.some(x => x === 'write:unsetld.record.v2')).toBe(false);
  });

  it('leaves only the trial reminder pending and dismisses what was delivered', async () => {
    const { deleteLocalData } = await setUp();
    await deleteLocalData();
    expect(m.pending.map(p => p.identifier)).toEqual(['trial-end']);
    expect(m.dismissed).toBe(1);
  });

  it('clears the proof folder, the image caches and the widgets, after the store reset', async () => {
    const { deleteLocalData } = await setUp();
    await deleteLocalData();
    expect(m.photosDeleted).toBe(1);
    expect(m.imageCaches).toBe(2);
    expect(m.widgetsReset).toBe(1);
    expect(m.log.indexOf('widgets')).toBeGreaterThan(m.log.indexOf('reset'));
  });

  it('goes nowhere near the network, and then reads UNSETLD+ from the store again', async () => {
    const { deleteLocalData, afterLocalDelete } = await setUp();
    const refresh = vi.fn();
    const off = afterLocalDelete(refresh);
    await deleteLocalData();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    off();
  });

  it('a write already waiting when the delete starts never puts the Keychain record back', async () => {
    const { useApp, deleteLocalData, backupRecord } = await setUp();
    await vi.advanceTimersByTimeAsync(2000);
    m.log = [];
    backupRecord({ installSalt: 's', record: { ...useApp.getState().record, days: { ...useApp.getState().record.days, '2026-10-19': { at: 0, verified: true } } } });
    await vi.advanceTimersByTimeAsync(500);
    await deleteLocalData();
    await vi.advanceTimersByTimeAsync(5000);
    expect(m.keychain.has('unsetld.record.v2')).toBe(false);
    expect(m.log).not.toContain('write:unsetld.record.v2');
  });

  it('touches nothing else when the Keychain record cannot be deleted, and the writer runs again', async () => {
    const { useApp, deleteLocalData, afterLocalDelete } = await setUp();
    const refresh = vi.fn();
    const off = afterLocalDelete(refresh);
    m.failRecordDelete = true;
    const before = useApp.getState();
    expect(await deleteLocalData()).toBe('failed');
    const s = useApp.getState();
    expect(s.settings.onboarded).toBe(true);
    expect(s.record).toBe(before.record);
    expect(s.installSalt).toBe(before.installSalt);
    for (const k of KEYS) expect(m.keychain.has(k), k).toBe(true);
    expect(m.pending.map(p => p.identifier).sort()).toEqual(['drop-d1', 'night-2026-10-19', 'rem-2026-10-19-1', 'rem-2026-10-20-0', 'timer-done', 'trial-end']);
    expect(m.dismissed).toBe(0);
    expect(m.photosDeleted + m.imageCaches + m.widgetsReset).toBe(0);
    expect(refresh).not.toHaveBeenCalled();
    expect(m.log).not.toContain('reset');
    // The writer was resumed: the record is backed up again.
    await vi.advanceTimersByTimeAsync(2000);
    expect(m.log).toContain('write:unsetld.record.v2');
    off();
  });

  it('runs once when asked twice', async () => {
    const { deleteLocalData } = await setUp();
    const [a, b] = await Promise.all([deleteLocalData(), deleteLocalData()]);
    expect([a, b]).toEqual(['done', 'done']);
    expect(m.log.filter(x => x === 'reset')).toHaveLength(1);
  });
});

// The age gate's under-13 answer (screens/onboarding/ageGate, stream B) runs this real delete:
// everything goes, then the install is blocked; a delete that can't finish still blocks, and the
// block screen sees data left to try again.
describe('Under 13: the age gate runs the real delete', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(NOW);
  });

  it('deletes everything on this phone, then blocks the install for good', async () => {
    const { useApp } = await setUp();
    const { blockUnder13, holdsData } = await import('../../screens/onboarding/ageGate');
    const { startRoute } = await import('../../core/age');
    expect(holdsData(useApp.getState())).toBe(true);
    expect(await blockUnder13()).toBe('done');
    for (const k of KEYS) expect(m.keychain.has(k), k).toBe(false);
    const s = useApp.getState();
    expect(s.settings.ageCheck).toBe('under13');
    expect(s.settings.onboarded).toBe(false);
    expect(holdsData(s)).toBe(false);
    expect(startRoute(s.settings)).toBe('AgeBlocked');
    // Nothing left but the trial reminder, which belongs to the Apple ID.
    expect(m.pending.map(p => p.identifier)).toEqual(['trial-end']);
    // The block is saved with the reset state, and the record never goes back to the Keychain.
    await vi.advanceTimersByTimeAsync(5000);
    expect(JSON.parse(m.storage.get('unsetld-v2') ?? '{}').state?.settings?.ageCheck).toBe('under13');
    expect(m.keychain.has('unsetld.record.v2')).toBe(false);
  });

  it('a delete that fails still blocks, with the data left for the block screen to try again', async () => {
    const { useApp } = await setUp();
    const { blockUnder13, holdsData } = await import('../../screens/onboarding/ageGate');
    m.failRecordDelete = true;
    expect(await blockUnder13()).toBe('failed');
    const s = useApp.getState();
    expect(s.settings.ageCheck).toBe('under13');
    expect(holdsData(s)).toBe(true);
    m.failRecordDelete = false;
    expect(await blockUnder13()).toBe('done');
    expect(holdsData(useApp.getState())).toBe(false);
    expect(useApp.getState().settings.ageCheck).toBe('under13');
  });
});
