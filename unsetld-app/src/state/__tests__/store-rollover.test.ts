// The 4:00 AM rollover in the store: after 4:00 AM, refreshDay takes a timer or a before photo
// from the day that ended (its notification cancelled, its photo deleted) and says so once
// (takeDayEnded), with no screen open. Today's own ones stay.
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
vi.mock('../../services/proof', () => ({ deletePhoto: (u: string) => void mem.deleted.push(u), webPhotoKeys: () => [] }));
vi.mock('../../services/timerNotify', () => ({
  cancelTimerDone: () => {
    mem.cancelled++;
    return Promise.resolve();
  },
}));

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m, 0);
const timer = (day: string, missionId = 'D1') => ({ missionId, day, requiredSeconds: 1800, startedAt: at(20, 23).getTime(), pausedAt: null, pausedMs: 0, speed: 1 });
const before = (day: string, missionId = 'O1') => ({ missionId, day, photo: { uri: `file:///x/proof/${day}-${missionId}-before.jpg`, takenAt: 0, kind: 'before', hash: 'h' } });

async function load(state: object) {
  mem.map.clear();
  mem.deleted = [];
  mem.cancelled = 0;
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 8 }));
  vi.resetModules();
  const store = await import('../store');
  await new Promise(r => setTimeout(r, 0));
  return store;
}

describe('4:00 AM rollover in the store', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  it("takes yesterday's timer and before photo at 4:05 AM, with the notification and the photo, and says so once", async () => {
    vi.setSystemTime(at(21, 3, 30)); // 3:30 AM on the 21st: still the 20th
    const { useApp } = await load({ settings: { onboarded: true }, timer: timer('2026-10-20'), pendingBefore: before('2026-10-20') });
    useApp.getState().refreshDay();
    expect(useApp.getState().timer).not.toBeNull();
    expect(useApp.getState().takeDayEnded()).toBe(false);

    vi.setSystemTime(at(21, 4, 5));
    useApp.getState().refreshDay();
    const s = useApp.getState();
    expect(s.currentDay).toBe('2026-10-21');
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///x/proof/2026-10-20-O1-before.jpg']);
    // Today says it once.
    expect(s.takeDayEnded()).toBe(true);
    expect(useApp.getState().takeDayEnded()).toBe(false);
    // Not saved: a new launch doesn't say it again.
    expect(JSON.parse(mem.map.get('unsetld-v2')!).state.dayEnded).toBeUndefined();
  });

  it("keeps today's timer and before photo", async () => {
    vi.setSystemTime(at(21, 9));
    const { useApp } = await load({ settings: { onboarded: true }, currentDay: '2026-10-21', timer: timer('2026-10-21'), pendingBefore: before('2026-10-21') });
    useApp.getState().refreshDay();
    const s = useApp.getState();
    expect(s.timer?.day).toBe('2026-10-21');
    expect(s.pendingBefore?.day).toBe('2026-10-21');
    expect(s.takeDayEnded()).toBe(false);
    expect(mem.cancelled + mem.deleted.length).toBe(0);
  });

  it('clears one left from days ago on the first refresh after launch (the app was closed over 4:00 AM)', async () => {
    vi.setSystemTime(at(23, 8));
    const { useApp } = await load({ settings: { onboarded: true }, timer: timer('2026-10-20') });
    useApp.getState().refreshDay();
    expect(useApp.getState().timer).toBeNull();
    expect(useApp.getState().takeDayEnded()).toBe(true);
  });
});
