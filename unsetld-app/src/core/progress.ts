// Progress beyond points: a level per track, totals, milestones and the week.
import { computeStreak } from './streak';
import { addDays, type DayKey } from './time';
import type { DayPlan, MissionDone, ProofPhoto, RecordState, TrackId } from './types';

export const TRACK_IDS: readonly TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'business', 'skills', 'projects', 'organization'];
const KNOWN_TRACKS: ReadonlySet<string> = new Set(TRACK_IDS);

/** Points a track needs to reach a level: L2 50, L3 150, L4 300, L5 500 ... */
export function levelStart(level: number): number {
  return (50 * (level - 1) * level) / 2;
}

export function levelFor(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  while (levelStart(level + 1) <= xp) level += 1;
  const start = levelStart(level);
  return { level, into: xp - start, span: levelStart(level + 1) - start };
}

/**
 * Accepted proof. Old or damaged entries (no verification, or no entry at all)
 * count as not proven rather than crashing what reads them.
 */
export function isProven(m: MissionDone | null | undefined): m is MissionDone {
  return m?.verification?.status === 'accepted';
}

/** A proof's photos; [] for entries saved without them. */
export function photosOf(m: MissionDone | null | undefined): ProofPhoto[] {
  const photos = m?.photos;
  return Array.isArray(photos) ? photos : [];
}

/** Points as stored, or 0 when an entry has none. */
const pointsOf = (m: MissionDone) => (typeof m.points === 'number' && Number.isFinite(m.points) ? m.points : 0);

/** Every mission on record (proven or not), oldest first. Missing or empty entries are skipped. */
export function allDone(r: RecordState): (MissionDone & { day: DayKey })[] {
  const missions = r.missions ?? {};
  return Object.keys(missions)
    .sort()
    .flatMap(day => Object.values(missions[day] ?? {}).flatMap(m => (m && typeof m === 'object' ? [{ ...m, day }] : [])))
    .sort((a, b) => (a.day === b.day ? (a.doneAt ?? 0) - (b.doneAt ?? 0) : a.day < b.day ? -1 : 1));
}

/** Days with at least one proven mission that earned points. */
export function activeDays(r: RecordState): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const [day, byId] of Object.entries(r.missions ?? {})) {
    if (Object.values(byId ?? {}).some(isProven)) out.add(day);
  }
  return out;
}

export interface TrackProgress {
  track: TrackId;
  xp: number;
  missions: number;
  level: number;
  into: number;
  span: number;
}

export function trackProgress(r: RecordState): Record<TrackId, TrackProgress> {
  const out = Object.fromEntries(TRACK_IDS.map(t => [t, { track: t, xp: 0, missions: 0, level: 1, into: 0, span: 50 }])) as Record<TrackId, TrackProgress>;
  for (const m of allDone(r)) {
    // A track that no longer exists (or an entry without one) adds to no level.
    if (!isProven(m) || !KNOWN_TRACKS.has(m.track)) continue;
    out[m.track].xp += pointsOf(m);
    out[m.track].missions += 1;
  }
  for (const t of TRACK_IDS) Object.assign(out[t], levelFor(out[t].xp));
  return out;
}

export interface Totals {
  missions: number;
  points: number;
  focusMinutes: number;
  perfectDays: number;
  activeDays: number;
}

export function totals(r: RecordState): Totals {
  const done = allDone(r).filter(isProven);
  return {
    missions: done.length,
    points: done.reduce((t, m) => t + pointsOf(m), 0) + Object.values(r.bonuses ?? {}).reduce((t, b) => t + (typeof b === 'number' ? b : 0), 0),
    focusMinutes: Math.floor(done.reduce((t, m) => t + (typeof m.timerSeconds === 'number' ? m.timerSeconds : 0), 0) / 60),
    perfectDays: Object.keys(r.bonuses ?? {}).length,
    activeDays: activeDays(r).size,
  };
}

export type MilestoneKey = 'first-mission' | 'missions-10' | 'streak-7' | 'missions-30' | 'perfect-day' | 'missions-100' | 'streak-30';

export interface MilestoneDef {
  key: MilestoneKey;
  title: string;
  kind: 'missions' | 'streak' | 'perfect';
  target: number;
}

export const MILESTONES_30: readonly MilestoneDef[] = [
  { key: 'first-mission', title: 'First mission', kind: 'missions', target: 1 },
  { key: 'missions-10', title: 'First 10 missions', kind: 'missions', target: 10 },
  { key: 'perfect-day', title: 'First perfect day', kind: 'perfect', target: 1 },
  { key: 'streak-7', title: '7 days', kind: 'streak', target: 7 },
  { key: 'missions-30', title: '30 missions', kind: 'missions', target: 30 },
  { key: 'missions-100', title: '100 missions', kind: 'missions', target: 100 },
  { key: 'streak-30', title: '30-day streak', kind: 'streak', target: 30 },
];

export interface MilestoneState extends MilestoneDef {
  /** Day it was reached, or null. */
  reached: DayKey | null;
  progress: number;
}

/** Milestones with the day each was reached, found by replaying the record. */
export function milestones(r: RecordState, today: DayKey): MilestoneState[] {
  const done = allDone(r).filter(isProven);
  const reachedMissions = (n: number) => (done.length >= n ? done[n - 1].day : null);
  const perfectDays = Object.keys(r.bonuses ?? {}).sort();
  const active = [...activeDays(r)].sort();
  const streakReached = (n: number): DayKey | null => {
    const seen = new Set<DayKey>();
    for (const d of active) {
      seen.add(d);
      if (computeStreak(seen, d).current >= n) return d;
    }
    return null;
  };
  const longest = computeStreak(new Set(active), today).longest;
  return MILESTONES_30.map(m => {
    if (m.kind === 'missions') return { ...m, reached: reachedMissions(m.target), progress: Math.min(done.length, m.target) };
    if (m.kind === 'perfect') return { ...m, reached: perfectDays[m.target - 1] ?? null, progress: Math.min(perfectDays.length, m.target) };
    return { ...m, reached: streakReached(m.target), progress: Math.min(longest, m.target) };
  });
}

/** Missions proven out of missions planned, for the days from `from` to `to`. */
export function completion(r: RecordState, plans: Record<DayKey, DayPlan>, from: DayKey, to: DayKey): { done: number; planned: number } {
  let done = 0;
  let planned = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const plan = plans[d];
    const byId = r.missions?.[d] ?? {};
    if (plan) planned += plan.missions.length;
    done += Object.values(byId).filter(isProven).length;
  }
  return { done, planned: Math.max(planned, done) };
}

// ---------------------------------------------------------------------------------------------
// 3.1 Progress (docs/UX_REDESIGN.md §7–8): what the Progress tab, Achievements, Stats and Proof
// history show. Built on the functions above; none of them change.

/**
 * How a day of the week reads on Progress: proven (a mission proven), covered (an Off Day kept
 * the streak), missed, today (nothing proven yet), today-proven, ahead (later this week) and
 * before (before the first day anything was proven: nothing to have missed yet).
 */
export type WeekDayKind = 'proven' | 'covered' | 'missed' | 'today' | 'today-proven' | 'ahead' | 'before';

export interface WeekDay {
  day: DayKey;
  kind: WeekDayKind;
}

/** The seven days from `monday`, each with how it reads. `covered`: days an Off Day covered (computeStreak). */
export function weekDays(active: ReadonlySet<DayKey>, covered: readonly DayKey[], today: DayKey, monday: DayKey): WeekDay[] {
  const first = [...active].sort()[0] ?? null;
  const off = new Set(covered);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    let kind: WeekDayKind;
    if (day === today) kind = active.has(day) ? 'today-proven' : 'today';
    else if (day > today) kind = 'ahead';
    else if (active.has(day)) kind = 'proven';
    else if (off.has(day)) kind = 'covered';
    else kind = first && day > first ? 'missed' : 'before';
    return { day, kind };
  });
}

export interface AreaProgress extends TrackProgress {
  /** Time put in: the focus timer's seconds where it ran, else the mission's minutes. */
  seconds: number;
}

/**
 * Levels (trackProgress: XP is mission points, no second currency) with the time put into each
 * area. `minutesOf` gives a mission's minutes (retired ones included); a mission no longer in the
 * library and without a timer adds no time.
 */
export function areaProgress(r: RecordState, minutesOf: (missionId: string) => number | undefined): Record<TrackId, AreaProgress> {
  const levels = trackProgress(r);
  const out = Object.fromEntries(TRACK_IDS.map(t => [t, { ...levels[t], seconds: 0 }])) as Record<TrackId, AreaProgress>;
  for (const m of allDone(r)) {
    if (!isProven(m) || !KNOWN_TRACKS.has(m.track)) continue;
    const timer = typeof m.timerSeconds === 'number' && Number.isFinite(m.timerSeconds) && m.timerSeconds > 0 ? m.timerSeconds : 0;
    const minutes = minutesOf(m.missionId);
    out[m.track].seconds += timer || (typeof minutes === 'number' && minutes > 0 ? minutes * 60 : 0);
  }
  return out;
}

/**
 * The areas Progress shows, in order: the ones the user chose that can get missions (in their
 * order), then any other area with points, most points first. An area the user chose but can't
 * get missions in (School for someone not in school) shows only once it has points.
 */
export function areasShown(chosen: readonly TrackId[], usable: readonly TrackId[], levels: Record<TrackId, Pick<TrackProgress, 'xp'>>): TrackId[] {
  const known = (t: TrackId) => KNOWN_TRACKS.has(t);
  const first = chosen.filter(t => known(t) && (usable.includes(t) || levels[t].xp > 0));
  const rest = TRACK_IDS.filter(t => !first.includes(t) && levels[t].xp > 0).sort((a, b) => levels[b].xp - levels[a].xp);
  return [...new Set([...first, ...rest])];
}

/** Achievements: the milestones reached, oldest first, then the next `count` to reach. */
export function achievementsView(ms: readonly MilestoneState[], count = 3): { reached: MilestoneState[]; next: MilestoneState[] } {
  const reached = ms.filter(m => m.reached).sort((a, b) => (a.reached! < b.reached! ? -1 : a.reached! > b.reached! ? 1 : 0));
  return { reached, next: ms.filter(m => !m.reached).slice(0, count) };
}

/** What a proof tile shows: the photo (`cover`), a timer, or neither (an entry saved without either). */
export type ProofTile = 'photo' | 'timer' | 'none';

export interface ProofEntry {
  /** `${day}:${missionId}`, unique on the record. */
  key: string;
  day: DayKey;
  done: MissionDone;
  /** The photo on the grid: the after photo of a pair, else the only one. Its uri is '' once the retention setting cleared it. */
  cover: ProofPhoto | null;
  tile: ProofTile;
}

export interface ProofMonth {
  /** 'YYYY-MM' */
  month: string;
  /** Days that month with a proven mission. */
  activeDays: number;
  /** Missions proven that month (one entry each). */
  missions: number;
  /** Newest first. */
  entries: ProofEntry[];
}

/**
 * Proof history: every proven mission, by month, newest first. A photo cleared by the retention
 * setting keeps its entry (uri ''), so the history never breaks; a timer-only proof is a timer
 * tile. Old entries without verification are not proven and don't show.
 */
export function proofMonths(r: RecordState): ProofMonth[] {
  const byMonth = new Map<string, ProofEntry[]>();
  const done = allDone(r).filter(isProven).reverse();
  for (const { day, ...m } of done) {
    const photos = photosOf(m);
    const cover = photos.find(p => p.kind !== 'before') ?? photos[0] ?? null;
    const timer = typeof m.timerSeconds === 'number' && m.timerSeconds > 0;
    const entry: ProofEntry = { key: `${day}:${m.missionId}`, day, done: { ...m, photos }, cover, tile: cover ? 'photo' : timer ? 'timer' : 'none' };
    const month = day.slice(0, 7);
    const list = byMonth.get(month);
    if (list) list.push(entry);
    else byMonth.set(month, [entry]);
  }
  return [...byMonth.entries()].map(([month, entries]) => ({ month, activeDays: new Set(entries.map(e => e.day)).size, missions: entries.length, entries }));
}
