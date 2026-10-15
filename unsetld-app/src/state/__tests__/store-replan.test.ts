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
    { slot: 'easy', missionId: 'F3', area: 'fitness' }, // Do 20 Minutes of Cardio: TIMER_AND_PHOTO
    { slot: 'main', missionId: 'S1', area: 'school' }, // Study One Subject for 30 Minutes: TIMER_AND_PHOTO
    { slot: 'easy', missionId: 'O1', area: 'organization' }, // Clear Your Desk: BEFORE_AFTER
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
    const { useApp, isApproved } = await load();
    useApp.getState().setProfile({ tracks: ['projects', 'money', 'career'] });
    useApp.getState().replanToday();
    const plan = useApp.getState().plans[TODAY];
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) {
      expect(['projects', 'money', 'career']).toContain(p.area);
      expect(isApproved(p.missionId)).toBe(true);
    }
  });

  it('keeps the plan while a timer runs for one of its missions', async () => {
    const { useApp } = await load();
    useApp.getState().startTimer('F3');
    vi.setSystemTime(new Date(NOW.getTime() + 5 * 60_000));
    useApp.getState().setProfile({ tracks: ['projects', 'money', 'career'] });
    useApp.getState().replanToday();
    const s = useApp.getState();
    expect(ids(s.plans[TODAY])).toEqual(ids(PLAN));
    expect(s.timer?.missionId).toBe('F3');
    expect(mem.cancelled).toBe(0);
  });

  it('keeps the plan while a before photo waits, so a new program starts tomorrow', async () => {
    const { useApp } = await load({ pendingBefore: before('O1') });
    useApp.getState().startProgram('lock-in-7');
    const s = useApp.getState();
    expect(s.program?.id).toBe('lock-in-7');
    expect(ids(s.plans[TODAY])).toEqual(ids(PLAN));
    expect(s.plans[TODAY].missions.some(p => p.programId)).toBe(false);
    expect(s.pendingBefore?.missionId).toBe('O1');
    expect(mem.deleted).toEqual([]);
  });

  it('a timer or before photo for a mission not in the plan never holds it, and goes with the rebuild', async () => {
    // Left by an earlier build: neither mission is in today's plan (Skills isn't one of this user's areas).
    const { useApp } = await load({
      timer: { missionId: 'K1', day: TODAY, requiredSeconds: 1800, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 },
      pendingBefore: before('K7'),
    });
    expect(useApp.getState().timer?.missionId).toBe('K1');
    useApp.getState().setProfile({ tracks: ['money', 'career'] });
    useApp.getState().replanToday();
    const s = useApp.getState();
    expect(ids(s.plans[TODAY])).not.toEqual(ids(PLAN));
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///p/K7-before.jpg']);
  });

  it("keeps yesterday's timer for Home to clear", async () => {
    const timer = { missionId: 'F3', day: '2026-10-09', requiredSeconds: 1200, startedAt: NOW.getTime() - 86_400_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp } = await load({ timer });
    useApp.getState().setProfile({ tracks: ['projects'] });
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

  // A retired mission (3.3) next to two approved ones.
  const withRemoved = { ...PLAN, missions: [{ slot: 'main', missionId: 'school-study-30', area: 'school' }, ...PLAN.missions.slice(0, 2)] };

  it('a library update rebuilds an untouched day', async () => {
    const { useApp, isApproved } = await load({ plans: { [TODAY]: withRemoved } });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(isApproved(p.missionId)).toBe(true);
  });

  it('a library update keeps what is left of a day with a timer running, with an approved mission in the retired one\'s place', async () => {
    const timer = { missionId: 'F3', day: TODAY, requiredSeconds: 1200, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp, isApproved } = await load({ plans: { [TODAY]: withRemoved }, timer });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(ids(plan).slice(1)).toEqual(['F3', 'S1']);
    expect(isApproved(plan.missions[0].missionId)).toBe(true);
    expect(plan.missions[0].area).toBe('school');
    expect(plan.rerolls).toBe(withRemoved.rerolls);
    expect(useApp.getState().timer).toEqual(timer);
    expect(mem.cancelled).toBe(0);
  });

  it('an empty stored day is planned again, keeping its swaps', async () => {
    const { useApp, isApproved } = await load({ plans: { [TODAY]: { day: TODAY, missions: [], rerolls: 1, replaced: ['S1'] } } });
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.length).toBe(3);
    for (const p of plan.missions) expect(isApproved(p.missionId)).toBe(true);
    expect(plan).toMatchObject({ rerolls: 1, replaced: ['S1'] });
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
    const { useApp, MISSION_BY_ID, isApproved } = await load();
    const { EASY_MAX_MINUTES } = await import('../../core/missions');
    useApp.getState().startTimer('F3');
    expect(useApp.getState().rerollMission(0)).toBe('ok');
    const s = useApp.getState();
    const next = s.plans[TODAY].missions[0];
    expect(next.missionId).not.toBe('F3');
    expect(isApproved(next.missionId)).toBe(true);
    expect(next.slot).toBe('easy');
    expect(next.area).toBe('fitness');
    expect(MISSION_BY_ID[next.missionId].track).toBe('fitness');
    expect(MISSION_BY_ID[next.missionId].minutes).toBeLessThanOrEqual(EASY_MAX_MINUTES);
    expect(s.plans[TODAY]).toMatchObject({ rerolls: 1, replaced: ['F3'] });
    expect(s.skips['F3']).toEqual({ count: 1, last: TODAY });
    expect(s.timer).toBeNull();
    expect(mem.cancelled).toBe(1);
    // A free user has one swap a day.
    expect(useApp.getState().rerollMission(1)).toBe('limit');
  });
});

describe('swapping in a mission picked from the sheet', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("never takes a retired mission or one from an area the user didn't choose", async () => {
    const { useApp } = await load();
    expect(useApp.getState().replaceMission(0, 'fitness-stretch-10', 'another')).toBe('invalid');
    expect(useApp.getState().replaceMission(0, 'M1', 'another')).toBe('invalid');
    expect(useApp.getState().plans[TODAY]).toEqual(PLAN);
    expect(useApp.getState().replaceMission(0, 'S11', 'another')).toBe('ok');
    expect(useApp.getState().plans[TODAY].missions[0]).toMatchObject({ missionId: 'S11', area: 'school' });
  });

  it("takes one from this week's focus area: picking the focus chose it for the week", async () => {
    const { useApp } = await load({ profile: { ...PROFILE, focus: { week: '2026-10-05', id: 'save' } } });
    expect(useApp.getState().replaceMission(0, 'M1', 'another')).toBe('ok');
    expect(useApp.getState().plans[TODAY].missions[0]).toMatchObject({ missionId: 'M1', area: 'money' });
  });
});

describe('focus timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('a Pause tap just after zero leaves it finished, and the timed proof counts', async () => {
    const { useApp, MISSION_BY_ID } = await load();
    const { elapsedSeconds, endsAt, timerDone } = await import('../../core/timer');
    const { localChecks } = await import('../../core/verify');
    useApp.getState().startTimer('F3');
    vi.setSystemTime(new Date(NOW.getTime() + 20 * 60_000 + 400));
    useApp.getState().pauseTimer();
    const t = useApp.getState().timer!;
    expect(t.pausedAt).toBeNull();
    const now = Date.now() + 2000;
    expect(timerDone(t, now)).toBe(true);
    // As MissionScreen submits it: the photo comes after the timer.
    const v = localChecks({
      mission: MISSION_BY_ID['F3'],
      photos: [{ uri: 'file:///p/F3.jpg', takenAt: now, kind: 'single', hash: 'hf' }],
      timerSeconds: Math.min(elapsedSeconds(t, now), t.requiredSeconds),
      timerEndedAt: endsAt(t) ?? undefined,
      now,
      usedHashes: new Set(),
      fromCamera: true,
    });
    expect(v.status).toBe('accepted');
  });
});

describe('the weekly focus', () => {
  // Sunday 11 Oct 2026: the week of Monday 5 Oct ends; next week starts Monday 12 Oct.
  const SUNDAY = new Date(2026, 9, 11, 18, 0, 0);
  const SUN = '2026-10-11';
  const sundayPlan = { ...PLAN, day: SUN };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SUNDAY);
  });

  it("picked on Sunday for next week, it keeps this week's focus and Sunday's missions until Monday", async () => {
    const focus = { week: '2026-10-05', id: 'gym' as const };
    const { useApp } = await load({ profile: { ...PROFILE, focus }, plans: { [SUN]: sundayPlan } });
    const { activeFocus } = await import('../../core/personalize');
    useApp.getState().refreshDay();
    useApp.getState().setFocus({ week: '2026-10-12', id: 'business' });
    const s = useApp.getState();
    expect(ids(s.plans[SUN])).toEqual(ids(sundayPlan));
    expect(activeFocus(s.profile, SUN)).toEqual(focus);
    expect(activeFocus(s.profile, '2026-10-12')?.id).toBe('business');
    // Taking it back on Sunday clears next week's only.
    s.setFocus(null, '2026-10-12');
    expect(activeFocus(useApp.getState().profile, '2026-10-12')).toBeNull();
    expect(activeFocus(useApp.getState().profile, SUN)).toEqual(focus);
  });

  it("set for this week, it replans an untouched today and replaces one picked ahead for it", async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0, 0));
    const { useApp } = await load({ profile: { ...PROFILE, nextFocus: { week: '2026-10-12', id: 'business' } }, plans: {} });
    const { activeFocus } = await import('../../core/personalize');
    useApp.getState().refreshDay();
    useApp.getState().setFocus({ week: '2026-10-12', id: 'gym' });
    const s = useApp.getState();
    expect(activeFocus(s.profile, '2026-10-12')?.id).toBe('gym');
    expect(s.profile.nextFocus).toBeNull();
    expect(s.plans['2026-10-12']?.missions.some(p => p.area === 'fitness')).toBe(true);
  });

  it('the retired weekly priority is cleared when the store moves to v6', async () => {
    const { useApp } = await load({ profile: { ...PROFILE, priority: 'school' } });
    expect(useApp.getState().profile.priority).toBeNull();
  });
});
