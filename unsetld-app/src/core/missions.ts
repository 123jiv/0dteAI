// Daily missions: which three (or four) missions a user gets today, and swapping one out.
// Pure and deterministic: the same library, profile, history and day always give the same plan.
import { hash32, mulberry32 } from './random';
import { addDays, dayNumber, diffDays, type DayKey } from './time';
import type { DayPlan, Mission, MissionSlot, PlannedMission, Profile, Requirement, TrackId } from './types';

/** Points by difficulty. The library stores them too; the validator keeps the two in step. */
export const SLOT_POINTS: Record<MissionSlot, number> = { quick: 10, progress: 15, challenge: 25 };

/** The day's slots by intensity: Start easy, Lock in, Push me. */
export const SLOTS_BY_INTENSITY: Record<Profile['intensity'], MissionSlot[]> = {
  easy: ['quick', 'quick', 'progress'],
  lockin: ['quick', 'progress', 'challenge'],
  push: ['quick', 'progress', 'challenge', 'challenge'],
};

/** The day's slots for a profile: by intensity, and never more than three short ones on a 5–15 minute day. */
export function slotsFor(profile: Pick<Profile, 'intensity' | 'minutes'>): MissionSlot[] {
  const slots = SLOTS_BY_INTENSITY[profile.intensity] ?? SLOTS_BY_INTENSITY.lockin;
  return profile.minutes === 15 ? slots.slice(0, 3) : slots;
}

/** Total minutes a day's missions should fit in, by the time the user chose. */
export const DAY_BUDGET: Record<Profile['minutes'], number> = { 15: 20, 30: 45, 60: 90, 90: 150 };

/** A skipped mission stays away this long; three skips keep it away much longer. */
export const SKIP_DAYS = 21;
export const SKIP_DAYS_REPEAT = 90;

/** A mission shown (but not done) isn't shown again for a few days, so days feel different. */
export const SHOWN_GAP_DAYS = 4;

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
  /** Today's missions from an active program, placed first. */
  program?: { id: string; missionIds: string[] } | null;
}

export const DEFAULT_PROFILE: Profile = {
  tracks: ['focus', 'school', 'fitness'],
  school: null,
  work: null,
  gym: null,
  project: null,
  age: null,
  minutes: 30,
  intensity: 'lockin',
  priority: null,
};

/** Whether the user's answers allow a mission's requirements. Unknown answers allow everything a teen could do. */
export function meetsRequirements(requires: readonly Requirement[] | undefined, p: Profile): boolean {
  for (const r of requires ?? []) {
    if (r === 'school' && p.school === false) return false;
    if (r === 'work' && p.work !== true) return false;
    if (r === 'gym' && p.gym !== true) return false;
    if (r === 'project' && p.project === false) return false;
    if (r === 'age16' && p.age === 'u16') return false;
    if (r === 'age18' && p.age !== '18plus') return false;
  }
  return true;
}

/** Can this mission be offered today at all (history and requirements)? */
export function available(m: Mission, input: Pick<PlanInput, 'profile' | 'day' | 'history'>, relaxShown = false): boolean {
  if (!m.active || !meetsRequirements(m.requires, input.profile)) return false;
  const { lastDone, lastPlanned, skips } = input.history;
  const done = lastDone[m.id];
  if (done) {
    if (!m.repeatable) return false;
    if (diffDays(done, input.day) < m.cooldownDays) return false;
  }
  const skip = skips[m.id];
  if (skip && diffDays(skip.last, input.day) < (skip.count >= 3 ? SKIP_DAYS_REPEAT : SKIP_DAYS)) return false;
  const shown = lastPlanned[m.id];
  if (!relaxShown && shown && shown !== input.day) {
    const gap = m.anchor ? Math.min(SHOWN_GAP_DAYS, m.cooldownDays) : SHOWN_GAP_DAYS;
    if (diffDays(shown, input.day) < gap) return false;
  }
  return true;
}

/** Which track each slot draws from today: the chosen tracks in rotation, with this week's priority on the progress slot most days. */
export function slotTracks(profile: Profile, slots: readonly MissionSlot[], day: DayKey): TrackId[] {
  const tracks = profile.tracks.length ? profile.tracks : DEFAULT_PROFILE.tracks;
  const n = dayNumber(day);
  const out = slots.map((_, i) => tracks[(((n + i) % tracks.length) + tracks.length) % tracks.length]);
  if (profile.priority && tracks.includes(profile.priority) && ((n % 3) + 3) % 3 !== 0) {
    const i = slots.indexOf('progress');
    if (i >= 0) {
      // Swap so the priority track takes the progress slot and nothing is lost.
      const j = out.indexOf(profile.priority);
      if (j >= 0 && j !== i) out[j] = out[i];
      out[i] = profile.priority;
    }
  }
  return out;
}

const EASIER: Record<MissionSlot, MissionSlot | null> = { challenge: 'progress', progress: 'quick', quick: null };

function weight(m: Mission, history: MissionHistory): number {
  let w = m.weight ?? 1;
  if (!history.lastPlanned[m.id]) w *= 1.5;
  if (m.anchor) w *= 1.4;
  const skip = history.skips[m.id];
  if (skip) w /= 1 + skip.count;
  return w;
}

function pick(cands: readonly Mission[], history: MissionHistory, seed: string): Mission | null {
  if (!cands.length) return null;
  const sorted = [...cands].sort((a, b) => (a.id < b.id ? -1 : 1));
  const ws = sorted.map(m => weight(m, history));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = mulberry32(hash32(seed))() * total;
  for (let i = 0; i < sorted.length; i++) {
    r -= ws[i];
    if (r <= 0) return sorted[i];
  }
  return sorted[sorted.length - 1];
}

/**
 * One mission for a slot. Tries, in order: the slot's own track; any chosen track;
 * the Life Reset basics; missions shown recently; an easier slot. Never repeats what's excluded.
 */
export function chooseForSlot(
  input: PlanInput,
  slot: MissionSlot,
  track: TrackId,
  exclude: ReadonlySet<string>,
  maxMinutes: number,
  seed: string,
): Mission | null {
  const tracks = input.profile.tracks.length ? input.profile.tracks : DEFAULT_PROFILE.tracks;
  const pools: ((m: Mission) => boolean)[] = [m => m.track === track, m => tracks.includes(m.track), m => m.track === 'reset'];
  let s: MissionSlot | null = slot;
  while (s) {
    for (const relaxShown of [false, true]) {
      for (const inPool of pools) {
        const cands = input.library.filter(
          m => m.slot === s && inPool(m) && !exclude.has(m.id) && available(m, input, relaxShown),
        );
        // The time budget is a preference: when nothing fits, take the shortest few in the slot,
        // except for people who said they only have 5–15 minutes, who get an easier slot instead.
        // Quick wins are short by definition, so the track's own quick wins come before another track's.
        const fits = cands.filter(m => m.minutes <= maxMinutes);
        const shortest = [...cands].sort((a, b) => a.minutes - b.minutes).slice(0, 3);
        const pool = fits.length ? fits : input.profile.minutes > 15 || s === 'quick' ? shortest : [];
        const chosen = pick(pool, input.history, `${seed}:${s}`);
        if (chosen) return chosen;
      }
    }
    s = EASIER[s];
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
  const budget = DAY_BUDGET[profile.minutes];
  const chosen: PlannedMission[] = [];
  const used = new Set<string>();
  let spent = 0;
  const filled = new Set<number>();

  // Program missions take the slot that matches their own (or the first free one).
  const byId = new Map(input.library.map(m => [m.id, m]));
  for (const id of input.program?.missionIds ?? []) {
    const m = byId.get(id);
    if (!m || !m.active || used.has(id)) continue;
    let i = slots.findIndex((s, k) => s === m.slot && !filled.has(k));
    if (i < 0) i = slots.findIndex((_, k) => !filled.has(k));
    if (i < 0) break;
    filled.add(i);
    chosen[i] = { slot: m.slot, missionId: id, programId: input.program!.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    spent += m.minutes;
  }

  slots.forEach((slot, i) => {
    if (filled.has(i)) return;
    const laterSlots = slots.length - i - 1;
    const room = Math.max(5, budget - spent - laterSlots * 5);
    const m = chooseForSlot(input, slot, tracks[i], used, room, `${salt}:${day}:${i}`);
    if (!m) return;
    chosen[i] = { slot: m.slot, missionId: m.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    spent += m.minutes;
  });

  return { day, missions: chosen.filter(Boolean), rerolls: 0, replaced: [] };
}

/** Swap one mission of today's plan for another that fits. null when there's nothing left to offer. */
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
  const room = Math.max(old?.minutes ?? 15, DAY_BUDGET[input.profile.minutes] - spent);
  const tracks = slotTracks(input.profile, plan.missions.map(p => p.slot), input.day);
  const next = chooseForSlot(input, current.slot, old?.track ?? tracks[index], exclude, room, `${input.salt}:${input.day}:${index}:r${plan.rerolls + 1}`);
  if (!next) return null;
  const missions = plan.missions.map((p, i) => (i === index ? { slot: next.slot, missionId: next.id } : p));
  return { ...plan, missions, rerolls: plan.rerolls + 1, replaced: [...plan.replaced, current.missionId] };
}

/** History for the generator, from the proven missions, recent plans and skips. */
export function historyFrom(
  done: Record<DayKey, Record<string, { missionId: string }>>,
  plans: Record<DayKey, DayPlan>,
  skips: MissionHistory['skips'],
  before: DayKey,
): MissionHistory {
  const lastDone: Record<string, DayKey> = {};
  for (const day of Object.keys(done).sort()) {
    if (day > before) continue;
    for (const id of Object.keys(done[day])) lastDone[id] = day;
  }
  const lastPlanned: Record<string, DayKey> = {};
  for (const day of Object.keys(plans).sort()) {
    if (day >= before) continue;
    for (const p of plans[day].missions) lastPlanned[p.missionId] = day;
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
