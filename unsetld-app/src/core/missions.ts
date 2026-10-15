// Daily missions: which missions a user gets today, and swapping one out.
// Goals first: every mission is an approved library mission (the library passed in: content
// MISSIONS) from an area the user chose (or this week's focus, or one their goal points at:
// eligibleAreas), filtered by their situation (a job search, skills), their time, what they
// did and skipped lately, how often each mission should come round, and the time of day.
// Nothing is ever made up or taken from outside the library. Pure and deterministic: the same
// library, profile, history and day always give the same plan.
import { goalPointsAt, jobSearch, kindsOf, leanFor, leansTo, LONG_MINUTES, NO_ADAPTATION, personalWeight, type Adaptation } from './personalize';
import { hash32, mulberry32 } from './random';
import { addDays, DAY_START_HOUR, dayNumber, diffDays, parseDay, type DayKey } from './time';
import { projectFrom } from './titles';
import type { DayPlan, Mission, MissionSlot, PlannedMission, Profile, Requirement, SkillId, SwapReason, TrackId } from './types';

/**
 * A short (easy) mission takes this many minutes or fewer. 20: the approved library runs 5–45
 * minutes (most 20–30), and every area has at least two missions this short.
 */
export const EASY_MAX_MINUTES = 20;

export function sizeOf(m: Pick<Mission, 'minutes'>): MissionSlot {
  return m.minutes <= EASY_MAX_MINUTES ? 'easy' : 'main';
}

/** The day by intensity, with an hour or more: one short mission, then focused ones (Push me adds a third). */
export const SLOTS_BY_INTENSITY: Record<Profile['intensity'], MissionSlot[]> = {
  easy: ['easy', 'main', 'main'],
  lockin: ['easy', 'main', 'main'],
  push: ['easy', 'main', 'main', 'main'],
};

/** The longest single mission each intensity hands out. */
export const MAIN_MAX_MINUTES: Record<Profile['intensity'], number> = { easy: 30, lockin: 45, push: 60 };

/**
 * The day's slots. The time the user has wins over intensity: with 15 minutes a day
 * it's two short missions, with 30 one short and one focused, with 45 one short and
 * two focused. With an hour or more, intensity decides (Push me adds one).
 */
export function slotsFor(profile: Pick<Profile, 'intensity' | 'minutes'>): MissionSlot[] {
  if (profile.minutes === 15) return ['easy', 'easy'];
  if (profile.minutes === 30) return ['easy', 'main'];
  if (profile.minutes === 45) return ['easy', 'main', 'main'];
  return SLOTS_BY_INTENSITY[profile.intensity] ?? SLOTS_BY_INTENSITY.lockin;
}

/**
 * Total minutes a day's missions should fit in, by the time the user has. The approved
 * missions run 5–45 minutes (most 20–30), so a 15-minute day is two short ones (about 30)
 * and a 30-minute day one short and one focused (about 45); with an hour or more, Start
 * easy keeps it shorter and Push me longer.
 */
export function dayBudget(profile: Pick<Profile, 'intensity' | 'minutes'>): number {
  switch (profile.minutes) {
    case 15:
      return 30;
    case 30:
      return 45;
    case 45:
      return profile.intensity === 'push' ? 85 : 75;
    default:
      return profile.intensity === 'push' ? 150 : profile.intensity === 'easy' ? 80 : 95;
  }
}

/** A swapped mission stays away this long; a third swap within a month keeps it away longer. */
export const SKIP_DAYS = 7;
export const SKIP_DAYS_REPEAT = 21;
/** Swaps older than this stop counting toward the longer wait. */
export const SKIP_MEMORY_DAYS = 30;
/** A core habit (study, train, build) is only kept away this long after a swap. */
export const SKIP_DAYS_CORE = 2;

/**
 * A mission shown but not done waits a few days before it's shown again (core habits excepted).
 * A weekly or rarer one (frequency 'low') waits its whole cooldown instead (available).
 */
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
 * they named; Apply to One Job or Internship ('jobsearch') only while a job or
 * internship search is part of their goal or (with `day`) this week's focus.
 */
export function meetsRequirements(requires: readonly Requirement[] | undefined, p: Profile, day?: DayKey): boolean {
  for (const r of requires ?? []) {
    if (r === 'jobsearch' && !jobSearch(p, day)) return false;
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
 * What a step of chooseForSlot lets back. Requirements, the time of day and the days of the
 * week are never relaxed; neither is a mission that can only be done once.
 */
export interface Relax {
  /** A mission shown lately but not done (a weekly or rarer one still waits: `lowShown`). */
  shown?: boolean;
  /** A mission the user swapped away lately. */
  skips?: boolean;
  /** A weekly or rarer mission shown within its cooldown. */
  lowShown?: boolean;
  /** A repeatable mission done within its cooldown. */
  cooldown?: boolean;
}

/**
 * Can this mission be offered today at all (requirements, time of day, history)? `relax`
 * lets back what the steps of chooseForSlot let back, one after another, rather than
 * leave a day short.
 */
export function available(m: Mission, input: Pick<PlanInput, 'profile' | 'day' | 'history' | 'hour'>, relax: Relax = {}): boolean {
  if (!m.active || !meetsRequirements(m.requires, input.profile, input.day)) return false;
  if (m.when === 'morning' && tooLateForMorning(input.hour)) return false;
  if (m.days && !m.days.includes(parseDay(input.day).getDay())) return false;
  const { lastDone, lastPlanned, skips } = input.history;
  const done = lastDone[m.id];
  if (done) {
    if (!m.repeatable) return false;
    if (!relax.cooldown && diffDays(done, input.day) < m.cooldownDays) return false;
  }
  const skip = skips[m.id];
  if (!relax.skips && skip && diffDays(skip.last, input.day) < skipDays(m, skip)) return false;
  const shown = lastPlanned[m.id];
  if (shown && shown !== input.day) {
    const ago = diffDays(shown, input.day);
    // A weekly or rarer mission (Create Your Study Plan for the Week, Check One Subscription) comes
    // round once per cooldown, done or not: shown on Monday and left, it isn't back on Thursday.
    if (m.frequency === 'low' && !relax.lowShown && ago < m.cooldownDays) return false;
    if (!relax.shown && !m.anchor && ago < Math.max(SHOWN_GAP_MIN_DAYS, Math.min(SHOWN_GAP_DAYS, m.cooldownDays))) return false;
  }
  return true;
}

/** The areas the user picked, or the defaults before onboarding (it can't finish with none). */
function chosenAreas(profile: Pick<Profile, 'tracks'>): TrackId[] {
  return profile.tracks.length ? [...profile.tracks] : [...DEFAULT_PROFILE.tracks];
}

/**
 * Areas the user didn't pick that their answers and goal make eligible, in this order:
 * School for someone in school whose goal is about school (grades, homework, an exam: age
 * alone never counts); Career for a job or internship search (jobSearch); Projects for
 * someone building something (they said so, or the goal names it: an app, a brand, a launch).
 * A weekly focus brings its own area in on its own (eligibleAreas).
 */
export function impliedAreas(profile: Profile, day?: DayKey): TrackId[] {
  const goal = profile.goal ?? '';
  const out: TrackId[] = [];
  if (profile.school === true && goalPointsAt(goal, 'school')) out.push('school');
  if (jobSearch(profile, day)) out.push('career');
  // "Land a software engineering job" or "Get a job at a startup" names a job, not something being
  // built: the words in front of "job" and where it is ("in/at …") don't count.
  const building = goalPointsAt(goal.replace(/\b(?:[a-z-]+\s+){0,3}(?:jobs?|internships?)\b(?:\s+(?:in|at|with)\s+(?:an?\s+|the\s+)?[a-z-]+)?/gi, ''), 'projects');
  if (profile.project === true || projectFrom(goal) !== null || building) out.push('projects');
  return out;
}

/**
 * Every area this user can get missions from (docs/MISSIONS_SPEC.md, eligibility): the areas
 * they picked, this week's focus area (picking a focus chooses its area for the week, with
 * `day`), and the areas their answers and goal point at (impliedAreas). Fitness, Money,
 * Skills, Organization and Discipline only when picked or the week's focus. Pure: tests and
 * the simulations check every planned mission's area against it.
 */
export function eligibleAreas(profile: Profile, day?: DayKey): TrackId[] {
  const out = chosenAreas(profile);
  const add = (t: TrackId | null | undefined) => {
    if (t && !out.includes(t)) out.push(t);
  };
  if (day) add(leanFor(profile, day).focusArea);
  for (const t of impliedAreas(profile, day)) add(t);
  return out;
}

/**
 * The areas the user picked (the defaults before onboarding) that some mission fits with
 * their answers. Never one they didn't pick: with none left, none (3.3 removed the fallback
 * to Discipline and Organization).
 */
export function usableAreas(library: readonly Mission[], profile: Profile, day?: DayKey): TrackId[] {
  return chosenAreas(profile).filter(t => library.some(m => m.active && serves(m, t) && meetsRequirements(m.requires, profile, day)));
}

/**
 * The areas a day draws from, in order: this week's focus area when the user didn't pick it
 * ("Get back into training" brings Fitness in for the week), the usable areas they picked,
 * then, only when they picked fewer than three, the areas their goal and answers point at
 * (impliedAreas: "Build a clothing brand" brings Projects in). Each only while some mission
 * in it fits their answers. Nothing else, ever: every step of chooseForSlot stays in these.
 */
export function planAreas(input: Pick<PlanInput, 'library' | 'profile' | 'day'>): TrackId[] {
  const { library, profile, day } = input;
  const plannable = (t: TrackId) => library.some(m => m.active && serves(m, t) && meetsRequirements(m.requires, profile, day));
  const picked = usableAreas(library, profile, day);
  const out: TrackId[] = [];
  const f = leanFor(profile, day).focusArea;
  if (f && !picked.includes(f) && plannable(f)) out.push(f);
  out.push(...picked);
  if (chosenAreas(profile).length < 3) for (const t of impliedAreas(profile, day)) if (!out.includes(t) && plannable(t)) out.push(t);
  return out;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The area that leads the day: this week's focus, else the weekly priority, else an area the
 * goal points at (a goal naming two of their areas, "Improve grades and work out consistently",
 * has them take turns day by day), else the first pick.
 */
export function leadArea(input: Pick<PlanInput, 'profile' | 'day'> & Partial<Pick<PlanInput, 'history'>>, areas: readonly TrackId[]): TrackId | undefined {
  const lean = leanFor(input.profile, input.day);
  const set = [lean.focusArea, input.profile.priority].find(a => a && areas.includes(a));
  if (set) return set;
  const goal = lean.goalAreas.filter(a => areas.includes(a));
  // Day 1 leads with what the goal names first ("Build and ship an app": Projects); the turns start on Day 2.
  if (input.history && Object.keys(input.history.lastPlanned).length === 0) return goal[0];
  // Counted over the days the lead doesn't rest (slotTracks rests it every third day), so each goal
  // area gets lead days; the resting day takes turns too, so the first one doesn't always give it up.
  const d = dayNumber(input.day);
  return goal.length ? goal[mod(mod(d, 3) === 0 ? Math.floor(d / 3) : d - Math.floor(d / 3), goal.length)] : undefined;
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
  // Goal areas taking turns to lead (leadArea): the others move on once every three days, not in
  // step with the lead, or the first goal area would sit behind the other areas on its partner's days.
  const goalTurns = !alwaysLead && preferred.length > 1 && preferred.includes(lead) && lead !== profile.priority;
  // Otherwise the others' order moves on every day, so the one that goes first changes (on the third day too).
  const turn = rotate(pool, mod(d, 3) === 0 || goalTurns ? Math.floor(d / 3) : d - Math.floor(d / 3));
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

/** How often the week's focus area gets a mission the focus names or tags, when one fits. */
export const FOCUS_SHARE = 0.8;

/** How often a slot gets one of its area's core habits (study, train, build, learn) when one is free; half that the day after. */
export const CORE_SHARE = 0.6;

/**
 * Core habits (anchors) come up on most days; the rest of the area's missions
 * fill the other days, so the habits that matter repeat without every day
 * looking the same.
 */
function pick(cands: readonly Mission[], input: Pick<PlanInput, 'history' | 'day' | 'profile' | 'adapt' | 'hour'>, track: TrackId, seed: string): Mission | null {
  if (!cands.length) return null;
  // The week's focus area: most days, a mission the focus names or tags ("Prepare for an exam":
  // practice tests, flashcards, study sessions), not just any mission in its area.
  const lean = leanFor(input.profile, input.day);
  if (lean.focusArea === track) {
    const on = cands.filter(m => lean.ids.has(m.id) || (m.tags ?? []).some(t => lean.focusTags.has(t)));
    if (on.length && on.length < cands.length && mulberry32(hash32(`${seed}:focus`))() < FOCUS_SHARE) return pickWeighted(on, input, track, seed);
  }
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

/** At most this many missions from one area in a day, unless it's this week's focus or the user's only area. */
export const MAX_PER_AREA = 2;

/**
 * One mission for a slot, and the area it fills. Every step draws from `input.library` (the
 * approved missions) and the plan areas only (planAreas), and tries, in order, stopping at the
 * first that has a candidate:
 * 1. the slot's area at the slot's size within the time left (missions shown lately but
 *    not done wait, then are let back), then (a focused slot) a shorter one in that area;
 * 2. the user's areas not in the day yet, the same way, so the day keeps its spread;
 * 3. the areas already in the day, at the slot's size, then shorter;
 * 4. missions the user swapped away lately, from any of their areas;
 * 5. weekly or rarer missions shown within their cooldown;
 * 6. the shortest few of their areas' missions at the slot's size, a little over the time left;
 * 7. the shortest few of any size (a short slot takes a focused mission when that's all there is);
 * 8. repeatable missions still in their cooldown: not yesterday's while another is left, then the
 *    one furthest through its cooldown (M5, monthly, isn't back within days), then the oldest done.
 * Steps 7 and 8 also let back what the plan learned to leave out (longer missions, preferShort),
 * up to what the intensity hands out.
 * Requirements, the time of day and the days of the week are never relaxed, and nothing outside
 * the library or the plan areas is ever returned. Never returns anything in `exclude`. An area
 * already holding MAX_PER_AREA missions of the day is left out (the week's focus and a single
 * area excepted). A slot whose area is already in the day lets the areas still missing go
 * first, and is tried with the others in the day before any of them is let back early;
 * `keepTrack` (a swap) keeps the slot's own area first.
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
  /** Lets a third mission into an area (generatePlan's last try, when no other area has one left). */
  crowd = false,
): SlotPick | null {
  const areas = planAreas(input);
  const lean = leanFor(input.profile, input.day);
  const intensityMax = MAIN_MAX_MINUTES[input.profile.intensity] ?? 45;
  // Long missions mostly left undone lately while shorter ones get proven: keep focused missions
  // shorter. A preference only: the last steps (7, 8) take a longer one rather than leave a slot empty.
  const mainMax = Math.min(intensityMax, input.adapt?.preferShort ? LONG_MINUTES - 5 : Infinity);
  // Two missions from one area is enough for a day ("Study One Subject", "Complete 10 Practice
  // Problems" and "Spend 30 Minutes on Your Hardest Class" is too much School) unless it's the
  // week's focus or their only area; a swap keeps its own area.
  const full = (t: TrackId) =>
    !crowd && areas.length > 1 && t !== lean.focusArea && !(keepTrack && t === track) && usedTracks.filter(x => x === t).length >= MAX_PER_AREA;
  const open = areas.filter(t => !full(t));
  const trackUsed = !keepTrack && usedTracks.includes(track);
  const fresh = trackUsed ? open.filter(t => !usedTracks.includes(t)) : [track, ...open.filter(t => t !== track && !usedTracks.includes(t))];
  const freshSet = new Set(fresh);
  const rest = trackUsed ? [...(full(track) ? [] : [track]), ...open.filter(t => t !== track && !freshSet.has(t))] : open.filter(t => !freshSet.has(t));
  const all = [...fresh, ...rest];
  const sizes: MissionSlot[] = slot === 'main' ? ['main', 'easy'] : ['easy'];

  // `size` null: any size. Nothing over what the intensity hands out, at any step (Start easy never gets a 45-minute workout).
  const fits = (m: Mission, size: MissionSlot | null, cap: number, top = mainMax) =>
    (size === null || sizeOf(m) === size) && m.minutes <= Math.min(cap, top) && !exclude.has(m.id);

  // For a user who named skills, a mission made for another medium (a video one for a coder)
  // only when nothing else in the area is left.
  const named = input.profile.skills ?? [];
  const offMedium = (m: Mission) => named.length > 0 && Boolean(m.fits?.length) && !m.fits!.some(x => named.includes(x));

  // Only when the area has nothing else that fits: a niche mission, or one made for a medium
  // (`fits`) the user never named, unless the week's focus or the
  // goal points at it; and on Day 1, a follow-up to an earlier session (Improve Something You Made
  // Yesterday) and, before 3 PM, a mission for tonight (the first list should be doable now).
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  const morning = input.hour != null && input.hour >= DAY_START_HOUR && input.hour < AFTERNOON_HOUR + 3;
  // Internship searches are for students: someone working and not in school gets job missions,
  // unless their goal or focus names internships.
  const workingAdult = input.profile.work === true && input.profile.school !== true;
  const internshipOnly = (m: Mission) => workingAdult && Boolean(m.tags?.includes('internship')) && !m.tags!.includes('job') && !leansTo(m, lean);
  const lastResort = (m: Mission) =>
    internshipOnly(m) ||
    ((Boolean(m.tags?.includes('niche')) || (named.length === 0 && Boolean(m.fits?.length))) && !leansTo(m, lean)) ||
    (firstDay && ((morning && m.when === 'evening') || Boolean(m.tags?.includes('follow-up'))));

  // A support task (Write Your Next 3 Project Actions) is never an area's only mission of the
  // day while a real one (a work session, a workout) fits.
  // A meal counts the same way unless the goal or focus is about food ("Eat healthier").
  const supportOnly = (m: Mission, area: TrackId) =>
    (Boolean(m.tags?.includes('support')) || (m.group === 'meal' && !leansTo(m, lean))) && !usedTracks.includes(area);

  // `strict`: only the usual missions, so a slot takes a real one a little longer (the stretch)
  // or shown lately before a last resort (tonight's Plan Tomorrow's Top 3 on a Day 1 morning).
  const tryAreas = (list: readonly TrackId[], size: MissionSlot | null, relax: Relax, cap: number, strict = false): SlotPick | null => {
    for (const area of list) {
      const cands = input.library.filter(m => serves(m, area) && fits(m, size, cap) && available(m, input, relax));
      const onMedium = cands.filter(m => !offMedium(m));
      const usual = (onMedium.length ? onMedium : cands).filter(m => !lastResort(m) && !supportOnly(m, area));
      const m = pick(usual.length || strict ? usual : onMedium.length ? onMedium : cands, input, area, `${seed}:${size ?? 'any'}:${area}`);
      if (m) return { mission: m, area };
    }
    return null;
  };

  /** The shortest few missions of these areas (of `size`, or any size), within `cap`. */
  const shortest = (list: readonly TrackId[], bySize: readonly (MissionSlot | null)[], cap: number, relax: Relax, top = mainMax): SlotPick | null => {
    for (const size of bySize) {
      for (const area of list) {
        const cands = input.library
          .filter(m => serves(m, area) && fits(m, size, cap, top) && available(m, input, relax))
          .sort((a, b) => a.minutes - b.minutes)
          .slice(0, 3);
        const m = pick(cands, input, area, `${seed}:short:${size ?? 'any'}:${area}`);
        if (m) return { mission: m, area };
      }
    }
    return null;
  };

  // The week's focus area in a focused slot, when everything the focus names is short ("Prepare for
  // an exam": Test Yourself on Flashcards for 20 Minutes, not a plain study session): its short
  // missions join the draw, so the focus steers the slot (pick's FOCUS_SHARE).
  if (slot === 'main' && track === lean.focusArea && !trackUsed) {
    const onFocus = (m: Mission) => lean.ids.has(m.id) || (m.tags ?? []).some(t => lean.focusTags.has(t));
    const focusFits = (size: MissionSlot) =>
      input.library.some(m => serves(m, track) && onFocus(m) && fits(m, size, maxMinutes) && available(m, input, { shown: true }));
    if (!focusFits('main') && focusFits('easy')) {
      for (const shown of [false, true]) {
        const got = tryAreas([track], null, { shown }, maxMinutes, true);
        if (got) return got;
      }
    }
  }
  // 1–3: the user's areas, fresh ones first, by size, within the time left.
  // The slot's own area at every size first (a short School mission beats a focused Career one
  // in a School slot), then the other areas not in the day yet, then the ones already in it.
  const groups = trackUsed ? [fresh, rest] : [[track], fresh.filter(t => t !== track), rest];
  for (const list of groups) {
    if (!list.length) continue;
    for (const size of sizes) {
      for (const strict of [true, false]) {
        for (const shown of [false, true]) {
          const got = tryAreas(list, size, { shown }, maxMinutes, strict);
          if (got) return got;
        }
        // Nothing in these areas fits the even share: take what's actually left before moving on,
        // still not yesterday's mission while another fits (Do 20 Minutes of Cardio three days running).
        if (stretch > maxMinutes) {
          for (const shown of [false, true]) {
            const got = tryAreas(list, size, { shown }, stretch, strict);
            if (got) return got;
          }
        }
      }
    }
  }
  // 4: let back missions swapped away lately rather than leave the day short.
  for (const size of sizes) {
    const got = tryAreas(all, size, { shown: true, skips: true }, maxMinutes);
    if (got) return got;
  }
  // 5: a weekly or rarer mission shown within its cooldown.
  const loose: Relax = { shown: true, skips: true, lowShown: true };
  for (const size of sizes) {
    const got = tryAreas(all, size, loose, Math.max(maxMinutes, stretch));
    if (got) return got;
  }
  // 6: nothing fits the time left; the shortest few of their areas' missions, a little over.
  const over = shortest(all, sizes, maxMinutes + 15, loose);
  if (over) return over;
  // 7: any size, within what the intensity hands out.
  const any = shortest(all, [null], intensityMax, loose, intensityMax);
  if (any) return any;
  // 8: a repeatable mission still in its cooldown, relaxed as little as can be: not one done
  // yesterday while another is left, then the one furthest through its cooldown (a weekly one done
  // 4 days ago before a monthly one done 4 days ago), then the one done longest ago.
  const lastDone = input.history.lastDone;
  const yesterday = (m: Mission) => (lastDone[m.id] && diffDays(lastDone[m.id], input.day) <= 1 ? 1 : 0);
  const waitLeft = (m: Mission) => (lastDone[m.id] ? (m.cooldownDays - diffDays(lastDone[m.id], input.day)) / m.cooldownDays : 0);
  for (const area of all) {
    const cands = input.library
      .filter(m => serves(m, area) && fits(m, null, intensityMax, intensityMax) && available(m, input, { ...loose, cooldown: true }))
      .sort(
        (a, b) =>
          yesterday(a) - yesterday(b) ||
          waitLeft(a) - waitLeft(b) ||
          (lastDone[a.id] ?? '').localeCompare(lastDone[b.id] ?? '') ||
          a.minutes - b.minutes ||
          (a.id < b.id ? -1 : 1),
      );
    if (cands.length) return { mission: cands[0], area };
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
  // Money and Organization are all short missions: a focused slot drawn for one of them trades
  // areas with a short slot whose area has focused missions, so the day keeps its focused work.
  const focusedIn = (t: TrackId) => input.library.some(m => m.active && serves(m, t) && sizeOf(m) === 'main');
  slots.forEach((s, i) => {
    if (s !== 'main' || focusedIn(tracks[i])) return;
    const j = slots.findIndex((x, k) => x === 'easy' && focusedIn(tracks[k]));
    if (j >= 0) [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  });
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
    // A mission the user's answers rule out (Apply to One Job or Internship with no job search) stays out.
    if (!meetsRequirements(m.requires, profile, day)) continue;
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
    // A focused slot takes what the later slots don't need (10 minutes for each short one still to
    // come); short slots share what's left evenly (15 + 15 on a 15-minute day's 30, not 20 + 10), so
    // the last one isn't squeezed. The day's last slot rounds down instead.
    const last = later.length === 0;
    const room =
      s === 'main'
        ? Math.max(20, budget - spent - laterMain * 20 - laterEasy * 10)
        : last
          ? Math.max(5, Math.min(EASY_MAX_MINUTES, Math.floor((budget - spent) / 5) * 5))
          : Math.max(5, Math.min(EASY_MAX_MINUTES, Math.ceil((budget - spent - laterMain * 20) / (laterEasy + 1) / 5) * 5));
    // The slot's area, or the first of the user's areas not in the day yet.
    const area = usedTracks.includes(tracks[i]) ? (areas.find(t => !usedTracks.includes(t)) ?? tracks[i]) : tracks[i];
    // A short slot may take up to EASY_MAX_MINUTES when its area has nothing within the even
    // share (Fitness's shortest are 20 minutes), rather than give the slot to another area.
    const stretch = s === 'easy' ? EASY_MAX_MINUTES : room;
    const seed = `${salt}:${day}:${i}`;
    // Never a slot left empty while an approved mission in their areas is left: when every other
    // area is out, a third mission from one area beats a short day.
    const got = chooseForSlot(input, s, area, used, room, seed, usedTracks, false, stretch) ?? chooseForSlot(input, s, area, used, room, seed, usedTracks, false, stretch, true);
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
 * Same area and size come first, then a different kind of mission (not "Work With
 * Your Phone Away for 30 Minutes" for "Lock In for 30 Minutes"); the user's other
 * areas only when that area has nothing left.
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

/**
 * "RECOMMENDED FOR YOU": up to `count` missions to replace the one at `index`, for the reason the
 * user gave. Each is a different kind (no two from one group), drawn the way a swap draws
 * (core/missions chooseForSlot: the slot's area first, the rest of the day left as it is):
 *  - too-hard: shorter than the mission it replaces (in its area first: Do 20 Minutes of Cardio for
 *    Walk for 30 Minutes); only shorter ones, so a mission of 15 minutes or less may have none;
 *  - too-easy: longer than it (a focused one, up to what the intensity hands out);
 *  - not-relevant: nothing of the same kind (its group and activity tags);
 *  - cant-today / already-did: nothing from its group (its near-twins);
 *  - another: the usual swap.
 * Too hard and too easy are about length, not kind, so a near-twin of another length counts. No
 * choice is still in its cooldown or was swapped away lately (chooseForSlot's last steps let those
 * back to fill a day, never a swap). When the reason leaves fewer than `count`, the usual swap's
 * picks fill in (not for too-hard: those would be no shorter). Pure: picking one is `replaceWith`.
 */
export function replacementChoices(plan: DayPlan, index: number, input: PlanInput, reason: SwapReason = 'another', count = 3): SlotPick[] {
  const current = plan.missions[index];
  if (!current) return [];
  const byId = new Map(input.library.map(m => [m.id, m]));
  const old = byId.get(current.missionId);
  const areas = planAreas(input);
  const exclude = new Set([
    current.missionId,
    ...plan.replaced,
    ...plan.missions.flatMap((p, i) => (i === index ? [] : [p.missionId, ...sameDayBlocked(input.library, byId.get(p.missionId))])),
  ]);
  const spent = plan.missions.reduce((t, p, i) => (i === index ? t : t + (byId.get(p.missionId)?.minutes ?? 0)), 0);
  const room = Math.max(old?.minutes ?? 20, dayBudget(input.profile) - spent);
  const was: MissionSlot = current.slot === 'easy' || current.slot === 'main' ? current.slot : old ? sizeOf(old) : 'main';
  const track = swapArea(plan, index, input) ?? old?.track ?? areas[0];
  if (!track) return [];
  const others = otherAreas(plan, index, byId, areas);
  const oldKinds = new Set(old ? kindsOf(old) : []);
  const oldMinutes = old?.minutes ?? (was === 'easy' ? EASY_MAX_MINUTES : 30);
  const mainMax = MAIN_MAX_MINUTES[input.profile.intensity] ?? 45;

  type Rule = { slot: MissionSlot; cap: number; ok: (m: Mission) => boolean; apart: boolean };
  const rules: Record<SwapReason, Rule> = {
    // The same slot, shorter: a too-hard 30-minute workout can be a 20-minute one (Do 20 Minutes of Cardio).
    'too-hard': { slot: was, cap: Math.max(5, oldMinutes - 5), ok: m => m.minutes < oldMinutes, apart: false },
    'too-easy': { slot: 'main', cap: Math.max(room, Math.min(mainMax, oldMinutes + 30)), ok: m => m.minutes > oldMinutes, apart: false },
    'not-relevant': { slot: was, cap: room, ok: m => !kindsOf(m).some(k => oldKinds.has(k)), apart: true },
    'cant-today': { slot: was, cap: room, ok: () => true, apart: true },
    'already-did': { slot: was, cap: room, ok: () => true, apart: true },
    another: { slot: was, cap: room, ok: () => true, apart: false },
  };
  const out: SlotPick[] = [];
  const taken = new Set<string>();
  const draw = (rule: Rule, tag: string) => {
    const ex = new Set([...exclude, ...taken, ...(rule.apart ? sameDayBlocked(input.library, old) : [])]);
    for (let k = 0; out.length < count && k < count * 4; k++) {
      const seed = `${input.salt}:${input.day}:${index}:r${plan.rerolls + 1}:${tag}${k}`;
      const got = chooseForSlot(input, rule.slot, track, ex, rule.cap, seed, others, true);
      if (!got) return;
      // Different kinds: nothing else from its group comes up after it.
      for (const id of sameDayBlocked(input.library, got.mission)) ex.add(id);
      // A swap respects cooldowns and recent swaps: only a day's plan may take one of those back.
      if (!rule.ok(got.mission) || !available(got.mission, input, { shown: true, skips: true })) continue;
      out.push(got);
      for (const id of sameDayBlocked(input.library, got.mission)) taken.add(id);
    }
  };
  draw(rules[reason], reason);
  if (out.length < count && reason !== 'another' && reason !== 'too-hard') draw(rules.another, 'fill');
  return out;
}

/**
 * The plan with the mission at `index` replaced by `mission` (one of `replacementChoices`, or
 * one of the user's own), for `area`, as one swap: the swap count goes up, the old mission
 * can't come back today, and the reason is kept for what the plan learns (core/personalize).
 * `points`: a mission of the user's own earns at most what the replaced one was worth.
 */
export function replaceWith(
  plan: DayPlan,
  index: number,
  mission: Mission,
  area: TrackId,
  reason: SwapReason,
  at: number,
  points?: number,
): DayPlan | null {
  const current = plan.missions[index];
  if (!current || current.missionId === mission.id || plan.missions.some((p, i) => i !== index && p.missionId === mission.id)) return null;
  const next: PlannedMission = { slot: sizeOf(mission), missionId: mission.id, area, ...(typeof points === 'number' ? { points } : {}) };
  return {
    ...plan,
    missions: plan.missions.map((p, i) => (i === index ? next : p)),
    rerolls: plan.rerolls + 1,
    replaced: [...plan.replaced, current.missionId],
    swaps: [...(plan.swaps ?? []), { from: current.missionId, to: mission.id, reason, area: current.area ?? area, at }],
  };
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
