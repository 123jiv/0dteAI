// Daily missions: which missions a user gets today, and swapping one out.
// Goals first: every mission comes from an area the user chose, filtered by their
// situation (school, work, business, gym, age, skills), their time, what they did
// and skipped lately, and the time of day. Pure and deterministic: the same library,
// profile, history and day always give the same plan.
import { leanFor, leansTo, NO_ADAPTATION, personalWeight, type Adaptation } from './personalize';
import { hash32, mulberry32 } from './random';
import { addDays, DAY_START_HOUR, dayNumber, diffDays, parseDay, type DayKey } from './time';
import type { DayPlan, Mission, MissionSlot, PlannedMission, Profile, Requirement, SkillId, TrackId } from './types';

/** An easy mission takes this many minutes or fewer. */
export const EASY_MAX_MINUTES = 15;

export function sizeOf(m: Pick<Mission, 'minutes'>): MissionSlot {
  return m.minutes <= EASY_MAX_MINUTES ? 'easy' : 'main';
}

/** The day by intensity, with 30 minutes or more: one easy mission, then focused ones (Push me adds a third). */
export const SLOTS_BY_INTENSITY: Record<Profile['intensity'], MissionSlot[]> = {
  easy: ['easy', 'main', 'main'],
  lockin: ['easy', 'main', 'main'],
  push: ['easy', 'main', 'main', 'main'],
};

/** The longest single mission each intensity hands out. */
export const MAIN_MAX_MINUTES: Record<Profile['intensity'], number> = { easy: 30, lockin: 45, push: 60 };

/**
 * The day's slots. The time the user has wins over intensity: with 15 minutes a day
 * it's three short missions, with 30 two short ones and one focused one, with 45 one
 * short and two focused. With an hour or more, intensity decides (Push me adds one).
 */
export function slotsFor(profile: Pick<Profile, 'intensity' | 'minutes'>): MissionSlot[] {
  if (profile.minutes === 15) return ['easy', 'easy', 'easy'];
  if (profile.minutes === 30) return ['easy', 'easy', 'main'];
  if (profile.minutes === 45) return ['easy', 'main', 'main'];
  return SLOTS_BY_INTENSITY[profile.intensity] ?? SLOTS_BY_INTENSITY.lockin;
}

/**
 * Total minutes a day's missions should fit in, by the time the user has. Close to
 * what they said; with an hour or more, Start easy keeps it shorter and Push me longer.
 */
export function dayBudget(profile: Pick<Profile, 'intensity' | 'minutes'>): number {
  switch (profile.minutes) {
    case 15:
      return 20;
    case 30:
      return 40;
    case 45:
      return profile.intensity === 'push' ? 65 : 55;
    default:
      return profile.intensity === 'push' ? 150 : profile.intensity === 'easy' ? 75 : 90;
  }
}

/** A swapped mission stays away this long; a third swap within a month keeps it away longer. */
export const SKIP_DAYS = 7;
export const SKIP_DAYS_REPEAT = 21;
/** Swaps older than this stop counting toward the longer wait. */
export const SKIP_MEMORY_DAYS = 30;
/** A core habit (study, train, build) is only kept away this long after a swap. */
export const SKIP_DAYS_CORE = 2;

/** A mission shown but not done waits a few days before it's shown again (core habits excepted). */
export const SHOWN_GAP_DAYS = 3;
/** Missions that aren't core habits never show up two days running while something else fits. */
export const SHOWN_GAP_MIN_DAYS = 2;

/** Plans made from this hour on leave out morning missions (make your bed, top 3 priorities). */
export const AFTERNOON_HOUR = 12;

/**
 * Too late in the day for a morning mission: the afternoon and evening, and the hours
 * after midnight, which still belong to the day that ends at 4 AM. Unknown = morning.
 */
export function tooLateForMorning(hour: number | undefined): boolean {
  if (hour == null) return false;
  return hour >= AFTERNOON_HOUR || hour < DAY_START_HOUR;
}

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
  /**
   * Local clock hour (0–23) when a plan for today is made; leave it out for any other
   * day. Morning missions are left out from noon until 4 AM.
   */
  hour?: number;
  /** Today's missions from an active program, placed first. */
  program?: { id: string; missionIds: string[] } | null;
  /** What the user did lately (core/personalize learnFrom); none = no adaptation. */
  adapt?: Adaptation;
}

export const DEFAULT_PROFILE: Profile = {
  tracks: ['discipline', 'school', 'fitness'],
  school: null,
  work: null,
  gym: null,
  project: null,
  skills: [],
  age: null,
  minutes: 45,
  intensity: 'lockin',
  priority: null,
};

/** Does a mission count toward this goal area? */
export function serves(m: Pick<Mission, 'track' | 'also'>, t: TrackId): boolean {
  return m.track === t || (m.also?.includes(t) ?? false);
}

const SKILLS: readonly SkillId[] = ['coding', 'design', 'video', 'writing', 'language', 'music'];

/**
 * Whether the user's answers allow a mission. School missions only for people
 * who didn't say they're out of school (high-school ones not for college students);
 * work, gym and "your customers" missions only for people who said yes; "your
 * product" missions not for people who said they have no business yet, and "pick a
 * business idea" ones not for people who have one; skill drills only for the skills
 * they named.
 */
export function meetsRequirements(requires: readonly Requirement[] | undefined, p: Profile): boolean {
  for (const r of requires ?? []) {
    if (r === 'school' && p.school === false) return false;
    if (r === 'highschool' && (p.school === false || p.schoolLevel === 'college')) return false;
    if (r === 'work' && p.work !== true) return false;
    if (r === 'gym' && p.gym !== true) return false;
    if (r === 'project' && p.project !== true) return false;
    if (r === 'building' && p.project === false) return false;
    if (r === 'starting' && p.project === true) return false;
    if (r === 'age16' && p.age === 'u16') return false;
    if (r === 'age18' && p.age !== '18plus') return false;
    if ((SKILLS as readonly string[]).includes(r) && !(p.skills ?? []).includes(r as SkillId)) return false;
  }
  return true;
}

/** How long a swapped mission stays away. */
function skipDays(m: Mission, skip: { count: number }): number {
  if (m.anchor) return SKIP_DAYS_CORE;
  return skip.count >= 3 ? SKIP_DAYS_REPEAT : SKIP_DAYS;
}

/**
 * Can this mission be offered today at all (requirements, time of day, history)?
 * `relaxShown` lets back a mission shown lately but not done; `ignoreSkips` lets
 * back one the user swapped away (only when nothing else in their areas is left).
 */
export function available(
  m: Mission,
  input: Pick<PlanInput, 'profile' | 'day' | 'history' | 'hour'>,
  relaxShown = false,
  ignoreSkips = false,
): boolean {
  if (!m.active || !meetsRequirements(m.requires, input.profile)) return false;
  if (m.when === 'morning' && tooLateForMorning(input.hour)) return false;
  if (m.days && !m.days.includes(parseDay(input.day).getDay())) return false;
  const { lastDone, lastPlanned, skips } = input.history;
  const done = lastDone[m.id];
  if (done) {
    if (!m.repeatable) return false;
    if (diffDays(done, input.day) < m.cooldownDays) return false;
  }
  const skip = skips[m.id];
  if (!ignoreSkips && skip && diffDays(skip.last, input.day) < skipDays(m, skip)) return false;
  const shown = lastPlanned[m.id];
  if (!relaxShown && shown && shown !== input.day && !m.anchor) {
    const gap = Math.max(SHOWN_GAP_MIN_DAYS, Math.min(SHOWN_GAP_DAYS, m.cooldownDays));
    if (diffDays(shown, input.day) < gap) return false;
  }
  return true;
}

/** Areas that have universal easy missions (plan tomorrow, clean your desk) for a day nothing else fits. */
const FALLBACK_TRACKS: readonly TrackId[] = ['discipline', 'organization'];

/**
 * The chosen areas that can ever get a mission with the user's answers (School is
 * left out for someone not in school), or the defaults when none are known. When
 * none of the chosen areas can, the universal basics.
 */
export function usableAreas(library: readonly Mission[], profile: Profile): TrackId[] {
  const chosen = profile.tracks.length ? profile.tracks : DEFAULT_PROFILE.tracks;
  const usable = chosen.filter(t => library.some(m => m.active && serves(m, t) && meetsRequirements(m.requires, profile)));
  return usable.length ? usable : [...FALLBACK_TRACKS];
}

/**
 * The areas a day draws from: the usable areas, plus this week's focus area when it isn't one
 * of them ("Get back in the gym" brings Fitness in for the week) and the user's answers allow it.
 */
export function planAreas(input: Pick<PlanInput, 'library' | 'profile' | 'day'>): TrackId[] {
  const base = usableAreas(input.library, input.profile);
  const f = leanFor(input.profile, input.day).focusArea;
  if (!f || base.includes(f)) return base;
  const ok = input.library.some(m => m.active && serves(m, f) && meetsRequirements(m.requires, input.profile));
  return ok ? [f, ...base] : base;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The area that leads the day: this week's focus, else the weekly priority, else an area the
 * goal points at (a goal naming two of their areas, "Improve grades and work out consistently",
 * has them take turns day by day), else the first pick.
 */
export function leadArea(input: Pick<PlanInput, 'profile' | 'day'>, areas: readonly TrackId[]): TrackId | undefined {
  const lean = leanFor(input.profile, input.day);
  const set = [lean.focusArea, input.profile.priority].find(a => a && areas.includes(a));
  if (set) return set;
  const goal = lean.goalAreas.filter(a => areas.includes(a));
  // Counted over the days the lead doesn't rest (slotTracks rests it every third day), so each goal area gets lead days.
  const d = dayNumber(input.day);
  return goal.length ? goal[mod(d - Math.floor(d / 3), goal.length)] : undefined;
}

const rotate = <T,>(xs: readonly T[], k: number): T[] => (xs.length ? [...xs.slice(mod(k, xs.length)), ...xs.slice(0, mod(k, xs.length))] : []);

/**
 * Which area each slot draws from today. The focused missions go first: the
 * user's lead area (their first pick, or this week's priority) on two days in
 * three, then the other areas in rotation; on the third day the others go first.
 * Easy missions take the next areas, so a day covers as many of their goals as it
 * has slots. Slots beyond the areas go to the other areas in turn, never the lead
 * (with two areas, the two take turns).
 * `areas`: the usable areas (usableAreas); the profile's own when left out.
 */
export function slotTracks(
  profile: Profile,
  slots: readonly MissionSlot[],
  day: DayKey,
  areas?: readonly TrackId[],
  leadOverride?: TrackId,
  /** The lead never rests (a weekly focus: the user asked for it all week; or the user's first day). */
  alwaysLead = false,
  /** On a rest day (and every day with `preferAlways`), these (the other areas the goal points at) go first among the others. */
  preferred: readonly TrackId[] = [],
  preferAlways = false,
): TrackId[] {
  const tracks = areas?.length ? [...areas] : profile.tracks.length ? profile.tracks : DEFAULT_PROFILE.tracks;
  const d = dayNumber(day);
  const lead =
    leadOverride && tracks.includes(leadOverride) ? leadOverride : profile.priority && tracks.includes(profile.priority) ? profile.priority : tracks[0];
  const pool = tracks.filter(t => t !== lead);
  const rest = !alwaysLead && pool.length > 0 && mod(d, 3) === 0;
  // The others' order moves on every day, so the one that goes first changes (on the third day too).
  const turn = rotate(pool, mod(d, 3) === 0 ? Math.floor(d / 3) : d - Math.floor(d / 3));
  const others = rest || preferAlways ? [...turn.filter(t => preferred.includes(t)), ...turn.filter(t => !preferred.includes(t))] : turn;
  const queue = rest ? [...others, lead] : [lead, ...others];
  const at = (k: number) =>
    k < queue.length ? queue[k] : pool.length > 1 ? others[mod(k - queue.length + d, others.length)] : queue[mod(k - queue.length + d, queue.length)];
  const out: TrackId[] = new Array(slots.length);
  let q = 0;
  slots.forEach((s, i) => {
    if (s === 'main') out[i] = at(q++);
  });
  slots.forEach((s, i) => {
    if (s !== 'main') out[i] = at(q++);
  });
  return out;
}

function weight(m: Mission, input: Pick<PlanInput, 'history' | 'day' | 'profile' | 'adapt' | 'hour'>, track: TrackId): number {
  let w = (m.weight ?? 1) * personalWeight(m, track, leanFor(input.profile, input.day), input.adapt ?? NO_ADAPTATION);
  if (m.track !== track) w *= 0.6; // counts toward this area, but it's mainly another one
  const skills = input.profile.skills ?? [];
  if (skills.length) {
    // A drill for a skill they named beats a generic session; a medium they didn't name comes up less.
    if (m.requires?.some(r => (skills as readonly string[]).includes(r))) w *= 2;
    if (m.fits?.length) w *= m.fits.some(s => skills.includes(s)) ? 1.5 : 0.25;
  }
  const shown = input.history.lastPlanned[m.id];
  if (!shown) w *= 1.3;
  else {
    const ago = diffDays(shown, input.day);
    if (ago === 1) w *= 0.3;
    else if (ago === 2) w *= 0.6;
  }
  const skip = input.history.skips[m.id];
  if (skip) w /= 1 + skip.count;
  // A plan made in the morning leans toward what can be done now; tonight's prep can still come up.
  if (m.when === 'evening' && !m.anchor && input.hour != null && input.hour >= DAY_START_HOUR && input.hour < AFTERNOON_HOUR) w *= 0.5;
  return w;
}

/** How often a slot gets one of its area's core habits (study, train, build, learn) when one is free; half that the day after. */
export const CORE_SHARE = 0.6;

/**
 * Core habits (anchors) come up on most days; the rest of the area's missions
 * fill the other days, so the habits that matter repeat without every day
 * looking the same.
 */
function pick(cands: readonly Mission[], input: Pick<PlanInput, 'history' | 'day' | 'profile' | 'adapt' | 'hour'>, track: TrackId, seed: string): Mission | null {
  if (!cands.length) return null;
  // A core habit counts as core only in its own area (Learn a Career Skill is core for Career, not Skills).
  const core = cands.filter(m => m.anchor && m.track === track);
  const rest = cands.filter(m => !(m.anchor && m.track === track));
  if (core.length && rest.length) {
    // Day 1 (nothing planned before) is all core habits where there are any: the first list
    // should be the staples, not luck. After that, when every core habit on offer was in
    // yesterday's plan, today leans on the rest of the area.
    const yesterday = addDays(input.day, -1);
    const firstDay = Object.keys(input.history.lastPlanned).length === 0;
    const share = firstDay ? 1 : core.some(m => input.history.lastPlanned[m.id] !== yesterday) ? CORE_SHARE : CORE_SHARE / 2;
    const useCore = mulberry32(hash32(`${seed}:core`))() < share;
    return pickWeighted(useCore ? core : rest, input, track, seed);
  }
  return pickWeighted(cands, input, track, seed);
}

function pickWeighted(cands: readonly Mission[], input: Pick<PlanInput, 'history' | 'day' | 'profile' | 'adapt' | 'hour'>, track: TrackId, seed: string): Mission | null {
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

/** A mission picked for a slot, and the area it is in the day for. */
export interface SlotPick {
  mission: Mission;
  area: TrackId;
}

/**
 * One mission for a slot, and the area it fills. Tries, in order, stopping at the
 * first that has a candidate:
 * 1. the slot's area at the slot's size within the time left (missions shown lately but
 *    not done wait, then are let back), then (a focused slot) a shorter one in that area;
 * 2. the user's areas not in the day yet, the same way, so the day keeps its spread;
 * 3. the areas already in the day, at the slot's size, then shorter;
 * 4. missions the user swapped away lately, from any of their areas;
 * 5. the universal basics (plan tomorrow, clean your desk);
 * 6. the shortest few of their areas' missions, a little over the time left.
 * Never returns anything in `exclude`. A slot whose area is already in the day lets the
 * areas still missing go first, and is tried with the others in the day before any of
 * them is let back early; `keepTrack` (a swap) keeps the slot's own area first.
 */
export function chooseForSlot(
  input: PlanInput,
  slot: MissionSlot,
  track: TrackId,
  exclude: ReadonlySet<string>,
  maxMinutes: number,
  seed: string,
  usedTracks: readonly TrackId[] = [],
  keepTrack = false,
  /** The most the slot may take when nothing fits `maxMinutes` in its area (an even share of a short day is a preference). */
  stretch = maxMinutes,
): SlotPick | null {
  const areas = planAreas(input);
  // Long missions mostly left undone lately while shorter ones get proven: keep focused missions shorter.
  const mainMax = Math.min(MAIN_MAX_MINUTES[input.profile.intensity] ?? 45, input.adapt?.preferShort ? 35 : Infinity);
  const trackUsed = !keepTrack && usedTracks.includes(track);
  const fresh = trackUsed ? areas.filter(t => !usedTracks.includes(t)) : [track, ...areas.filter(t => t !== track && !usedTracks.includes(t))];
  const freshSet = new Set(fresh);
  const rest = trackUsed ? [track, ...areas.filter(t => t !== track && !freshSet.has(t))] : areas.filter(t => !freshSet.has(t));
  const sizes: MissionSlot[] = slot === 'main' ? ['main', 'easy'] : ['easy'];

  const fits = (m: Mission, size: MissionSlot, cap: number) =>
    sizeOf(m) === size && m.minutes <= cap && (size === 'easy' || m.minutes <= mainMax) && !exclude.has(m.id);

  // For a user who named skills, a mission made for another medium ("Edit One Video" for a coder)
  // only when nothing else in the area is left.
  const named = input.profile.skills ?? [];
  const offMedium = (m: Mission) => named.length > 0 && Boolean(m.fits?.length) && !m.fits!.some(x => named.includes(x));

  // Only when the area has nothing else that fits: a niche mission (a plank set, typing practice)
  // or one made for a medium (Film One Video) the user never named, unless the week's focus or the
  // goal points at it; and on Day 1, a follow-up to an earlier session (Review Yesterday's Notes)
  // and, before 3 PM, a mission for tonight (the first list should be doable now).
  const lean = leanFor(input.profile, input.day);
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  const morning = input.hour != null && input.hour >= DAY_START_HOUR && input.hour < AFTERNOON_HOUR + 3;
  const lastResort = (m: Mission) =>
    ((Boolean(m.tags?.includes('niche')) || (named.length === 0 && Boolean(m.fits?.length))) && !leansTo(m, lean)) ||
    (firstDay && ((morning && m.when === 'evening') || Boolean(m.tags?.includes('follow-up'))));

  const tryAreas = (list: readonly TrackId[], size: MissionSlot, relaxShown: boolean, ignoreSkips: boolean, cap: number): SlotPick | null => {
    for (const area of list) {
      const all = input.library.filter(m => serves(m, area) && fits(m, size, cap) && available(m, input, relaxShown, ignoreSkips));
      const onMedium = all.filter(m => !offMedium(m));
      const usual = (onMedium.length ? onMedium : all).filter(m => !lastResort(m));
      const cands = usual.length ? usual : onMedium.length ? onMedium : all;
      const m = pick(cands, input, area, `${seed}:${size}:${area}`);
      if (m) return { mission: m, area };
    }
    return null;
  };

  // 1–3: the user's areas, fresh ones first, by size, within the time left.
  // The slot's own area at every size first (a short School mission beats a focused Career one
  // in a School slot), then the other areas not in the day yet, then the ones already in it.
  const groups = trackUsed ? [fresh, rest] : [[track], fresh.filter(t => t !== track), rest];
  for (const list of groups) {
    if (!list.length) continue;
    for (const size of sizes) {
      for (const relaxShown of [false, true]) {
        const got = tryAreas(list, size, relaxShown, false, maxMinutes);
        if (got) return got;
      }
      // Nothing in these areas fits the even share: take what's actually left before moving on.
      if (stretch > maxMinutes) {
        const got = tryAreas(list, size, true, false, stretch);
        if (got) return got;
      }
    }
  }
  // 4: let back missions swapped away lately rather than leave the day short.
  for (const size of sizes) {
    const got = tryAreas([...fresh, ...rest], size, true, true, maxMinutes);
    if (got) return got;
  }
  // 5: the universal basics.
  for (const relaxShown of [false, true]) {
    for (const area of FALLBACK_TRACKS) {
      const cands = input.library.filter(m => m.track === area && fits(m, 'easy', maxMinutes) && available(m, input, relaxShown));
      const m = pick(cands, input, area, `${seed}:fallback:${area}`);
      if (m) return { mission: m, area };
    }
  }
  // 6: nothing fits the time left; the shortest few of their areas' missions, a little over.
  for (const size of sizes) {
    for (const area of [...fresh, ...rest]) {
      const cands = input.library
        .filter(m => serves(m, area) && fits(m, size, maxMinutes + 15) && available(m, input, true, true))
        .sort((a, b) => a.minutes - b.minutes)
        .slice(0, 3);
      const m = pick(cands, input, area, `${seed}:short:${size}:${area}`);
      if (m) return { mission: m, area };
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

/** The area a mission counts for in this user's day: the first of their areas it serves, or its own. */
function areaFor(m: Mission, areas: readonly TrackId[]): TrackId {
  return areas.find(t => serves(m, t)) ?? m.track;
}

/** The day's plan: the program's missions first, then one mission per slot, within the time budget. */
export function generatePlan(input: PlanInput): DayPlan {
  const { profile, day, salt } = input;
  const slots = slotsFor(profile);
  const areas = planAreas(input);
  const lead = leadArea(input, areas);
  const lean = leanFor(profile, day);
  // Day 1 (nothing planned before) leads with the area they came for, whatever the date.
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  const goalAreas = lean.goalAreas.filter(a => areas.includes(a));
  // Day 1 also gives the goal's other areas the next slots: the first list is what they came for.
  const tracks = slotTracks(profile, slots, day, areas, lead, firstDay || Boolean(lead && lead === lean.focusArea), goalAreas, firstDay);
  const budget = dayBudget(profile);
  const chosenSlots: PlannedMission[] = [];
  const used = new Set<string>();
  const usedTracks: TrackId[] = [];
  let spent = 0;
  const filled = new Set<number>();

  // Program missions take a slot of their size (or the first free one). With a weekly focus on a
  // day of three or fewer, one of them is enough (it moves the plan on) and the focus keeps a slot.
  const byId = new Map(input.library.map(m => [m.id, m]));
  const focusArea = lean.focusArea && areas.includes(lean.focusArea) ? lean.focusArea : null;
  const programIds = [...(input.program?.missionIds ?? [])];
  // The one that goes in: the plan's mission in the focus area if it has one, else its shortest,
  // so the focus keeps the focused slot ("Get back in the gym" still gets a workout).
  const rank = (id: string) => {
    const m = byId.get(id);
    return (m?.track === focusArea ? 0 : 2) + (m && sizeOf(m) === 'easy' ? 0 : 1);
  };
  if (focusArea && slots.length <= 3) programIds.sort((x, y) => rank(x) - rank(y) || (byId.get(x)?.minutes ?? 0) - (byId.get(y)?.minutes ?? 0));
  let placed = 0;
  for (const id of programIds) {
    if (focusArea && slots.length <= 3 && placed >= 1 && !usedTracks.includes(focusArea)) break;
    const m = byId.get(id);
    if (!m || !m.active || used.has(id)) continue;
    // A mission the user's answers rule out (School Reset after "not in school") stays out.
    if (!meetsRequirements(m.requires, profile)) continue;
    // Too late for a morning mission (or the wrong day of the week); the program day's other missions still move it on.
    if (m.when === 'morning' && tooLateForMorning(input.hour)) continue;
    if (m.days && !m.days.includes(parseDay(day).getDay())) continue;
    let i = slots.findIndex((s, k) => s === sizeOf(m) && !filled.has(k));
    if (i < 0) i = slots.findIndex((_, k) => !filled.has(k));
    if (i < 0) break;
    filled.add(i);
    const area = areaFor(m, areas);
    chosenSlots[i] = { slot: slots[i], missionId: id, area, programId: input.program!.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    usedTracks.push(area);
    spent += m.minutes;
    placed += 1;
  }

  // Focused missions first (they take most of the time), then the easy ones.
  const order = slots.map((s, i) => ({ s, i })).sort((a, b) => (a.s === b.s ? a.i - b.i : a.s === 'main' ? -1 : 1));
  // A plan took the focus area's slot: the first free slot (focused first) goes to the focus instead.
  if (focusArea && !usedTracks.includes(focusArea) && !order.some(o => !filled.has(o.i) && tracks[o.i] === focusArea)) {
    const free = order.find(o => !filled.has(o.i));
    if (free) tracks[free.i] = focusArea;
  }
  for (const { s, i } of order) {
    if (filled.has(i)) continue;
    const later = order.filter(o => !filled.has(o.i) && o.i !== i && !chosenSlots[o.i]);
    const laterMain = later.filter(o => o.s === 'main').length;
    const laterEasy = later.length - laterMain;
    // A focused slot takes what the later slots don't need; easy slots share what's left evenly
    // (10 + 10 + 5 on a 25-minute day, not 15 + 5 + 5), so the last one isn't squeezed to 5 minutes.
    const room =
      s === 'main'
        ? Math.max(20, budget - spent - laterMain * 20 - laterEasy * 5)
        : Math.max(5, Math.min(EASY_MAX_MINUTES, Math.ceil((budget - spent - laterMain * 20) / (laterEasy + 1) / 5) * 5));
    // The slot's area, or the first of the user's areas not in the day yet.
    const area = usedTracks.includes(tracks[i]) ? (areas.find(t => !usedTracks.includes(t)) ?? tracks[i]) : tracks[i];
    const left = Math.max(room, budget - spent - laterMain * 20 - laterEasy * 5);
    const got = chooseForSlot(input, s, area, used, room, `${salt}:${day}:${i}`, usedTracks, false, s === 'easy' ? Math.min(EASY_MAX_MINUTES, left) : room);
    if (!got) continue;
    chosenSlots[i] = { slot: s, missionId: got.mission.id, area: got.area };
    for (const x of sameDayBlocked(input.library, got.mission)) used.add(x);
    usedTracks.push(got.area);
    spent += got.mission.minutes;
  }

  return { day, missions: chosenSlots.filter(Boolean), rerolls: 0, replaced: [] };
}

/** The areas the rest of the day is in, for the mission at `index`'s neighbours. */
function otherAreas(plan: DayPlan, index: number, byId: ReadonlyMap<string, Mission>, areas: readonly TrackId[]): TrackId[] {
  return plan.missions.flatMap((p, i) => {
    if (i === index) return [];
    const m = byId.get(p.missionId);
    return p.area ? [p.area] : m ? [areaFor(m, areas)] : [];
  });
}

/**
 * The area a swap of the mission at `index` draws from (and the swap dialog names):
 * the area it was in the day for, while that is still one of the user's areas or the
 * mission came from a program; otherwise the first of the user's areas it serves, then
 * the first of their areas not in the day yet.
 */
export function swapArea(plan: DayPlan, index: number, input: Pick<PlanInput, 'library' | 'profile' | 'day'>): TrackId | null {
  const current = plan.missions[index];
  if (!current) return null;
  const byId = new Map(input.library.map(m => [m.id, m]));
  const old = byId.get(current.missionId);
  const areas = planAreas(input);
  if (current.area && (areas.includes(current.area) || current.programId != null)) return current.area;
  if (old && areas.some(t => serves(old, t))) return areaFor(old, areas);
  const others = otherAreas(plan, index, byId, areas);
  return (
    areas.find(t => !others.includes(t)) ??
    slotTracks(input.profile, plan.missions.map(p => (p.slot === 'easy' ? 'easy' : 'main')), input.day, areas)[index]
  );
}

/**
 * Swap one mission of today's plan for another from the same area (another
 * School mission for a School mission), the same size, not already in the day.
 * Same area and size come first, then a different kind of mission (not "Lock In"
 * for "Do a 20-Minute Focus Session"); the user's other areas only when that area
 * has nothing left.
 */
export function rerollMission(plan: DayPlan, index: number, input: PlanInput): DayPlan | null {
  const current = plan.missions[index];
  if (!current) return null;
  const byId = new Map(input.library.map(m => [m.id, m]));
  const old = byId.get(current.missionId);
  const areas = planAreas(input);
  // The rest of the day stays as it is, so the new mission can't overlap any of it.
  const exclude = new Set([
    current.missionId,
    ...plan.replaced,
    ...plan.missions.flatMap((p, i) => (i === index ? [] : sameDayBlocked(input.library, byId.get(p.missionId)))),
  ]);
  const spent = plan.missions.reduce((t, p, i) => (i === index ? t : t + (byId.get(p.missionId)?.minutes ?? 0)), 0);
  const room = Math.max(old?.minutes ?? 20, dayBudget(input.profile) - spent);
  const slot: MissionSlot = current.slot === 'easy' || current.slot === 'main' ? current.slot : old ? sizeOf(old) : 'main';
  const track = swapArea(plan, index, input)!;
  const others = otherAreas(plan, index, byId, areas);
  const seed = `${input.salt}:${input.day}:${index}:r${plan.rerolls + 1}`;
  // Same area and size first: without the old mission's own group (its near-twins), then with it.
  const apart = new Set([...exclude, ...sameDayBlocked(input.library, old)]);
  const fit = (p: SlotPick | null) => Boolean(p && p.area === track && sizeOf(p.mission) === slot);
  const first = chooseForSlot(input, slot, track, apart, room, seed, others, true);
  let next = first;
  if (!fit(first)) {
    const second = chooseForSlot(input, slot, track, exclude, room, seed, others, true);
    next = fit(second) ? second : first && first.area === track ? first : (second ?? first);
  }
  if (!next) return null;
  const missions = plan.missions.map((p, i) => (i === index ? { slot, missionId: next.mission.id, area: next.area } : p));
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

/** A swap, counted for the generator. Swaps more than a month old are forgotten. */
export function addSkip(skips: MissionHistory['skips'], id: string, day: DayKey): MissionHistory['skips'] {
  const prev = skips[id];
  const count = prev && diffDays(prev.last, day) <= SKIP_MEMORY_DAYS ? prev.count + 1 : 1;
  return { ...skips, [id]: { count, last: day } };
}
