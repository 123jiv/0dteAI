// Lines: today's global line, and the pools reminders and widgets pick from.
import { hash32, seededShuffle } from './random';
import { dayNumber, type DayKey } from './time';
import type { Line } from './types';

/** Original lines over this length never become today's line. */
export const TODAY_MAX_CHARS = 80;
/** Lock-screen widget limit. */
export const LOCK_MAX_CHARS = 60;

/** Attributed quotes ship only once checked against the source. */
export function isShippable(l: Line): boolean {
  return !l.attribution || l.verified === true;
}

export function isClean(l: Line): boolean {
  return !l.explicit && isShippable(l);
}

/** Clean and short enough for the lock screen. */
export function isLockEligible(l: Line): boolean {
  return isClean(l) && !l.attribution && l.text.length <= LOCK_MAX_CHARS;
}

/** Candidates for today's line: clean originals of 80 characters or fewer, by number. */
export function todayCandidates(lines: readonly Line[]): Line[] {
  return lines
    .filter(l => isClean(l) && !l.attribution && l.text.length <= TODAY_MAX_CHARS)
    .sort((a, b) => a.no - b.no);
}

/**
 * Today's line is global: the same No. for everyone on a given day, like a
 * daily drop. schedule.json can pin a day; otherwise it walks a fixed
 * permutation so no line repeats until all have run.
 */
export function todayLine(lines: readonly Line[], schedule: Record<string, number>, day: DayKey): Line | null {
  const pinned = schedule[day];
  if (pinned) {
    const l = lines.find(x => x.no === pinned);
    if (l && isClean(l)) return l;
  }
  const pool = todayCandidates(lines);
  if (!pool.length) return null;
  // One fixed order, walked a day at a time: any n consecutive days show n different lines.
  const n = pool.length;
  const perm = seededShuffle(pool, `unsetld:today:${n}`);
  return perm[((dayNumber(day) % n) + n) % n];
}

/**
 * A line to go with a task: from the task's chapter (or the user's mix for
 * their own rules), clean unless the screen is in the app and Strong language is on.
 */
export function lineForTask(
  lines: readonly Line[],
  chapters: readonly string[],
  seed: string,
  allowExplicit = false,
  maxChars = 90,
): Line | null {
  const set = new Set(chapters);
  const pool = lines.filter(
    l => set.has(l.chapter) && isShippable(l) && (allowExplicit || !l.explicit) && !l.attribution && l.text.length <= maxChars,
  );
  return pickFor(pool, seed);
}

/** Stable pick for a slot (reminder or widget entry) from a pool. */
export function pickFor<T>(pool: readonly T[], seed: string): T | null {
  if (!pool.length) return null;
  return pool[hash32(seed) % pool.length];
}
