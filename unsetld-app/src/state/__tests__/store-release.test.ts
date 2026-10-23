// Release builds ignore tester state. A dev build updated to a TestFlight or App Store build on
// the same phone (same bundle id) would otherwise keep its time travel and 60x timers, with no
// tester tools to undo them. As a release build loads: back to the real date with the real record
// and plans, the clock's offset 0, timers at normal speed, and a timer or before photo from a
// travelled day goes, as does a timer started at tester speed. Preview and dev builds keep all of it.
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

const NOW = new Date(2026, 9, 19, 10, 0, 0); // Mon 19 Oct 2026
const TODAY = '2026-10-19';
const TRAVELLED = '2026-10-24';

const proven = (id: string, day: string) => ({
  missionId: id,
  slot: 'main',
  track: 'school',
  points: 15,
  doneAt: 0,
  photos: [{ uri: `file:///x/proof/${day}-${id}-single.jpg`, takenAt: 0, kind: 'single', hash: `h-${id}-${day}` }],
  verification: { status: 'accepted', method: 'on-device', checks: [], at: 0 },
});
const rec = (days: string[]) => ({
  days: Object.fromEntries(days.map(d => [d, { at: 0, verified: true }])),
  missions: Object.fromEntries(days.map(d => [d, { S1: proven('S1', d) }])),
  bonuses: {},
  redemptions: [],
  legacyPoints: 0,
});
const plan = (day: string) => ({ day, missions: [{ slot: 'main', missionId: 'S1', area: 'school' }], rerolls: 0, replaced: [] });

/** A dev build's saved state, five days into time travel at 60x timers, with a timer and a before photo on the travelled day. */
const travelling = {
  installSalt: 's',
  settings: { onboarded: true, timerSpeed: 60 },
  profile: { tracks: ['school', 'fitness'], minutes: 30 },
  dayOffset: 5,
  record: rec(['2026-10-18', TODAY, TRAVELLED]),
  plans: { [TRAVELLED]: plan(TRAVELLED) },
  devSnapshot: rec(['2026-10-18']),
  devPlans: { [TODAY]: plan(TODAY) },
  timer: { missionId: 'D1', day: TRAVELLED, requiredSeconds: 1800, startedAt: NOW.getTime(), pausedAt: null, pausedMs: 0, speed: 60 },
  pendingBefore: { missionId: 'O1', day: TRAVELLED, photo: { uri: 'file:///x/proof/2026-10-24-O1-before.jpg', takenAt: 0, kind: 'before', hash: 'b' } },
};

async function load(state: object, preview: boolean) {
  mem.map.clear();
  mem.deleted = [];
  mem.cancelled = 0;
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 8 }));
  vi.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = preview;
  const store = await import('../store').finally(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });
  const clock = await import('../../services/clock');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...clock };
}

describe('release builds ignore tester state', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('comes back to the real date, record and plans, with timers at normal speed', async () => {
    const { useApp, today, getDayOffset } = await load(travelling, false);
    const s = useApp.getState();
    expect(getDayOffset()).toBe(0);
    expect(today()).toBe(TODAY);
    expect(s.dayOffset).toBe(0);
    expect(s.currentDay).toBe(TODAY);
    expect(s.settings.timerSpeed).toBe(1);
    expect(Object.keys(s.record.days)).toEqual(['2026-10-18']);
    expect(Object.keys(s.plans)).toEqual([TODAY]);
    expect(s.devSnapshot).toBeNull();
    expect(s.devPlans).toBeNull();
    // The travelled day's timer and before photo go, with the notification and the photo.
    expect(s.timer).toBeNull();
    expect(s.pendingBefore).toBeNull();
    expect(mem.cancelled).toBe(1);
    expect(mem.deleted).toEqual(['file:///x/proof/2026-10-24-O1-before.jpg']);
    // Saved that way.
    const saved = JSON.parse(mem.map.get('unsetld-v2')!).state;
    expect(saved.dayOffset).toBe(0);
    expect(saved.devSnapshot).toBeNull();
    expect(saved.settings.timerSpeed).toBe(1);
  });

  it('resets the offset and speed when no snapshot was kept, and leaves the record as it is', async () => {
    const { useApp, today } = await load({ ...travelling, devSnapshot: null, devPlans: null, timer: null, pendingBefore: null }, false);
    const s = useApp.getState();
    expect(today()).toBe(TODAY);
    expect(s.settings.timerSpeed).toBe(1);
    expect(Object.keys(s.record.days)).toEqual(['2026-10-18', TODAY, TRAVELLED]);
  });

  it('a plan finished on a travelled day goes back to its real days, as the record does', async () => {
    const program = { id: 'lock-in-7', startedDay: '2026-10-13', doneDays: ['2026-10-13', '2026-10-18', TODAY, '2026-10-20', '2026-10-21', '2026-10-22', TRAVELLED], finishedDay: TRAVELLED };
    const { useApp } = await load({ ...travelling, program }, false);
    const s = useApp.getState();
    expect(s.program).toEqual({ ...program, doneDays: ['2026-10-13', '2026-10-18', TODAY], finishedDay: null });
    // The real record has no finish, and nothing says the plan finished.
    expect(s.record.plansFinished).toBeUndefined();
    // No snapshot kept: the record stays as it is, and so does the plan.
    const kept = await load({ ...travelling, devSnapshot: null, devPlans: null, program }, false);
    expect(kept.useApp.getState().program).toEqual(program);
  });

  it('a timer running at tester speed on the real day goes too, with its early "done" alert', async () => {
    const fast = { missionId: 'D1', day: TODAY, requiredSeconds: 1800, startedAt: NOW.getTime() - 60_000, pausedAt: null, pausedMs: 0, speed: 60 };
    const { useApp } = await load({ ...travelling, dayOffset: 0, devSnapshot: null, devPlans: null, pendingBefore: null, timer: fast }, false);
    const s = useApp.getState();
    expect(s.settings.timerSpeed).toBe(1);
    expect(s.timer).toBeNull();
    expect(mem.cancelled).toBe(1);
    // A timer at normal speed on the real day is kept.
    const normal = await load({ ...travelling, dayOffset: 0, devSnapshot: null, devPlans: null, pendingBefore: null, timer: { ...fast, speed: 1 } }, false);
    expect(normal.useApp.getState().timer?.missionId).toBe('D1');
    expect(mem.cancelled).toBe(0);
  });

  it('leaves a release state with no tester state untouched', async () => {
    const state = { installSalt: 's', settings: { onboarded: true }, profile: { tracks: ['school', 'fitness'] }, record: rec([TODAY]), plans: { [TODAY]: plan(TODAY) } };
    const { useApp } = await load(state, false);
    const s = useApp.getState();
    expect(Object.keys(s.record.days)).toEqual([TODAY]);
    expect(Object.keys(s.plans)).toEqual([TODAY]);
    expect(mem.cancelled + mem.deleted.length).toBe(0);
  });

  it('a preview or dev build keeps its time travel', async () => {
    const { useApp, today, getDayOffset } = await load(travelling, true);
    const s = useApp.getState();
    expect(getDayOffset()).toBe(5);
    expect(today()).toBe(TRAVELLED);
    expect(s.settings.timerSpeed).toBe(60);
    expect(s.devSnapshot).not.toBeNull();
    expect(s.timer?.day).toBe(TRAVELLED);
  });
});
