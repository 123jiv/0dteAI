import { describe, expect, it } from 'vitest';
import programsJson from '../../content/programs.json';
import { emptyRecord } from '../record';
import { finishOf, planMomentKey, programDayView, programFinished, programProgress, recordPlanFinish, startProgram } from '../programs';
import type { DayPlan, PlannedMission, Program, ProgramState } from '../types';

const p: Program = { id: 'lock', title: '7 Day Lock In', short: '', days: 3, tracks: ['discipline'], free: true, plan: [['a', 'b'], ['c'], ['d']] };
const DAY = '2026-10-14';

const planned = (missionId: string, programId?: string): PlannedMission => ({ slot: 'main', missionId, ...(programId ? { programId } : {}) });
const planOf = (missions: PlannedMission[], replaced: string[] = []): Pick<DayPlan, 'missions' | 'replaced'> => ({ missions, replaced });

describe('programFinished', () => {
  it('is finished with a finish date, or once every day is proven without one', () => {
    let s: ProgramState = startProgram('lock', '2026-10-01');
    expect(programFinished(p, s)).toBe(false);
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) s = programProgress(p, s, d);
    expect(s.finishedDay).toBe('2026-10-03');
    expect(programFinished(p, s)).toBe(true);
    // An earlier build's state: every day proven, no finish date.
    expect(programFinished(p, { ...s, finishedDay: null })).toBe(true);
    expect(programFinished(p, { ...s, doneDays: ['2026-10-01'], finishedDay: null })).toBe(false);
  });
});

describe('programDayView', () => {
  const s = startProgram('lock', DAY);

  it("shows today's day while today has no plan yet", () => {
    expect(programDayView(p, s, DAY, undefined)).toEqual({ day: 1, when: 'today', ids: ['a', 'b'], wait: null });
  });

  it("shows today's day when today's plan holds it, leaving out a mission the plan left out", () => {
    const plan = planOf([planned('a', 'lock'), planned('x'), planned('y')]);
    expect(programDayView(p, s, DAY, plan)).toEqual({ day: 1, when: 'today', ids: ['a'], wait: null });
  });

  it('keeps a program mission that was swapped out, while another one is still in the day', () => {
    const plan = planOf([planned('a', 'lock'), planned('z'), planned('y')], ['b']);
    expect(programDayView(p, s, DAY, plan)?.ids).toEqual(['a', 'b']);
  });

  it("moves to tomorrow when today's plan was set without the program", () => {
    const plan = planOf([planned('x'), planned('y'), planned('z')]);
    expect(programDayView(p, s, DAY, plan)).toEqual({ day: 1, when: 'tomorrow', ids: ['a', 'b'], wait: 'set' });
  });

  it('a mission the planner picked on its own, without the program, does not count as the program day', () => {
    const plan = planOf([planned('a'), planned('y'), planned('z')]);
    expect(programDayView(p, s, DAY, plan)?.wait).toBe('set');
  });

  it('moves to tomorrow when every program mission was swapped out', () => {
    const plan = planOf([planned('x'), planned('y'), planned('z')], ['a', 'b']);
    expect(programDayView(p, s, DAY, plan)).toEqual({ day: 1, when: 'tomorrow', ids: ['a', 'b'], wait: 'swapped' });
  });

  it("shows the next day once today's day is proven", () => {
    const done = programProgress(p, s, DAY);
    const plan = planOf([planned('a', 'lock'), planned('x'), planned('y')]);
    expect(programDayView(p, done, DAY, plan)).toEqual({ day: 2, when: 'tomorrow', ids: ['c'], wait: 'proven' });
    // The next morning, day 2 is today's.
    expect(programDayView(p, done, '2026-10-15', undefined)).toEqual({ day: 2, when: 'today', ids: ['c'], wait: null });
  });

  it('a missed day just waits: the same day comes back', () => {
    const done = programProgress(p, s, DAY);
    expect(programDayView(p, done, '2026-10-18', undefined)?.day).toBe(2);
  });

  it('shows nothing once the program is finished', () => {
    let st = s;
    for (const d of ['2026-10-14', '2026-10-15', '2026-10-16']) st = programProgress(p, st, d);
    expect(programDayView(p, st, '2026-10-16', undefined)).toBeNull();
    expect(programDayView(p, { ...st, finishedDay: null }, '2026-10-17', undefined)).toBeNull();
  });

  it('every program in the library has a view on each of its days', () => {
    for (const prog of programsJson as Program[]) {
      let st = startProgram(prog.id, '2026-10-01');
      for (let i = 0; i < prog.days; i++) {
        const d = `2026-10-${String(i + 1).padStart(2, '0')}`;
        expect(programDayView(prog, st, d, undefined)).toEqual({ day: i + 1, when: 'today', ids: prog.plan[i], wait: null });
        st = programProgress(prog, st, d);
      }
      expect(programFinished(prog, st)).toBe(true);
    }
  });
});

describe('recordPlanFinish', () => {
  it('notes each finish once, oldest first, and never removes one', () => {
    const r0 = emptyRecord();
    expect(r0.plansFinished).toBeUndefined();
    const r1 = recordPlanFinish(r0, 'lock-in-7', '2026-10-02');
    expect(r1.plansFinished).toEqual([{ id: 'lock-in-7', finished: '2026-10-02' }]);
    expect(r0.plansFinished).toBeUndefined();
    // The same finish again: the record as it was (the same object).
    expect(recordPlanFinish(r1, 'lock-in-7', '2026-10-02')).toBe(r1);
    // The same plan finished again later, and another plan: both added after it.
    const r2 = recordPlanFinish(recordPlanFinish(r1, 'lock-in-7', '2026-10-20'), 'get-organized', '2026-10-25');
    expect(r2.plansFinished).toEqual([
      { id: 'lock-in-7', finished: '2026-10-02' },
      { id: 'lock-in-7', finished: '2026-10-20' },
      { id: 'get-organized', finished: '2026-10-25' },
    ]);
    expect(recordPlanFinish(r2, 'get-organized', '2026-10-25')).toBe(r2);
    // Everything else on the record stays.
    expect({ ...r2, plansFinished: undefined }).toEqual({ ...r0, plansFinished: undefined });
  });

  it('a damaged list is read as none', () => {
    const r = { ...emptyRecord(), plansFinished: null as never };
    expect(recordPlanFinish(r, 'lock', DAY).plansFinished).toEqual([{ id: 'lock', finished: DAY }]);
  });

  it('the moment key and the finish a saved state stands for', () => {
    expect(planMomentKey('lock-in-7', '2026-10-02')).toBe('plan:lock-in-7:2026-10-02');
    let s: ProgramState = startProgram('lock', '2026-10-01');
    expect(finishOf(p, s)).toBeNull();
    for (const d of ['2026-10-01', '2026-10-03', '2026-10-02']) s = { ...s, doneDays: [...s.doneDays, d] };
    expect(finishOf(p, s)).toBe('2026-10-03');
    expect(finishOf(p, { ...s, finishedDay: '2026-10-04' })).toBe('2026-10-04');
    expect(finishOf(p, { ...s, doneDays: ['2026-10-01'] })).toBeNull();
    // A plan the library no longer has: only a finish day says it finished.
    expect(finishOf(undefined, s)).toBeNull();
    expect(finishOf(undefined, { ...s, finishedDay: '2026-10-04' })).toBe('2026-10-04');
  });
});
