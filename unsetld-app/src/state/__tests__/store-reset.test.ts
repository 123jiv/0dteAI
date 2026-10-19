// The store's half of Delete data on this phone (resetLocalData): the state a new install starts
// with, loaded and saved, with a new salt and today's date; the server config kept and the
// membership inactive (its mode kept); the user's own missions gone from the lookup; the clock's
// tester offset 0; the first build's saved state and the preview's photos removed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import v33 from './fixtures/v33-state.json';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>(), deleted: [] as string[], webKeys: [] as string[] };
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
vi.mock('../../services/proof', () => ({ deletePhoto: (u: string) => void mem.deleted.push(u), webPhotoKeys: () => mem.webKeys }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 19, 10, 0, 0);
const TODAY = '2026-10-19';

async function load() {
  mem.map.clear();
  mem.deleted = [];
  mem.map.set('unsetld-v2', JSON.stringify(v33));
  mem.map.set('unsetld-state-v1', '{"state":{},"version":2}');
  vi.resetModules();
  const store = await import('../store');
  const content = await import('../../content');
  const clock = await import('../../services/clock');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...content, ...clock };
}

describe('resetLocalData', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('leaves the state a new install starts with, loaded and saved', async () => {
    const { useApp, MISSION_BY_ID, DEFAULT_SETTINGS, EMPTY_PREMIUM, getDayOffset } = await load();
    const before = useApp.getState();
    expect(before.settings.onboarded).toBe(true);
    expect(Object.keys(before.record.days).length).toBeGreaterThan(0);
    // One of the user's own missions, made today.
    const own = before.createCustomMission({ title: 'Sketch the next tee', track: 'projects', proofType: 'PHOTO' } as never);
    expect(own && MISSION_BY_ID[own.id]).toBeTruthy();
    useApp.setState({ remote: { ...before.remote, accessEnabled: true, collection: '009' }, premium: { ...before.premium, active: true, plan: 'annual', mode: 'revenuecat' } });
    useApp.getState().setDayOffset(3);
    mem.webKeys = ['web-proof:2026-10-19-S1-single'];

    useApp.getState().resetLocalData();
    const s = useApp.getState();
    expect(s.hydrated).toBe(true);
    expect(s.installSalt).not.toBe(before.installSalt);
    expect(s.currentDay).toBe(TODAY);
    expect(getDayOffset()).toBe(0);
    expect(s.dayOffset).toBe(0);
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.record.days).toEqual({});
    expect(s.record.missions).toEqual({});
    expect(s.record.plansFinished ?? []).toEqual([]);
    expect(s.plans).toEqual({});
    expect(s.program).toBeNull();
    expect(s.customMissions).toEqual([]);
    expect(s.profile.goal ?? null).toBeNull();
    expect(s.momentsShown).toEqual([]);
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(s.account).toEqual({ userId: null, email: null });
    // The server config stays; the membership is inactive until the store says otherwise, its mode kept.
    expect(s.remote.accessEnabled).toBe(true);
    expect(s.remote.collection).toBe('009');
    expect(s.premium).toEqual({ ...EMPTY_PREMIUM, mode: 'revenuecat' });
    // The user's own missions are gone from the lookup too.
    expect(MISSION_BY_ID[own!.id]).toBeUndefined();
    expect(MISSION_BY_ID.D1).toBeTruthy();
    // Actions survive the replace.
    expect(typeof useApp.getState().ensurePlan).toBe('function');

    // Saved as this version's defaults; the first build's key and the preview's photos are gone.
    const saved = JSON.parse(mem.map.get('unsetld-v2')!);
    expect(saved.version).toBe(8);
    expect(saved.state.settings.onboarded).toBe(false);
    expect(saved.state.record.days).toEqual({});
    expect(saved.state.installSalt).toBe(s.installSalt);
    expect(mem.map.has('unsetld-state-v1')).toBe(false);
    expect(mem.deleted).toEqual(['web-proof:2026-10-19-S1-single']);
  });

  it('a reload after the reset still starts fresh', async () => {
    const { useApp } = await load();
    useApp.getState().resetLocalData();
    const saved = mem.map.get('unsetld-v2')!;
    vi.resetModules();
    mem.map.set('unsetld-v2', saved);
    const again = await import('../store');
    await new Promise(r => setTimeout(r, 0));
    const s = again.useApp.getState();
    expect(s.settings.onboarded).toBe(false);
    expect(Object.keys(s.record.days)).toEqual([]);
  });
});
