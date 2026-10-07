import { seededShuffle } from './random';
import { dayNumber, type DayKey } from './time';
import type { CustomLine, LaneId, Line, Tone } from './types';

export interface PoolOptions {
  lanes: LaneId[];
  tone: Tone;
  /** Force clean lines only (lock screen, reminders, App Store screenshots). */
  cleanOnly?: boolean;
  custom?: CustomLine[];
}

export function customToLine(c: CustomLine): Line {
  return { id: c.id, lane: 'custom', text: c.text, tone: 'clean' };
}

/** Lines the user can be shown, in a stable order. */
export function buildPool(all: readonly Line[], opts: PoolOptions): Line[] {
  const lanes = new Set<string>(opts.lanes);
  const allowUnfiltered = opts.tone === 'unfiltered' && !opts.cleanOnly;
  const pool = all.filter(l => lanes.has(l.lane) && (allowUnfiltered || l.tone === 'clean'));
  const custom = (opts.custom ?? []).map(customToLine);
  return [...pool, ...custom].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Today's line. Walks a seeded permutation of the pool one step per day, so no
 * line repeats until the whole pool has been shown, then reshuffles.
 */
export function dailyLine(pool: readonly Line[], salt: string, day: DayKey): Line | null {
  const n = pool.length;
  if (n === 0) return null;
  const dn = dayNumber(day);
  const cycle = Math.floor(dn / n);
  const idx = ((dn % n) + n) % n;
  const perm = seededShuffle(pool, `${salt}:cycle:${cycle}:${n}`);
  return perm[idx];
}

/** The swipe feed for a day: today's line first, then a fresh daily shuffle. */
export function feedFor(pool: readonly Line[], salt: string, day: DayKey, count = 60): Line[] {
  const today = dailyLine(pool, salt, day);
  if (!today) return [];
  const rest = seededShuffle(
    pool.filter(l => l.id !== today.id),
    `${salt}:feed:${day}`,
  );
  return [today, ...rest].slice(0, Math.max(1, count));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
