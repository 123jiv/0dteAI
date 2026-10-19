// Usage counts through the real store and the real service (launch pass P1-20; docs/METRICS.md):
// the store's actions record the allowlisted events once each where they should; nothing is
// recorded while sharing was never turned on (every install in this build), in tester time
// travel, or once unsetld.com says no; and nothing the user wrote (their goal, their own mission,
// Something else) ever reaches the phone's queue or the request.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>() };
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
vi.mock('../../services/proof', () => ({ deletePhoto: () => {}, webPhotoKeys: () => [] }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const KEY = 'unsetld.metrics.v1';
const GOAL = 'Launch my clothing brand by June';
const OWN = 'Call grandma about the trip';
const ELSE = 'Stop vaping before prom';
const at9 = (day: number) => new Date(2026, 9, day, 9, 0, 0);
const accepted = () => ({ status: 'accepted' as const, method: 'on-device' as const, checks: [], at: Date.now() });
const photo = (id: string) => [{ uri: `file:///p/${id}.jpg`, takenAt: Date.now(), kind: 'single' as const, hash: `h-${id}-${Date.now()}` }];

async function load(state: object) {
  mem.map.clear();
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 8 }));
  vi.resetModules();
  const store = await import('../store');
  const metrics = await import('../../services/metrics');
  // As state/lifecycle connects it.
  metrics.connectMetrics(() => ({ shareUsage: store.useApp.getState().settings.shareUsage, metrics: store.useApp.getState().remote.metrics }));
  await new Promise(r => setTimeout(r, 0));
  return { useApp: store.useApp, metrics };
}

type Loaded = Awaited<ReturnType<typeof load>>;
const queue = () => (JSON.parse(mem.map.get(KEY) ?? 'null') as { queue: { e: string; p: Record<string, unknown> }[] } | null)?.queue ?? null;
const names = () => (queue() ?? []).map(q => q.e);

/** Proves every mission in today's plan, one by one. */
function proveAll({ useApp }: Loaded) {
  const d = useApp.getState().currentDay;
  const plan = useApp.getState().ensurePlan(d);
  for (const p of plan.missions) useApp.getState().completeMission(p.missionId, photo(p.missionId), accepted(), { verifiedClock: true, timerSeconds: 3600 });
}

/** A day's worth of everything the store records: setup, a proof, a swap to an own mission, a focus, a plan. */
function aDay(app: Loaded) {
  const s = app.useApp.getState();
  s.setProfile({ goal: GOAL, goalArea: 'projects' });
  s.completeOnboarding(false);
  const own = s.createCustomMission({ title: OWN, track: 'projects', proofType: 'PHOTO' });
  expect(own).not.toBeNull();
  expect(app.useApp.getState().replaceMission(0, own!.id, 'another')).toBe('ok');
  app.useApp.getState().setFocus({ week: '2026-10-19', id: 'other', text: ELSE, area: 'discipline' });
  app.useApp.getState().skipFocus('2026-10-26');
  app.useApp.getState().startProgram('lock-in-7');
  proveAll(app);
  app.useApp.getState().leaveProgram();
}

const PROFILE = { tracks: ['projects', 'discipline'], minutes: 30, intensity: 'lockin' };

describe('the store records usage counts only when allowed', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at9(21));
  });

  it('records nothing while sharing was never answered: every install in this build', async () => {
    const app = await load({ installSalt: 'salt-a', settings: { onboarded: false }, profile: PROFILE });
    expect(app.useApp.getState().settings.shareUsage).toBeNull();
    aDay(app);
    await app.metrics.metricsIdle();
    expect(mem.map.has(KEY)).toBe(false);
  });

  it('records nothing in tester time travel, or once unsetld.com says no', async () => {
    const app = await load({ installSalt: 'salt-b', settings: { onboarded: false, shareUsage: true }, profile: PROFILE });
    app.useApp.getState().setDayOffset(2);
    aDay(app);
    await app.metrics.metricsIdle();
    expect(mem.map.has(KEY)).toBe(false);
    const off = await load({ installSalt: 'salt-c', settings: { onboarded: false, shareUsage: true }, profile: PROFILE, remote: { accessEnabled: false, collection: '004', metrics: false } });
    aDay(off);
    await off.metrics.metricsIdle();
    expect(mem.map.has(KEY)).toBe(false);
  });

  it('with sharing on: each action records its event, the once-only ones once', async () => {
    const app = await load({ installSalt: 'salt-d', settings: { onboarded: false, shareUsage: true }, profile: PROFILE });
    aDay(app);
    await app.metrics.metricsIdle();
    const q = queue()!;
    expect(names()).toEqual([
      'onboarding_completed',
      'mission_swapped',
      'weekly_focus_set',
      'weekly_focus_set',
      'plan_started',
      'first_mission_proven',
      'mission_proven',
      ...names().slice(7, -2).map(() => 'mission_proven'),
      'perfect_day',
      'plan_left',
    ]);
    expect(q[0].p).toEqual({ areas: ['discipline', 'projects'], minutes: '30', goal: 'picked', returning: false });
    expect(q[1].p).toMatchObject({ to: 'custom', reason: 'another', used: 1 });
    expect(q[2].p).toEqual({ focus: 'other', week: 'this' });
    expect(q[3].p).toEqual({ focus: 'skip', week: 'next' });
    expect(q[4].p).toEqual({ plan: 'lock-in-7', free: true });
    expect(q.find(x => x.e === 'mission_proven' && x.p.mission === 'custom')).toBeDefined();
    // Started after today was swapped, so the Plan starts tomorrow: left with no day done.
    expect(q[q.length - 1].p).toEqual({ plan: 'lock-in-7', at_day: 0, why: 'left' });
    // A second day's proofs: no second first proof; a perfect day of its own.
    vi.setSystemTime(at9(22));
    app.useApp.getState().refreshDay();
    proveAll(app);
    await app.metrics.metricsIdle();
    expect(names().filter(e => e === 'first_mission_proven')).toHaveLength(1);
    expect(names().filter(e => e === 'perfect_day')).toHaveLength(2);
    expect(names().filter(e => e === 'onboarding_completed')).toHaveLength(1);
  });

  it('a Plan finished: plan_completed once; clearing it afterwards is not leaving it', async () => {
    vi.setSystemTime(at9(12));
    const app = await load({ installSalt: 'salt-plan', settings: { onboarded: true, shareUsage: true }, profile: PROFILE });
    app.useApp.getState().startProgram('lock-in-7');
    for (let day = 12; day <= 18; day++) {
      vi.setSystemTime(at9(day));
      app.useApp.getState().refreshDay();
      proveAll(app);
    }
    app.useApp.getState().leaveProgram();
    await app.metrics.metricsIdle();
    const done = queue()!.filter(x => x.e === 'plan_completed');
    expect(done).toEqual([expect.objectContaining({ p: { plan: 'lock-in-7', days_over: 0 } })]);
    expect(names()).not.toContain('plan_left');
  });

  it('switching Plans records the one left', async () => {
    const app = await load({ installSalt: 'salt-sw', settings: { onboarded: true, shareUsage: true }, profile: { ...PROFILE, tracks: ['organization', 'discipline'] } });
    app.useApp.getState().startProgram('lock-in-7');
    app.useApp.getState().startProgram('get-organized');
    await app.metrics.metricsIdle();
    expect(queue()!.map(x => [x.e, x.p.plan, x.p.why ?? null])).toEqual([
      ['plan_started', 'lock-in-7', null],
      ['plan_left', 'lock-in-7', 'switched'],
      ['plan_started', 'get-organized', null],
    ]);
  });
});

describe('nothing the user wrote leaves the store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at9(21));
  });

  it('their goal, own mission and Something else never reach the queue or the request', async () => {
    const app = await load({ installSalt: 'salt-leak', settings: { onboarded: false, shareUsage: true }, profile: PROFILE, remote: { accessEnabled: false, collection: '004', metrics: true } });
    aDay(app);
    // The next day closes this one.
    vi.setSystemTime(at9(22));
    app.metrics.closeDays(app.useApp.getState().plans, app.useApp.getState().record, 30);
    await app.metrics.metricsIdle();
    const stored = mem.map.get(KEY)!;
    expect(names()).toContain('day_closed');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await app.metrics.flushMetrics({ force: true });
    vi.unstubAllGlobals();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = String(fetchMock.mock.calls[0][1].body);
    const own = app.useApp.getState().customMissions[0].id;
    for (const text of [stored, body]) {
      for (const s of [GOAL, OWN, ELSE, 'clothing', 'grandma', 'vaping', own, app.useApp.getState().installSalt, 'u16', '16to17']) expect(text).not.toContain(s);
    }
    expect(body).toContain('"to":"custom"');
  });
});
