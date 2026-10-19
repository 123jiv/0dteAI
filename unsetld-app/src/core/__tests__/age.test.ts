// The 13+ age gate (launch pass P0-4): the birth year (and, on the 13 line only, the month) to a
// bucket; Apple's Declared Age Range to the same buckets, never its simulated adult; and where the
// app opens and what happens to a link while the gate is open.
import { describe, expect, it } from 'vitest';
import { ageFromBirth, ageFromRange, AGE_GATES, appleAnswer, birthYears, canAskApple, intentGate, MIN_AGE, needsMonth, startRoute } from '../age';

const NOW = new Date(2026, 9, 19, 12, 0, 0); // Mon 19 Oct 2026

describe('year first, the month only on the 13 line', () => {
  it('maps a year to a bucket, the younger one when the year straddles 16 or 18', () => {
    expect(ageFromBirth(2026, null, NOW)).toEqual({ kind: 'under13' });
    expect(ageFromBirth(2015, null, NOW)).toEqual({ kind: 'under13' });
    expect(ageFromBirth(2014, null, NOW)).toEqual({ kind: 'under13' }); // 12 at most
    expect(ageFromBirth(2013, null, NOW)).toEqual({ kind: 'month' }); // 12 or 13
    expect(ageFromBirth(2012, null, NOW)).toEqual({ kind: 'ok', age: 'u16' }); // 13 or 14
    expect(ageFromBirth(2010, null, NOW)).toEqual({ kind: 'ok', age: 'u16' }); // 15 or 16
    expect(ageFromBirth(2009, null, NOW)).toEqual({ kind: 'ok', age: '16to17' }); // 16 or 17
    expect(ageFromBirth(2008, null, NOW)).toEqual({ kind: 'ok', age: '16to17' }); // 17 or 18
    expect(ageFromBirth(2007, null, NOW)).toEqual({ kind: 'ok', age: '18plus' }); // 18 or 19
    expect(ageFromBirth(1990, null, NOW)).toEqual({ kind: 'ok', age: '18plus' });
    expect(ageFromBirth(1926, null, NOW)).toEqual({ kind: 'ok', age: '18plus' });
  });

  it('on the 13 line the month decides, and the birth month itself counts as not reached', () => {
    expect(ageFromBirth(2013, 1, NOW)).toEqual({ kind: 'ok', age: 'u16' });
    expect(ageFromBirth(2013, 9, NOW)).toEqual({ kind: 'ok', age: 'u16' });
    expect(ageFromBirth(2013, 10, NOW)).toEqual({ kind: 'under13' }); // October: not yet
    expect(ageFromBirth(2013, 11, NOW)).toEqual({ kind: 'under13' });
    expect(ageFromBirth(2013, 12, NOW)).toEqual({ kind: 'under13' });
  });

  it('January and December: the boundary moves with the date', () => {
    const jan = new Date(2027, 0, 15, 12);
    expect(ageFromBirth(2014, null, jan)).toEqual({ kind: 'month' });
    expect(ageFromBirth(2014, 1, jan)).toEqual({ kind: 'under13' });
    expect(ageFromBirth(2014, 12, jan)).toEqual({ kind: 'under13' });
    expect(ageFromBirth(2013, null, jan)).toEqual({ kind: 'ok', age: 'u16' });
    const dec = new Date(2026, 11, 31, 23);
    expect(ageFromBirth(2013, 11, dec)).toEqual({ kind: 'ok', age: 'u16' });
    expect(ageFromBirth(2013, 12, dec)).toEqual({ kind: 'under13' });
  });

  it('a month that is no month asks again', () => {
    expect(ageFromBirth(2013, 0, NOW)).toEqual({ kind: 'month' });
    expect(ageFromBirth(2013, 13, NOW)).toEqual({ kind: 'month' });
    expect(ageFromBirth(2013, 2.5, NOW)).toEqual({ kind: 'month' });
  });

  it('only that one year asks for the month', () => {
    const asking = birthYears(NOW).filter(y => needsMonth(y, NOW));
    expect(asking).toEqual([NOW.getFullYear() - MIN_AGE]);
  });

  it('the wheel: this year back a hundred, newest first, every answer possible', () => {
    const years = birthYears(NOW);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(1926);
    expect(years).toHaveLength(101);
    // Every year has an answer (or asks for the month): nothing on the wheel is a dead end.
    for (const y of years) expect(['ok', 'under13', 'month']).toContain(ageFromBirth(y, null, NOW).kind);
  });

  it('every day of the year: 13 exactly on the first day of the month after the birth month', () => {
    for (let month = 1; month <= 12; month++) {
      for (let nowMonth = 0; nowMonth < 12; nowMonth++) {
        const now = new Date(2026, nowMonth, 10, 12);
        const r = ageFromBirth(2013, month, now);
        expect(r.kind, `born ${month}/2013, asked ${nowMonth + 1}/2026`).toBe(nowMonth + 1 > month ? 'ok' : 'under13');
      }
    }
  });
});

describe("Apple's Declared Age Range", () => {
  it('asks with the same lines as the buckets', () => {
    expect(AGE_GATES).toEqual({ threshold1: 13, threshold2: 16, threshold3: 18 });
  });

  it('maps each range to a bucket', () => {
    expect(ageFromRange(null, 12)).toEqual({ kind: 'under13' });
    expect(ageFromRange(0, 12)).toEqual({ kind: 'under13' });
    expect(ageFromRange(13, 15)).toEqual({ kind: 'ok', age: 'u16' });
    expect(ageFromRange(16, 17)).toEqual({ kind: 'ok', age: '16to17' });
    expect(ageFromRange(18, null)).toEqual({ kind: 'ok', age: '18plus' });
    expect(ageFromRange(null, null)).toBeNull();
    expect(ageFromRange(undefined, undefined)).toBeNull();
    expect(ageFromRange(10, null)).toBeNull();
  });

  it('never takes the simulated adult (before iOS 26, on the web): no declaration, no answer', () => {
    expect(appleAnswer({ lowerBound: 18, upperBound: null })).toBeNull();
    expect(appleAnswer({ lowerBound: 18, upperBound: null, ageRangeDeclaration: null })).toBeNull();
    expect(appleAnswer(null)).toBeNull();
    expect(appleAnswer(undefined)).toBeNull();
  });

  it('takes a declared range, by the person, a guardian or confirmed', () => {
    expect(appleAnswer({ lowerBound: 18, upperBound: null, ageRangeDeclaration: 'selfDeclared' })).toEqual({ kind: 'ok', age: '18plus' });
    expect(appleAnswer({ lowerBound: 13, upperBound: 15, ageRangeDeclaration: 'guardianDeclared' })).toEqual({ kind: 'ok', age: 'u16' });
    expect(appleAnswer({ lowerBound: null, upperBound: 12, ageRangeDeclaration: 'guardianDeclared' })).toEqual({ kind: 'under13' });
    expect(appleAnswer({ lowerBound: 16, upperBound: 17, ageRangeDeclaration: 'confirmed' })).toEqual({ kind: 'ok', age: '16to17' });
  });

  it('only iOS 26 or later; never the web, Android, or an older iOS', () => {
    expect(canAskApple('ios', '26.0')).toBe(true);
    expect(canAskApple('ios', '26.2')).toBe(true);
    expect(canAskApple('ios', '27.1')).toBe(true);
    expect(canAskApple('ios', '18.6')).toBe(false);
    expect(canAskApple('ios', '16.4')).toBe(false);
    expect(canAskApple('ios', undefined)).toBe(false);
    expect(canAskApple('ios', '')).toBe(false);
    expect(canAskApple('web', '26.2')).toBe(false);
    expect(canAskApple('android', 36)).toBe(false);
  });
});

describe('where the app opens', () => {
  it('under 13 stays blocked, whatever else is saved', () => {
    expect(startRoute({ onboarded: false, ageCheck: 'under13' })).toBe('AgeBlocked');
    expect(startRoute({ onboarded: true, ageCheck: 'under13' })).toBe('AgeBlocked');
  });

  it('someone new starts at Name (the age gate follows it)', () => {
    expect(startRoute({ onboarded: false, ageCheck: null })).toBe('Name');
    expect(startRoute({ onboarded: false, ageCheck: undefined })).toBe('Name');
    // Answered, then closed before the areas: Name again, which goes straight on to the areas.
    expect(startRoute({ onboarded: false, ageCheck: 'ok' })).toBe('Name');
  });

  it('someone onboarded before the gate existed answers it once', () => {
    expect(startRoute({ onboarded: true, ageCheck: null })).toBe('Age');
    expect(startRoute({ onboarded: true, ageCheck: undefined })).toBe('Age');
    expect(startRoute({ onboarded: true, ageCheck: 'ok' })).toBe('Main');
  });

  it('links and notification taps wait for the gate, and go nowhere on a blocked install', () => {
    expect(intentGate({ onboarded: true, ageCheck: 'ok' })).toBe('go');
    expect(intentGate({ onboarded: true, ageCheck: null })).toBe('wait');
    expect(intentGate({ onboarded: false, ageCheck: null })).toBe('drop');
    expect(intentGate({ onboarded: false, ageCheck: 'ok' })).toBe('drop');
    expect(intentGate({ onboarded: true, ageCheck: 'under13' })).toBe('drop');
  });
});
