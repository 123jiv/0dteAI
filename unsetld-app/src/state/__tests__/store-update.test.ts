// Updates that retire missions (3.3 kept only the approved library), leave a day with nothing
// open, or meet plans saved before plans recorded areas; and a 2.x tester snapshot. Hydrates the
// real store from a seeded entry.
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

  it("drops a retired mission's running timer and plans the untouched day again from the approved library", async () => {
    const plan = { day: TODAY, missions: [
      { slot: 'easy', missionId: 'fitness-stretch-10', area: 'fitness' },
      { slot: 'main', missionId: 'fitness-bike-30', area: 'fitness' },
      { slot: 'main', missionId: 'school-study-30', area: 'school' },
    ], rerolls: 0, replaced: [] };
    const timer = { missionId: 'fitness-bike-30', day: TODAY, startedAt: NOW.getTime() - 20 * 60_000, requiredSeconds: 1800, pausedAt: null, pausedMs: 0, speed: 1 };
    const { useApp, MISSION_BY_ID, MISSIONS, historyMission, isApproved } = await load({
      installSalt: 'salt-r', settings: { onboarded: true },
      profile: { tracks: ['fitness', 'school'], school: true },
      plans: { [TODAY]: plan }, timer,
    }, 4);
    expect(MISSIONS.some(m => m.id === 'fitness-bike-30')).toBe(false);
    expect(MISSION_BY_ID['fitness-bike-30']).toBeUndefined();
    // Still shown as it was on the record, never as something to do.
    expect(historyMission('fitness-bike-30')?.title).toBe('Bike for 30 Minutes');
    // Nothing outside the approved library runs (3.3), so the timer goes, with its notification.
    expect(useApp.getState().timer).toBeNull();
    expect(mem.cancelled).toBe(1);
    const next = useApp.getState().ensurePlan(TODAY).missions.map(p => p.missionId);
    expect(next.length).toBeGreaterThan(0);
    for (const id of next) expect(isApproved(id)).toBe(true);
  });

  it('plans a day again when everything left in it is already proven', async () => {
    const { useApp, isApproved } = await load({
      installSalt: 'salt-p', settings: { onboarded: true },
      profile: { tracks: ['money', 'fitness'] },
      plans: { [TODAY]: { day: TODAY, missions: [{ slot: 'quick', missionId: OLD[0] }, { slot: 'easy', missionId: 'M1', area: 'money' }], rerolls: 0, replaced: [] } },
      record: rec({ [TODAY]: { M1: done('M1', 'money', 5, 'easy') } }),
    }, 4);
    const plan = useApp.getState().ensurePlan(TODAY);
    const proven = useApp.getState().record.missions[TODAY];
    expect(plan.missions.some(p => !proven[p.missionId])).toBe(true);
    for (const p of plan.missions) expect(isApproved(p.missionId)).toBe(true);
  });

  it('gives a plan saved without areas the area its row shows, so the proof counts there', async () => {
    const { useApp } = await load({
      installSalt: 'salt-a', settings: { onboarded: true },
      profile: { tracks: ['projects', 'career'] },
      plans: { [TODAY]: { day: TODAY, missions: [{ slot: 'main', missionId: 'P1' }, { slot: 'main', missionId: 'C4' }], rerolls: 0, replaced: [] } },
    }, 4);
    const plan = useApp.getState().ensurePlan(TODAY);
    expect(plan.missions.map(p => p.area)).toEqual(['projects', 'career']);
    expect(useApp.getState().plans[TODAY].missions[0].area).toBe('projects');
  });

  it('stops a program the new answers rule out, and keeps one they allow', async () => {
    // No built-in program needs a job search; one that holds "Apply to One Job or Internship" (C2) does.
    const program = { id: 'test-apply', startedDay: TODAY, doneDays: [], finishedDay: null };
    const goal = 'Get a finance internship';
    const { useApp, PROGRAM_BY_ID } = await load({ installSalt: 'salt-s', settings: { onboarded: true }, profile: { tracks: ['career', 'fitness'], goal }, program }, 6);
    PROGRAM_BY_ID['test-apply'] = { id: 'test-apply', title: 'Apply', short: '', days: 2, tracks: ['career'], free: true, plan: [['C3'], ['C2']] };
    useApp.getState().setProfile({ gym: true });
    expect(useApp.getState().program?.id).toBe('test-apply');
    useApp.getState().setProfile({ goal: 'Run a 5k' });
    expect(useApp.getState().program).toBeNull();
    expect(useApp.getState().profile.goal).toBe('Run a 5k');
  });

  it('keeps School Reset after "not in school": a program is an explicit choice', async () => {
    const program = { id: 'school-reset', startedDay: TODAY, doneDays: [], finishedDay: null };
    const { useApp } = await load({ installSalt: 'salt-s2', settings: { onboarded: true }, profile: { tracks: ['school', 'fitness'], school: true }, program }, 6);
    useApp.getState().setProfile({ school: false });
    expect(useApp.getState().program?.id).toBe('school-reset');
    expect(useApp.getState().profile.school).toBe(false);
  });

  it('plans a pre-update day again from approved missions only; a retired mission proven that day stays on the record with its title', async () => {
    // Saved by 3.2 (v6): today's plan holds retired missions, and one of them is already proven.
    const plan = { day: TODAY, missions: [
      { slot: 'main', missionId: 'school-study-30', area: 'school' },
      { slot: 'main', missionId: 'fitness-workout', area: 'fitness' },
      { slot: 'easy', missionId: 'discipline-make-your-bed', area: 'discipline' },
    ], rerolls: 0, replaced: [] };
    const today = { ...done('school-study-30', 'school', 15, 'main'), title: 'Study for 30 Minutes' };
    // Proven before 3.2 kept titles on the record.
    const earlier = done('fitness-workout', 'fitness', 15, 'main');
    const { useApp, isApproved, historyMission } = await load({
      installSalt: 'salt-u', settings: { onboarded: true },
      profile: { tracks: ['school', 'fitness', 'discipline'], school: true, minutes: 45, intensity: 'lockin' },
      plans: { [TODAY]: plan },
      record: rec({ '2026-10-09': { 'fitness-workout': earlier }, [TODAY]: { 'school-study-30': today } }, { days: { '2026-10-09': { verified: true }, [TODAY]: { verified: true } } }),
    }, 6);
    const next = useApp.getState().ensurePlan(TODAY);
    expect(next.missions.length).toBeGreaterThan(0);
    for (const p of next.missions) expect(isApproved(p.missionId)).toBe(true);
    expect(next.missions.some(p => p.missionId === 'school-study-30' || p.missionId === 'fitness-workout' || p.missionId === 'discipline-make-your-bed')).toBe(false);
    expect(useApp.getState().plans[TODAY]).toEqual(next);
    // The proof stays: its points, its title, and the day on record.
    const r = useApp.getState().record;
    expect(r.missions[TODAY]['school-study-30']).toMatchObject({ missionId: 'school-study-30', title: 'Study for 30 Minutes', points: 15, track: 'school' });
    expect(r.missions['2026-10-09']['fitness-workout'].points).toBe(15);
    expect(r.days[TODAY]).toBeTruthy();
    // History views read the retired mission's title and proof line (content historyMission).
    expect(historyMission('fitness-workout')).toMatchObject({ title: 'Complete Your Workout', track: 'fitness', proofType: 'PHOTO' });
    expect(historyMission('school-study-30')?.title).toBe('Study for 30 Minutes');
  });

  it('keeps a swapped pre-update day and gives each retired mission an approved one in its place, without using a swap', async () => {
    const own = { id: 'custom-a', track: 'fitness', title: 'Stretch my hips', short: 'Stretch my hips.', proof: 'A photo that shows it done.', proofType: 'PHOTO', points: 5, minutes: 10, cooldownDays: 0, repeatable: true, tags: ['custom'], active: true, custom: true };
    const { useApp, isApproved } = await load({
      installSalt: 'salt-k', settings: { onboarded: true },
      profile: { tracks: ['fitness', 'school'], school: true, minutes: 45 },
      customMissions: [own],
      plans: { [TODAY]: { day: TODAY, missions: [
        { slot: 'easy', missionId: 'custom-a', area: 'fitness', points: 5 },
        { slot: 'main', missionId: 'school-study-30', area: 'school' },
        { slot: 'main', missionId: 'fitness-workout', area: 'fitness' },
      ], rerolls: 1, replaced: ['fitness-stretch-10'] } },
    }, 6);
    const plan = useApp.getState().ensurePlan(TODAY);
    // The user's own mission stays where it was; the day keeps its three missions and its one swap.
    expect(plan.missions[0].missionId).toBe('custom-a');
    expect(plan.missions).toHaveLength(3);
    for (const p of plan.missions.slice(1)) expect(isApproved(p.missionId)).toBe(true);
    expect(plan.missions[1].area).toBe('school');
    expect(plan.rerolls).toBe(1);
    // Proving the one mission of their own is no longer the whole day.
    const r = useApp.getState().completeMission('custom-a', [{ uri: 'file:///c.jpg', takenAt: NOW.getTime(), kind: 'single', hash: 'hc' }], accepted(NOW.getTime()), { verifiedClock: true });
    expect(r).toMatchObject({ accepted: true, perfect: false });
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
