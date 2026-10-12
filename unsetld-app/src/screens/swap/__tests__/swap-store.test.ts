// What the swap sheet says a mission of the user's own earns is what the day pays for it: the
// sheet's number (logic ownEarns + slotWorth) against the store's swap (createCustomMission,
// replaceMission) and what proving it credits (core/complete). And using one again from
// "Use again" keeps nothing new. Hydrates the real store from a seeded storage entry.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>() };
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
}));
vi.mock('../../../services/proof', () => ({ deletePhoto: () => undefined }));
vi.mock('../../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 12, 15, 0, 0); // Mon 12 Oct 2026, 3 PM local
const TODAY = '2026-10-12';

const PROFILE = { tracks: ['discipline', 'school', 'fitness'], school: true, gym: false, age: '18plus', minutes: 60, intensity: 'lockin' };
const PLAN = {
  day: TODAY,
  missions: [
    { slot: 'easy', missionId: 'discipline-make-your-bed', area: 'discipline' }, // PHOTO, 5 pts
    { slot: 'main', missionId: 'school-study-60', area: 'school' }, // TIMER_AND_PHOTO, 25 pts
    { slot: 'main', missionId: 'fitness-stretch-10', area: 'fitness' }, // TIMER, 10 pts
  ],
  rerolls: 0,
  replaced: [] as string[],
};
const GUITAR = { title: 'Practice guitar', track: 'school', proofType: 'TIMER', timerMinutes: 30 } as const;
const accepted = { status: 'accepted', method: 'on-device', checks: [], at: NOW.getTime() } as const;

async function load(extra: object = {}) {
  mem.map.clear();
  const state = { installSalt: 'salt-s', settings: { onboarded: true }, profile: PROFILE, plans: { [TODAY]: PLAN }, ...extra };
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 6 }));
  vi.resetModules();
  const store = await import('../../../state/store');
  const logic = await import('../logic');
  const complete = await import('../../../core/complete');
  const custom = await import('../../../core/custom');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...logic, ...complete, ...custom };
}

describe('what the sheet says a mission of your own earns', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  for (const [index, pts] of [
    [0, 5],
    [1, 15],
  ] as const) {
    it(`is what the day pays for it, in a ${pts === 5 ? '5' : '25'}-point spot`, async () => {
      const { useApp, slotWorth, ownEarns, completeMission } = await load();
      const before = useApp.getState().plans[TODAY];
      expect(before?.missions.map(p => p.missionId)).toEqual(PLAN.missions.map(p => p.missionId));
      const quoted = ownEarns(GUITAR.proofType, GUITAR.timerMinutes, slotWorth(before, index));
      expect(quoted).toBe(pts);

      const m = useApp.getState().createCustomMission({ ...GUITAR })!;
      expect(m).toBeTruthy();
      expect(useApp.getState().replaceMission(index, m.id, 'another')).toBe('ok');
      const plan = useApp.getState().plans[TODAY]!;
      expect(plan.missions[index]?.missionId).toBe(m.id);
      expect(plan.missions[index]?.points).toBe(quoted);

      // Proving it credits the same number.
      const done = completeMission(useApp.getState().record, TODAY, plan, m, [], accepted, { at: NOW.getTime(), verifiedClock: true });
      expect(done.points).toBe(quoted);
    });
  }
});

describe('using one of your own again', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('puts the same one in the day and keeps nothing new', async () => {
    const seed = (await import('../../../core/custom')).makeCustomMission({ ...GUITAR }, 'custom-guitar1');
    const { useApp, recentOwn, startDraft, draftFrom, draftInput, ownToAdd, ownEarns, slotWorth } = await load({ customMissions: [seed] });
    const s = useApp.getState();
    expect(s.customMissions.map(m => m.id)).toEqual(['custom-guitar1']);
    const plan = s.plans[TODAY]!;
    const recent = recentOwn(s.customMissions, plan, s.profile.tracks);
    expect(recent.map(m => m.id)).toEqual(['custom-guitar1']);

    // "Use again", nothing changed: the one from before.
    const input = draftInput(draftFrom(recent[0]!, startDraft(plan, 1, s.profile.tracks)));
    const m = ownToAdd(recent, input, s.createCustomMission);
    expect(m?.id).toBe('custom-guitar1');
    expect(useApp.getState().customMissions).toHaveLength(1);
    expect(useApp.getState().replaceMission(1, m!.id, 'another')).toBe('ok');
    expect(useApp.getState().plans[TODAY]!.missions[1]?.points).toBe(ownEarns('TIMER', 30, slotWorth(plan, 1)));
    expect(useApp.getState().customMissions).toHaveLength(1);
  });

  it('makes a new one when the form says something else', async () => {
    const seed = (await import('../../../core/custom')).makeCustomMission({ ...GUITAR }, 'custom-guitar1');
    const { useApp, recentOwn, ownToAdd } = await load({ customMissions: [seed] });
    const s = useApp.getState();
    const recent = recentOwn(s.customMissions, s.plans[TODAY], s.profile.tracks);
    const m = ownToAdd(recent, { ...GUITAR, timerMinutes: 45 }, s.createCustomMission);
    expect(m?.id).not.toBe('custom-guitar1');
    expect(m?.timerMinutes).toBe(45);
    expect(ownToAdd(recent, null, s.createCustomMission)).toBeNull();
  });
});
