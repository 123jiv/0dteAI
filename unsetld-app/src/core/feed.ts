// What the reader shows: today's global line, then the day's mix.
import { hash32, seededShuffle } from './random';
import { dayNumber, diffDays, type DayKey } from './time';
import type { ChapterId, Line, YourLine } from './types';

/** Original lines over this length never become today's line. */
export const TODAY_MAX_CHARS = 80;
/** Lock-screen widget limit. */
export const LOCK_MAX_CHARS = 60;
/** Free tier: counted pages per day before the end card. */
export const FREE_DAILY_LINES = 10;
/** Explicit lines stay out of a user's first lines. */
export const EXPLICIT_AFTER_SEEN = 10;

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

export interface FeedOptions {
  lines: readonly Line[];
  chapters: readonly ChapterId[];
  today: DayKey;
  salt: string;
  /** Line no → the last day it was seen. */
  seen: Record<number, DayKey>;
  hidden: ReadonlySet<number>;
  strongLanguage: boolean;
  lifetimeSeen: number;
  /** Already shown above the mix (today's line). */
  exclude?: ReadonlySet<number>;
  /** Chapter of the page just before the mix, to avoid repeating it. */
  prevChapter?: ChapterId | null;
}

/** Lines not seen within `days`, ignoring today (so the day's feed is stable). */
function freshWithin(pool: Line[], seen: Record<number, DayKey>, today: DayKey, days: number): Line[] {
  return pool.filter(l => {
    const s = seen[l.no];
    return !s || s >= today || diffDays(s, today) >= days;
  });
}

export function feedPool(o: FeedOptions): Line[] {
  const chapters = new Set(o.chapters);
  const allowExplicit = o.strongLanguage && o.lifetimeSeen >= EXPLICIT_AFTER_SEEN;
  const pool = o.lines.filter(
    l =>
      chapters.has(l.chapter) &&
      isShippable(l) &&
      !o.hidden.has(l.no) &&
      !o.exclude?.has(l.no) &&
      (allowExplicit || !l.explicit),
  );
  for (const days of [30, 7]) {
    const fresh = freshWithin(pool, o.seen, o.today, days);
    if (fresh.length >= 15) return fresh;
  }
  return pool;
}

/**
 * The day's mix: a deterministic shuffle (install salt + day), arranged so
 * explicit lines sit at least 4 positions apart and the same chapter doesn't
 * appear twice in a row when the mix has two or more chapters.
 */
export function buildMix(o: FeedOptions): Line[] {
  const pool = feedPool(o);
  const shuffled = seededShuffle(
    pool.slice().sort((a, b) => a.no - b.no),
    `${o.salt}:mix:${o.today}`,
  );
  const multiChapter = new Set(pool.map(l => l.chapter)).size >= 2;
  const out: Line[] = [];
  let lastExplicitAt = -Infinity;
  let prevChapter = o.prevChapter ?? null;
  const remaining = shuffled;
  while (remaining.length) {
    const explicitOk = (l: Line) => !l.explicit || out.length - lastExplicitAt >= 4;
    const chapterOk = (l: Line) => !multiChapter || l.chapter !== prevChapter;
    let idx = remaining.findIndex(l => explicitOk(l) && chapterOk(l));
    if (idx < 0) idx = remaining.findIndex(explicitOk);
    if (idx < 0) break; // only explicit lines left and none can be placed yet: leave them for another day
    const [pick] = remaining.splice(idx, 1);
    if (pick.explicit) lastExplicitAt = out.length;
    out.push(pick);
    prevChapter = pick.chapter;
  }
  return out;
}

export type Page =
  | { kind: 'line'; key: string; line: Line; counted: boolean; today?: boolean }
  | { kind: 'yours'; key: string; line: YourLine }
  | { kind: 'night'; key: string }
  | { kind: 'end'; key: string }
  | { kind: 'access-intro'; key: string }
  | { kind: 'volume'; key: string; volume: number }
  | { kind: 'exhausted'; key: string };

export interface PagesOptions {
  today: Line | null;
  mix: Line[];
  yourLines: YourLine[];
  premium: boolean;
  night: boolean;
  oneTime: 'access-intro' | { volume: number } | null;
  /** Free tier: library lines already counted today. */
  countedToday: ReadonlySet<number>;
  /** Start the pager on this line (deep link). */
  startLine?: Line | null;
  salt: string;
  day: DayKey;
}

/**
 * The reader's pages, in the spec's order: night check, today's line, one
 * one-time page, the mix (your lines every 5th page), then the end card
 * (free) or the library-exhausted page (Full Edition).
 */
export function buildPages(o: PagesOptions): Page[] {
  const pages: Page[] = [];
  if (o.night) pages.push({ kind: 'night', key: 'night' });

  const lines: Line[] = [];
  if (o.startLine) lines.push(o.startLine);
  if (o.today && o.today.no !== o.startLine?.no) lines.push(o.today);
  for (const l of o.mix) if (!lines.some(x => x.no === l.no)) lines.push(l);

  // Free: 10 counted lines a day. Lines already counted today always stay, so the list is stable while reading.
  let budget = FREE_DAILY_LINES - o.countedToday.size;
  const visible: Line[] = [];
  for (const l of lines) {
    if (o.premium || o.countedToday.has(l.no)) visible.push(l);
    else if (budget > 0) {
      visible.push(l);
      budget--;
    }
  }

  const yours = o.premium && o.yourLines.length ? seededShuffle(o.yourLines, `${o.salt}:yours:${o.day}`) : [];
  let yi = 0;
  let lineCount = 0;
  visible.forEach((l, i) => {
    pages.push({ kind: 'line', key: `l${l.no}`, line: l, counted: true, today: l.no === o.today?.no });
    lineCount++;
    if (i === 0 && o.oneTime) {
      pages.push(
        o.oneTime === 'access-intro'
          ? { kind: 'access-intro', key: 'access-intro' }
          : { kind: 'volume', key: `volume${o.oneTime.volume}`, volume: o.oneTime.volume },
      );
    }
    if (yours.length && lineCount % 4 === 0) {
      const y = yours[yi % yours.length];
      pages.push({ kind: 'yours', key: `y${y.id}-${yi}`, line: y });
      yi++;
    }
  });
  pages.push(o.premium ? { kind: 'exhausted', key: 'exhausted' } : { kind: 'end', key: 'end' });
  return pages;
}

/** Stable pick for a slot (reminder or widget entry) from a pool. */
export function pickFor<T>(pool: readonly T[], seed: string): T | null {
  if (!pool.length) return null;
  return pool[hash32(seed) % pool.length];
}
