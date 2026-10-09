// Programs: a curated run of missions over several days (7 Day Lock In, School Reset ...).
// A program day moves on once a mission from it is proven, so a missed day doesn't fail the program.
import type { DayKey } from './time';
import type { Program, ProgramState } from './types';

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
