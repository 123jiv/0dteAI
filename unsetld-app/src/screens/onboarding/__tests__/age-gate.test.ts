// What the age gate's answer does to the store (launch pass P0-4). 13 or over: the bucket and
// ageCheck 'ok', nothing else. Under 13: the install is blocked, then everything on this phone is
// deleted (stream F's deleteLocalData, faked here as its contract says: the store back to its
// defaults), and it stays blocked after a restart. A delete that fails still blocks, and
// the block screen tries again while anything is left. Hydrates the real store.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return {
    map: new Map<string, string>(),
    wipe: 'reset' as 'reset' | 'throw' | 'failed',
    /** ageCheck as the delete found it, for each delete. */
    seen: [] as (string | null)[],
  };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../../../state/storage', () => ({
  appStorage: {
    getItem: (k: string) => mem.map.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.map.set(k, v),
    removeItem: (k: string) => void mem.map.delete(k),
  },
  setRoomMaker: () => {},
}));
vi.mock('../../../services/proof', () => ({ deletePhoto: () => {}, webPhotoKeys: () => [] }));
vi.mock('../../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));
// Stream F's deleteLocalData, by its contract: 'failed' touches nothing; 'done' leaves the store at
// its defaults (hydrated, a new day) with the Keychain record gone. The real delete under the
// age gate is tested in services/__tests__/wipe.test.ts.
vi.mock('../../../services/wipe', () => ({
  deleteLocalData: async () => {
    const { useApp } = await import('../../../state/store');
    mem.seen.push(useApp.getState().settings.ageCheck);
    if (mem.wipe === 'throw') throw new Error('deleteLocalData not implemented yet');
    if (mem.wipe === 'failed') return 'failed';
    useApp.setState({ ...useApp.getInitialState(), hydrated: true });
    return 'done';
  },
}));

const NOW = new Date(2026, 9, 19, 15, 0, 0);
const TODAY = '2026-10-19';

const accepted = { status: 'accepted', method: 'on-device', checks: [], at: NOW.getTime() - 3600_000 };
const proof = {
  missionId: 'D4',
  slot: 'easy',
  track: 'discipline',
  points: 5,
  doneAt: NOW.getTime() - 3600_000,
  photos: [{ uri: 'file:///p/D4.jpg', takenAt: NOW.getTime() - 3600_000, kind: 'single', hash: 'h-D4' }],
  verification: accepted,
};
/** Someone onboarded before the age gate: areas, a goal, one mission proven today. */
const EXISTING = {
  installSalt: 'salt-age',
  settings: { onboarded: true, reminders: { on: true, count: 3, first: 420, last: 1320 } },
  profile: { tracks: ['discipline', 'fitness'], goal: 'Build muscle', age: '18plus', minutes: 30 },
  record: { days: {}, missions: { [TODAY]: { D4: proof } }, bonuses: {}, redemptions: [], legacyPoints: 0 },
};

async function load(state: object | null) {
  mem.map.clear();
  if (state) mem.map.set('unsetld-v2', JSON.stringify({ state, version: 8 }));
  return reload();
}

/** The app opening again, from what was saved. */
async function reload() {
  vi.resetModules();
  const store = await import('../../../state/store');
  const gate = await import('../ageGate');
  const age = await import('../../../core/age');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...gate, ...age };
}

describe('the age gate in the store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    mem.wipe = 'reset';
    mem.seen = [];
  });

  it('13 or over: the bucket and the pass, nothing else changes', async () => {
    const { useApp, passAgeGate, startRoute } = await load(EXISTING);
    expect(startRoute(useApp.getState().settings)).toBe('Age');
    const before = useApp.getState();
    passAgeGate('16to17');
    const after = useApp.getState();
    expect(after.profile).toEqual({ ...before.profile, age: '16to17' });
    expect(after.settings).toEqual({ ...before.settings, ageCheck: 'ok' });
    expect(after.record).toBe(before.record);
    expect(startRoute(after.settings)).toBe('Main');
    // Saved: the pass holds after a restart.
    const again = await reload();
    expect(again.useApp.getState().settings.ageCheck).toBe('ok');
    expect(again.useApp.getState().profile.age).toBe('16to17');
    expect(again.startRoute(again.useApp.getState().settings)).toBe('Main');
  });

  it('a new user: Name, then the gate; the pass is kept if they close the app before the areas', async () => {
    const { useApp, passAgeGate, startRoute } = await load(null);
    expect(useApp.getState().settings.ageCheck).toBeNull();
    expect(startRoute(useApp.getState().settings)).toBe('Name');
    passAgeGate('u16');
    expect(useApp.getState().profile.age).toBe('u16');
    expect(useApp.getState().settings.onboarded).toBe(false);
  });

  it('under 13: everything is deleted first, then this install is blocked, for good', async () => {
    const { useApp, blockUnder13, holdsData, DEFAULT_SETTINGS } = await load(EXISTING);
    expect(holdsData(useApp.getState())).toBe(true);
    expect(await blockUnder13()).toBe('done');
    // The block was saved before the delete started: an app killed partway still opens on it.
    expect(mem.seen).toEqual(['under13']);
    const s = useApp.getState();
    expect(s.settings).toEqual({ ...DEFAULT_SETTINGS, ageCheck: 'under13' });
    expect(s.profile.goal ?? null).toBeNull();
    expect(s.profile.age).toBeNull();
    expect(Object.keys(s.record.missions)).toEqual([]);
    expect(holdsData(s)).toBe(false);
    // A restart opens on the block, and nothing comes back.
    const again = await reload();
    const t = again.useApp.getState();
    expect(t.settings.ageCheck).toBe('under13');
    expect(again.startRoute(t.settings)).toBe('AgeBlocked');
    expect(again.intentGate(t.settings)).toBe('drop');
    expect(again.holdsData(t)).toBe(false);
  });

  it('under 13 when the delete fails or throws: still blocked, and the block screen will delete again', async () => {
    for (const how of ['failed', 'throw'] as const) {
      mem.wipe = how;
      const { useApp, blockUnder13, holdsData, startRoute } = await load(EXISTING);
      expect(await blockUnder13()).toBe(how === 'failed' ? 'failed' : 'error');
      expect(useApp.getState().settings.ageCheck).toBe('under13');
      expect(startRoute(useApp.getState().settings)).toBe('AgeBlocked');
      // What's left is what the block screen checks for, to delete again on the next launch.
      expect(holdsData(useApp.getState())).toBe(true);
      mem.wipe = 'reset';
      expect(await blockUnder13()).toBe('done');
      expect(holdsData(useApp.getState())).toBe(false);
      expect(useApp.getState().settings.ageCheck).toBe('under13');
    }
  });

  it('holdsData: anything someone could have entered', async () => {
    const { useApp, holdsData } = await load(null);
    const s = useApp.getState();
    expect(holdsData(s)).toBe(false);
    expect(holdsData({ ...s, settings: { ...s.settings, onboarded: true } })).toBe(true);
    expect(holdsData({ ...s, profile: { ...s.profile, goal: 'Save $1,000' } })).toBe(true);
    expect(holdsData({ ...s, record: { ...s.record, days: { [TODAY]: { proven: 1 } as never } } })).toBe(true);
    expect(holdsData({ ...s, customMissions: [{ id: 'own-1' } as never] })).toBe(true);
  });
});
