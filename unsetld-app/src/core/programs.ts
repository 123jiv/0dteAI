// Programs ("Plans" in the app): a curated run of missions over several days (7 Day Lock In, School Reset ...).
// A program day moves on once a mission from it is proven, so a missed day doesn't fail the program.
import type { DayKey } from './time';
import type { DayPlan, Program, ProgramState } from './types';

export function startProgram(id: string, today: DayKey): ProgramState {
  return { id, startedDay: today, doneDays: [], finishedDay: null };
}

/** The program day to show today (1-based), or null once it's finished. */
export function programDay(p: Program, s: ProgramState, today: DayKey): number | null {
  if (s.finishedDay) return null;
  const idx = s.doneDays.indexOf(today);
  const n = idx >= 0 ? idx + 1 : s.doneDays.filter(d => d < today).length + 1;
  return n <= p.days ? n : null;
}

/** Missions the program puts in today's plan. */
export function programMissions(p: Program, s: ProgramState, today: DayKey): string[] {
  const n = programDay(p, s, today);
  return n ? p.plan[n - 1] ?? [] : [];
}

/** A program mission was proven today. */
export function programProgress(p: Program, s: ProgramState, today: DayKey): ProgramState {
  if (s.finishedDay || s.doneDays.includes(today)) return s;
  const doneDays = [...s.doneDays, today];
  return { ...s, doneDays, finishedDay: doneDays.length >= p.days ? today : null };
}

/**
 * Every day proven. Also true without a finish date (a state from an earlier build, or a
 * program that got shorter), so the run shows as finished rather than as a day that isn't there.
 */
export function programFinished(p: Program, s: ProgramState): boolean {
  return Boolean(s.finishedDay) || s.doneDays.length >= p.days;
}

/**
 * Why the running program shows tomorrow's missions instead of today's: today's day is
 * already proven, today's plan was set without it (started late), or its missions were swapped out.
 */
export type ProgramWait = 'proven' | 'set' | 'swapped';

/** What the running program shows: one program day's missions, today or tomorrow. */
export interface ProgramDayView {
  /** The program day the missions belong to (1-based). */
  day: number;
  when: 'today' | 'tomorrow';
  ids: string[];
  /** Set when `when` is tomorrow. */
  wait: ProgramWait | null;
}

/**
 * The missions the running program shows on Plans. Today's, while today's plan holds them (only
 * the ones in the plan or swapped out of it: a morning mission planned after noon or a school-day
 * one at the weekend is left out of the day, and proving one of the others still moves it on).
 * Tomorrow's once today's day is proven, or when today's plan was set without the program.
 * Null when the program is finished.
 */
export function programDayView(p: Program, s: ProgramState, today: DayKey, plan: Pick<DayPlan, 'missions' | 'replaced'> | undefined): ProgramDayView | null {
  if (programFinished(p, s)) return null;
  const n = programDay(p, s, today);
  if (n === null) return null;
  if (s.doneDays.includes(today)) return { day: n + 1, when: 'tomorrow', ids: p.plan[n] ?? [], wait: 'proven' };
  const ids = p.plan[n - 1] ?? [];
  if (!plan) return { day: n, when: 'today', ids, wait: null };
  if (plan.missions.some(m => m.programId === p.id)) {
    const shown = ids.filter(id => plan.missions.some(m => m.missionId === id) || plan.replaced.includes(id));
    return { day: n, when: 'today', ids: shown, wait: null };
  }
  return { day: n, when: 'tomorrow', ids, wait: ids.some(id => plan.replaced.includes(id)) ? 'swapped' : 'set' };
}
