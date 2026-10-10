// Today's plan once the day has started: Settings > Your plan and starting a program never
// rebuild it under a running timer or a waiting before photo, a library update keeps what's
// started, an empty stored day is planned again, and nothing is left running for a mission Home
// no longer shows. Hydrates the real store from a seeded storage entry.
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

const PROFILE = { tracks: ['school', 'fitness', 'organization'], school: true, gym: true, age: '18plus', minutes: 60, intensity: 'lockin' };
const PLAN = {
  day: TODAY,
  missions: [
    { slot: 'easy', missionId: 'fitness-stretch-10', area: 'fitness' }, // TIMER
    { slot: 'main', missionId: 'school-study-30', area: 'school' }, // TIMER_AND_PHOTO
    { slot: 'main', missionId: 'organization-fix-broken', area: 'organization' }, // BEFORE_AFTER
  ],
  rerolls: 0,
  replaced: [] as string[],
};
const before = (missionId: string) => ({ missionId, day: TODAY, photo: { uri: `file:///p/${missionId}-before.jpg`, takenAt: NOW.getTime(), kind: 'before' as const, hash: 'hb' } });
const ids = (p: { missions: { missionId: string }[] }) => p.missions.map(m => m.missionId);

async function load(extra: object = {}) {
  mem.map.clear();
  mem.deleted = [];
  mem.cancelled = 0;
  const state = { installSalt: 'salt-r', settings: { onboarded: true }, profile: PROFILE, plans: { [TODAY]: PLAN }, ...extra };
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 4 }));
  vi.resetModules();
  const store = await import('../store');
  const content = await import('../../content');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...content };
}

describe('Settings > Your plan and programs once the day has started', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('rebuilds a day nothing was started in', async () => {
    const { useApp } = await load();
    useApp.getState().setProfile({ tracks: ['business', 'money', 'career'] });
    useApp.getState().replanToday();
    const plan = useApp.getState().plans[TODAY];
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(['business', 'money', 'career']).toContain(p.area);
  });

  it('keeps the plan while a timer runs for one of its missions', async () => {
    const { useApp } = await load();
    useApp.getState().startTimer('fitness-stretch-10');
    vi.setSystemTime(new Date(NOW.getTime() + 5 * 60_000));
    useApp.getState().setProfile({ tracks: ['business', 'money', 'career'] });
    useApp.getState().replanToday();
    const s = useApp.getState();
    expect(ids(s.plans[TODAY])).toEqual(ids(PLAN));
    expect(s.timer?.missionId).toBe('fitness-stretch-10');
    expect(mem.cancelled).toBe(0);
  });

  it('keeps the plan while a before photo waits, so a new program starts tomorrow', async () => {
    const { useApp } = await load({ pendingBefore: before('organization-fix-broken') });
    useApp.getState().startProgram('lock-in-7');
    const s = useApp.getState();
    expect(s.program?.id).toBe('lock-in-7');
    expect(ids(s.plans[TODAY])).toEqual(ids(PLAN));
    expect(s.plans[TODAY].missions.some(p => p.programId)).toBe(false);
    expect(s.pendingBefore?.missionId).toBe('organization-fix-broken');
    expect(mem.deleted).toEqual([]);
  });

  it('a timer or before photo for a mission not in the plan never holds it, and goes with the rebuild', async () => {
    // Left by an earlier build: neither mission can be in this user's plan (music, school).
    const { useApp } = await load({
      profile: { ...PROFILE, school: false },
      timer: { missionId: 'skills-instrument', day: TODAY, requiredSeconds: 1800, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 },
      pendingBefore: before('school-organize-schoolwork'),
    });
    useApp.getState().replanToday();
    const s = useApp.getState();
    expect(ids(s.plans[TODAY])).not.toEqual(ids(PLAN));
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///p/school-organize-schoolwork-before.jpg']);
  });

  it("keeps yesterday's timer for Home to clear", async () => {
    const timer = { missionId: 'fitness-stretch-10', day: '2026-10-09', requiredSeconds: 600, startedAt: NOW.getTime() - 86_400_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp } = await load({ timer });
    useApp.getState().setProfile({ tracks: ['business'] });
    useApp.getState().replanToday();
    expect(useApp.getState().timer).toEqual(timer);
    expect(mem.cancelled).toBe(0);
  });
});

describe('ensurePlan with a stored day it cannot use as it is', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  const withRemoved = { ...PLAN, missions: [{ slot: 'main', missionId: 'focus-lock-in-25' }, ...PLAN.missions.slice(0, 2)] };

  it('a library update rebuilds an untouched day', async () => {
    const { useApp, MISSION_BY_ID } = await load({ plans: { [TODAY]: withRemoved } });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
  });

  it('a library update keeps what is left of a day with a timer running', async () => {
    const timer = { missionId: 'fitness-stretch-10', day: TODAY, requiredSeconds: 600, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp } = await load({ plans: { [TODAY]: withRemoved }, timer });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(ids(plan)).toEqual(['fitness-stretch-10', 'school-study-30']);
    expect(useApp.getState().timer).toEqual(timer);
    expect(mem.cancelled).toBe(0);
  });

  it('an empty stored day is planned again, keeping its swaps', async () => {
    const { useApp, MISSION_BY_ID } = await load({ plans: { [TODAY]: { day: TODAY, missions: [], rerolls: 1, replaced: ['school-study-30'] } } });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(MISSION_BY_ID[p.missionId]).toBeTruthy();
    expect(plan).toMatchObject({ rerolls: 1, replaced: ['school-study-30'] });
    expect(useApp.getState().plans[TODAY]).toBe(plan);
  });

  it('a stored day that is fine comes back as it is', async () => {
    const { useApp } = await load();
    expect(useApp.getState().ensurePlan(TODAY)).toEqual(PLAN);
  });
});

describe('swap', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("stays in the mission's area, says which area, and takes the swapped-out mission's timer with it", async () => {
    const { useApp, MISSION_BY_ID } = await load();
    useApp.getState().startTimer('fitness-stretch-10');
    expect(useApp.getState().rerollMission(0)).toBe('ok');
    const s = useApp.getState();
    const next = s.plans[TODAY].missions[0];
    expect(next.missionId).not.toBe('fitness-stretch-10');
    expect(next.slot).toBe('easy');
    expect(next.area).toBe('fitness');
    expect(MISSION_BY_ID[next.missionId].minutes).toBeLessThanOrEqual(15);
    expect(s.plans[TODAY]).toMatchObject({ rerolls: 1, replaced: ['fitness-stretch-10'] });
    expect(s.skips['fitness-stretch-10']).toEqual({ count: 1, last: TODAY });
    expect(s.timer).toBeNull();
    expect(mem.cancelled).toBe(1);
    // A free user has one swap a day.
    expect(useApp.getState().rerollMission(1)).toBe('limit');
  });
});

describe('focus timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('a Pause tap just after zero leaves it finished, and the TIMER proof counts', async () => {
    const { useApp, MISSION_BY_ID } = await load();
    const { elapsedSeconds, endsAt, timerDone } = await import('../../core/timer');
    const { localChecks } = await import('../../core/verify');
    useApp.getState().startTimer('fitness-stretch-10');
    vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000 + 400));
    useApp.getState().pauseTimer();
    const t = useApp.getState().timer!;
    expect(t.pausedAt).toBeNull();
    const now = Date.now() + 2000;
    expect(timerDone(t, now)).toBe(true);
    // As MissionScreen submits it.
    const v = localChecks({
      mission: MISSION_BY_ID['fitness-stretch-10'],
      photos: [],
      timerSeconds: Math.min(elapsedSeconds(t, now), t.requiredSeconds),
      timerEndedAt: endsAt(t) ?? undefined,
      now,
      usedHashes: new Set(),
      fromCamera: true,
    });
    expect(v.status).toBe('accepted');
  });
});
