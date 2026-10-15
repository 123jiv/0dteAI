// Tester time travel: the real record and plans are kept aside and come back with "Back to the
// real today", and photo retention on a travelled date never deletes a file the real record shows.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays } from '../../core/time';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>(), deleted: [] as string[] };
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
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const NOW = new Date(2026, 9, 14, 9, 0, 0); // Wed 14 Oct 2026, 9 AM local
const TODAY = '2026-10-14';
const PHOTO = 'web-proof:2026-10-14-S3-single';
const OLD_PHOTO = 'file:///proof/2026-08-01-S1-single.jpg';

const proven = (id: string, uri: string) => ({
  missionId: id,
  slot: 'main',
  track: 'school',
  points: 15,
  doneAt: NOW.getTime() - 600_000,
  photos: [{ uri, takenAt: NOW.getTime() - 600_000, kind: 'single', hash: `h-${uri}` }],
  verification: { status: 'accepted', method: 'on-device', checks: [], at: NOW.getTime() - 600_000 },
});

async function load(state: object) {
  mem.map.clear();
  mem.deleted = [];
  mem.map.set('unsetld-v2', JSON.stringify({ state, version: 7 }));
  vi.resetModules();
  const store = await import('../store');
  const clock = await import('../../services/clock');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...clock };
}

const plan = (day: string) => ({ day, missions: [{ slot: 'main', missionId: 'S1', area: 'school' }], rerolls: 0, replaced: [] });

describe('tester time travel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it("keeps the real photos when photos expire on a travelled date, and Back brings back the real record and plans", async () => {
    // The real plans: today and the 20 days before it.
    const plans = Object.fromEntries(Array.from({ length: 21 }, (_, i) => addDays(TODAY, -i)).map(d => [d, plan(d)]));
    const record = {
      days: { [TODAY]: { verified: true } },
      missions: { '2026-08-01': { S1: proven('S1', OLD_PHOTO) }, [TODAY]: { S3: proven('S3', PHOTO) } },
      bonuses: {},
      redemptions: [],
      legacyPoints: 0,
    };
    const { useApp, today } = await load({ installSalt: 's', settings: { onboarded: true, proofRetentionDays: 30 }, profile: { tracks: ['school', 'fitness'], minutes: 45 }, plans, record });
    const realPlans = useApp.getState().plans;
    expect(Object.keys(realPlans)).toHaveLength(21);

    // Jump 60 days: the travelled record starts as the real one (Tester tools' jumpProving).
    const real = useApp.getState().record;
    useApp.getState().setDayOffset(60);
    useApp.getState().setRecord(real);
    expect(today()).toBe('2026-12-13');
    useApp.getState().ensurePlan(today());
    // The travelled date prunes the real plans away.
    expect(useApp.getState().plans[TODAY]).toBeUndefined();

    // Reopening the app runs retention on the travelled date.
    const files = useApp.getState().expireProofPhotos();
    expect(files).toEqual([]);
    const travelled = useApp.getState().record.missions;
    expect(travelled[TODAY].S3.photos[0].uri).toBe('');

    useApp.getState().backToRealToday();
    const s = useApp.getState();
    expect(today()).toBe(TODAY);
    expect(s.record.missions[TODAY].S3.photos[0].uri).toBe(PHOTO);
    expect(s.plans).toEqual(realPlans);
    expect(s.devSnapshot).toBeNull();
    expect(s.devPlans).toBeNull();

    // Back on the real date, retention goes on as usual: the August photo is past 30 days.
    expect(useApp.getState().expireProofPhotos()).toEqual([OLD_PHOTO]);
  });

  it('deletes a travelled photo the real record never had', async () => {
    const { useApp } = await load({ installSalt: 's', settings: { onboarded: true, proofRetentionDays: 30 }, profile: { tracks: ['school', 'fitness'], minutes: 45 }, plans: {}, record: { days: {}, missions: {}, bonuses: {}, redemptions: [], legacyPoints: 0 } });
    useApp.getState().setDayOffset(1);
    const travelledPhoto = 'web-proof:2026-10-15-S1-single';
    useApp.getState().setRecord({ ...useApp.getState().record, missions: { '2026-10-15': { S1: proven('S1', travelledPhoto) } } } as never);
    useApp.getState().setDayOffset(60);
    expect(useApp.getState().expireProofPhotos()).toEqual([travelledPhoto]);
  });

  it('a snapshot kept by an earlier build, without plans, leaves the plans as they are', async () => {
    const snap = { days: {}, missions: {}, bonuses: {}, redemptions: [], legacyPoints: 0 };
    const { useApp } = await load({ installSalt: 's', settings: { onboarded: true }, profile: { tracks: ['school', 'fitness'], minutes: 45 }, dayOffset: 3, devSnapshot: snap, plans: { '2026-10-17': plan('2026-10-17') }, record: snap });
    useApp.getState().backToRealToday();
    expect(Object.keys(useApp.getState().plans)).toEqual(['2026-10-17']);
  });
});
