// Proving a mission through the store: the record keeps the approved id and the title as the
// user saw it (core/titles missionTitle), so "Work on Your Clothing Brand for 30 Minutes" stays
// on the record as P1. A mission of the user's own keeps its own title.
// Hydrates the real store from a seeded storage entry.
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
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 10, 15, 0, 0); // Sat 10 Oct 2026, 3 PM local
const TODAY = '2026-10-10';

const accepted = () => ({ status: 'accepted' as const, method: 'on-device' as const, checks: [], at: Date.now() });
const photo = (id: string) => [{ uri: `file:///p/${id}.jpg`, takenAt: Date.now(), kind: 'single' as const, hash: `h-${id}` }];

async function load(state: object) {
  mem.map.clear();
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 7 }));
  vi.resetModules();
  const store = await import('../store');
  await new Promise(r => setTimeout(r, 0));
  return store;
}

describe('proving a mission', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('keeps the approved id and the title the user saw', async () => {
    const plan = { day: TODAY, missions: [{ slot: 'main', missionId: 'P1', area: 'projects' }, { slot: 'easy', missionId: 'D4', area: 'discipline' }], rerolls: 0, replaced: [] };
    const { useApp } = await load({
      installSalt: 'salt-c',
      settings: { onboarded: true },
      profile: { tracks: ['projects', 'discipline'], goal: 'Launch my clothing brand' },
      plans: { [TODAY]: plan },
    });
    const r = useApp.getState().completeMission('P1', photo('P1'), accepted(), { verifiedClock: true, timerSeconds: 1800 });
    expect(r.accepted).toBe(true);
    expect(useApp.getState().record.missions[TODAY].P1).toMatchObject({ missionId: 'P1', title: 'Work on Your Clothing Brand for 30 Minutes', track: 'projects', points: 15 });
    // A mission without a slot to fill keeps its approved title.
    useApp.getState().completeMission('D4', photo('D4'), accepted(), { verifiedClock: true });
    expect(useApp.getState().record.missions[TODAY].D4.title).toBe("Plan Tomorrow's Top 3");
  });

  it('keeps the approved title when the goal names nothing to fill in', async () => {
    const plan = { day: TODAY, missions: [{ slot: 'main', missionId: 'S1', area: 'school' }], rerolls: 0, replaced: [] };
    const { useApp } = await load({ installSalt: 'salt-d', settings: { onboarded: true }, profile: { tracks: ['school'], goal: 'Get better grades' }, plans: { [TODAY]: plan } });
    useApp.getState().completeMission('S1', photo('S1'), accepted(), { verifiedClock: true, timerSeconds: 1800 });
    expect(useApp.getState().record.missions[TODAY].S1.title).toBe('Study One Subject for 30 Minutes');
  });

  it("keeps a mission of the user's own under its own title, at what its slot pays", async () => {
    const own = { id: 'custom-a1', track: 'projects', title: 'Sketch the spring hoodie', short: 'Sketch the spring hoodie.', proof: 'A photo that shows it done.', proofType: 'PHOTO', points: 5, minutes: 10, cooldownDays: 0, repeatable: true, tags: ['custom'], active: true, custom: true, source: 'USER_CREATED' };
    const plan = { day: TODAY, missions: [{ slot: 'main', missionId: 'custom-a1', area: 'projects', points: 5 }], rerolls: 1, replaced: ['P1'] };
    const { useApp } = await load({ installSalt: 'salt-e', settings: { onboarded: true }, profile: { tracks: ['projects'], goal: 'Launch my clothing brand' }, plans: { [TODAY]: plan }, customMissions: [own] });
    useApp.getState().completeMission('custom-a1', photo('custom-a1'), accepted(), { verifiedClock: true });
    expect(useApp.getState().record.missions[TODAY]['custom-a1']).toMatchObject({ title: 'Sketch the spring hoodie', points: 5 });
  });
});
