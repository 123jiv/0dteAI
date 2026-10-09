// What's left of 2.x points (tasks proven with a photo, traded for codes), kept only
// to carry an old balance into 3.0 and to sync the days an account already proved.
import type { DayKey } from './time';
import type { RecordState } from './types';

/** 2.x rules: 10 points a proven task, at most 4 a day. */
const PER_PROOF = 10;
const MAX_PER_DAY = 4;

function provenTasks(r: RecordState, day: DayKey): number {
  return Math.min(MAX_PER_DAY, Object.values(r.work?.[day] ?? {}).filter(d => d.proof).length);
}

/** The 2.x balance: proven tasks' points minus the codes already taken. */
export function legacyBalance(r: RecordState): number {
  const earned = Object.keys(r.work ?? {}).reduce((t, d) => t + provenTasks(r, d) * PER_PROOF, 0);
  const spent = (r.codes ?? []).reduce((t, c) => t + c.points, 0);
  return Math.max(0, earned - spent);
}

/**
 * Proofs per day for an account sync: 3.0 days count proven missions and their
 * points (with the perfect-day bonus); 2.x days count proven tasks.
 */
export function proofsByDay(r: RecordState): { day: DayKey; count: number; points?: number }[] {
  const out = new Map<DayKey, { day: DayKey; count: number; points?: number }>();
  for (const day of Object.keys(r.work ?? {})) {
    const count = provenTasks(r, day);
    if (count) out.set(day, { day, count });
  }
  for (const [day, byId] of Object.entries(r.missions ?? {})) {
    const proven = Object.values(byId ?? {}).filter(m => m?.verification?.status === 'accepted');
    if (!proven.length) continue;
    const points = proven.reduce((t, m) => t + m.points, 0) + (r.bonuses?.[day] ?? 0);
    const prev = out.get(day);
    out.set(day, { day, count: (prev?.count ?? 0) + proven.length, points });
  }
  return [...out.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}
