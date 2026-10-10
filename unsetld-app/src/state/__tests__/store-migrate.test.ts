// Loading state saved by earlier builds: v3 plans, timers and before photos for missions the
// library no longer has, and old area ids in the tester snapshot and the Keychain backup.
// Hydrates the real store from a seeded storage entry.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>(), deleted: [] as string[], cancelled: 0 };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({
  appStorage: {
    getItem: (k: string) => mem.map.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.map.set(k, v),
    removeItem: (k: string) => void mem.map.delete(k),
  },
}));
vi.mock('../../services/proof', () => ({ deletePhoto: (u: string) => void mem.deleted.push(u) }));
vi.mock('../../services/timerNotify', () => ({
  cancelTimerDone: () => {
    mem.cancelled++;
    return Promise.resolve();
  },
}));

const NOW = new Date(2026, 9, 10, 15, 0, 0); // Sat 10 Oct 2026, 3 PM local
const TODAY = '2026-10-10';
const OLD = ['focus-reset-your-desk', 'focus-lock-in-25', 'focus-one-class-no-phone'];

const accepted = (at: number) => ({ status: 'accepted', method: 'on-device', checks: [], at });
const done = (id: string, track: string, points: number, slot = 'progress') => ({
  missionId: id,
  slot,
  track,
  points,
  doneAt: NOW.getTime() - 3600_000,
  photos: [{ uri: `file:///p/${id}.jpg`, takenAt: NOW.getTime() - 3600_000, kind: 'single', hash: `h-${id}` }],
  verification: accepted(NOW.getTime() - 3600_000),
});
const rec = (missions: object, extra: object = {}) => ({ days: {}, missions, bonuses: {}, redemptions: [], legacyPoints: 0, ...extra });
const oldPlan = (rerolls: number, replaced: string[]) => ({
  day: TODAY,
  missions: [
    { slot: 'quick', missionId: OLD[0] },
    { slot: 'progress', missionId: OLD[1] },
    { slot: 'challenge', missionId: OLD[2] },
  ],
  rerolls,
  replaced,
});

async function load(state: object, version: number) {
  mem.map.clear();
  mem.deleted = [];
  mem.cancelled = 0;
  mem.map.set('unsetld-v2', JSON.stringify({ state, version }));
  vi.resetModules();
  const store = await import('../store');
  const content = await import('../../content');
  // Clean-up after a load runs once hydration has finished.
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...content };
}

const tracksOf = (r: { missions: Record<string, Record<string, { track: string }>> }) =>
  Object.values(r.missions).flatMap(d => Object.values(d).map(m => m.track));

describe('v3 → v4: today keeps missions to prove', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('plans the day again when a proven day has nothing left in the library', async () => {
    const v3 = {
      installSalt: 'salt-1',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['focus', 'mindset', 'fitness'], school: true, gym: true, age: '16to17', minutes: 60, intensity: 'lockin', priority: 'reset' },
      plans: { [TODAY]: oldPlan(0, []) },
      record: rec({ [TODAY]: { [OLD[0]]: done(OLD[0], 'focus', 10, 'quick') } }),
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
    };
    const { useApp, MISSION_BY_ID } = await load(v3, 3);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
    expect(plan).toMatchObject({ day: TODAY, rerolls: 0, replaced: [] });
    // The old proof still counts.
    expect(useApp.getState().record.missions[TODAY][OLD[0]].points).toBe(10);
  });

  it('plans the day again after a swap, keeping the swap count and what was swapped out', async () => {
    const v3 = {
      installSalt: 'salt-2',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['school', 'fitness', 'reset'], school: true, age: '18plus', minutes: 60, intensity: 'lockin', priority: null },
      plans: { [TODAY]: oldPlan(1, ['focus-hide-the-distraction']) },
      record: rec({ '2026-10-09': { [OLD[1]]: done(OLD[1], 'focus', 15) } }),
      skips: {},
      timer: null,
      pendingBefore: null,
      program: null,
    };
    const { useApp, MISSION_BY_ID } = await load(v3, 3);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
    expect(plan.rerolls).toBe(1);
    expect(plan.replaced).toEqual(['focus-hide-the-distraction']);
    expect(useApp.getState().plans[TODAY]).toEqual(plan);
    // Asked again, the same plan.
    expect(useApp.getState().ensurePlan(TODAY)).toBe(plan);
  });

  it('drops a saved timer and before photo for missions the library no longer has, with the notification and the photo', async () => {
    const v3 = {
      installSalt: 'salt-3',
      settings: { onboarded: true, colorway: 'black' },
      profile: { tracks: ['focus', 'fitness'], minutes: 60, intensity: 'lockin' },
      plans: { [TODAY]: oldPlan(0, []) },
      record: rec({}),
      timer: { missionId: OLD[1], day: TODAY, requiredSeconds: 1500, startedAt: NOW.getTime() - 600_000, pausedAt: null, pausedMs: 0, speed: 1 },
      pendingBefore: { missionId: 'reset-clear-one-surface', day: TODAY, photo: { uri: 'file:///p/before.jpg', takenAt: NOW.getTime() - 60_000, kind: 'before', hash: 'hb' } },
    };
    const { useApp } = await load(v3, 3);
    const s = useApp.getState();
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///p/before.jpg']);
    expect(s.ensurePlan(TODAY).missions.length).toBe(3);
  });

  it('keeps a saved timer and before photo for missions the library has', async () => {
    const timer = { missionId: 'fitness-stretch-10', day: TODAY, requiredSeconds: 600, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const pendingBefore = { missionId: 'organization-clean-desk', day: TODAY, photo: { uri: 'file:///p/desk.jpg', takenAt: NOW.getTime() - 60_000, kind: 'before', hash: 'hd' } };
    const v4 = {
      installSalt: 'salt-4',
      settings: { onboarded: true },
      profile: { tracks: ['fitness', 'organization'], minutes: 60, intensity: 'lockin' },
      plans: {
        [TODAY]: {
          day: TODAY,
          missions: [
            { slot: 'easy', missionId: 'fitness-stretch-10', area: 'fitness' },
            { slot: 'easy', missionId: 'organization-clean-desk', area: 'organization' },
          ],
          rerolls: 0,
          replaced: [],
        },
      },
      timer,
      pendingBefore,
    };
    const { useApp } = await load(v4, 4);
    expect(useApp.getState().timer).toEqual(timer);
    expect(useApp.getState().pendingBefore).toEqual(pendingBefore);
    expect(mem.cancelled).toBe(0);
    expect(mem.deleted).toEqual([]);
  });
});

describe('old area ids stay out of the record', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("maps the tester snapshot too, so Back to real today brings back today's areas", async () => {
    const v3 = {
      installSalt: 'salt-5',
      settings: { onboarded: true },
      profile: { tracks: ['focus', 'fitness'], minutes: 60, intensity: 'lockin' },
      plans: {},
      dayOffset: 6,
      record: rec({ '2026-10-08': { [OLD[1]]: done(OLD[1], 'focus', 15) } }),
      devSnapshot: rec({
        '2026-10-05': { [OLD[1]]: done(OLD[1], 'focus', 15), 'reset-x': done('reset-x', 'reset', 10) },
        '2026-10-06': { 'mindset-y': done('mindset-y', 'mindset', 25) },
      }),
    };
    const { useApp } = await load(v3, 3);
    expect(tracksOf(useApp.getState().record)).toEqual(['discipline']);
    useApp.getState().backToRealToday();
    const r = useApp.getState().record;
    expect(tracksOf(r)).toEqual(['discipline', 'organization', 'discipline']);
    const { trackProgress } = await import('../../core/progress');
    const levels = trackProgress(r);
    expect(levels.discipline.xp).toBe(40);
    expect(levels.organization.xp).toBe(10);
  });

  it('maps a tester snapshot that an earlier 4.0 build saved without mapping it', async () => {
    const v4 = {
      installSalt: 'salt-5b',
      settings: { onboarded: true },
      profile: { tracks: ['discipline', 'organization'], minutes: 60, intensity: 'lockin' },
      dayOffset: 3,
      record: rec({}),
      devSnapshot: rec({ '2026-10-05': { 'reset-x': done('reset-x', 'reset', 10), 'mindset-y': done('mindset-y', 'mindset', 25) } }),
    };
    const { useApp } = await load(v4, 4);
    useApp.getState().backToRealToday();
    expect(tracksOf(useApp.getState().record)).toEqual(['organization', 'discipline']);
  });

  it('maps a Keychain backup written by a 3.0 preview build', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 4);
    const backup = rec({ '2026-10-05': { [OLD[1]]: done(OLD[1], 'focus', 15), 'reset-x': done('reset-x', 'reset', 10) } });
    useApp.getState().restore('salt-6', backup as never);
    const s = useApp.getState();
    expect(s.installSalt).toBe('salt-6');
    expect(tracksOf(s.record)).toEqual(['discipline', 'organization']);
  });

  it('carries a 2.x balance over from a Keychain backup', async () => {
    const { useApp } = await load({ installSalt: 'fresh', settings: { onboarded: false } }, 4);
    const proof = { uri: '', takenAt: 0, lineNo: null };
    const twoX = {
      days: { '2025-03-01': { at: 0, verified: true } },
      work: { '2025-03-01': { a: { text: 'a', doneAt: 0, proof }, b: { text: 'b', doneAt: 0, proof }, c: { text: 'c', doneAt: 0, proof: null } } },
      codes: [{ day: '2025-03-02', collection: 'x', points: 10, percent: 10, code: 'C', url: '', expires: '2025-04-01' }],
    };
    useApp.getState().restore('salt-7', twoX as never);
    const r = useApp.getState().record;
    expect(r.legacyPoints).toBe(10);
    expect(r.missions).toEqual({});
    const { balance } = await import('../../core/rewards');
    expect(balance(r)).toBe(10);
  });

  it('leaves a current record as it is, however many times it runs', async () => {
    const { migrateRecordTracks } = await load({ installSalt: 'fresh' }, 4);
    const current = rec({ '2026-10-05': { 'school-study-30': done('school-study-30', 'school', 15) } });
    expect(migrateRecordTracks(current as never)).toEqual(current);
    const old = rec({ '2026-10-05': { 'reset-x': done('reset-x', 'reset', 10) } });
    const once = migrateRecordTracks(old as never);
    expect(migrateRecordTracks(once)).toEqual(once);
  });
});
