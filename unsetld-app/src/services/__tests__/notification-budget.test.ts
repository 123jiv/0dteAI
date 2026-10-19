// The pending-notification budget against a fake iOS queue with its 64 limit, under both of iOS's
// overflow behaviours: 'soonest' keeps the 64 that fire soonest (as Apple documents for local
// notifications) and 'reject' drops a request made while 64 are pending. Mission reminders (56 at
// most), the next two drop alerts, the trial reminder and the focus timer's "done" together stay
// at or under 60, so the timer's is never the one lost. Also: ids from older builds are cancelled,
// a timer that would only end after its day's 4:00 AM gets no notification, and Delete data on
// this phone leaves only the trial reminder.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isOwnNotification, MAX_PENDING, overBudget, PENDING_BUDGET } from '../../core/reminders';
import { startTimer } from '../../core/timer';
import { dayKeyOf } from '../../core/time';

const q = vi.hoisted(() => ({
  pending: [] as { identifier: string; date: number }[],
  model: 'soonest' as 'soonest' | 'reject',
  dropped: [] as string[],
  dismissed: 0,
  granted: true,
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  DEFAULT_ACTION_IDENTIFIER: 'default',
  getAllScheduledNotificationsAsync: async () => q.pending.map(p => ({ identifier: p.identifier })),
  cancelScheduledNotificationAsync: async (id: string) => {
    q.pending = q.pending.filter(p => p.identifier !== id);
  },
  getPermissionsAsync: async () => ({ granted: q.granted, canAskAgain: false }),
  requestPermissionsAsync: async () => ({ granted: q.granted }),
  dismissAllNotificationsAsync: async () => {
    q.dismissed++;
  },
  scheduleNotificationAsync: async ({ identifier, trigger }: { identifier: string; trigger: { date: Date } }) => {
    q.pending = q.pending.filter(p => p.identifier !== identifier);
    if (q.model === 'reject' && q.pending.length >= 64) {
      q.dropped.push(identifier);
      return identifier;
    }
    q.pending.push({ identifier, date: new Date(trigger.date).getTime() });
    if (q.pending.length > 64) {
      q.pending.sort((a, b) => a.date - b.date);
      q.dropped.push(...q.pending.slice(64).map(p => p.identifier));
      q.pending = q.pending.slice(0, 64);
    }
    return identifier;
  },
}));

// 6:00 AM, before the day's first reminder: the most reminders still ahead.
const NOW = new Date(2026, 9, 20, 6, 0, 0);
const input = (count: number) => ({ remindersOn: true, count, first: 7 * 60, last: 22 * 60, plans: {}, perDay: 2, streak: 4, seed: 'salt' });
const drops = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `d${i}`, collection: `00${5 + i}`, publicAt: new Date(NOW.getTime() + (10 + i * 7) * 86_400_000).toISOString() }));
const ids = () => q.pending.map(p => p.identifier);

/** A trial reminder as the paywall schedules it (its id is one of the trial ids). */
async function trial(id = 'trial-end') {
  const N = await import('expo-notifications');
  await N.scheduleNotificationAsync({ identifier: id, content: { title: 't', body: 'b' }, trigger: { type: 'date', date: new Date(NOW.getTime() + 5 * 86_400_000) } } as never);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  q.pending = [];
  q.dropped = [];
  q.dismissed = 0;
  q.granted = true;
});

describe('the budget', () => {
  it('leaves 56 for reminders: 64, less 4 kept free, the timer, the trial and two drop alerts', () => {
    expect(PENDING_BUDGET).toBe(60);
    expect(MAX_PENDING).toBe(56);
  });

  it('knows its own ids, and trims unknown ones first, then the latest reminders', () => {
    expect(['rem-2026-10-20-0', 'drop-d1', 'timer-done', 'trial-end', 'trial-day2'].every(isOwnNotification)).toBe(true);
    expect(isOwnNotification('night-2026-10-20')).toBe(false);
    const rem = Array.from({ length: 58 }, (_, i) => `rem-${dayKeyOf(new Date(2026, 9, 20 + Math.floor(i / 10), 12))}-${i % 10}`);
    const pending = ['night-1', 'timer-done', 'trial-end', 'drop-a', 'drop-b', ...rem];
    // 62 of our own, 2 over the budget: the two latest reminders go, with the unknown id.
    expect(overBudget(pending)).toEqual(['night-1', rem[57], rem[56]]);
    expect(overBudget(['night-1', 'timer-done'])).toEqual(['night-1']);
    expect(overBudget(['timer-done', 'trial-end'])).toEqual([]);
  });
});

for (const model of ['soonest', 'reject'] as const) {
  describe(`iOS keeping ${model === 'soonest' ? 'the soonest 64' : 'the first 64 asked for'}`, () => {
    it('10 reminders a day, 3 drops, a trial and a running timer: everything fits, the timer included', async () => {
      q.model = model;
      const { reschedule, scheduleDropAlerts } = await import('../notifications');
      const { scheduleTimerDone } = await import('../timerNotify');
      await reschedule(input(10));
      await scheduleDropAlerts({ drops: drops(3), optedIn: true });
      await trial();
      await scheduleTimerDone(startTimer('D1', dayKeyOf(NOW), 30, Date.now()));
      expect(q.dropped).toEqual([]);
      expect(q.pending.length).toBeLessThanOrEqual(PENDING_BUDGET);
      expect(ids().filter(i => i.startsWith('rem-')).length).toBeLessThanOrEqual(MAX_PENDING);
      // Only the next two drops.
      expect(ids().filter(i => i.startsWith('drop-')).sort()).toEqual(['drop-d0', 'drop-d1']);
      expect(ids()).toContain('timer-done');
      expect(ids()).toContain('trial-end');
    });

    it('a reminder rebuild after the others, then a timer: the timer still gets its place', async () => {
      q.model = model;
      const { reschedule, scheduleDropAlerts } = await import('../notifications');
      const { scheduleTimerDone } = await import('../timerNotify');
      await scheduleDropAlerts({ drops: drops(3), optedIn: true });
      await trial('trial-day2');
      await reschedule(input(10));
      await scheduleTimerDone(startTimer('D1', dayKeyOf(NOW), 30, Date.now()));
      expect(q.dropped).toEqual([]);
      expect(ids()).toContain('timer-done');
      expect(ids()).toContain('trial-day2');
      expect(q.pending.length).toBeLessThanOrEqual(PENDING_BUDGET);
    });
  });
}

describe('cleaning up', () => {
  it("cancels ids an older build left behind (2.x night checks) when the reminders are rebuilt", async () => {
    const { reschedule } = await import('../notifications');
    q.pending.push({ identifier: 'night-2026-10-21', date: NOW.getTime() + 86_400_000 }, { identifier: 'something-else', date: NOW.getTime() + 2 * 86_400_000 });
    await reschedule(input(3));
    expect(ids().some(i => i.startsWith('night-') || i === 'something-else')).toBe(false);
  });

  it('Delete data on this phone: only the trial reminder stays, and delivered ones are dismissed', async () => {
    const { clearPendingExceptTrial, NO_REMINDERS, reschedule, scheduleDropAlerts } = await import('../notifications');
    const { cancelTimerDone, scheduleTimerDone } = await import('../timerNotify');
    await reschedule(input(5));
    await scheduleDropAlerts({ drops: drops(2), optedIn: true });
    await trial();
    await scheduleTimerDone(startTimer('D1', dayKeyOf(NOW), 30, Date.now()));
    q.pending.push({ identifier: 'stray', date: NOW.getTime() + 1000 });
    await reschedule(NO_REMINDERS);
    await scheduleDropAlerts({ drops: [], optedIn: false });
    await cancelTimerDone();
    await clearPendingExceptTrial();
    expect(ids()).toEqual(['trial-end']);
    expect(q.dismissed).toBe(1);
  });
});

describe('timer done', () => {
  it('rings when the timer ends before its day does', async () => {
    const { scheduleTimerDone } = await import('../timerNotify');
    await scheduleTimerDone(startTimer('D1', dayKeyOf(NOW), 30, Date.now()));
    expect(ids()).toEqual(['timer-done']);
  });

  it("gets no notification when it would only end after that day's 4:00 AM (a timer resumed late)", async () => {
    const { scheduleTimerDone } = await import('../timerNotify');
    vi.setSystemTime(new Date(2026, 9, 21, 3, 50, 0)); // 3:50 AM: still the 20th
    const t = startTimer('D1', '2026-10-20', 30, Date.now());
    await scheduleTimerDone(t);
    expect(ids()).toEqual([]);
    // One that ends at 3:59 rings.
    await scheduleTimerDone(startTimer('D1', '2026-10-20', 9, Date.now()));
    expect(ids()).toEqual(['timer-done']);
  });

  it("counts the day's end on the app's clock under tester time travel", async () => {
    const { timerDayEnds } = await import('../timerNotify');
    const end = new Date(2026, 9, 21, 4, 0, 0).getTime();
    expect(timerDayEnds({ day: '2026-10-20' }, 0)).toBe(end);
    // Two days ahead on the app's clock: that day ends two real days earlier.
    expect(timerDayEnds({ day: '2026-10-22' }, 2)).toBe(end);
  });
});
