// A Plan finished through the real store (launch pass P1-8): the finishing proof puts it on the
// record (plansFinished), where it stays through Clear, leaving, starting another Plan and a
// restore; Today then has one moment for it (core/moments), and none for a finish the update
// already marked. Hydrates the real store from a seeded storage entry.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import v33 from './fixtures/v33-state.json';

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
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const at9 = (day: number) => new Date(2026, 9, day, 9, 0, 0); // 9 AM local, October 2026

const accepted = () => ({ status: 'accepted' as const, method: 'on-device' as const, checks: [], at: Date.now() });
const photo = (id: string) => [{ uri: `file:///p/${id}.jpg`, takenAt: Date.now(), kind: 'single' as const, hash: `h-${id}-${Date.now()}` }];

async function load(state: object, version = 8) {
  mem.map.clear();
  mem.map.set('unsetld-v2', JSON.stringify({ state, version }));
  vi.resetModules();
  const store = await import('../store');
  const moments = await import('../../core/moments');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...moments };
}

type Store = Awaited<ReturnType<typeof load>>['useApp'];

async function loadWith(state: object) {
  const loaded = await load(state);
  const content = await import('../../content');
  return { ...loaded, MISSION_BY_ID: content.MISSION_BY_ID };
}

/** Proves one of the running Plan's missions in today's plan, on October `day` at 9 AM. */
function provePlanDay(useApp: Store, day: number) {
  vi.setSystemTime(at9(day));
  const d = `2026-10-${String(day).padStart(2, '0')}`;
  const plan = useApp.getState().ensurePlan(d);
  const m = plan.missions.find(p => p.programId);
  expect(m, `a Plan mission on ${d}`).toBeDefined();
  return useApp.getState().completeMission(m!.missionId, photo(m!.missionId), accepted(), { verifiedClock: true, timerSeconds: 1800 });
}

const PROFILE = { tracks: ['discipline', 'school'], minutes: 30, intensity: 'lock' };

describe('finishing a Plan', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at9(12));
  });

  it('puts it on the record with the proof that finishes it, and only then', async () => {
    const { useApp } = await load({ installSalt: 'salt-plan', settings: { onboarded: true }, profile: PROFILE });
    useApp.getState().startProgram('lock-in-7');
    for (let i = 0; i < 6; i++) {
      provePlanDay(useApp, 12 + i);
      expect(useApp.getState().record.plansFinished ?? []).toEqual([]);
    }
    provePlanDay(useApp, 18);
    expect(useApp.getState().program).toMatchObject({ id: 'lock-in-7', finishedDay: '2026-10-18' });
    expect(useApp.getState().record.plansFinished).toEqual([{ id: 'lock-in-7', finished: '2026-10-18' }]);
    // Another proof the same day adds nothing.
    const rest = useApp.getState().plans['2026-10-18'].missions.find(p => !useApp.getState().record.missions['2026-10-18']?.[p.missionId]);
    if (rest) useApp.getState().completeMission(rest.missionId, photo(rest.missionId), accepted(), { verifiedClock: true, timerSeconds: 1800 });
    expect(useApp.getState().record.plansFinished).toHaveLength(1);
  });

  it('keeps it through Clear, starting another Plan, finishing again and a restore', async () => {
    const { useApp } = await load({ installSalt: 'salt-keep', settings: { onboarded: true }, profile: { tracks: ['organization', 'discipline'], minutes: 30, intensity: 'lock' } });
    useApp.getState().startProgram('get-organized');
    for (let i = 0; i < 5; i++) provePlanDay(useApp, 12 + i);
    const first = { id: 'get-organized', finished: '2026-10-16' };
    expect(useApp.getState().record.plansFinished).toEqual([first]);

    // Clear (leaveProgram), then the same Plan again, finished again: a second entry.
    useApp.getState().leaveProgram();
    expect(useApp.getState().record.plansFinished).toEqual([first]);
    vi.setSystemTime(at9(17));
    useApp.getState().startProgram('get-organized');
    expect(useApp.getState().record.plansFinished).toEqual([first]);
    for (let i = 0; i < 5; i++) provePlanDay(useApp, 17 + i);
    const second = { id: 'get-organized', finished: '2026-10-21' };
    expect(useApp.getState().record.plansFinished).toEqual([first, second]);

    // Starting another Plan, or leaving one partway, takes nothing off.
    useApp.getState().startProgram('lock-in-7');
    provePlanDay(useApp, 22);
    useApp.getState().leaveProgram();
    expect(useApp.getState().record.plansFinished).toEqual([first, second]);

    // The Keychain backup holds the record: a restore brings the finishes back with it.
    const backup = JSON.parse(JSON.stringify(useApp.getState().record));
    useApp.getState().setRecord({ ...useApp.getState().record, plansFinished: [] });
    useApp.getState().restore('salt-keep', backup);
    expect(useApp.getState().record.plansFinished).toEqual([first, second]);
  });

  it('Today has one moment for it, standing in for what was reached with it; none after', async () => {
    const { useApp, dueMoment } = await load({ installSalt: 'salt-moment', settings: { onboarded: true }, profile: PROFILE });
    useApp.getState().startProgram('lock-in-7');
    for (let i = 0; i < 7; i++) provePlanDay(useApp, 12 + i);
    const s = useApp.getState();
    const due = dueMoment(s.record, '2026-10-18', s.momentsShown);
    expect(due?.moment).toEqual({ kind: 'plan', id: 'lock-in-7', day: '2026-10-18' });
    // Seven days in a row: the 7-day streak and the first plan are reached with it, on one screen.
    expect(due?.covers).toEqual(expect.arrayContaining(['plan:lock-in-7:2026-10-18', 'plan-1', 'streak-7', 'day:2026-10-18']));
    for (const k of due!.covers) useApp.getState().markMomentShown(k);
    expect(dueMoment(useApp.getState().record, '2026-10-18', useApp.getState().momentsShown)).toBeNull();
    // The next day: nothing waiting.
    expect(dueMoment(useApp.getState().record, '2026-10-19', useApp.getState().momentsShown)).toBeNull();
  });
});

describe('an UNSETLD+ Plan earns no more than the day without it (rules review 4)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(at9(12));
  });

  const PUSH = { tracks: ['discipline', 'organization'], minutes: 60, intensity: 'push' };
  const points = (plan: { missions: { missionId: string; points?: number }[] }, byId: Record<string, { points: number }>) =>
    plan.missions.reduce((t, p) => t + Math.min(typeof p.points === 'number' ? p.points : Infinity, byId[p.missionId].points), 0);

  it('caps a members-only Plan day at the same day planned without it; a free Plan day is as it was', async () => {
    const { useApp, MISSION_BY_ID } = await loadWith({ installSalt: 'salt-plus', settings: { onboarded: true }, profile: PUSH });
    const own = points(useApp.getState().ensurePlan('2026-10-12'), MISSION_BY_ID);
    for (const id of ['build-something', 'school-reset', 'business-week']) {
      const { useApp: app } = await loadWith({ installSalt: 'salt-plus', settings: { onboarded: true }, profile: PUSH });
      app.getState().startProgram(id);
      const plan = app.getState().ensurePlan('2026-10-12');
      expect(plan.missions.some(p => p.programId === id), id).toBe(true);
      expect(points(plan, MISSION_BY_ID), id).toBeLessThanOrEqual(own);
      // School Reset's first day would come to 50 against 45: a Plan mission pays less.
      if (id === 'school-reset') expect(plan.missions.some(p => p.programId === id && typeof p.points === 'number')).toBe(true);
    }
    const { useApp: free } = await loadWith({ installSalt: 'salt-plus', settings: { onboarded: true }, profile: PUSH });
    free.getState().startProgram('get-organized');
    const plan = free.getState().ensurePlan('2026-10-12');
    expect(plan.missions.some(p => p.programId === 'get-organized')).toBe(true);
    expect(plan.missions.every(p => p.points === undefined)).toBe(true);
  });
});

describe('a finish from before the update (the 3.3 fixture: Get Organized, finished 9 Oct)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  it('gets no moment once it is older than yesterday', async () => {
    vi.setSystemTime(new Date(2026, 9, 15, 8, 0, 0));
    const { useApp, dueMoment } = await load(v33.state, 7);
    const s = useApp.getState();
    expect(s.record.plansFinished).toEqual([{ id: 'get-organized', finished: '2026-10-09' }]);
    const due = dueMoment(s.record, '2026-10-15', s.momentsShown);
    expect(due?.moment?.kind).not.toBe('plan');
    expect(due?.covers ?? []).not.toContain('plan-1');
  });

  it('finished yesterday, its moment is still to come', async () => {
    vi.setSystemTime(new Date(2026, 9, 10, 8, 0, 0));
    const { useApp, dueMoment } = await load(v33.state, 7);
    const s = useApp.getState();
    expect(dueMoment(s.record, '2026-10-10', s.momentsShown)?.moment).toEqual({ kind: 'plan', id: 'get-organized', day: '2026-10-09' });
  });
});
