// Anonymous usage counts, the service (launch pass P1-20; docs/METRICS.md): it records nothing
// unless iOS, a release build, the real today, sharing on and not switched off all hold; it sends
// only when unsetld.com's switch is on, with its own request (no Authorization, no cookies), in
// batches of up to 100; a failed batch is kept and retried with the same id; turning it off drops
// what waits; Delete data on this phone removes the key.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { storage: new Map<string, string>(), platform: { OS: 'ios' } };
});

vi.mock('react-native', () => ({ Platform: m.platform }));
vi.mock('../../state/storage', () => ({
  appStorage: {
    getItem: async (k: string) => m.storage.get(k) ?? null,
    setItem: async (k: string, v: string) => void m.storage.set(k, v),
    removeItem: async (k: string) => void m.storage.delete(k),
  },
}));

type Svc = typeof import('../metrics');
type Clock = typeof import('../clock');
const KEY = 'unsetld.metrics.v1';
const switches = { shareUsage: true as boolean | null, metrics: undefined as boolean | undefined };
let svc: Svc;
let clock: Clock;
let fetchMock: ReturnType<typeof vi.fn>;

const at = (day: number, hour = 9) => new Date(2026, 9, day, hour, 0, 0);
const saved = () => {
  const raw = m.storage.get(KEY);
  return raw ? (JSON.parse(raw) as { installDay: string | null; once: string[]; closed: string; queue: { e: string; p: Record<string, unknown>; day: string; dn: number | null; cohort: string }[]; pending: { id: string; events: unknown[] } | null }) : null;
};
const reply = (status: number) => fetchMock.mockImplementationOnce(async () => ({ ok: status >= 200 && status < 300, status }));

async function fresh(dev = false) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  vi.resetModules();
  svc = await import('../metrics');
  clock = await import('../clock');
  clock.setDayOffset(0);
  svc.connectMetrics(() => ({ ...switches }));
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(at(21));
  m.storage.clear();
  m.platform.OS = 'ios';
  switches.shareUsage = true;
  switches.metrics = undefined;
  fetchMock = vi.fn(async () => ({ ok: true, status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  await fresh();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

describe('recording: dormant unless every gate holds', () => {
  const tryOne = async () => {
    svc.track('paywall_viewed', { from: 'swaps' });
    await svc.metricsIdle();
    return saved();
  };

  it('records nothing while sharing was never answered or is off (nothing in this build sets it)', async () => {
    switches.shareUsage = null;
    expect(await tryOne()).toBeNull();
    switches.shareUsage = false;
    expect(await tryOne()).toBeNull();
  });

  it('records nothing when unsetld.com switched it off, on the web, in tester time travel, or unconnected', async () => {
    switches.metrics = false;
    expect(await tryOne()).toBeNull();
    switches.metrics = undefined;
    m.platform.OS = 'web';
    expect(await tryOne()).toBeNull();
    m.platform.OS = 'ios';
    clock.setDayOffset(3);
    expect(await tryOne()).toBeNull();
    clock.setDayOffset(0);
    svc.connectMetrics(null);
    expect(await tryOne()).toBeNull();
  });

  it('records nothing in a dev build (IS_PREVIEW)', async () => {
    await fresh(true);
    expect(await tryOne()).toBeNull();
  });

  it('with sharing on and the switch unknown: records, but sends nothing', async () => {
    expect((await tryOne())?.queue).toEqual([{ e: 'paywall_viewed', p: { from: 'swaps' }, day: '2026-10-21', dn: null, cohort: 'pre' }]);
    await svc.flushMetrics({ force: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a once-only event is recorded once; the setup day comes from a setup event', async () => {
    svc.track('onboarding_completed', { areas: ['school'], minutes: 30, goal: 'none', returning: false });
    svc.track('onboarding_completed', { areas: ['money'], minutes: 15, goal: 'none', returning: false });
    vi.setSystemTime(at(28));
    svc.track('mission_proven', { mission: 'S1', area: 'school', n_today: 1 });
    await svc.metricsIdle();
    const s = saved()!;
    expect(s.installDay).toBe('2026-10-21');
    expect(s.queue.map(q => [q.e, q.dn, q.cohort])).toEqual([
      ['onboarding_completed', 0, '2026-10-19'],
      ['mission_proven', 7, '2026-10-19'],
    ]);
    expect(s.once).toEqual(['onboarding_completed']);
  });

  it('null records nothing, and an unknown property never reaches the phone', async () => {
    svc.track('first_mission_started', null);
    svc.track('weekly_focus_set', { focus: 'other', text: 'stop vaping', week: 'this' });
    await svc.metricsIdle();
    expect(m.storage.get(KEY)).not.toContain('vaping');
    expect(saved()!.queue.map(q => q.p)).toEqual([{ focus: 'other', week: 'this' }]);
  });
});

describe('day_closed', () => {
  const plan = (day: string, ids: string[], rerolls = 0) => ({ day, missions: ids.map(missionId => ({ slot: 'main' as const, missionId })), rerolls, replaced: [] });

  it('closes each planned day since the first record, up to yesterday, once', async () => {
    svc.track('paywall_viewed', { from: 'settings' }); // the first record, on the 21st
    await svc.metricsIdle();
    vi.setSystemTime(at(24));
    const plans = { '2026-10-20': plan('2026-10-20', ['S1']), '2026-10-21': plan('2026-10-21', ['S1', 'F3'], 1), '2026-10-22': plan('2026-10-22', ['S1']), '2026-10-24': plan('2026-10-24', ['S1']) };
    const record = { days: {}, missions: { '2026-10-21': { S1: { verification: { status: 'accepted' } } } } } as never;
    svc.closeDays(plans, record, 30);
    svc.closeDays(plans, record, 30);
    await svc.metricsIdle();
    const closed = saved()!.queue.filter(q => q.e === 'day_closed');
    expect(closed.map(q => q.day)).toEqual(['2026-10-21', '2026-10-22']);
    expect(closed[0].p).toMatchObject({ planned: 2, proven: 1, swaps: 1, minutes: '30', plan: false });
    expect(saved()!.closed).toBe('2026-10-23');
  });

  it('after sharing stops and starts again, closes no day from while it was off', async () => {
    svc.track('paywall_viewed', { from: 'settings' });
    await svc.stopMetrics();
    vi.setSystemTime(at(25));
    svc.track('paywall_viewed', { from: 'swaps' }); // on again on the 25th
    vi.setSystemTime(at(27));
    const plans = Object.fromEntries([21, 22, 23, 24, 25, 26].map(d => [`2026-10-${d}`, plan(`2026-10-${d}`, ['S1'])]));
    svc.closeDays(plans, { days: {}, missions: {} } as never, 30);
    await svc.metricsIdle();
    expect(saved()!.queue.filter(q => q.e === 'day_closed').map(q => q.day)).toEqual(['2026-10-25', '2026-10-26']);
  });

  it('does nothing before anything was recorded', async () => {
    svc.closeDays({ '2026-10-20': plan('2026-10-20', ['S1']) }, { days: {}, missions: {} } as never, 30);
    await svc.metricsIdle();
    expect(saved()).toBeNull();
  });
});

describe('sending', () => {
  const fill = async (n: number) => {
    for (let i = 0; i < n; i++) svc.track('mission_proven', { mission: 'S1', n_today: (i % 9) + 1 });
    await svc.metricsIdle();
  };
  const bodyOf = (call: number) => JSON.parse((fetchMock.mock.calls[call][1] as { body: string }).body) as { s: number; app: string; batch: string; events: unknown[] };

  it("only with unsetld.com's switch on, with its own request: no Authorization, no cookies", async () => {
    await fill(25);
    await svc.flushMetrics();
    expect(fetchMock).not.toHaveBeenCalled();
    switches.metrics = true;
    await svc.flushMetrics();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.unsetld.com/api/app/events');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|cookie/i);
    const body = bodyOf(0);
    expect(body).toMatchObject({ s: 1, app: '3.3.0' });
    expect(body.batch).toMatch(/^[0-9a-f-]{32,36}$/);
    expect(body.events).toHaveLength(25);
    expect(saved()!.queue).toEqual([]);
    expect(saved()!.pending).toBeNull();
  });

  it('waits for 20 records, or the oldest to be 6 hours old', async () => {
    switches.metrics = true;
    await fill(3);
    await svc.flushMetrics();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.setSystemTime(new Date(at(21).getTime() + 6 * 3600_000));
    await svc.flushMetrics();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(0).events).toHaveLength(3);
  });

  it('batches of at most 100, at most one try every 15 minutes', async () => {
    switches.metrics = true;
    await fill(250);
    await svc.flushMetrics();
    await svc.flushMetrics();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(at(21).getTime() + 16 * 60_000));
    await svc.flushMetrics();
    vi.setSystemTime(new Date(at(21).getTime() + 32 * 60_000));
    await svc.flushMetrics();
    expect(fetchMock.mock.calls.map((_, i) => bodyOf(i).events.length)).toEqual([100, 100, 50]);
    expect(saved()!.queue).toEqual([]);
  });

  it('a 5xx or no network keeps the batch and retries it with the same id; 400/413/422 drop it', async () => {
    switches.metrics = true;
    await fill(20);
    reply(503);
    await svc.flushMetrics();
    const id = bodyOf(0).batch;
    expect(saved()!.pending?.id).toBe(id);
    vi.setSystemTime(new Date(at(21).getTime() + 16 * 60_000));
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('offline');
    });
    await svc.flushMetrics();
    expect(bodyOf(1).batch).toBe(id);
    expect(saved()!.pending?.id).toBe(id);
    vi.setSystemTime(new Date(at(21).getTime() + 32 * 60_000));
    reply(422);
    await svc.flushMetrics();
    expect(bodyOf(2).batch).toBe(id);
    expect(saved()!.pending).toBeNull();
  });

  it('a 401 is just kept: it never signs anyone out (no session is involved)', async () => {
    switches.metrics = true;
    await fill(20);
    reply(401);
    await svc.flushMetrics();
    expect(saved()!.pending).not.toBeNull();
  });

  it('records older than 30 days go unsent', async () => {
    switches.metrics = true;
    await fill(2);
    vi.setSystemTime(at(21 + 31));
    await svc.flushMetrics({ force: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('turning it off, and deleting', () => {
  it('stopMetrics drops what waits and keeps the once-only flags', async () => {
    switches.metrics = true;
    svc.track('first_mission_proven', { mission: 'S1', area: 'school', proof: 'PHOTO' });
    for (let i = 0; i < 20; i++) svc.track('paywall_viewed', { from: 'swaps' });
    await svc.metricsIdle();
    reply(500);
    await svc.flushMetrics();
    expect(saved()!.pending).not.toBeNull();
    await svc.stopMetrics();
    expect(saved()).toMatchObject({ queue: [], pending: null, once: ['first_mission_proven'] });
    svc.track('first_mission_proven', { mission: 'S1', area: 'school', proof: 'PHOTO' });
    await svc.metricsIdle();
    expect(saved()!.queue).toEqual([]);
  });

  it('clearMetrics removes the key; a record after it starts again', async () => {
    svc.track('first_mission_proven', { mission: 'S1' });
    svc.track('paywall_viewed', { from: 'swaps' });
    await svc.clearMetrics();
    expect(m.storage.has(KEY)).toBe(false);
    svc.track('first_mission_proven', { mission: 'S1' });
    await svc.metricsIdle();
    expect(saved()!.queue.map(q => q.e)).toEqual(['first_mission_proven']);
  });

  it('an unreadable key starts again', async () => {
    m.storage.set(KEY, '{nope');
    await fresh();
    svc.track('paywall_viewed', { from: 'swaps' });
    await svc.metricsIdle();
    expect(saved()!.queue).toHaveLength(1);
  });
});
