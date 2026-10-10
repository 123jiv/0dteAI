// The browser preview's storage: about 5 MB of localStorage that proof photos can fill, and the
// same preview open in two tabs. Runs the real store, web storage and photo saving against a
// fake localStorage with a quota.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const web = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  class FakeStorage {
    map = new Map<string, string>();
    quota = Infinity;
    blocked = false;
    get length() {
      return this.map.size;
    }
    key(i: number) {
      return [...this.map.keys()][i] ?? null;
    }
    getItem(k: string) {
      return this.map.get(k) ?? null;
    }
    used(except?: string) {
      let n = 0;
      for (const [k, v] of this.map) if (k !== except) n += k.length + v.length;
      return n;
    }
    setItem(k: string, v: string) {
      if (this.blocked) throw new DOMException('blocked', 'SecurityError');
      if (this.used(k) + k.length + v.length > this.quota) throw new DOMException('full', 'QuotaExceededError');
      this.map.set(k, String(v));
    }
    removeItem(k: string) {
      this.map.delete(k);
    }
  }
  const ls = new FakeStorage();
  const listeners: Record<string, (e: { key: string | null; newValue: string | null }) => void> = {};
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
  (globalThis as { window?: unknown }).window = { addEventListener: (type: string, fn: (e: never) => void) => void (listeners[type] = fn) };
  return { ls, listeners };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'web' },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-file-system', () => ({}));
vi.mock('expo-image-manipulator', () => ({}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 14, 9, 0, 0); // Wed 14 Oct 2026, 9 AM local
const TODAY = '2026-10-14';
const KEY = 'unsetld-v2';
const photo = (n: number) => `data:image/jpeg;base64,${'A'.repeat(n)}`;
const key = (day: string, id: string) => `web-proof:${day}-${id}-single`;

const proven = (id: string, uri: string) => ({
  missionId: id,
  slot: 'main',
  track: 'school',
  points: 15,
  doneAt: 0,
  photos: [{ uri, takenAt: 0, kind: 'single', hash: `h-${uri}` }],
  verification: { status: 'accepted', method: 'on-device', checks: [], at: 0 },
});

/** Two old days with a photo each (the oldest holds two), and today's. */
function seeded() {
  const days = { '2026-08-01': ['school-study-30', 'fitness-stretch-10'], '2026-08-02': ['school-study-30'], [TODAY]: ['school-study-30'] };
  const missions: Record<string, Record<string, ReturnType<typeof proven>>> = {};
  for (const [day, ids] of Object.entries(days)) {
    missions[day] = Object.fromEntries(ids.map(id => [id, proven(id, key(day, id))]));
    for (const id of ids) web.ls.map.set(key(day, id), photo(2000));
  }
  return {
    installSalt: 's',
    settings: { onboarded: true, proofRetentionDays: 0 },
    profile: { tracks: ['school', 'fitness'], minutes: 45 },
    plans: {},
    record: { days: {}, missions, bonuses: {}, redemptions: [], legacyPoints: 0 },
  };
}

async function load(state: object) {
  web.ls.map.set(KEY, JSON.stringify({ state, version: 6 }));
  vi.resetModules();
  const store = await import('../store');
  const storage = await import('../storage');
  const proof = await import('../../services/proof');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...storage, ...proof };
}

const saved = () => JSON.parse(web.ls.map.get(KEY)!).state;
const settle = () => new Promise(r => setTimeout(r, 0));

describe('browser preview storage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    web.ls.map.clear();
    web.ls.quota = Infinity;
    web.ls.blocked = false;
  });

  it("full: the oldest day's photos make room, show as cleared, and the record is saved", async () => {
    const { useApp, useSaveFailed } = await load(seeded());
    web.ls.quota = web.ls.used() + 50;
    useApp.getState().ensurePlan(TODAY);
    expect(saved().plans[TODAY]).toBeTruthy();
    expect(web.ls.map.has(key('2026-08-01', 'school-study-30'))).toBe(false);
    expect(web.ls.map.has(key('2026-08-01', 'fitness-stretch-10'))).toBe(false);
    expect(web.ls.map.has(key('2026-08-02', 'school-study-30'))).toBe(true);
    expect(web.ls.map.has(key(TODAY, 'school-study-30'))).toBe(true);
    await settle();
    const r = saved().record;
    expect(r.missions['2026-08-01']['school-study-30'].photos[0]).toMatchObject({ uri: '', hash: `h-${key('2026-08-01', 'school-study-30')}` });
    expect(r.missions['2026-08-02']['school-study-30'].photos[0].uri).toBe(key('2026-08-02', 'school-study-30'));
    expect(useApp.getState().record.missions['2026-08-01']['fitness-stretch-10'].photos[0].uri).toBe('');
    expect(useSaveFailed.getState().failed).toBe(false);
  });

  it("full with nothing left to give up: today's photo stays and the app is told", async () => {
    const state = seeded();
    for (const k of [...web.ls.map.keys()]) if (!k.includes(TODAY)) web.ls.map.delete(k);
    const { useApp, useSaveFailed } = await load(state);
    const before = web.ls.map.get(KEY);
    web.ls.quota = web.ls.used() + 50;
    useApp.getState().ensurePlan(TODAY);
    expect(web.ls.map.get(KEY)).toBe(before);
    expect(web.ls.map.has(key(TODAY, 'school-study-30'))).toBe(true);
    expect(useSaveFailed.getState().failed).toBe(true);
    // The app still runs on what's in memory.
    expect(useApp.getState().plans[TODAY]).toBeTruthy();
  });

  it("a new photo that doesn't fit makes room first, and isn't claimed as saved when nothing can go", async () => {
    const { savePhoto } = await load(seeded());
    web.ls.quota = web.ls.used() + 1000;
    const a = await savePhoto(photo(1500), `${TODAY}-fitness-stretch-10-single`);
    expect(a.uri).toBe(key(TODAY, 'fitness-stretch-10'));
    expect(web.ls.map.has(key('2026-08-01', 'school-study-30'))).toBe(false);
    await settle();
    web.ls.quota = web.ls.used() + 1000;
    for (const k of [...web.ls.map.keys()]) if (k.startsWith('web-proof:2026-08')) web.ls.map.delete(k);
    const b = await savePhoto(photo(5000), `${TODAY}-school-read-single`);
    expect(b.uri).toBe('');
    expect(web.ls.map.has(key(TODAY, 'school-read'))).toBe(false);
  });

  it('full to the last byte at launch: the saved state is still read, and a save makes room', async () => {
    const state = seeded();
    web.ls.map.set(KEY, JSON.stringify({ state, version: 6 }));
    web.ls.quota = web.ls.used();
    const { useApp, useSaveFailed } = await load(state);
    expect(useApp.getState().settings.onboarded).toBe(true);
    expect(useApp.getState().record.missions[TODAY]['school-study-30']).toBeTruthy();
    useApp.getState().ensurePlan(TODAY);
    expect(saved().plans[TODAY]).toBeTruthy();
    expect(useSaveFailed.getState().failed).toBe(false);
  });

  it('blocked storage keeps the photo in the record', async () => {
    const { savePhoto } = await load(seeded());
    web.ls.blocked = true;
    const p = await savePhoto(photo(100), `${TODAY}-school-read-single`);
    expect(p.uri).toBe(photo(100));
  });

  it("open in two tabs: the other tab's save is read here, without saving it back", async () => {
    const { useApp } = await load(seeded());
    useApp.getState().ensurePlan(TODAY);
    // The other tab proves a mission and saves.
    const other = saved();
    other.record.missions[TODAY]['fitness-stretch-10'] = proven('fitness-stretch-10', key(TODAY, 'fitness-stretch-10'));
    const json = JSON.stringify({ state: other, version: 6 });
    web.ls.map.set(KEY, json);
    web.listeners.storage({ key: 'web-proof:x', newValue: 'x' });
    expect(useApp.getState().record.missions[TODAY]['fitness-stretch-10']).toBeUndefined();
    web.listeners.storage({ key: KEY, newValue: json });
    await settle();
    expect(useApp.getState().record.missions[TODAY]['fitness-stretch-10']).toBeTruthy();
    expect(web.ls.map.get(KEY)).toBe(json);
    // This tab's next save keeps the other tab's proof.
    useApp.getState().markMomentShown('first-proof');
    expect(saved().record.missions[TODAY]['fitness-stretch-10']).toBeTruthy();
  });
});
