// Updates that retire missions, leave a day with nothing open, or meet plans saved before
// plans recorded areas; and a 2.x tester snapshot. Hydrates the real store from a seeded entry.
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

describe('after an update', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('keeps a retired mission in today\'s plan, with its running timer', async () => {
    const plan = { day: TODAY, missions: [
      { slot: 'easy', missionId: 'fitness-stretch-10', area: 'fitness' },
      { slot: 'main', missionId: 'fitness-bike-30', area: 'fitness' },
      { slot: 'main', missionId: 'school-study-30', area: 'school' },
    ], rerolls: 0, replaced: [] };
    const timer = { missionId: 'fitness-bike-30', day: TODAY, startedAt: NOW.getTime() - 20 * 60_000, requiredSeconds: 1800, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp, MISSION_BY_ID, MISSIONS } = await load({
      installSalt: 'salt-r', settings: { onboarded: true },
      profile: { tracks: ['fitness', 'school'], school: true },
      plans: { [TODAY]: plan }, timer,
    }, 4);
    expect(MISSIONS.some(m => m.id === 'fitness-bike-30')).toBe(false);
    expect(MISSION_BY_ID['fitness-bike-30']?.active).toBe(false);
    expect(useApp.getState().timer?.missionId).toBe('fitness-bike-30');
    expect(mem.cancelled).toBe(0);
    expect(useApp.getState().ensurePlan(TODAY).missions.map(p => p.missionId)).toEqual(plan.missions.map(p => p.missionId));
  });

  it('plans a day again when everything left in it is already proven', async () => {
    const { useApp } = await load({
      installSalt: 'salt-p', settings: { onboarded: true },
      profile: { tracks: ['money', 'fitness'] },
      plans: { [TODAY]: { day: TODAY, missions: [{ slot: 'quick', missionId: OLD[0] }, { slot: 'progress', missionId: 'money-sell-unused' }], rerolls: 0, replaced: [] } },
      record: rec({ [TODAY]: { 'money-sell-unused': done('money-sell-unused', 'money', 15) } }),
    }, 4);
    const plan = useApp.getState().ensurePlan(TODAY);
    const proven = useApp.getState().record.missions[TODAY];
    expect(plan.missions.some(p => !proven[p.missionId])).toBe(true);
  });

  it('gives a plan saved without areas the area its row shows, so the proof counts there', async () => {
    const { useApp } = await load({
      installSalt: 'salt-a', settings: { onboarded: true },
      profile: { tracks: ['projects'] },
      plans: { [TODAY]: { day: TODAY, missions: [{ slot: 'main', missionId: 'career-portfolio' }, { slot: 'main', missionId: 'projects-build-30' }], rerolls: 0, replaced: [] } },
    }, 4);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.map(p => p.area)).toEqual(['projects', 'projects']);
    expect(useApp.getState().plans[TODAY].missions[0].area).toBe('projects');
  });

  it('stops a program the new answers rule out, and keeps one they allow', async () => {
    const program = { id: 'school-reset', startedDay: TODAY, doneDays: [], finishedDay: null };
    const { useApp } = await load({ installSalt: 'salt-s', settings: { onboarded: true }, profile: { tracks: ['school', 'fitness'], school: true }, program }, 4);
    useApp.getState().setProfile({ gym: true });
    expect(useApp.getState().program?.id).toBe('school-reset');
    useApp.getState().setProfile({ school: false });
    expect(useApp.getState().program).toBeNull();
    expect(useApp.getState().profile.school).toBe(false);
  });

  it('keeps a 2.x balance in a tester snapshot through Back to real today', async () => {
    const proof = { uri: '', takenAt: 0, lineNo: null };
    const twoX = {
      days: { '2025-03-01': { at: 0, verified: true } },
      work: { '2025-03-01': { a: { text: 'a', doneAt: 0, proof }, b: { text: 'b', doneAt: 0, proof }, c: { text: 'c', doneAt: 0, proof } } },
      codes: [],
    };
    const { useApp } = await load({ installSalt: 'salt-t', record: twoX, devSnapshot: twoX, dayOffset: 3 }, 1);
    useApp.getState().backToRealToday();
    const r = useApp.getState().record;
    expect(r.legacyPoints).toBe(30);
    expect(r.missions).toEqual({});
  });
});
