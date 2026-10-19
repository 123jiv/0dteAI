// Onboarding ends on the Goal step (launch pass): Continue writes the goal and the area picked
// for it, builds today's plan and marks onboarding done, the way GoalScreen does it. Day 1 leads
// with the picked area; Skip leaves both empty. Hydrates the real store from a seeded entry.
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
vi.mock('../../services/proof', () => ({ deletePhoto: () => undefined }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 21, 10, 0, 0); // Wed 21 Oct 2026, 10 AM local
const TODAY = '2026-10-21';

/** A new user part way through onboarding: areas and time answered, nothing planned yet. */
async function load() {
  mem.map.clear();
  const profile = { tracks: ['school', 'skills', 'discipline'], school: null, minutes: 30, intensity: 'lockin' };
  mem.map.set('unsetld-v2', JSON.stringify({ state: { installSalt: 'salt-goal', settings: { onboarded: false }, profile }, version: 8 }));
  vi.resetModules();
  const store = await import('../store');
  const content = await import('../../content');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...content };
}

/** What GoalScreen does on Continue (or Skip, with nulls) in onboarding. */
function finish(useApp: Awaited<ReturnType<typeof load>>['useApp'], goal: string | null, goalArea: 'discipline' | null) {
  const s = useApp.getState();
  s.setProfile({ goal, goalArea });
  s.replanToday();
  s.completeOnboarding(false);
}

describe('the Goal step finishes onboarding', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('keeps the goal and its area, and Day 1 leads with that area', async () => {
    const { useApp, MISSION_BY_ID } = await load();
    finish(useApp, 'Get my life together', 'discipline');
    const s = useApp.getState();
    expect(s.settings.onboarded).toBe(true);
    expect(s.profile.goal).toBe('Get my life together');
    expect(s.profile.goalArea).toBe('discipline');
    const plan = s.plans[TODAY]!;
    const focused = plan.missions.filter(p => p.slot === 'main');
    expect(focused.length).toBeGreaterThan(0);
    expect(focused[0]!.area ?? MISSION_BY_ID[focused[0]!.missionId]?.track).toBe('discipline');
  });

  it('Skip keeps neither, and Day 1 leads with the first area', async () => {
    const { useApp, MISSION_BY_ID } = await load();
    finish(useApp, null, null);
    const s = useApp.getState();
    expect(s.settings.onboarded).toBe(true);
    expect(s.profile.goal).toBeNull();
    expect(s.profile.goalArea).toBeNull();
    const focused = s.plans[TODAY]!.missions.filter(p => p.slot === 'main');
    expect(focused[0]!.area ?? MISSION_BY_ID[focused[0]!.missionId]?.track).not.toBe('discipline');
  });
});
