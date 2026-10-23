// The free trial comes from the store product's intro offer (core/trial), never a fixed 3 days or
// 48 hours: its length, its end, and the reminder 24 hours before it.
import { describe, expect, it } from 'vitest';
import { dayMonth, dayMonthYear, longDate, reminderAt, shortDate, trialEnd, trialLabel, trialOf, trialTimeline, type Trial } from '../trial';

const free = (periodUnit: string, periodNumberOfUnits: number, cycles = 1) => ({ price: 0, periodUnit, periodNumberOfUnits, cycles });
const HOUR = 3_600_000;

describe('trialOf: the intro offer, when it costs nothing', () => {
  it('reads P3D, P1W, P2W and P1M', () => {
    expect(trialOf(free('DAY', 3))).toEqual({ unit: 'day', count: 3 });
    expect(trialOf(free('WEEK', 1))).toEqual({ unit: 'week', count: 1 });
    expect(trialOf(free('WEEK', 2))).toEqual({ unit: 'week', count: 2 });
    expect(trialOf(free('MONTH', 1))).toEqual({ unit: 'month', count: 1 });
    expect(trialOf(free('YEAR', 1))).toEqual({ unit: 'year', count: 1 });
  });
  it('a paid intro offer, a missing one or a broken one is no trial', () => {
    expect(trialOf({ price: 0.99, periodUnit: 'WEEK', periodNumberOfUnits: 1, cycles: 1 })).toBeNull();
    expect(trialOf({ price: 1.99, periodUnit: 'MONTH', periodNumberOfUnits: 3, cycles: 3 })).toBeNull();
    expect(trialOf(null)).toBeNull();
    expect(trialOf(undefined)).toBeNull();
    expect(trialOf(free('FORTNIGHT', 1))).toBeNull();
    expect(trialOf(free('DAY', 0))).toBeNull();
  });
  it('counts cycles', () => {
    expect(trialOf(free('WEEK', 1, 2))).toEqual({ unit: 'week', count: 2 });
    expect(trialOf(free('DAY', 7, 0))).toEqual({ unit: 'day', count: 7 });
  });
  it('labels it the way the paywall says it', () => {
    expect(trialLabel({ unit: 'day', count: 3 })).toBe('3 days');
    expect(trialLabel({ unit: 'week', count: 1 })).toBe('1 week');
    expect(trialLabel({ unit: 'month', count: 1 })).toBe('1 month');
    expect(trialLabel({ unit: 'day', count: 1 })).toBe('1 day');
  });
});

describe('the end and the reminder', () => {
  const start = new Date(2026, 9, 19, 10, 0);
  it('ends in calendar time', () => {
    expect(trialEnd(start, { unit: 'day', count: 3 })).toEqual(new Date(2026, 9, 22, 10, 0));
    expect(trialEnd(start, { unit: 'week', count: 1 })).toEqual(new Date(2026, 9, 26, 10, 0));
    expect(trialEnd(start, { unit: 'month', count: 1 })).toEqual(new Date(2026, 10, 19, 10, 0));
  });
  it('a month from a date the next month lacks ends on its last day, as the App Store does', () => {
    expect(trialEnd(new Date(2027, 0, 31, 10, 0), { unit: 'month', count: 1 })).toEqual(new Date(2027, 1, 28, 10, 0));
    expect(trialEnd(new Date(2028, 0, 31, 10, 0), { unit: 'month', count: 1 })).toEqual(new Date(2028, 1, 29, 10, 0));
    expect(trialEnd(new Date(2026, 9, 31, 10, 0), { unit: 'month', count: 1 })).toEqual(new Date(2026, 10, 30, 10, 0));
    expect(trialEnd(new Date(2026, 11, 31, 10, 0), { unit: 'month', count: 2 })).toEqual(new Date(2027, 1, 28, 10, 0));
    expect(trialEnd(new Date(2026, 7, 31, 10, 0), { unit: 'month', count: 1 })).toEqual(new Date(2026, 8, 30, 10, 0));
    expect(trialEnd(new Date(2028, 1, 29, 10, 0), { unit: 'year', count: 1 })).toEqual(new Date(2029, 1, 28, 10, 0));
    expect(trialEnd(new Date(2026, 9, 19, 10, 0), { unit: 'year', count: 1 })).toEqual(new Date(2027, 9, 19, 10, 0));
    // The paywall's line: "3 MAR" was shown for a trial started on 31 Jan.
    expect(shortDate(trialEnd(new Date(2027, 0, 31, 10, 0), { unit: 'month', count: 1 }))).toBe('28 FEB');
  });
  it('reminds 24 hours before the end, for every length', () => {
    for (const t of [
      { unit: 'day', count: 3 },
      { unit: 'week', count: 1 },
      { unit: 'week', count: 2 },
      { unit: 'month', count: 1 },
    ] as Trial[]) {
      const end = trialEnd(start, t);
      expect(end.getTime() - reminderAt(end, start)!.getTime()).toBe(24 * HOUR);
    }
  });
  it('no reminder when the end is under 25 hours away (a trial restored on its last day)', () => {
    const now = new Date(2026, 9, 21, 12);
    expect(reminderAt(new Date(now.getTime() + 24.5 * HOUR), now)).toBeNull();
    expect(reminderAt(new Date(now.getTime() + 24 * HOUR), now)).toBeNull();
    expect(reminderAt(new Date(now.getTime() - HOUR), now)).toBeNull();
    expect(reminderAt(new Date(now.getTime() + 25 * HOUR), now)).toEqual(new Date(now.getTime() + HOUR));
    expect(reminderAt(new Date('not a date'), now)).toBeNull();
  });
  it('a one-day trial has no reminder on the timeline', () => {
    expect(trialTimeline({ unit: 'day', count: 1 }, start, true).remind).toBeNull();
  });
  it('the timeline drops the reminder when notifications are off', () => {
    const on = trialTimeline({ unit: 'week', count: 1 }, start, true);
    expect(on.remind).toEqual(new Date(2026, 9, 25, 10, 0));
    expect(on.end).toEqual(new Date(2026, 9, 26, 10, 0));
    expect(trialTimeline({ unit: 'week', count: 1 }, start, false).remind).toBeNull();
  });
});

describe('dates as the screens write them', () => {
  const d = new Date(2026, 9, 22, 9, 0);
  it('timeline label, VoiceOver, You row', () => {
    expect(shortDate(d)).toBe('22 OCT');
    expect(longDate(d)).toBe('22 October');
    expect(dayMonth(d)).toBe('22 Oct');
    expect(dayMonthYear(d)).toBe('22 Oct 2026');
  });
});
