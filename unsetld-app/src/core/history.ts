// The record, day by day (the Record tab and a day's page): what each day holds, built from the
// proofs on record. Never from plans alone: they're kept six weeks and aren't backed up, so a
// day's size comes from `record.planned` (3.2), then its plan, then its perfect-day bonus.
// A friend's shared streak (not built) would read only `activeDays`, never these proofs.
import { activeDays, allDone, isProven, photosOf, proofMonths, type ProofEntry } from './progress';
import { computeStreak } from './streak';
import { addDays, parseDay, type DayKey } from './time';
import type { DayPlan, MissionDone, ProofPhoto, RecordState, TrackId } from './types';

/**
 * How a day reads on the calendar: nothing proven, one mission, two or more, or every mission
 * in the day's plan proven (the perfect-day bonus was paid). A 3/3 day is `perfect`; a 2/4 day
 * on Push me is `two`.
 */
export type DayLevel = 'none' | 'one' | 'two' | 'perfect';

export interface DayMark {
  day: DayKey;
  /** Day of the month, 1–31. */
  date: number;
  /** Missions proven that day. */
  proven: number;
  /** Missions the day's plan held, when it's known. */
  planned: number | null;
  level: DayLevel;
  /** A missed day an Off Day covered: the streak went through it. */
  covered: boolean;
  /** On record from before missions (2.x): shown up, no proofs to show. */
  legacy: boolean;
  when: 'past' | 'today' | 'future';
}

const provenOn = (r: RecordState, day: DayKey): MissionDone[] => Object.values(r.missions?.[day] ?? {}).filter(isProven);

/** Missions the day's plan held, when known: the record, then the plan, then a perfect day's proofs. */
export function plannedOn(r: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, day: DayKey): number | null {
  const proven = provenOn(r, day).length;
  const stored = r.planned?.[day];
  if (typeof stored === 'number' && stored > 0) return Math.max(stored, proven);
  const plan = plans[day];
  if (plan?.missions.length) return Math.max(plan.missions.length, proven);
  // The bonus is paid only when every planned mission is proven.
  if (r.bonuses?.[day]) return proven;
  return null;
}

/** A day is perfect when its bonus was paid (as Stats and Achievements count it). */
export const isPerfect = (r: RecordState, day: DayKey) => Boolean(r.bonuses?.[day]);

export function levelOf(proven: number, perfect: boolean): DayLevel {
  if (perfect && proven > 0) return 'perfect';
  return proven >= 2 ? 'two' : proven === 1 ? 'one' : 'none';
}

/** Everything the calendar needs about the record at once (the streak's covered days, 2.x days). */
export interface RecordIndex {
  active: Set<DayKey>;
  covered: Set<DayKey>;
  legacy: Set<DayKey>;
  today: DayKey;
}

export function indexRecord(r: RecordState, today: DayKey): RecordIndex {
  const active = activeDays(r);
  const covered = new Set(computeStreak(active, today).covered);
  // 2.x put a day on record without a mission; 3.x only with a proof (those are in `active`).
  const legacy = new Set(Object.keys(r.days ?? {}).filter(d => !active.has(d) && d <= today));
  return { active, covered, legacy, today };
}

export function dayMark(r: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, day: DayKey, ix: RecordIndex): DayMark {
  const when = day === ix.today ? 'today' : day > ix.today ? 'future' : 'past';
  const proven = when === 'future' ? 0 : provenOn(r, day).length;
  const legacy = proven === 0 && ix.legacy.has(day);
  return {
    day,
    date: parseDay(day).getDate(),
    proven,
    planned: when === 'future' ? null : plannedOn(r, plans, day),
    level: legacy ? 'one' : levelOf(proven, isPerfect(r, day)),
    covered: ix.covered.has(day),
    legacy,
    when,
  };
}

/** 'YYYY-MM' of a day. */
export const monthOf = (day: DayKey) => day.slice(0, 7);

/** The first day of a month ('YYYY-MM'). */
const firstOf = (month: string): DayKey => `${month}-01`;

/** The month after (n = 1) or before (n = -1) `month`. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

export interface MonthView {
  month: string;
  /** Monday-first weeks; null pads the days outside the month. */
  weeks: (DayMark | null)[][];
  /** Days with a mission proven this month, and the missions. */
  days: number;
  missions: number;
  perfect: number;
}

export function monthView(r: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, month: string, ix: RecordIndex): MonthView {
  const first = firstOf(month);
  // Monday = 0.
  const lead = (parseDay(first).getDay() + 6) % 7;
  const cells: (DayMark | null)[] = Array.from({ length: lead }, () => null);
  let days = 0;
  let missions = 0;
  let perfect = 0;
  for (let d = first; monthOf(d) === month; d = addDays(d, 1)) {
    const mark = dayMark(r, plans, d, ix);
    cells.push(mark);
    if (mark.proven > 0) days += 1;
    missions += mark.proven;
    if (mark.level === 'perfect') perfect += 1;
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (DayMark | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { month, weeks, days, missions, perfect };
}

/** The months the record spans, oldest first: from the first day on record (or this month) to this one. */
export function recordMonths(r: RecordState, today: DayKey): string[] {
  const ix = indexRecord(r, today);
  const firsts = [...ix.active, ...ix.legacy].sort();
  const now = monthOf(today);
  let m = firsts.length ? monthOf(firsts[0]) : now;
  if (m > now) m = now;
  const out: string[] = [];
  for (; m <= now; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

/** The days from `monday` for a week (Day 1's empty row, the completion strip). */
export function weekMarks(r: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, monday: DayKey, ix: RecordIndex): DayMark[] {
  return Array.from({ length: 7 }, (_, i) => dayMark(r, plans, addDays(monday, i), ix));
}

/** "Day 12": the day's place among the days with a mission proven (null if none was). */
export function dayNumberOf(r: RecordState, day: DayKey): number | null {
  const active = activeDays(r);
  if (!active.has(day)) return null;
  return [...active].filter(d => d <= day).length;
}

export interface RecordSummary {
  /** Days with a mission proven. */
  days: number;
  missions: number;
  perfect: number;
}

export function recordSummary(r: RecordState): RecordSummary {
  const done = allDone(r).filter(isProven);
  return { days: activeDays(r).size, missions: done.length, perfect: Object.keys(r.bonuses ?? {}).filter(d => (r.bonuses[d] ?? 0) > 0).length };
}

/** The newest proofs, newest first (the Record's recent proof row). */
export function recentProofs(r: RecordState, count: number): ProofEntry[] {
  return proofMonths(r)
    .flatMap(m => m.entries)
    .slice(0, count);
}

export interface DayProof {
  missionId: string;
  /** As proven (3.2 keeps it); older entries look it up by id. */
  title?: string;
  track: TrackId;
  points: number;
  doneAt: number;
  photos: ProofPhoto[];
  /** The after photo of a pair, else the only one; its uri is '' once retention cleared it. */
  cover: ProofPhoto | null;
  timerSeconds: number;
}

export interface LegacyTask {
  text: string;
  doneAt: number;
  /** '' when the photo is gone; null when there never was one. */
  uri: string | null;
}

export interface DayDetail {
  day: DayKey;
  /** "Day 12" (null for a day with nothing proven). */
  number: number | null;
  /** Proven, in the order they were proven. */
  proven: DayProof[];
  /** Missions the plan held that weren't proven, while the plan is still kept. */
  open: string[];
  planned: number | null;
  perfect: boolean;
  level: DayLevel;
  /** Points from the missions. */
  points: number;
  /** The perfect-day bonus (0 if none). */
  bonus: number;
  total: number;
  /** 2.x tasks on this day. */
  legacy: LegacyTask[];
}

export function dayDetail(r: RecordState, plans: Readonly<Record<DayKey, DayPlan>>, day: DayKey): DayDetail {
  const proven = provenOn(r, day)
    .slice()
    .sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0))
    .map((m): DayProof => {
      const photos = photosOf(m);
      return {
        missionId: m.missionId,
        title: m.title,
        track: m.track,
        points: typeof m.points === 'number' && Number.isFinite(m.points) ? m.points : 0,
        doneAt: m.doneAt ?? 0,
        photos,
        cover: photos.find(p => p.kind !== 'before') ?? photos[0] ?? null,
        timerSeconds: typeof m.timerSeconds === 'number' && m.timerSeconds > 0 ? m.timerSeconds : 0,
      };
    });
  const ids = new Set(proven.map(p => p.missionId));
  const open = (plans[day]?.missions ?? []).map(p => p.missionId).filter(id => !ids.has(id));
  const perfect = isPerfect(r, day);
  const bonus = perfect ? (r.bonuses[day] ?? 0) : 0;
  const points = proven.reduce((t, p) => t + p.points, 0);
  const legacy = Object.values(r.work?.[day] ?? {}).flatMap((t): LegacyTask[] =>
    t && typeof t === 'object' ? [{ text: String(t.text ?? ''), doneAt: t.doneAt ?? 0, uri: t.proof ? (t.proof.uri ?? '') : null }] : [],
  );
  return {
    day,
    number: dayNumberOf(r, day),
    proven,
    open,
    planned: plannedOn(r, plans, day),
    perfect,
    level: levelOf(proven.length, perfect),
    points,
    bonus,
    total: points + bonus,
    legacy,
  };
}
