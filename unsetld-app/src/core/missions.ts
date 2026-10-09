// Daily missions: which missions a user gets today, and swapping one out.
// Goals first: every mission comes from an area the user chose, filtered by their
// situation (school, work, business, gym, age, skills), their time, what they did
// and skipped lately, and the time of day. Pure and deterministic: the same library,
// profile, history and day always give the same plan.
import { hash32, mulberry32 } from './random';
import { addDays, dayNumber, diffDays, parseDay, type DayKey } from './time';
import type { DayPlan, Mission, MissionSlot, PlannedMission, Profile, Requirement, TrackId } from './types';

/** An easy mission takes this many minutes or fewer. */
export const EASY_MAX_MINUTES = 15;

export function sizeOf(m: Pick<Mission, 'minutes'>): MissionSlot {
  return m.minutes <= EASY_MAX_MINUTES ? 'easy' : 'main';
}

/** The day by intensity: one easy mission, then focused ones (Push me adds a third). */
export const SLOTS_BY_INTENSITY: Record<Profile['intensity'], MissionSlot[]> = {
  easy: ['easy', 'main', 'main'],
  lockin: ['easy', 'main', 'main'],
  push: ['easy', 'main', 'main', 'main'],
};

/** The longest single mission each intensity hands out. */
export const MAIN_MAX_MINUTES: Record<Profile['intensity'], number> = { easy: 30, lockin: 45, push: 60 };

/** Total minutes a day's missions should fit in, by the time the user chose. */
export const DAY_BUDGET: Record<Profile['minutes'], number> = { 15: 25, 30: 65, 60: 120, 90: 180 };

/** The day's slots for a profile. With 5–15 minutes a day it's three short missions. */
export function slotsFor(profile: Pick<Profile, 'intensity' | 'minutes'>): MissionSlot[] {
  if (profile.minutes === 15) return ['easy', 'easy', 'easy'];
  return SLOTS_BY_INTENSITY[profile.intensity] ?? SLOTS_BY_INTENSITY.lockin;
}

/** A skipped mission stays away this long; three skips keep it away much longer. */
export const SKIP_DAYS = 14;
export const SKIP_DAYS_REPEAT = 60;

/** A mission shown but not done waits a few days before it's shown again (core habits excepted). */
export const SHOWN_GAP_DAYS = 3;

/** Plans made from this hour on leave out morning missions (make your bed, top 3 priorities). */
export const AFTERNOON_HOUR = 12;

export interface MissionHistory {
  /** Last day each mission was proven. */
  lastDone: Record<string, DayKey>;
  /** Last day each mission was in a plan. */
  lastPlanned: Record<string, DayKey>;
  skips: Record<string, { count: number; last: DayKey }>;
}

export interface PlanInput {
  library: readonly Mission[];
  profile: Profile;
  day: DayKey;
  salt: string;
  history: MissionHistory;
  /** Local hour the plan is made (0–23). Morning missions are left out after noon. */
  hour?: number;
  /** Today's missions from an active program, placed first. */
  program?: { id: string; missionIds: string[] } | null;
}

export const DEFAULT_PROFILE: Profile = {
  tracks: ['discipline', 'school', 'fitness'],
  school: null,
  work: null,
  gym: null,
  project: null,
  skills: [],
  age: null,
  minutes: 60,
  intensity: 'lockin',
  priority: null,
};

/** Does a mission count toward this goal area? */
export function serves(m: Pick<Mission, 'track' | 'also'>, t: TrackId): boolean {
  return m.track === t || (m.also?.includes(t) ?? false);
}

/**
 * Whether the user's answers allow a mission. School missions only for people
 * who didn't say they're out of school; work, gym and "your customers" missions
 * only for people who said yes; skill drills only for the skills they named.
 */
export function meetsRequirements(requires: readonly Requirement[] | undefined, p: Profile): boolean {
  for (const r of requires ?? []) {
    if (r === 'school' && p.school === false) return false;
    if (r === 'work' && p.work !== true) return false;
    if (r === 'gym' && p.gym !== true) return false;
    if (r === 'project' && p.project !== true) return false;
    if (r === 'age16' && p.age === 'u16') return false;
    if (r === 'age18' && p.age !== '18plus') return false;
    if ((r === 'coding' || r === 'design' || r === 'video' || r === 'writing' || r === 'language' || r === 'music') && !(p.skills ?? []).includes(r)) return false;
  }
  return true;
}

/** Can this mission be offered today at all (requirements, time of day, history)? */
export function available(m: Mission, input: Pick<PlanInput, 'profile' | 'day' | 'history' | 'hour'>, relaxShown = false): boolean {
  if (!m.active || !meetsRequirements(m.requires, input.profile)) return false;
  if (m.when === 'morning' && (input.hour ?? 0) >= AFTERNOON_HOUR) return false;
  if (m.days && !m.days.includes(parseDay(input.day).getDay())) return false;
  const { lastDone, lastPlanned, skips } = input.history;
  const done = lastDone[m.id];
  if (done) {
    if (!m.repeatable) return false;
    if (diffDays(done, input.day) < m.cooldownDays) return false;
  }
  const skip = skips[m.id];
  if (skip && diffDays(skip.last, input.day) < (skip.count >= 3 ? SKIP_DAYS_REPEAT : SKIP_DAYS)) return false;
  const shown = lastPlanned[m.id];
  if (!relaxShown && shown && shown !== input.day && !m.anchor && diffDays(shown, input.day) < Math.min(SHOWN_GAP_DAYS, Math.max(1, m.cooldownDays))) {
    return false;
  }
  return true;
}

/** The chosen areas, or the defaults when none are known. */
function chosen(profile: Profile): TrackId[] {
  return profile.tracks.length ? profile.tracks : DEFAULT_PROFILE.tracks;
}

/**
 * Which area each slot draws from today. The focused missions go first: the
 * user's lead area (their first pick, or this week's priority) on two days in
 * three, then the other areas in rotation; the easy mission takes the next area,
 * so a day covers as many of their goals as it has slots.
 */
export function slotTracks(profile: Profile, slots: readonly MissionSlot[], day: DayKey): TrackId[] {
  const tracks = chosen(profile);
  const n = ((dayNumber(day) % tracks.length) + tracks.length) % tracks.length;
  const order = [...tracks.slice(n), ...tracks.slice(0, n)];
  const lead = profile.priority && tracks.includes(profile.priority) ? profile.priority : tracks[0];
  const leadToday = ((dayNumber(day) % 3) + 3) % 3 !== 0 ? lead : order[0];
  const queue = [leadToday, ...order.filter(t => t !== leadToday)];
  const out: TrackId[] = new Array(slots.length);
  let q = 0;
  slots.forEach((s, i) => {
    if (s === 'main') out[i] = queue[q++ % queue.length];
  });
  slots.forEach((s, i) => {
    if (s !== 'main') out[i] = queue[q++ % queue.length];
  });
  return out;
}

function weight(m: Mission, input: Pick<PlanInput, 'history' | 'day'>, track: TrackId): number {
  let w = m.weight ?? 1;
  if (m.track !== track) w *= 0.6; // counts toward this area, but it's mainly another one
  const shown = input.history.lastPlanned[m.id];
  if (!shown) w *= 1.3;
  else {
    const ago = diffDays(shown, input.day);
    if (ago === 1) w *= 0.3;
    else if (ago === 2) w *= 0.6;
  }
  const skip = input.history.skips[m.id];
  if (skip) w /= 1 + skip.count;
  return w;
}

/** How often a slot gets one of its area's core habits (study, train, build, learn) when one is free. */
export const CORE_SHARE = 0.6;

/**
 * Core habits (anchors) come up on most days; the rest of the area's missions
 * fill the other days, so the habits that matter repeat without every day
 * looking the same.
 */
function pick(cands: readonly Mission[], input: Pick<PlanInput, 'history' | 'day'>, track: TrackId, seed: string): Mission | null {
  if (!cands.length) return null;
  // A core habit counts as core only in its own area (Learn a Career Skill is core for Career, not Skills).
  const core = cands.filter(m => m.anchor && m.track === track);
  const rest = cands.filter(m => !(m.anchor && m.track === track));
  if (core.length && rest.length) {
    const useCore = mulberry32(hash32(`${seed}:core`))() < CORE_SHARE;
    return pickWeighted(useCore ? core : rest, input, track, seed);
  }
  return pickWeighted(cands, input, track, seed);
}

function pickWeighted(cands: readonly Mission[], input: Pick<PlanInput, 'history' | 'day'>, track: TrackId, seed: string): Mission | null {
  if (!cands.length) return null;
  const sorted = [...cands].sort((a, b) => (a.id < b.id ? -1 : 1));
  const ws = sorted.map(m => weight(m, input, track));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = mulberry32(hash32(seed))() * total;
  for (let i = 0; i < sorted.length; i++) {
    r -= ws[i];
    if (r <= 0) return sorted[i];
  }
  return sorted[sorted.length - 1];
}

/** Areas that have universal easy missions (plan tomorrow, clean your desk) for a day nothing else fits. */
const FALLBACK_TRACKS: readonly TrackId[] = ['discipline', 'organization'];

/**
 * One mission for a slot. Tries, in order: the slot's own area; the user's other
 * areas not used yet today; any of their areas; then (easy slot only) the
 * universal basics. A focused slot with nothing that fits falls back to an easy
 * mission. Never returns anything in `exclude`.
 */
export function chooseForSlot(
  input: PlanInput,
  slot: MissionSlot,
  track: TrackId,
  exclude: ReadonlySet<string>,
  maxMinutes: number,
  seed: string,
  usedTracks: readonly TrackId[] = [],
): Mission | null {
  const tracks = chosen(input.profile);
  const mainMax = MAIN_MAX_MINUTES[input.profile.intensity] ?? 45;
  const pools: { area: TrackId | null; test: (m: Mission) => boolean }[] = [
    { area: track, test: m => serves(m, track) },
    ...tracks.filter(t => t !== track && !usedTracks.includes(t)).map(t => ({ area: t, test: (m: Mission) => serves(m, t) })),
    { area: null, test: (m: Mission) => tracks.some(t => serves(m, t)) },
  ];
  const sizes: MissionSlot[] = slot === 'main' ? ['main', 'easy'] : ['easy'];
  for (const size of sizes) {
    const usePools = size === 'easy' ? [...pools, { area: null, test: (m: Mission) => FALLBACK_TRACKS.includes(m.track) }] : pools;
    for (const relaxShown of [false, true]) {
      for (const pool of usePools) {
        const cands = input.library.filter(
          m =>
            sizeOf(m) === size &&
            (size === 'easy' || m.minutes <= mainMax) &&
            pool.test(m) &&
            !exclude.has(m.id) &&
            available(m, input, relaxShown),
        );
        // The time budget is a preference: when nothing fits, take the shortest few.
        const fits = cands.filter(m => m.minutes <= maxMinutes);
        const shortest = [...cands].sort((a, b) => a.minutes - b.minutes).slice(0, 3);
        const chosenMission = pick(fits.length ? fits : shortest, input, pool.area ?? track, `${seed}:${size}:${pool.area ?? '*'}`);
        if (chosenMission) return chosenMission;
      }
    }
  }
  return null;
}

/** A mission's id plus every other mission in its group: none of them can join a day that has it. */
function sameDayBlocked(library: readonly Mission[], m: Mission | undefined): string[] {
  if (!m) return [];
  if (!m.group) return [m.id];
  return [m.id, ...library.filter(x => x.group === m.group && x.id !== m.id).map(x => x.id)];
}

/** The day's plan: the program's missions first, then one mission per slot, within the time budget. */
export function generatePlan(input: PlanInput): DayPlan {
  const { profile, day, salt } = input;
  const slots = slotsFor(profile);
  const tracks = slotTracks(profile, slots, day);
  const budget = DAY_BUDGET[profile.minutes] ?? DAY_BUDGET[60];
  const chosenSlots: PlannedMission[] = [];
  const used = new Set<string>();
  const usedTracks: TrackId[] = [];
  let spent = 0;
  const filled = new Set<number>();

  // Program missions take a slot of their size (or the first free one).
  const byId = new Map(input.library.map(m => [m.id, m]));
  for (const id of input.program?.missionIds ?? []) {
    const m = byId.get(id);
    if (!m || !m.active || used.has(id)) continue;
    // Too late for a morning mission (or the wrong day of the week); the program day's other missions still move it on.
    if (m.when === 'morning' && (input.hour ?? 0) >= AFTERNOON_HOUR) continue;
    if (m.days && !m.days.includes(parseDay(day).getDay())) continue;
    let i = slots.findIndex((s, k) => s === sizeOf(m) && !filled.has(k));
    if (i < 0) i = slots.findIndex((_, k) => !filled.has(k));
    if (i < 0) break;
    filled.add(i);
    chosenSlots[i] = { slot: slots[i], missionId: id, programId: input.program!.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    usedTracks.push(m.track);
    spent += m.minutes;
  }

  // Focused missions first (they take most of the time), then the easy one.
  const order = slots.map((s, i) => ({ s, i })).sort((a, b) => (a.s === b.s ? a.i - b.i : a.s === 'main' ? -1 : 1));
  for (const { s, i } of order) {
    if (filled.has(i)) continue;
    const later = order.filter(o => !filled.has(o.i) && o.i !== i && !chosenSlots[o.i]);
    const reserve = later.reduce((t, o) => t + (o.s === 'main' ? 20 : 5), 0);
    const room = Math.max(s === 'main' ? 20 : 5, budget - spent - reserve);
    const m = chooseForSlot(input, s, tracks[i], used, room, `${salt}:${day}:${i}`, usedTracks);
    if (!m) continue;
    chosenSlots[i] = { slot: s, missionId: m.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    usedTracks.push(m.track);
    spent += m.minutes;
  }

  return { day, missions: chosenSlots.filter(Boolean), rerolls: 0, replaced: [] };
}

/**
 * Swap one mission of today's plan for another from the same area (another
 * School mission for a School mission), the same size, not already in the day.
 * Falls back to the user's other areas only when that area has nothing left.
 */
export function rerollMission(plan: DayPlan, index: number, input: PlanInput): DayPlan | null {
  const current = plan.missions[index];
  if (!current) return null;
  const byId = new Map(input.library.map(m => [m.id, m]));
  const old = byId.get(current.missionId);
  // The rest of the day stays as it is, so the new mission can't overlap any of it.
  const exclude = new Set([
    current.missionId,
    ...plan.replaced,
    ...plan.missions.flatMap((p, i) => (i === index ? [] : sameDayBlocked(input.library, byId.get(p.missionId)))),
  ]);
  const spent = plan.missions.reduce((t, p, i) => (i === index ? t : t + (byId.get(p.missionId)?.minutes ?? 0)), 0);
  const room = Math.max(old?.minutes ?? 20, (DAY_BUDGET[input.profile.minutes] ?? 120) - spent);
  const slot: MissionSlot = current.slot === 'easy' || current.slot === 'main' ? current.slot : old ? sizeOf(old) : 'main';
  const track = old?.track ?? slotTracks(input.profile, plan.missions.map(p => (p.slot === 'easy' ? 'easy' : 'main')), input.day)[index];
  const others = plan.missions.flatMap((p, i) => (i === index ? [] : [byId.get(p.missionId)?.track])).filter((t): t is TrackId => Boolean(t));
  const next = chooseForSlot(input, slot, track, exclude, room, `${input.salt}:${input.day}:${index}:r${plan.rerolls + 1}`, others);
  if (!next) return null;
  const missions = plan.missions.map((p, i) => (i === index ? { slot, missionId: next.id } : p));
  return { ...plan, missions, rerolls: plan.rerolls + 1, replaced: [...plan.replaced, current.missionId] };
}

/** History for the generator, from the proven missions, recent plans and skips. */
export function historyFrom(
  done: Record<DayKey, Record<string, { missionId: string; verification?: { status: string } }>>,
  plans: Record<DayKey, DayPlan>,
  skips: MissionHistory['skips'],
  before: DayKey,
): MissionHistory {
  const lastDone: Record<string, DayKey> = {};
  for (const day of Object.keys(done).sort()) {
    if (day > before) continue;
    for (const [id, m] of Object.entries(done[day] ?? {})) if (!m?.verification || m.verification.status === 'accepted') lastDone[id] = day;
  }
  const lastPlanned: Record<string, DayKey> = {};
  for (const day of Object.keys(plans).sort()) {
    if (day >= before) continue;
    for (const p of plans[day]?.missions ?? []) lastPlanned[p.missionId] = day;
  }
  return { lastDone, lastPlanned, skips };
}

/** Plans older than this are dropped from storage (history keeps what matters). */
export const PLAN_KEEP_DAYS = 42;

export function prunePlans(plans: Record<DayKey, DayPlan>, today: DayKey): Record<DayKey, DayPlan> {
  const cutoff = addDays(today, -PLAN_KEEP_DAYS);
  const out: Record<DayKey, DayPlan> = {};
  for (const [d, p] of Object.entries(plans)) if (d >= cutoff) out[d] = p;
  return out;
}

/** A skip, counted for the generator's weighting. */
export function addSkip(skips: MissionHistory['skips'], id: string, day: DayKey): MissionHistory['skips'] {
  const prev = skips[id];
  return { ...skips, [id]: { count: (prev?.count ?? 0) + 1, last: day } };
}
