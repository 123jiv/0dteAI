import { describe, expect, it } from 'vitest';
import milestonesJson from '../../content/milestones.json';
import linesJson from '../../content/lines.json';
import promptsJson from '../../content/reminders.json';
import { isLockEligible, lineForTask, todayLine } from '../feed';
import { perMonth, savingsPercent } from '../pricing';
import {
  accessState,
  answerNight,
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
  stats,
  week,
} from '../record';
import { allProofs, claimCode, completeTask, dailyTask, dailyTaskFor, dayWork, pointsBalance, provenCounts, readyTier, tierStatus, uncompleteTask } from '../points';
import pointsJson from '../../content/points.json';
import { dayReminderTimes, daysAhead, MAX_PENDING, planNotifications, slotOf } from '../reminders';
import { addDays, atMinutes, dayKeyOf, diffDays, formatTime, nextDayStart } from '../time';
import { lineOfDay } from '../today';
import { breakBeats, lineSize, typo } from '../typography';
import type { Line, Milestone, PointsConfig, RecordState, ReminderPrompt, Task } from '../types';

const MILESTONES = milestonesJson as Milestone[];
const LIB = linesJson as Line[];
const PROMPTS = promptsJson as ReminderPrompt[];
const POINTS = pointsJson as PointsConfig;

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

  it('counts run, longest and held', () => {
    let r = onRecord(emptyRecord(), '2026-09-01', 19);
    r = onRecord(r, '2026-09-25', 12);
    r = answerNight(r, '2026-09-25', true);
    r = answerNight(r, '2026-09-26', false);
    r = answerNight(r, '2026-08-01', true); // not on record: doesn't count
    const s = stats(r, '2026-10-06');
    expect(s).toEqual({ total: 31, run: 12, longest: 19, held: 1 });
    // Before today's open, the run still counts through yesterday.
    expect(stats(r, '2026-10-07').run).toBe(12);
    expect(stats(r, '2026-10-08').run).toBe(0);
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

const t = (id: string, chapter: Task['chapter'], text: string, proof: string, when: Task['when'], lines: number[]): Task => ({
  id, chapter, text, proof, when, why: 'Because it matters.', how: 'Start now.', lines,
});
const TASKS: Task[] = [
  t('disc-001', 'discipline', 'Make your bed.', 'The made bed.', 'morning', [9001, 9002]),
  t('disc-002', 'discipline', 'Clear the sink.', 'The empty sink.', 'evening', [9003]),
  t('focu-001', 'focus', 'One hour, phone away.', 'Your phone, away.', 'day', [9004]),
  t('mone-001', 'money', 'Write down every payment.', 'The list.', 'any', []),
];
const proof = { uri: '', takenAt: 0, lineNo: 1 };

describe("today's work", () => {
  it('picks one daily task from the chosen chapters, stable per day, no repeats until all have run', () => {
    const a = dailyTask(TASKS, ['discipline', 'focus'], 'salt', '2026-10-07')!;
    expect(['discipline', 'focus']).toContain(a.chapter);
    expect(dailyTask(TASKS, ['discipline', 'focus'], 'salt', '2026-10-07')!.id).toBe(a.id);
    const three = [0, 1, 2].map(i => dailyTask(TASKS, ['discipline', 'focus'], 'salt', addDays('2026-10-07', i))!.id);
    expect(new Set(three).size).toBe(3);
    expect(dailyTask(TASKS, ['stoic'], 'salt', '2026-10-07')).toBeNull();
  });

  it('lists the rules, the daily task, then your own tasks', () => {
    const work = dayWork(['Up before 7.', 'Train every day.', 'Finish what I start.'], TASKS[0], [{ id: 'x', text: 'Call home.' }]);
    expect(work.map(w => w.key)).toEqual(['r0', 'r1', 'r2', 'd', 'o:x']);
    expect(work[3]).toMatchObject({ source: 'daily', chapter: 'discipline', proof: 'The made bed.', why: 'Because it matters.', how: 'Start now.' });
  });

  it('keeps a finished daily task for the rest of the day, even if the chapters change', () => {
    const before = dailyTask(TASKS, ['discipline'], 'salt', '2026-10-07')!;
    const after = dailyTaskFor(TASKS, ['focus', 'money'], 'salt', '2026-10-07', before.text)!;
    expect(after.id).toBe(before.id);
    expect(dailyTaskFor(TASKS, ['focus'], 'salt', '2026-10-07')!.chapter).toBe('focus');
    expect(dailyTaskFor(TASKS, ['focus'], 'salt', '2026-10-07', 'A task that was removed.')!.chapter).toBe('focus');
  });

  it("takes the day's line from the daily task's paired lines", () => {
    const L = (no: number, chapter: Line['chapter'], text: string, explicit = false): Line => ({ no, chapter, text, explicit, volume: 1 });
    const lines = [
      L(9001, 'discipline', 'The bed is the first thing you finish today.'),
      L(9002, 'discipline', 'Two minutes, and the day already owes you one.'),
      L(9003, 'discipline', 'The sink is tomorrow morning, cleaned up tonight.'),
      L(9004, 'focus', 'The phone in the kitchen is the whole trick.'),
      L(9005, 'focus', 'A swear makes this one damn explicit for testing.', true),
    ];
    const base = { lines, schedule: {}, tasks: TASKS, chapters: ['discipline', 'focus'] as Task['chapter'][], salt: 'salt' };
    for (let i = 0; i < 12; i++) {
      const day = addDays('2026-10-07', i);
      const task = dailyTask(TASKS, base.chapters, 'salt', day)!;
      const line = lineOfDay({ ...base, day })!;
      expect(task.lines).toContain(line.no);
    }
    // An even pool (Discipline alone: two tasks) still alternates a task's two lines from one round to the next.
    const seen = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const day = addDays('2026-10-07', i);
      if (dailyTask(TASKS, ['discipline'], 'salt', day)!.id === 'disc-001') seen.add(lineOfDay({ ...base, chapters: ['discipline'], day })!.no);
    }
    expect([...seen].sort()).toEqual([9001, 9002]);
    // A pinned day wins; a task with no usable pair falls back to the global rotation.
    expect(lineOfDay({ ...base, schedule: { '2026-10-07': 9004 }, day: '2026-10-07' })!.no).toBe(9004);
    const money = lineOfDay({ ...base, chapters: ['money'], day: '2026-10-07' })!;
    expect(money.explicit).toBe(false);
  });

  it('earns 10 points per proven task, up to 4 a day; no points without a photo', () => {
    const work = dayWork(['A.', 'B.', 'C.'], TASKS[0], [{ id: 'x', text: 'D.' }]);
    let r = emptyRecord();
    r = completeTask(r, '2026-10-07', work[0], proof, 1);
    r = completeTask(r, '2026-10-07', work[1], null, 2);
    expect(pointsBalance(r, POINTS)).toBe(POINTS.perProof);
    for (const w of work) r = completeTask(r, '2026-10-07', w, proof, 3);
    expect(Object.keys(r.work['2026-10-07']).length).toBe(5);
    expect(pointsBalance(r, POINTS)).toBe(POINTS.maxPerDay * POINTS.perProof);
    // Retaking a photo keeps the first time and adds nothing.
    expect(r.work['2026-10-07'].r0.doneAt).toBe(1);
    r = uncompleteTask(r, '2026-10-07', 'r0');
    expect(pointsBalance(r, POINTS)).toBe(POINTS.maxPerDay * POINTS.perProof);
    r = uncompleteTask(r, '2026-10-07', 'r1');
    expect(pointsBalance(r, POINTS)).toBe((POINTS.maxPerDay - 1) * POINTS.perProof);
    expect(allProofs(r).length).toBe(3);
    // The server gets each day's proven count, capped like the points.
    r = completeTask(r, '2026-10-06', work[0], null, 4);
    r = completeTask(r, '2026-10-05', work[0], proof, 5);
    expect(provenCounts(r, POINTS)).toEqual([
      { day: '2026-10-05', count: 1 },
      { day: '2026-10-07', count: 3 },
    ]);
  });

  it('trades points for one code each collection', () => {
    const [ten, fifteen] = POINTS.tiers;
    const work = dayWork(['A.', 'B.', 'C.'], TASKS[0], []);
    const provenDays = (n: number) => {
      let r = emptyRecord();
      for (let i = 0; i < n; i++) for (const w of work) r = completeTask(r, addDays('2026-09-01', i), w, proof, 0);
      return r;
    };
    const perDay = POINTS.maxPerDay * POINTS.perProof;
    const daysFor10 = Math.ceil(ten.points / perDay);
    let r = provenDays(daysFor10 - 1);
    expect(tierStatus(r, POINTS, ten, '004')).toEqual({ kind: 'short', need: ten.points - (daysFor10 - 1) * perDay });
    expect(readyTier(r, POINTS, '004')).toBeNull();
    r = provenDays(daysFor10);
    expect(tierStatus(r, POINTS, ten, '004')).toEqual({ kind: 'ready' });
    r = claimCode(r, POINTS, ten, '004', '2026-10-01', { code: 'X', url: 'u' });
    expect(pointsBalance(r, POINTS)).toBe(daysFor10 * perDay - ten.points);
    expect(r.codes[0]).toMatchObject({ percent: 10, expires: '2026-10-31' });
    r = { ...r, work: provenDays(60).work };
    expect(tierStatus(r, POINTS, fifteen, '004')).toEqual({ kind: 'used' });
    expect(claimCode(r, POINTS, fifteen, '004', '2026-10-02', { code: 'Y', url: 'u' }).codes.length).toBe(1);
    expect(tierStatus(r, POINTS, fifteen, '005')).toEqual({ kind: 'ready' });
  });
});

describe('lines', () => {
  it('picks one global, clean line per day', () => {
    const a = todayLine(LIB, {}, '2026-10-07')!;
    expect(a.explicit).toBe(false);
    expect(a.text.length).toBeLessThanOrEqual(80);
    expect(todayLine(LIB, {}, '2026-10-07')!.no).toBe(a.no);
    expect(todayLine(LIB, { '2026-10-07': 59 }, '2026-10-07')!.no).toBe(59);
    // A pinned explicit line is ignored.
    expect(todayLine(LIB, { '2026-10-07': 8 }, '2026-10-07')!.explicit).toBe(false);
    const month = Array.from({ length: 30 }, (_, i) => todayLine(LIB, {}, addDays('2026-10-01', i))!.no);
    expect(new Set(month).size).toBe(30);
  });

  it('finds a line about a task, clean unless allowed', () => {
    for (let i = 0; i < 40; i++) {
      const l = lineForTask(LIB, ['training'], `s${i}`)!;
      expect(l.chapter).toBe('training');
      expect(l.explicit).toBe(false);
    }
    const any = Array.from({ length: 200 }, (_, i) => lineForTask(LIB, ['vices'], `x${i}`, true)!);
    expect(any.every(l => l.chapter === 'vices')).toBe(true);
  });

  it('marks lock-screen lines', () => {
    const lock = LIB.filter(isLockEligible);
    expect(lock.every(l => !l.explicit && l.text.length <= 60)).toBe(true);
    expect(lock.length).toBeGreaterThan(30);
  });
});

describe('reminders', () => {
  const base = { day: '2026-10-07', first: 7 * 60, last: 22 * 60, night: { enabled: true, time: 21 * 60 + 30 }, seed: 's' };

  it('puts the first reminder exactly at First and spreads the rest to Last', () => {
    for (const seed of ['s', 'a', 'b', 'c', 'd']) {
      for (let i = 0; i < 20; i++) {
        const t = dayReminderTimes({ ...base, seed, day: addDays('2026-10-07', i), count: 3 });
        expect(t.map(x => x.kind)).toEqual(['today', 'task', 'task']);
        expect(t[0].minutes).toBe(7 * 60);
        expect(Math.abs(t[1].minutes - (14 * 60 + 30))).toBeLessThanOrEqual(10);
        // The last one lands within 30 min of the 9:30 PM night check (10:00 PM counts), so it moves 45 min earlier.
        expect(t[2].minutes).toBeLessThanOrEqual(22 * 60 - 45);
        expect(t[2].minutes).toBeGreaterThanOrEqual(22 * 60 - 10 - 45);
      }
    }
  });

  it('never stacks reminders on one minute when Last is at or before First', () => {
    const off = { enabled: false, time: 0 };
    const cases = [
      { first: 23 * 60, last: 22 * 60, count: 3, night: off }, // reversed
      { first: 22 * 60 + 30, last: 22 * 60, count: 3, night: base.night }, // First moved past the default Last
      { first: 8 * 60, last: 8 * 60, count: 5, night: off }, // equal
      { first: 20 * 60, last: 4 * 60 + 30, count: 3, night: off }, // ends after 4:00 AM
    ];
    for (const c of cases) {
      const t = dayReminderTimes({ ...base, ...c });
      expect(t.length).toBe(c.count);
      expect(t[0].minutes).toBe(c.first);
      for (let i = 1; i < t.length; i++) expect(t[i].minutes).toBeGreaterThan(t[i - 1].minutes);
      // Never past the end of the day (3:59 AM).
      expect(t[t.length - 1].minutes).toBeLessThanOrEqual(28 * 60 - 1);
    }
    // A window too narrow for the count gets fewer reminders, never two in one minute.
    const narrow = dayReminderTimes({ ...base, first: 8 * 60, last: 8 * 60 + 3, count: 10, night: off });
    const mins = narrow.map(x => x.minutes);
    expect(mins[0]).toBe(480);
    expect(new Set(mins).size).toBe(mins.length);
    expect(mins.every(x => x <= 483)).toBe(true);
  });

  it('keeps a reminder moved for the night check at its own time, not stacked on the one before', () => {
    // 10 a day, 7 to 10 PM: the moved ones land among the others, so they're sorted, not pushed a minute apart.
    for (const seed of ['s', 'a', 'b', 'c', 'd']) {
      for (let i = 0; i < 20; i++) {
        const t = dayReminderTimes({ ...base, seed, day: addDays('2026-10-07', i), count: 10, first: 19 * 60 });
        expect(t[0]).toEqual({ minutes: 19 * 60, kind: 'today' });
        for (let k = 1; k < t.length; k++) expect(t[k].minutes).toBeGreaterThan(t[k - 1].minutes);
        for (let k = 2; k < t.length; k++) expect(t[k].minutes - t[k - 2].minutes).toBeGreaterThan(2);
      }
    }
  });

  it('nudges the work after the first reminder, in order through the day', () => {
    const t = dayReminderTimes({ ...base, count: 5, night: { enabled: false, time: 0 } });
    expect(t.map(x => x.kind)).toEqual(['today', 'task', 'task', 'task', 'task']);
    for (let i = 1; i < t.length; i++) expect(t[i].minutes).toBeGreaterThan(t[i - 1].minutes);
  });

  it('handles a window that ends after midnight', () => {
    const t = dayReminderTimes({ ...base, count: 3, first: 20 * 60, last: 60, night: { enabled: false, time: 0 } });
    expect(t[2].minutes).toBeLessThanOrEqual(25 * 60);
    expect(t[2].minutes).toBeGreaterThan(t[1].minutes);
  });

  const opts = {
    today: '2026-10-07',
    count: 3,
    first: 7 * 60,
    last: 22 * 60,
    night: { enabled: true, time: 21 * 60 + 30 },
    answered: new Set<string>(),
    prompts: PROMPTS,
    seed: 's',
  };

  it('stays under the pending limit and skips answered nights', () => {
    const now = new Date(2026, 9, 7, 6, 0);
    const plan = planNotifications({
      now,
      today: '2026-10-07',
      count: 10,
      first: 7 * 60,
      last: 22 * 60,
      night: { enabled: true, time: 21 * 60 + 30 },
      answered: new Set(['2026-10-07']),
      prompts: PROMPTS,
      seed: 's',
    });
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(plan.some(p => p.id === 'night-2026-10-07')).toBe(false);
    expect(plan.some(p => p.id === 'night-2026-10-08')).toBe(true);
    expect(plan.every(p => p.date > now)).toBe(true);
    for (const p of plan.filter(x => x.kind === 'task')) {
      const slot = slotOf(p.date.getHours() * 60 + p.date.getMinutes());
      expect(PROMPTS.find(x => x.text === p.prompt)?.slot).toBe(slot);
    }
  });

  it('schedules floor(60 / (count + 1)) days ahead', () => {
    expect([1, 3, 5, 10].map(c => daysAhead(c, true))).toEqual([30, 15, 10, 5]);
    const plan = planNotifications({ ...opts, now: new Date(2026, 9, 7, 6, 0), count: 1 });
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(plan.some(p => p.id === `rem-${addDays('2026-10-07', 29)}-0`)).toBe(true);
  });

  it('keeps each prompt when the plan is rebuilt, and rotates them day to day', () => {
    for (const count of [3, 10]) {
      const early = new Map(planNotifications({ ...opts, count, now: new Date(2026, 9, 7, 6, 0) }).map(p => [p.id, p.prompt]));
      const later = planNotifications({ ...opts, count, now: new Date(2026, 9, 7, 16, 0) });
      expect(later.some(p => p.day === '2026-10-07' && p.prompt)).toBe(true);
      for (const p of later) expect(p.prompt).toBe(early.get(p.id));
    }
    // Opening the app each morning: the midday nudge isn't the same text every day.
    const midday = [0, 1, 2, 3].map(i => {
      const day = addDays('2026-10-07', i);
      return planNotifications({ ...opts, today: day, now: atMinutes(day, 9 * 60) }).find(p => p.id === `rem-${day}-1`)!.prompt;
    });
    for (let i = 1; i < midday.length; i++) expect(midday[i]).not.toBe(midday[i - 1]);
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
