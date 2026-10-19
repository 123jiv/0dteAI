// The trial reminder follows the entitlement (services/notifications syncTrialReminder): one
// `trial-end` notification 24 hours before the store's trial end, only with notifications allowed;
// the old fixed 48-hour `trial-day2` is always cancelled.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const n = vi.hoisted(() => ({
  granted: true,
  scheduled: new Map<string, { body: string; date: Date }>(),
  cancelled: [] as string[],
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: async () => ({ granted: n.granted, canAskAgain: true }),
  cancelScheduledNotificationAsync: async (id: string) => {
    n.cancelled.push(id);
    n.scheduled.delete(id);
  },
  scheduleNotificationAsync: async (r: { identifier: string; content: { body: string }; trigger: { date: Date } }) => {
    n.scheduled.set(r.identifier, { body: r.content.body, date: r.trigger.date });
    return r.identifier;
  },
}));

const NOW = new Date(2026, 9, 19, 10, 0);
const HOUR = 3_600_000;
const iso = (d: Date) => d.toISOString();

async function load() {
  vi.resetModules();
  return import('../notifications');
}

describe('syncTrialReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    n.granted = true;
    n.scheduled.clear();
    n.cancelled = [];
    // An install that upgraded mid-trial still has the 3.2 reminder queued.
    n.scheduled.set('trial-day2', { body: 'old', date: new Date(NOW.getTime() + 48 * HOUR) });
  });

  it('a 7-day trial: reminded 6 days in, 24 hours before it ends, at its price', async () => {
    const { syncTrialReminder, TRIAL_REMINDER_ID } = await load();
    const end = new Date(2026, 9, 26, 10, 0);
    const at = await syncTrialReminder({ trialEnds: iso(end), price: '$24.99', kind: 'annual' });
    expect(at).toEqual(new Date(end.getTime() - 24 * HOUR));
    expect([...n.scheduled.keys()]).toEqual([TRIAL_REMINDER_ID]);
    expect(n.scheduled.get('trial-end')).toEqual({
      date: new Date(2026, 9, 25, 10, 0),
      body: 'Your free trial ends tomorrow. $24.99 a year starts then. Cancel any time in Settings.',
    });
    expect(n.cancelled).toContain('trial-day2');
  });

  it('a monthly trial says a month; an unknown price says UNSETLD+ renews', async () => {
    const { syncTrialReminder } = await load();
    const end = iso(new Date(2026, 9, 22, 10, 0));
    await syncTrialReminder({ trialEnds: end, price: '$4.99', kind: 'monthly' });
    expect(n.scheduled.get('trial-end')?.body).toBe('Your free trial ends tomorrow. $4.99 a month starts then. Cancel any time in Settings.');
    await syncTrialReminder({ trialEnds: end, price: null, kind: 'annual' });
    expect(n.scheduled.get('trial-end')?.body).toBe('Your free trial ends tomorrow. UNSETLD+ renews then unless you cancel in Settings.');
  });

  it('rescheduling keeps one reminder', async () => {
    const { syncTrialReminder } = await load();
    await syncTrialReminder({ trialEnds: iso(new Date(2026, 9, 22, 10)), price: '$24.99', kind: 'annual' });
    await syncTrialReminder({ trialEnds: iso(new Date(2026, 9, 26, 10)), price: '$24.99', kind: 'annual' });
    expect([...n.scheduled.keys()]).toEqual(['trial-end']);
    expect(n.scheduled.get('trial-end')?.date).toEqual(new Date(2026, 9, 25, 10));
  });

  it('no renewing trial (cancelled, ended, not a member): nothing scheduled, the old one goes', async () => {
    const { syncTrialReminder } = await load();
    await syncTrialReminder({ trialEnds: iso(new Date(2026, 9, 26, 10)), price: '$24.99', kind: 'annual' });
    expect(await syncTrialReminder({ trialEnds: null })).toBeNull();
    expect(n.scheduled.size).toBe(0);
  });

  it('notifications off: no reminder is promised or left queued', async () => {
    const { syncTrialReminder } = await load();
    n.granted = false;
    expect(await syncTrialReminder({ trialEnds: iso(new Date(2026, 9, 26, 10)), price: '$24.99', kind: 'annual' })).toBeNull();
    expect(n.scheduled.size).toBe(0);
  });

  it('under 25 hours to go (restored late in the trial): no reminder', async () => {
    const { syncTrialReminder } = await load();
    expect(await syncTrialReminder({ trialEnds: iso(new Date(NOW.getTime() + 24.5 * HOUR)), price: '$24.99', kind: 'annual' })).toBeNull();
    expect(n.scheduled.size).toBe(0);
  });

  it('never the fixed 48 hours of 3.2', async () => {
    const { syncTrialReminder } = await load();
    for (const days of [3, 7, 14, 30]) {
      const at = await syncTrialReminder({ trialEnds: iso(new Date(NOW.getTime() + days * 24 * HOUR)), price: '$24.99', kind: 'annual' });
      expect(at!.getTime() - NOW.getTime()).toBe((days - 1) * 24 * HOUR);
    }
  });
});
