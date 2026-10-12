import { describe, expect, it } from 'vitest';
import { perMonth, savingsPercent } from '../pricing';
import { barcode, barcodeGeometry, dayCount, emptyRecord, recordDay, week } from '../record';
import { addDays, atMinutes, dayKeyOf, diffDays, formatTime, nextDayStart } from '../time';
import { breakBeats, lineSize, typo } from '../typography';
import type { RecordState } from '../types';

/** Records `n` consecutive days starting at `start`. */
function onRecord(r: RecordState, start: string, n: number): RecordState {
  let cur = r;
  for (let i = 0; i < n; i++) cur = recordDay(cur, addDays(start, i), true);
  return cur;
}

describe('day boundary', () => {
  it('runs from 4:00 AM to 3:59 AM', () => {
    expect(dayKeyOf(new Date(2026, 9, 7, 3, 59))).toBe('2026-10-06');
    expect(dayKeyOf(new Date(2026, 9, 7, 4, 0))).toBe('2026-10-07');
    expect(dayKeyOf(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
    expect(dayKeyOf(new Date(2026, 9, 8, 1, 30))).toBe('2026-10-07');
  });
  it('rolls over month and year ends', () => {
    expect(dayKeyOf(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-02-27', '2026-03-01')).toBe(2);
  });
  it('finds the next 4:00 AM', () => {
    const late = nextDayStart(new Date(2026, 9, 8, 1, 0));
    expect([late.getDate(), late.getHours()]).toEqual([8, 4]);
    const day = nextDayStart(new Date(2026, 9, 8, 9, 0));
    expect([day.getDate(), day.getHours()]).toEqual([9, 4]);
  });
  it('places times after midnight on the next calendar date', () => {
    const d = atMinutes('2026-10-07', 60);
    expect([d.getDate(), d.getHours()]).toEqual([8, 1]);
    expect(formatTime(7 * 60)).toBe('7:00 AM');
    expect(formatTime(21 * 60 + 30)).toBe('9:30 PM');
    expect(formatTime(0)).toBe('12:00 AM');
  });
});

describe('record', () => {
  it('records each day once and never backfills', () => {
    let r = recordDay(emptyRecord(), '2026-10-07', false);
    r = recordDay(r, '2026-10-07', false);
    expect(dayCount(r)).toBe(1);
    r = recordDay(r, '2026-10-07', true);
    expect(r.days['2026-10-07'].verified).toBe(true);
    r = recordDay(r, '2026-10-06', true);
    expect(dayCount(r)).toBe(1);
  });

  it('never takes a day back after a long gap: the count only grows', () => {
    let r = onRecord(emptyRecord(), '2026-01-01', 40);
    r = onRecord(r, '2026-03-01', 7);
    expect(dayCount(r)).toBe(47);
  });

  it('draws the barcode and week', () => {
    let r = onRecord(emptyRecord(), '2026-10-01', 3);
    r = recordDay(r, '2026-10-05', true);
    const bars = barcode(r, '2026-10-05');
    expect(bars.map(b => b.kind)).toEqual(['on', 'on', 'on', 'missed', 'today']);
    expect(barcode(onRecord(emptyRecord(), '2026-01-01', 300), '2026-10-27').length).toBe(120);
    expect(barcodeGeometry(5, 334)).toEqual({ pitch: 8, bar: 2 });
    expect(barcodeGeometry(120, 334).bar).toBe(1);
    expect(week(r, '2026-10-05').map(d => d.on)).toEqual([false, false, true, true, true, false, true]);
  });
});

describe('typography and pricing', () => {
  it('makes quotes typographic', () => {
    expect(typo("isn't")).toBe('isn’t');
    expect(typo('Take "just" out')).toBe('Take “just” out');
    expect(typo("'Tis")).toBe('‘Tis');
  });
  it('steps line sizes by length', () => {
    expect(lineSize('Short line.').fontSize).toBe(52);
    expect(lineSize('x'.repeat(50)).fontSize).toBe(46);
    expect(lineSize('x'.repeat(70)).fontSize).toBe(40);
    expect(lineSize('x'.repeat(90)).fontSize).toBe(34);
  });
  it('breaks two-beat lines', () => {
    expect(breakBeats("That restless feeling isn't a problem. It's an instruction.")).toBe(
      "That restless feeling isn't a problem.\nIt's an instruction.",
    );
    expect(breakBeats('Eat something real. Drink some water. Then back to it.')).toBe(
      'Eat something real. Drink some water. Then back to it.',
    );
  });
  it('derives plan figures from store prices', () => {
    expect(savingsPercent(24.99, 4.99)).toBe(58);
    expect(perMonth(24.99)).toBe(2.08);
  });
});
