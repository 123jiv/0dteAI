import { describe, expect, it } from 'vitest';
import milestonesJson from '../../content/milestones.json';
import { perMonth, savingsPercent } from '../pricing';
import {
  accessState,
  barcode,
  barcodeGeometry,
  dayCount,
  emptyRecord,
  markLetterShown,
  milestoneStatus,
  PAUSABLE_DAYS,
  pendingLetter,
  recordDay,
  roadPosition,
  week,
} from '../record';
import { addDays, atMinutes, dayKeyOf, diffDays, formatTime, nextDayStart } from '../time';
import { breakBeats, lineSize, typo } from '../typography';
import type { Milestone, RecordState } from '../types';

const MILESTONES = milestonesJson as Milestone[];

/** Records `n` consecutive days starting at `start`. */
function onRecord(r: RecordState, start: string, n: number): RecordState {
  let cur = r;
  for (let i = 0; i < n; i++) cur = recordDay(cur, addDays(start, i), true);
  return cur;
}

const m = (id: string) => MILESTONES.find(x => x.id === id)!;

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

  it('pauses access after 14 missed days and reopens after 7 more on record', () => {
    let r = onRecord(emptyRecord(), '2026-01-01', 40);
    expect(accessState(r, '2026-02-10').paused).toBe(false);
    // Last day on record is 2026-02-09. 14 missed days later: paused.
    expect(accessState(r, '2026-02-23').paused).toBe(false);
    expect(accessState(r, '2026-02-24').paused).toBe(true);
    r = onRecord(r, '2026-02-24', 6);
    const mid = accessState(r, '2026-02-29' as string);
    expect(mid.paused).toBe(true);
    expect(mid.reopenProgress).toBe(6);
    r = recordDay(r, '2026-03-02', true);
    const after = accessState(r, '2026-03-02');
    expect(after.paused).toBe(false);
    expect(after.lastComeback).toBe('2026-03-02');
    // The count never drops.
    expect(dayCount(r)).toBe(47);
  });

  it('gives milestone statuses: early access pauses, the patch is used once', () => {
    const r = onRecord(emptyRecord(), '2026-01-01', 31);
    const today = '2026-01-31';
    expect(MILESTONES.map(x => x.day)).toEqual([7, 90, 365]);
    expect(milestoneStatus(r, m('early-access'), today)).toEqual({ kind: 'open' });
    expect(milestoneStatus(r, m('patch'), today)).toEqual({ kind: 'locked', daysLeft: 59 });
    // Paused after 14 missed days: early access pauses, the count stays.
    expect(milestoneStatus(r, m('early-access'), '2026-03-01')).toEqual({ kind: 'paused' });
    const big = onRecord(emptyRecord(), '2025-01-01', 95);
    expect(milestoneStatus(big, m('patch'), '2025-04-05')).toEqual({ kind: 'open' });
    expect(milestoneStatus({ ...big, patchClaimed: '2025-04-05' }, m('patch'), '2025-04-05')).toEqual({ kind: 'used' });
    expect(milestoneStatus(big, m('patch'), '2025-06-30')).toEqual({ kind: 'open' }); // the patch never pauses
  });

  it('sends one letter for the highest milestone, then a comeback letter', () => {
    let r = onRecord(emptyRecord(), '2026-01-01', 6);
    expect(pendingLetter(r, '2026-01-06')).toBeNull();
    r = onRecord(r, '2026-01-07', 1);
    const seven = pendingLetter(r, '2026-01-07')!;
    expect(seven).toMatchObject({ kind: 'milestone', day: 7 });
    r = markLetterShown(r, seven);
    expect(pendingLetter(r, '2026-01-07')).toBeNull();
    // Restored long record: only the top letter, and lower ones count as shown.
    let big = onRecord(emptyRecord(), '2025-01-01', 100);
    const top = pendingLetter(big, '2025-04-10')!;
    expect(top).toMatchObject({ day: 90 });
    big = markLetterShown(big, top);
    expect(big.lettersShown).toEqual(expect.arrayContaining(['7', '90']));
    // Comeback after a pause.
    r = onRecord(r, '2026-02-01', 7);
    const back = pendingLetter(r, '2026-02-07')!;
    expect(back).toMatchObject({ kind: 'comeback', day: '2026-02-07' });
    // Not lost if it isn't shown that day; gone once shown, or if access pauses again.
    expect(pendingLetter(r, '2026-02-09')).toMatchObject({ kind: 'comeback', day: '2026-02-07' });
    expect(pendingLetter(r, '2026-03-01')).toBeNull();
    expect(pendingLetter(markLetterShown(r, back), '2026-02-09')).toBeNull();
  });

  it('only pauses once early access has opened', () => {
    expect(MILESTONES.filter(x => x.pausable).map(x => x.day)).toEqual([...PAUSABLE_DAYS]);
    // 2 days, 22 missed, then back every day: nothing was open, so nothing pauses.
    let r = onRecord(emptyRecord(), '2026-01-01', 2);
    expect(accessState(r, '2026-01-24').paused).toBe(false);
    for (let i = 0; i < 9; i++) {
      const day = addDays('2026-01-25', i);
      r = recordDay(r, day, true);
      expect(accessState(r, day)).toEqual({ paused: false, reopenProgress: 0, lastComeback: null });
      const letter = pendingLetter(r, day);
      if (dayCount(r) === 7) {
        expect(letter).toMatchObject({ kind: 'milestone', day: 7 });
        expect(milestoneStatus(r, m('early-access'), day)).toEqual({ kind: 'open' });
        r = markLetterShown(r, letter!);
      } else expect(letter).toBeNull();
    }
  });

  it('holds back the early-access letter while paused, and sends one letter when access reopens', () => {
    // 7 days on record, letter never shown, then 17 missed days: paused.
    let r = onRecord(emptyRecord(), '2026-01-01', 7);
    expect(pendingLetter(r, '2026-01-25')).toBeNull();
    for (let i = 0; i < 6; i++) {
      const day = addDays('2026-01-25', i);
      r = recordDay(r, day, true);
      expect(accessState(r, day).paused).toBe(true);
      expect(pendingLetter(r, day)).toBeNull();
    }
    r = recordDay(r, '2026-01-31', true);
    expect(accessState(r, '2026-01-31')).toMatchObject({ paused: false, lastComeback: '2026-01-31' });
    const seven = pendingLetter(r, '2026-01-31')!;
    expect(seven).toMatchObject({ kind: 'milestone', day: 7 });
    r = markLetterShown(r, seven);
    expect(r.lettersShown).toEqual(expect.arrayContaining(['7', 'comeback:2026-01-31']));
    expect(pendingLetter(r, '2026-01-31')).toBeNull();
  });

  it('draws the barcode, week and road', () => {
    let r = onRecord(emptyRecord(), '2026-10-01', 3);
    r = recordDay(r, '2026-10-05', true);
    const bars = barcode(r, '2026-10-05');
    expect(bars.map(b => b.kind)).toEqual(['on', 'on', 'on', 'missed', 'today']);
    expect(barcode(onRecord(emptyRecord(), '2026-01-01', 300), '2026-10-27').length).toBe(120);
    expect(barcodeGeometry(5, 334)).toEqual({ pitch: 8, bar: 2 });
    expect(barcodeGeometry(120, 334).bar).toBe(1);
    expect(week(r, '2026-10-05').map(d => d.on)).toEqual([false, false, true, true, true, false, true]);
    expect(roadPosition(0)).toBe(0);
    expect(roadPosition(7)).toBeCloseTo(1 / 3);
    expect(roadPosition(90)).toBeCloseTo(2 / 3);
    expect(roadPosition(400)).toBe(1);
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
