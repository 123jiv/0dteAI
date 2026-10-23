// Daily missions: which missions a user gets today, and swapping one out.
// Goals first: every mission is an approved library mission (the library passed in: content
// MISSIONS) from an area the user chose (or this week's focus, or one their goal points at:
// eligibleAreas), filtered by their situation (a job search, skills), their time, what they
// did and skipped lately, how often each mission should come round, and the time of day.
// Nothing is ever made up or taken from outside the library. Pure and deterministic: the same
// library, profile, history and day always give the same plan.
import { goalPointsAt, jobSearch, kindsOf, leanFor, leansTo, learnFrom, LONG_MINUTES, NO_ADAPTATION, personalWeight, type Adaptation } from './personalize';
import { hash32, mulberry32 } from './random';
import { usableText } from './safety';
import { addDays, DAY_START_HOUR, dayNumber, diffDays, parseDay, type DayKey } from './time';
import { projectFrom } from './titles';
import type { DayPlan, Mission, MissionDone, MissionSlot, PlannedMission, Profile, Requirement, SkillId, SwapReason, TrackId } from './types';

/**
 * A short (easy) mission takes this many minutes or fewer. 20: the approved library runs 5–45
 * minutes (most 20–30), and every area has at least two missions this short.
 */
export const EASY_MAX_MINUTES = 20;

/** A mission's own size, for labelling it: short (EASY_MAX_MINUTES or less) or focused. What a slot can take is fitsSlot. */
export function sizeOf(m: Pick<Mission, 'minutes'>): MissionSlot {
  return m.minutes <= EASY_MAX_MINUTES ? 'easy' : 'main';
}

/**
 * A focused (main) slot takes a mission of this many minutes or more, up to its cap. The same 20
 * as EASY_MAX_MINUTES: a 20-minute mission (Complete 10 Practice Problems, Do 20 Minutes of
 * Cardio) fits either slot, so it isn't squeezed out on days the focused slots take 30 minutes
 * each and leave the short slot 15.
 */
export const MAIN_MIN_MINUTES = 20;

/** Can a slot of this kind take the mission (the time left aside)? A short slot: 20 minutes or less; a focused one: 20 or more. */
export function fitsSlot(m: Pick<Mission, 'minutes'>, slot: MissionSlot): boolean {
  return slot === 'easy' ? m.minutes <= EASY_MAX_MINUTES : m.minutes >= MAIN_MIN_MINUTES;
}

/**
 * The shape of a day: how many missions, how long they may run in all, and how a slot is sized.
 * One row per time choice (DAY_SHAPE); slotsFor, dayBudget and generatePlan read nothing else,
 * and the copy that states the day (content/copy/onboarding pace, legal.json "Your missions") is
 * tested against it.
 */
export interface DayShape {
  /** The day's slots: short ones (20 minutes or less) and focused ones (20 or more). */
  slots: readonly MissionSlot[];
  /** Total minutes the day's missions fit in. */
  budget: number;
  /**
   * The least the day should come to (the low end of the minutes the copy promises): the day's last
   * slot takes a mission that gets it there first, in its own area, when one fits (a one-mission
   * day: 10 minutes or more, not a 5-minute one).
   */
  least: number;
  /** The longest single mission the day hands out, at every step (the guarantee steps too). */
  longest: number;
  /** A focused slot takes a mission this long or longer while one is free, else 20 or more. */
  focusedMin: number;
  /**
   * How far over the time left a slot may go when nothing in its area fits: a short slot
   * stretches to what's left of the budget plus this (never past 20), and chooseForSlot's step 6
   * takes the shortest missions up to this much over.
   */
  overshoot: number;
}

/**
 * The day's shape by the time the user has (launch pass, model J). The reserve rule is the same
 * for every row: a focused slot keeps aside, for each short slot still to come, the shortest
 * mission free in that slot's area (5 for Money, 20 for Fitness; its weekly one first when that
 * one's turn has come: reserveFor), not a flat 10, so a 30-minute mission can pair with a 5-minute
 * one and a 20-minute workout isn't squeezed out. src/core/__tests__/day-shape.sim.test.ts holds
 * the gates every row keeps (the time promise) and what each measured.
 * - 15: one mission, 20 minutes at most.
 * - 30: two, one short and one focused, about 30 minutes in all.
 * - 45: two, the focused one 30 minutes or more when one is free, about 45.
 * - 60+ (an hour or more): intensity decides. Start easy is three with two short, Lock in three
 *   with two focused, Push me four. Below an hour intensity changes nothing.
 * The perfect-day bonus is the same at every shape, so the most a day earns stays 4 × 20 + 15.
 */
export const DAY_SHAPE: {
  readonly 15: DayShape;
  readonly 30: DayShape;
  readonly 45: DayShape;
  readonly 60: Readonly<Record<Profile['intensity'], DayShape>>;
} = {
  15: { slots: ['easy'], budget: 20, least: 10, longest: 20, focusedMin: MAIN_MIN_MINUTES, overshoot: 5 },
  30: { slots: ['easy', 'main'], budget: 35, least: 25, longest: 45, focusedMin: MAIN_MIN_MINUTES, overshoot: 5 },
  45: { slots: ['easy', 'main'], budget: 55, least: 40, longest: 45, focusedMin: 30, overshoot: 5 },
  60: {
    easy: { slots: ['easy', 'easy', 'main'], budget: 65, least: 55, longest: 30, focusedMin: MAIN_MIN_MINUTES, overshoot: 5 },
    lockin: { slots: ['easy', 'main', 'main'], budget: 75, least: 60, longest: 45, focusedMin: MAIN_MIN_MINUTES, overshoot: 5 },
    push: { slots: ['easy', 'main', 'main', 'main'], budget: 100, least: 75, longest: 60, focusedMin: MAIN_MIN_MINUTES, overshoot: 5 },
  },
};

/** The day's shape for this user: the time they have, and with an hour or more their intensity. */
export function dayShape(profile: Pick<Profile, 'intensity' | 'minutes'>): DayShape {
  if (profile.minutes === 15 || profile.minutes === 30 || profile.minutes === 45) return DAY_SHAPE[profile.minutes];
  return DAY_SHAPE[60][profile.intensity] ?? DAY_SHAPE[60].lockin;
}

/** The day by intensity, with an hour or more (DAY_SHAPE[60]). */
export const SLOTS_BY_INTENSITY: Record<Profile['intensity'], readonly MissionSlot[]> = {
  easy: DAY_SHAPE[60].easy.slots,
  lockin: DAY_SHAPE[60].lockin.slots,
  push: DAY_SHAPE[60].push.slots,
};

/** The longest single mission each intensity hands out, with an hour or more (DAY_SHAPE[60]). */
export const MAIN_MAX_MINUTES: Record<Profile['intensity'], number> = {
  easy: DAY_SHAPE[60].easy.longest,
  lockin: DAY_SHAPE[60].lockin.longest,
  push: DAY_SHAPE[60].push.longest,
};

/** The day's slots (DAY_SHAPE): one with 15 minutes, two with 30 or 45, three or four with an hour or more. */
export function slotsFor(profile: Pick<Profile, 'intensity' | 'minutes'>): MissionSlot[] {
  return [...dayShape(profile).slots];
}

/** Total minutes a day's missions fit in (DAY_SHAPE): 20, 35, 55, and 65, 75 or 100 with an hour or more. */
export function dayBudget(profile: Pick<Profile, 'intensity' | 'minutes'>): number {
  return dayShape(profile).budget;
}

/** The longest single mission the day hands out (DAY_SHAPE): what a "too easy" swap can reach too. */
export function longestFor(profile: Pick<Profile, 'intensity' | 'minutes'>): number {
  return dayShape(profile).longest;
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

/**
 * No mission, core habits included, comes up on more than this many days of any seven (Track
 * Everything You Spend Today too: the area gives way to the others for a day instead).
 */
export const MAX_DAYS_IN_WEEK = 4;

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
  /** The days of the week before (the six days before the one planned) each mission was in a plan: MAX_DAYS_IN_WEEK. */
  recent?: Record<string, DayKey[]>;
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
  /**
   * Today's missions from an active program, placed first. `membersOnly`: an UNSETLD+ Plan, whose
   * day never earns more than the same day planned without it (generatePlan, capForPlan).
   */
  program?: {
    id: string;
    missionIds: string[];
    membersOnly?: boolean;
    /** The most the day's missions may earn on a membersOnly Plan's day (state/store: ownDay's points). */
    ceiling?: number;
  } | null;
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
  /** A mission already in the plan on MAX_DAYS_IN_WEEK of the last six days. */
  often?: boolean;
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
  if (!relax.often) {
    const week = (input.history.recent?.[m.id] ?? []).filter(d => d < input.day && diffDays(d, input.day) < 7);
    if (new Set(week).size >= MAX_DAYS_IN_WEEK) return false;
  }
  return true;
}

/** The areas the user picked, or the defaults before onboarding (it can't finish with none). */
function chosenAreas(profile: Pick<Profile, 'tracks'>): TrackId[] {
  return profile.tracks.length ? [...profile.tracks] : [...DEFAULT_PROFILE.tracks];
}

/**
 * Areas the user didn't pick that their answers and goal make eligible, in this order:
 * School for someone whose goal is about school (grades, homework, an exam: age alone never
 * counts) unless they said they're out of school (a No kept from an earlier version; onboarding
 * no longer asks: picking School means in school); Career for a job or internship search
 * (jobSearch); Projects for someone building something (they said so, or the goal names it: an
 * app, a brand, a launch). A weekly focus brings its own area in on its own (eligibleAreas).
 */
export function impliedAreas(profile: Profile, day?: DayKey): TrackId[] {
  // A goal the safety check refuses (core/safety) brings nothing in, even where its unsafe words
  // sit inside the "job" phrase taken out below.
  const goal = usableText(profile.goal) ? (profile.goal ?? '') : '';
  const out: TrackId[] = [];
  if (profile.school !== false && goalPointsAt(goal, 'school')) out.push('school');
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
 * three, then the other areas in rotation (the goal's other areas first with
 * `goalFocused`); on the third day the others go first.
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
  /**
   * On the days the lead doesn't rest, `preferred` take the focused slots after the lead, before
   * the areas the goal doesn't name; the short slots keep the turn (generatePlan: whenever no weekly
   * focus leads).
   */
  goalFocused = false,
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
  const goalFirst = (xs: readonly TrackId[]) => [...xs.filter(t => preferred.includes(t)), ...xs.filter(t => !preferred.includes(t))];
  const others = rest || preferAlways ? goalFirst(turn) : turn;
  let queue = rest ? [...others, lead] : [lead, ...others];
  // The goal's areas hold the focused slots ("Improve grades and train consistently": School and
  // Fitness, not Discipline, on the days the lead doesn't rest); the areas the goal doesn't name keep
  // the short slots in turn, and focused ones on the rest days.
  const mains = slots.filter(s => s === 'main').length;
  if (goalFocused && !rest && !preferAlways && preferred.length && mains > 1) {
    const focused = [lead, ...goalFirst(turn)].slice(0, mains);
    queue = [...focused, ...turn.filter(t => !focused.includes(t))];
  }
  // On the lead's rest day an area the goal doesn't name keeps one focused slot, even when the goal
  // names more areas than the day has focused slots (a goal naming Career, Skills and Projects, with
  // Fitness chosen too: the goal's areas would otherwise hold both every day). A 45-minute day, with
  // one focused slot, gives it every other rest day, so the goal's areas keep most of them (at 30
  // minutes the one focused slot is too short for the other areas' focused missions anyway).
  const free = turn.filter(t => !preferred.includes(t));
  const freeDay = mains > 1 || (mains === 1 && dayBudget(profile) >= DAY_SHAPE[45].budget && mod(Math.floor(d / 3), 2) === 0);
  if (goalFocused && rest && !preferAlways && freeDay && free.length && queue.slice(0, mains).every(t => preferred.includes(t))) {
    const focused = [...queue.slice(0, mains - 1), free[0]];
    queue = [...focused, ...queue.filter(t => !focused.includes(t))];
  }
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

/**
 * How many days a mission's turn takes to come round, by how often it should come up: a
 * high-frequency one every 2–3 days, a medium one every 4–5. A weekly or rarer one's turn is its
 * whole cooldown (turnOf).
 */
export const TURN_DAYS: Record<'high' | 'medium', number> = { high: 2.5, medium: 4.5 };
/**
 * How far its turn moves a mission's weight: down to a quarter just after it was shown, up to ten
 * times when it's long overdue or was never shown. Ten, not two or three: the goal and the time
 * of day weigh missions up to three times apart (a goal match 1.5, an evening mission planned in
 * the morning 0.5), and a mission they weigh down still has to come round within a few weeks.
 */
export const TURN_MIN = 0.25;
export const TURN_MAX = 10;
/** Shown or done yesterday: well down whatever its turn, so a day doesn't repeat the one before. */
export const YESTERDAY_WEIGHT = 0.3;

/**
 * How far round a mission's turn is on `day`: the days since it was last shown, done or swapped
 * away, over its turn (TURN_DAYS; a weekly or rarer one, its cooldown). 1 or more: its turn has
 * come. Never shown: fully due (Infinity), except one rarer than weekly (Check One Subscription,
 * Improve One Resume Bullet) in the user's first week (`recent`): its turn comes in the second week,
 * so the first week is the staples and the weekly ones, not every monthly mission at once.
 */
export function turnOf(
  m: Pick<Mission, 'id' | 'frequency' | 'cooldownDays'>,
  history: Pick<MissionHistory, 'lastDone' | 'lastPlanned'> & Partial<Pick<MissionHistory, 'skips' | 'recent'>>,
  day: DayKey,
): number {
  const last = [history.lastPlanned[m.id], history.lastDone[m.id], history.skips?.[m.id]?.last].reduce<DayKey | undefined>(
    (a, b) => (b && (!a || b > a) ? b : a),
    undefined,
  );
  if (!last) {
    if (m.frequency !== 'low' || m.cooldownDays <= 7 || !history.recent) return Infinity;
    const days = daysIn(history, day);
    return days >= 6 ? Infinity : days / 6;
  }
  const days = m.frequency === 'low' ? Math.max(1, m.cooldownDays) : TURN_DAYS[m.frequency ?? 'high'];
  return diffDays(last, day) / days;
}

/** How many of the six days before `day` had a plan (MissionHistory.recent): under 6 in a user's first week. */
function daysIn(history: Pick<MissionHistory, 'recent'>, day: DayKey): number {
  return new Set(Object.values(history.recent ?? {}).flatMap(days => days.filter(d => d < day && diffDays(d, day) < 7))).size;
}

/**
 * A mission OVERDUE_TURNS behind its turn. Never shown counts only once the user has a week of
 * plans: on Day 2 every short mission is new, and they shouldn't all crowd into focused slots.
 */
function overdue(m: Mission, input: Pick<PlanInput, 'history' | 'day'>): boolean {
  const turn = turnOf(m, input.history, input.day);
  return turn >= OVERDUE_TURNS && (turn < Infinity || daysIn(input.history, input.day) >= 6);
}

/**
 * A plan for the week (Create Your Study Plan for the Week, Make a Spending Plan for This Week,
 * Review Your Calendar for the Next 7 Days: weekly or rarer, tagged planning) belongs at the start
 * of the week, Sunday to Tuesday (WEEK_START_DAYS). It isn't tied to those days (it can't miss a
 * week), but its turn comes on them: later in the week it comes up much less, and only once two
 * turns overdue does it fill a slot like any other mission. Otherwise whatever weekday it first
 * lands on, it keeps, a week apart.
 */
export const WEEK_START_DAYS: readonly number[] = [0, 1, 2];
const weekPlan = (m: Mission) => m.frequency === 'low' && Boolean(m.tags?.includes('planning'));
const weekStart = (day: DayKey) => WEEK_START_DAYS.includes(parseDay(day).getDay());
/**
 * How often a slot gets a plan for the week whose turn has come, Sunday to Tuesday (DUE_SHARE for
 * the other weekly missions). Always on a one-mission day: its area holds the day only now and then.
 */
export const WEEK_PLAN_SHARE = 0.8;

/** A weekly or rarer mission whose turn has come (its cooldown is over, or it was never shown; a plan for the week, Sunday to Tuesday). */
function dueLow(m: Mission, input: Pick<PlanInput, 'history' | 'day'>): boolean {
  return m.frequency === 'low' && turnOf(m, input.history, input.day) >= 1 && (!weekPlan(m) || weekStart(input.day));
}

/**
 * A plan for the week kept for the start of the week: Wednesday to Saturday, until it's two turns
 * overdue (never shown counts once the user has a week of plans, so someone starting on a Thursday
 * gets their first one on Sunday).
 */
function heldForWeekStart(m: Mission, input: Pick<PlanInput, 'history' | 'day'>): boolean {
  if (!weekPlan(m) || weekStart(input.day)) return false;
  const turn = turnOf(m, input.history, input.day);
  return turn < 2 || (turn === Infinity && daysIn(input.history, input.day) < 6);
}

function weight(m: Mission, input: Pick<PlanInput, 'history' | 'day' | 'profile' | 'adapt' | 'hour'>, track: TrackId): number {
  const adapt = input.adapt ?? NO_ADAPTATION;
  let w = (m.weight ?? 1) * personalWeight(m, track, leanFor(input.profile, input.day), adapt);
  if (m.track !== track) w *= 0.6; // counts toward this area, but it's mainly another one
  const skills = input.profile.skills ?? [];
  if (skills.length) {
    // A drill for a skill they named beats a generic session; a medium they didn't name comes up less.
    if (m.requires?.some(r => (skills as readonly string[]).includes(r))) w *= 2;
    if (m.fits?.length) w *= m.fits.some(s => skills.includes(s)) ? 1.5 : 0.25;
  }
  // Its turn: the longer a mission has been away for how often it should come round, the more it
  // comes up, so an area's whole library turns over instead of the same few missions. One the user
  // turned down (swapped as not relevant, or its kind swapped again and again) doesn't build up a
  // turn: it can still come back, but nothing pushes it.
  const turn = turnOf(m, input.history, input.day);
  const turnedDown = Boolean(adapt.notForMe?.[m.id]) || kindsOf(m).some(k => adapt.swappedKinds[k]);
  let t = Math.min(turnedDown ? 1 : TURN_MAX, Math.max(TURN_MIN, turn));
  const shown = input.history.lastPlanned[m.id];
  const done = input.history.lastDone[m.id];
  if ((shown && diffDays(shown, input.day) <= 1) || (done && diffDays(done, input.day) <= 1)) t = Math.min(t, YESTERDAY_WEIGHT);
  w *= t;
  // A plan for the week, Wednesday to Saturday: it belongs at the start of the week (WEEK_START_DAYS).
  if (weekPlan(m) && !weekStart(input.day)) w *= 0.2;
  const skip = input.history.skips[m.id];
  if (skip) w /= 1 + skip.count;
  // A plan made in the morning leans toward what can be done now; tonight's prep can still come up.
  if (m.when === 'evening' && !m.anchor && input.hour != null && input.hour >= DAY_START_HOUR && input.hour < AFTERNOON_HOUR) w *= 0.5;
  return w;
}

/** How often the week's focus area gets a mission the focus names or tags, when one fits. */
export const FOCUS_SHARE = 0.8;

/**
 * How often a slot gets one of its area's core habits (study, train, build, learn) when one is
 * free; half that the day after. Under half: the habits still come up more than any other single
 * mission, and the rest of the area gets enough slots for every mission in it to come round
 * within a few weeks.
 */
export const CORE_SHARE = 0.45;
/**
 * CORE_SHARE in an area the goal names ("Build and ship an app": Projects and Skills): what the
 * user came for keeps its core habits (Work on Your Project for 30 Minutes) on more of its days.
 * 0.5, not 0.6: at 0.55 and up, School's two habits crowd out the rest of School for someone whose
 * goal is grades (Start an Assignment Before It's Urgent, Turn Today's Notes Into 10 Questions: not
 * once in four weeks in three or four installs of ten). Not in a weekly focus week: the focus leads
 * and the week is as it was.
 */
export const GOAL_CORE_SHARE = 0.5;

/**
 * How often a slot gets a weekly or rarer mission of its area whose turn has come, when there is
 * one: Create Your Study Plan for the Week comes round about weekly, not as one of eight equal
 * picks on the days its area happens to have a slot its size. Under half, so on the days one is
 * due the area's other missions still get most slots: it comes up within a few days of its turn.
 */
export const DUE_SHARE = 0.4;

/**
 * A short mission this many turns overdue (or never shown in a week of plans) may take a focused
 * slot of its area on a day its area holds no short slot (Money or Organization takes it, or the
 * area leads): with Career, Skills and Organization and an hour or more, Career and Skills only ever hold
 * focused slots, and Practice Explaining One Project You've Built still comes round. A support task
 * this overdue takes a short slot next to its area's real mission (generatePlan).
 */
export const OVERDUE_TURNS = 3;

/**
 * Core habits (anchors) come up on many days; the rest of the area's missions fill the other
 * days by turn (weight), so the habits that matter repeat without every day looking the same,
 * and a weekly mission whose turn has come goes ahead of both on most days (DUE_SHARE).
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
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  // A weekly or rarer mission whose turn has come (DUE_SHARE); not on Day 1, which is the staples.
  const due = firstDay ? [] : cands.filter(m => dueLow(m, input));
  // A one-mission day (15 minutes) that has its plan for the week due takes it: the area has few days.
  const planShare = dayShape(input.profile).slots.length === 1 ? 1 : WEEK_PLAN_SHARE;
  if (due.length && mulberry32(hash32(`${seed}:due`))() < (due.some(weekPlan) ? planShare : DUE_SHARE)) return pickWeighted(due, input, track, seed);
  // A core habit counts as core only in its own area (Learn a Career Skill is core for Career, not Skills).
  const core = cands.filter(m => m.anchor && m.track === track);
  const rest = cands.filter(m => !(m.anchor && m.track === track));
  if (core.length && rest.length) {
    // Day 1 (nothing planned before) is all core habits where there are any: the first list
    // should be the staples, not luck. After that, when every core habit on offer was in
    // yesterday's plan, today leans on the rest of the area.
    const yesterday = addDays(input.day, -1);
    const base = lean.goalAreas.includes(track) && !lean.focusArea ? GOAL_CORE_SHARE : CORE_SHARE;
    const share = firstDay ? 1 : core.some(m => input.history.lastPlanned[m.id] !== yesterday) ? base : base / 2;
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
 * At most this many missions from one area in a day, unless it's this week's focus or the user's
 * only area. generatePlan's one exception: a short slot that only a mission past the day's time
 * could fill, with no near-twin that fits either, takes a third, shorter one (a Push me day of two
 * areas, Fitness's short missions all cardio and its focused one cardio too).
 */
export const MAX_PER_AREA = 2;

/** What generatePlan lets a slot take beyond the usual, from the rest of the day (chooseForSlot). */
export interface SlotRules {
  /**
   * A focused slot may take a short mission whose turn has come: a weekly or rarer one, or one
   * OVERDUE_TURNS overdue in an area outside `shortAreas` (generatePlan: while the day keeps a
   * focused mission).
   */
  takeShort?: boolean;
  /** The areas holding today's short slots: their short missions can come up there instead. */
  shortAreas?: readonly TrackId[];
  /** The least a focused slot takes (generatePlan: LONG_MINUTES once another focused slot holds less). */
  mainMin?: number;
  /**
   * The areas already holding a real mission of the day (20 minutes or more, not a support task): a
   * support task only joins one of these. Left out: the areas in the day.
   */
  held?: readonly TrackId[];
  /** The least any mission may take (the day's last slot's first try: DayShape least). */
  atLeast?: number;
  /**
   * A focused slot that prefers longer missions (`mainMin` over 20: a 45-minute day's 30) still takes
   * a 20-minute one OVERDUE_TURNS behind its turn, so an area holding only the focused slot has its
   * 20-minute missions come round (Publish Something You Made, Improve Something You Made Yesterday).
   */
  overdueFocused?: boolean;
  /**
   * This area only, and only what fits the time left (steps 1 to 6): nothing still in its
   * cooldown or past the overshoot. generatePlan: the week's focus on a Plan day past its time,
   * where null leaves the slot out rather than giving it to another area.
   */
  only?: TrackId;
}

/**
 * One mission for a slot, and the area it fills. Every step draws from `input.library` (the
 * approved missions) and the plan areas only (planAreas), and tries, in order, stopping at the
 * first that has a candidate:
 * 1. the slot's area at the slot's size within the time left (missions shown lately but
 *    not done wait, then are let back), then (a focused slot) a shorter one in that area;
 * 2. the user's areas not in the day yet, the same way, so the day keeps its spread;
 * 3. the areas already in the day, at the slot's size, then shorter;
 * 4. missions the user swapped away lately, from any of their areas;
 * 5. missions already on MAX_DAYS_IN_WEEK of the last six days, then weekly or rarer missions shown
 *    within their cooldown;
 * 6. the shortest few of their areas' missions at the slot's size, a little over the time left
 *    (DayShape overshoot);
 * 7. a short slot: a short mission still in its cooldown (as in 9; not a weekly or rarer one), so
 *    the day keeps its time;
 * 8. the shortest few of any size (a short slot takes a focused mission when that's all there is);
 * 9. repeatable missions still in their cooldown: not yesterday's while another is left, then the
 *    one furthest through its cooldown (M5, monthly, isn't back within days), then the oldest done.
 * Steps 7 to 9 also let back what the plan learned to leave out (longer missions, preferShort),
 * up to the longest the day hands out (DayShape longest).
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
  rules: SlotRules = {},
): SlotPick | null {
  const areas = planAreas(input);
  const lean = leanFor(input.profile, input.day);
  const shape = dayShape(input.profile);
  const intensityMax = shape.longest;
  // Long missions mostly left undone lately while shorter ones get proven: keep focused missions
  // shorter, every other day, so long ones still come up and the user can show they do them (with
  // none planned, what preferShort learns from would never change). A preference only: the last
  // steps (7, 8) take a longer one rather than leave a slot empty.
  const mainMax = Math.min(intensityMax, input.adapt?.preferShort && mod(dayNumber(input.day), 2) === 0 ? LONG_MINUTES - 5 : Infinity);
  // Two missions from one area is enough for a day ("Study One Subject", "Complete 10 Practice
  // Problems" and "Spend 30 Minutes on Your Hardest Class" is too much School) unless it's the
  // week's focus or their only area; a swap keeps its own area.
  const full = (t: TrackId) =>
    !crowd && areas.length > 1 && t !== lean.focusArea && !(keepTrack && t === track) && usedTracks.filter(x => x === t).length >= MAX_PER_AREA;
  const open = areas.filter(t => !full(t) && (!rules.only || t === rules.only));
  const trackUsed = !keepTrack && usedTracks.includes(track);
  const fresh = trackUsed ? open.filter(t => !usedTracks.includes(t)) : [track, ...open.filter(t => t !== track && !usedTracks.includes(t))];
  const freshSet = new Set(fresh);
  const rest = trackUsed ? [...(full(track) ? [] : [track]), ...open.filter(t => t !== track && !freshSet.has(t))] : open.filter(t => !freshSet.has(t));
  const all = [...fresh, ...rest];
  const sizes: MissionSlot[] = slot === 'main' ? ['main', 'easy'] : ['easy'];

  // `size` null: any size. Nothing over the longest the day hands out, at any step (a 15-minute day
  // never gets a 30-minute mission, Start easy never a 45-minute workout).
  const mainMin = Math.max(MAIN_MIN_MINUTES, rules.mainMin ?? 0);
  const atLeast = rules.atLeast ?? 0;
  const fits = (m: Mission, size: MissionSlot | null, cap: number, top = mainMax) =>
    (size === null || (fitsSlot(m, size) && (size === 'easy' || m.minutes >= mainMin || (Boolean(rules.overdueFocused) && overdue(m, input))))) &&
    m.minutes >= atLeast &&
    m.minutes <= Math.min(cap, top) &&
    !exclude.has(m.id);

  // For a user who named skills, a mission made for another medium (a video one for a coder)
  // only when nothing else in the area is left.
  const named = input.profile.skills ?? [];
  const offMedium = (m: Mission) => named.length > 0 && Boolean(m.fits?.length) && !m.fits!.some(x => named.includes(x));

  // Only when the area has nothing else that fits: a niche mission, or one made for a medium
  // (`fits`) the user never named, unless the week's focus or the goal points at it; a follow-up
  // (Improve Something You Made Yesterday) unless real work in its area was proven yesterday; and on
  // Day 1, before 3 PM, a mission for tonight (the first list should be doable now).
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  const dayBefore = addDays(input.day, -1);
  // With `takeShort`, a focused slot also takes a weekly or rarer mission of its area whose turn has
  // come, so it comes round about on time where its area only ever holds a focused slot (Review One
  // Important Metric for someone whose short slot always goes to Money); and a short mission long
  // overdue (OVERDUE_TURNS) in an area holding no short slot today, so an area that never gets the
  // short slot (Money or Organization takes it, or it's the lead) still has its short missions come
  // round. Not on Day 1 (the staples).
  const takesShort = (m: Mission, size: MissionSlot | null, cap: number, area: TrackId) =>
    Boolean(rules.takeShort) &&
    !firstDay &&
    size === 'main' &&
    fits(m, null, cap) &&
    (dueLow(m, input) || (Boolean(rules.shortAreas && !rules.shortAreas.includes(area)) && overdue(m, input)));
  // Near-twins in one area (a group: Finish One Thing You've Been Avoiding and Finish One Unfinished
  // Task, Clear Your Desk and Reset Your Workspace, the cardio missions) count together for the four
  // days in seven, and one meant for a few times a week (medium or low frequency) isn't the day after
  // its twin, so the area doesn't read the same day after day. Cardio (high frequency) may follow
  // cardio, or the 30-minute ones would rarely come up. A preference within the area: where its twins
  // are all it has (Fitness's short missions are both cardio), the area keeps its slot. Core habits
  // keep their own rules. A focused one OVERDUE_TURNS behind its turn may follow a short twin: where
  // the area holds a focused slot only on the lead's rest day (an area the goal doesn't name) and its
  // short twin always lands the day before (Finish One Unfinished Task), Finish One Thing You've Been
  // Avoiding still comes round. Only there: with no goal, in a weekly focus week, or in an area the
  // goal names, the rule stands as it was.
  const restDayOnly = (m: Mission) =>
    !firstDay && !lean.focusArea && lean.goalAreas.some(a => areas.includes(a)) && !lean.goalAreas.includes(m.track);
  const twinsOk = (m: Mission, relax: Relax) => {
    if (!m.group || m.anchor) return true;
    const twins = input.library.filter(x => x.id !== m.id && x.group === m.group && !x.anchor && x.track === m.track);
    if (!twins.length) return true;
    const shownYesterday = twins.filter(x => input.history.lastPlanned[x.id] === dayBefore);
    const owed = restDayOnly(m) && !fitsSlot(m, 'easy') && shownYesterday.every(x => fitsSlot(x, 'easy')) && overdue(m, input);
    if (!relax.shown && m.frequency !== 'high' && shownYesterday.length && !owed) return false;
    if (relax.often) return true;
    const week = [m, ...twins].flatMap(x => (input.history.recent?.[x.id] ?? []).filter(d => d < input.day && diffDays(d, input.day) < 7));
    return new Set(week).size < MAX_DAYS_IN_WEEK;
  };
  // Two planning missions in a day (Plan Tomorrow's Top 3 and Create Your Study Plan for the Week)
  // read as the same task twice: once the day has one, an area takes another of its missions when it
  // has one. The day's missions and their groups are in `exclude`, and a planning mission's group
  // holds only planning ones, so a planning mission there means one is in the day.
  const planning = (m: Mission) => Boolean(m.tags?.includes('planning'));
  const planned = input.library.some(m => exclude.has(m.id) && planning(m));
  const madeYesterday = (m: Mission) =>
    input.library.some(x => serves(x, m.track) && x.minutes >= MAIN_MIN_MINUTES && !x.tags?.includes('support') && input.history.lastDone[x.id] === dayBefore);
  const morning = input.hour != null && input.hour >= DAY_START_HOUR && input.hour < AFTERNOON_HOUR + 3;
  // Internship searches are for students: someone working and not in school gets job missions,
  // unless their goal or focus names internships.
  const workingAdult = input.profile.work === true && input.profile.school !== true;
  const internshipOnly = (m: Mission) => workingAdult && Boolean(m.tags?.includes('internship')) && !m.tags!.includes('job') && !leansTo(m, lean);
  const lastResort = (m: Mission) =>
    internshipOnly(m) ||
    ((Boolean(m.tags?.includes('niche')) || (named.length === 0 && Boolean(m.fits?.length))) && !leansTo(m, lean)) ||
    (Boolean(m.tags?.includes('follow-up')) && !madeYesterday(m)) ||
    (firstDay && morning && m.when === 'evening');

  // A support task (Write Your Next 3 Project Actions) is never an area's only mission of the
  // day while a real one (a work session, a workout) fits: it joins an area holding a real one
  // (`rules.held`), not one holding only another short task (Review One Important Metric).
  // A meal counts the same way unless the goal or focus is about food ("Eat healthier").
  const held = rules.held ?? usedTracks;
  const supportOnly = (m: Mission, area: TrackId) =>
    (Boolean(m.tags?.includes('support')) || (m.group === 'meal' && !leansTo(m, lean))) && !held.includes(area);

  // `strict` 2: only the usual missions, so a slot takes a real one a little longer (the stretch)
  // or shown lately before a last resort (tonight's Plan Tomorrow's Top 3 on a Day 1 morning); 1:
  // a last resort too, but still not a support task alone (a follow-up a little longer before Write
  // Your Next 3 Project Actions); 0: anything that fits.
  const tryAreas = (list: readonly TrackId[], size: MissionSlot | null, relax: Relax, cap: number, strict: 0 | 1 | 2 = 0): SlotPick | null => {
    for (const area of list) {
      const cands = input.library.filter(
        m =>
          serves(m, area) &&
          (fits(m, size, cap) || takesShort(m, size, cap, area)) &&
          available(m, input, relax) &&
          (relax.often || !heldForWeekStart(m, input)),
      );
      const onMedium = cands.filter(m => !offMedium(m));
      const base = onMedium.length ? onMedium : cands;
      const usual = base.filter(m => !lastResort(m) && !supportOnly(m, area));
      const real = base.filter(m => !supportOnly(m, area));
      const pool = usual.length || strict === 2 ? usual : real.length || strict === 1 ? real : base;
      const apart = pool.filter(m => twinsOk(m, relax));
      const varied = apart.filter(m => !(planned && planning(m)));
      const m = pick(varied.length ? varied : apart.length ? apart : pool, input, area, `${seed}:${size ?? 'any'}:${area}`);
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
        const got = tryAreas([track], null, { shown }, maxMinutes, 2);
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
      for (const strict of [2, 1, 0] as const) {
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
  // 5: a mission already on four of the last six days (Track Everything You Spend Today a fifth day),
  // then a weekly or rarer mission shown within its cooldown.
  const loose: Relax = { shown: true, skips: true, often: true, lowShown: true };
  for (const relax of [{ ...loose, lowShown: false }, loose]) {
    for (const size of sizes) {
      const got = tryAreas(all, size, relax, Math.max(maxMinutes, stretch));
      if (got) return got;
    }
  }
  // 6: nothing fits the time left; the shortest few of their areas' missions, a little over (DayShape overshoot).
  const over = shortest(all, sizes, maxMinutes + shape.overshoot, loose);
  if (over) return over;
  if (rules.only) return null;
  // A repeatable mission still in its cooldown, relaxed as little as can be: not one done yesterday
  // while another is left, then the one furthest through its cooldown (a weekly one done 4 days ago
  // before a monthly one done 4 days ago), then the one done longest ago.
  const lastDone = input.history.lastDone;
  const yesterday = (m: Mission) => (lastDone[m.id] && diffDays(lastDone[m.id], input.day) <= 1 ? 1 : 0);
  const waitLeft = (m: Mission) => (lastDone[m.id] ? (m.cooldownDays - diffDays(lastDone[m.id], input.day)) / m.cooldownDays : 0);
  const cooling = (size: MissionSlot | null, cap = intensityMax, weekly = true): SlotPick | null => {
    for (const area of all) {
      const cands = input.library
        .filter(m => serves(m, area) && fits(m, size, cap, intensityMax) && (weekly || (m.frequency !== 'low' && twinsOk(m, {}))) && available(m, input, { ...loose, cooldown: true }))
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
  };
  // 7: a short slot takes a short everyday mission still in its cooldown before a longer one, so the
  // day keeps its time (Plan Tomorrow's Top 3 a day early, not a 45-minute workout in the short slot);
  // a weekly or rarer one keeps its week, and near-twins keep apart.
  if (slot === 'easy') {
    const cool = cooling('easy', Math.max(maxMinutes, stretch), false) ?? cooling('easy', intensityMax, false);
    if (cool) return cool;
  }
  // 8: any size, within the longest the day hands out.
  const any = shortest(all, [null], intensityMax, loose, intensityMax);
  if (any) return any;
  // 9: any size still in its cooldown.
  return cooling(null);
}

/**
 * Missions of two areas that are the same half hour under two names: Spend 30 Minutes Building a
 * Career Skill and Practice Coding for 30 Minutes, for a coder looking for a software job. A day
 * holds one of them, as if they were a group (not a `group` in the library, so swaps don't learn
 * them as one kind).
 */
const SAME_TASK: readonly (readonly [string, string])[] = [['C7', 'K1']];

/** A mission's id plus the other name of the same task (SAME_TASK). */
function sameTask(id: string): string[] {
  return [id, ...SAME_TASK.flatMap(([a, b]) => (id === a ? [b] : id === b ? [a] : []))];
}

/**
 * A mission's id plus every other mission in its group (and SAME_TASK): none of them can join a day
 * that has it. generatePlan's one exception: a short slot that only a mission past the day's time
 * could fill takes a near-twin that keeps the time (Do 20 Minutes of Cardio next to Walk for 30
 * Minutes for Fitness alone at 30 or 45 minutes); never a second planning mission.
 */
function sameDayBlocked(library: readonly Mission[], m: Mission | undefined): string[] {
  if (!m) return [];
  if (!m.group) return sameTask(m.id);
  return [...sameTask(m.id), ...library.filter(x => x.group === m.group && x.id !== m.id).map(x => x.id)];
}

/**
 * The areas the day's missions (all but the one at `index`) hold a real mission for: 20 minutes or
 * more, not a support task. A support task only joins one of these.
 */
function realAreas(missions: readonly (PlannedMission | undefined)[], byId: ReadonlyMap<string, Mission>, areas: readonly TrackId[], index = -1): TrackId[] {
  return missions.flatMap((p, i) => {
    const m = p && i !== index ? byId.get(p.missionId) : undefined;
    return m && m.minutes >= MAIN_MIN_MINUTES && !m.tags?.includes('support') ? [p!.area ?? areaFor(m, areas)] : [];
  });
}

/** The area a mission counts for in this user's day: the first of their areas it serves, or its own. */
function areaFor(m: Mission, areas: readonly TrackId[]): TrackId {
  return areas.find(t => serves(m, t)) ?? m.track;
}

/** A short mission of `area` whose turn has come (weekly or rarer), within `maxMinutes`: generatePlan's days of one focused slot (30 and 45 minutes). */
function dueShort(input: PlanInput, area: TrackId, used: ReadonlySet<string>, maxMinutes: number, seed: string): SlotPick | null {
  const due = input.library.filter(
    m => serves(m, area) && dueLow(m, input) && fitsSlot(m, 'easy') && m.minutes <= maxMinutes && !used.has(m.id) && available(m, input),
  );
  const mission = pickWeighted(due, input, area, seed);
  return mission ? { mission, area } : null;
}

/**
 * A support task (Write Your Next 3 Project Actions) is never its area's only mission of the day, so
 * where the area holds one slot a day it would never come up. Once its turn is OVERDUE_TURNS
 * overdue (or it was never shown), a short slot takes it next to its area's real mission, on a day
 * of 45 minutes or more (at 15 or 30 minutes the day has no time for it). That area then has two
 * missions in the day, never more (MAX_PER_AREA, the week's focus aside).
 */
function supportFor(
  input: PlanInput,
  held: readonly TrackId[],
  usedTracks: readonly TrackId[],
  used: ReadonlySet<string>,
  maxMinutes: number,
  seed: string,
): SlotPick | null {
  if (Object.keys(input.history.lastPlanned).length === 0 || dayBudget(input.profile) < DAY_SHAPE[45].budget) return null;
  const focus = leanFor(input.profile, input.day).focusArea;
  for (const area of planAreas(input)) {
    if (!held.includes(area) || (area !== focus && usedTracks.filter(t => t === area).length >= MAX_PER_AREA)) continue;
    const due = input.library.filter(
      m =>
        serves(m, area) &&
        Boolean(m.tags?.includes('support')) &&
        fitsSlot(m, 'easy') &&
        m.minutes <= maxMinutes &&
        !used.has(m.id) &&
        available(m, input) &&
        overdue(m, input),
    );
    const mission = pickWeighted(due, input, area, `${seed}:support`);
    if (mission) return { mission, area };
  }
  return null;
}

/**
 * A Plan day adds the day's own missions only while this many minutes of its budget are left:
 * Plans run on their own time (every Plan mission goes in), and what's left of the time the user
 * chose is what the rest of the day gets.
 */
export const PLAN_DAY_MIN_LEFT = 10;

/**
 * The shortest short mission free in an area today (a focused slot's reserve for a short slot
 * still to come, DAY_SHAPE): 5 for Money, 15 for School, 20 for Fitness. A support task (Write Your
 * Next 3 Project Actions) only with `support`: it never holds a slot alone. `none` (10) when none is free.
 */
function shortestFor(input: PlanInput, area: TrackId, used: ReadonlySet<string>, none = 10, support = false): number {
  let min = Infinity;
  for (const m of input.library)
    if (serves(m, area) && fitsSlot(m, 'easy') && !used.has(m.id) && m.minutes < min && (support || !m.tags?.includes('support')) && available(m, input, { shown: true }))
      min = m.minutes;
  return Number.isFinite(min) ? min : none;
}

/**
 * What a focused slot keeps aside for a short slot still to come in `area`: the shortest weekly or
 * rarer mission of the area whose turn has come (Make a Spending Plan for This Week, 10, not Track
 * Everything You Spend Today, 5, so it can come round on a 30-minute day), else shortestFor.
 */
function reserveFor(input: PlanInput, area: TrackId, used: ReadonlySet<string>): number {
  let due = Infinity;
  for (const m of input.library) if (serves(m, area) && fitsSlot(m, 'easy') && !used.has(m.id) && m.minutes < due && dueLow(m, input) && available(m, input)) due = m.minutes;
  return Number.isFinite(due) ? due : shortestFor(input, area, used);
}

/**
 * The shortest short mission an area can hold a day with on its own today: free, and not a
 * support task or a follow-up, which never stand alone (Write Your Next 3 Project Actions). Fitness
 * is 20 (its cardio), Projects usually 20 too (Publish Something You Made). Infinity: none.
 */
function shortestAlone(input: PlanInput, area: TrackId): number {
  let min = Infinity;
  for (const m of input.library) {
    if (!serves(m, area) || !fitsSlot(m, 'easy') || m.minutes >= min) continue;
    if (m.tags?.includes('support') || m.tags?.includes('follow-up')) continue;
    if (available(m, input, { shown: true })) min = m.minutes;
  }
  return min;
}

/**
 * The area of a one-mission day (15 minutes). The areas take turns, so each one the user picked
 * is in the week: with a goal, its areas get about half the days and the others take turns in
 * between; with a weekly focus, the focus has two days in three and the others take turns on the
 * third; with a priority, it starts the turn. An area missing from the six days before takes the
 * day (a turn its missions couldn't fill), then, Sunday to Tuesday, an area whose plan for the
 * week is due (Create Your Study Plan for the Week can only come on a day its area has the one
 * slot). The focus's days are its own.
 * Day 1 keeps the lead (slotTracks).
 */
function oneMissionArea(input: PlanInput, areas: readonly TrackId[], lead: TrackId | undefined, goalAreas: readonly TrackId[], focusLeads: boolean): TrackId | undefined {
  if (!areas.length) return undefined;
  const d = dayNumber(input.day);
  let turn: TrackId[];
  let k: number;
  if (focusLeads && lead) {
    if (areas.length < 2 || mod(d, 3) !== 0) return lead;
    const rest = areas.filter(t => t !== lead);
    turn = [...rest.filter(t => goalAreas.includes(t)), ...rest.filter(t => !goalAreas.includes(t))];
    k = Math.floor(d / 3);
  } else {
    const others = areas.filter(t => !goalAreas.includes(t));
    turn = [];
    if (!goalAreas.length && lead) turn = [lead, ...areas.filter(t => t !== lead)];
    else if (!goalAreas.length || goalAreas.length >= others.length) turn = [...goalAreas, ...others];
    else others.forEach((t, i) => turn.push(goalAreas[i % goalAreas.length], t));
    k = d;
  }
  const area = turn[mod(k, turn.length)];
  // An area not in the day once in the six days before (once the user has six), in turn order.
  if (daysIn(input.history, input.day) >= 6) {
    const byId = new Map(input.library.map(m => [m.id, m]));
    const seen = new Set<TrackId>();
    for (const [id, days] of Object.entries(input.history.recent ?? {})) {
      const m = byId.get(id);
      if (m && days.some(x => x < input.day && diffDays(x, input.day) < 7)) seen.add(areaFor(m, areas));
    }
    const missing = rotate(turn, k).find(t => !seen.has(t) && input.library.some(m => serves(m, t) && fitsSlot(m, 'easy') && available(m, input, { shown: true })));
    if (missing) return missing;
  }
  // A plan for the week whose turn has come: its area takes the day, Sunday to Tuesday.
  if (weekStart(input.day)) {
    const due = (t: TrackId) => input.library.some(m => m.track === t && weekPlan(m) && dueLow(m, input) && available(m, input));
    if (!due(area)) return turn.find(due) ?? area;
  }
  return area;
}

/**
 * The day's plan (DAY_SHAPE): a Plan's missions first, every one of them, then one mission per
 * slot within the time budget. On a Plan day the day's own slots are filled only while
 * PLAN_DAY_MIN_LEFT minutes of the budget are left, and the week's focus keeps a mission. A day
 * running an UNSETLD+ Plan (`program.membersOnly`) earns no more than the same day planned
 * without it (capForPlan).
 */
export function generatePlan(input: PlanInput): DayPlan {
  const plan = planDay(input);
  if (!input.program?.membersOnly) return plan;
  const byId = Object.fromEntries(input.library.map(m => [m.id, m]));
  const without = dayPoints(planDay({ ...input, program: null }), byId);
  return capForPlan(plan, Math.min(without, input.program.ceiling ?? Infinity), byId);
}

/** What a planned mission earns when proven: its points, or less where the plan caps it (a swap, an UNSETLD+ Plan). */
export function plannedPoints(p: Pick<PlannedMission, 'missionId' | 'points'>, byId: Readonly<Record<string, Pick<Mission, 'points'>>>): number {
  const full = byId[p.missionId]?.points ?? 0;
  return typeof p.points === 'number' ? Math.max(0, Math.min(p.points, full)) : full;
}

/** What a day's missions earn when every one is proven (plannedPoints), the perfect-day bonus aside. */
export function dayPoints(plan: Pick<DayPlan, 'missions'>, byId: Readonly<Record<string, Pick<Mission, 'points'>>>): number {
  return plan.missions.reduce((t, p) => t + plannedPoints(p, byId), 0);
}

/**
 * UNSETLD+ never raises what a day earns (rules review, 23 Oct 2026: a members-only Plan's missions
 * in areas the user didn't pick are longer, higher-point ones, so a Plan week out-earned every free
 * week for about half of the users). A day running a members-only Plan earns at most `most`
 * (generatePlan: the same day planned without it, or the user's own day, ownDay, when that is
 * less): the Plan's missions give up points, the highest first, 5 at a time, then (when the day's
 * own missions alone come to more) the day's own. The cap is the planned `points`, as a swap's is:
 * proof credits it, the card and widgets show it, and a swap of the mission keeps it (state/store
 * swapCap). Free Plans earn as they always have.
 */
export function capForPlan(plan: DayPlan, most: number, byId: Readonly<Record<string, Pick<Mission, 'points'>>>): DayPlan {
  let over = dayPoints(plan, byId) - most;
  if (over <= 0) return plan;
  const worth = plan.missions.map(p => plannedPoints(p, byId));
  for (const fromPlan of [true, false]) {
    while (over > 0) {
      let k = -1;
      worth.forEach((w, i) => {
        if (w > 0 && Boolean(plan.missions[i].programId) === fromPlan && (k < 0 || w > worth[k])) k = i;
      });
      if (k < 0) break;
      const cut = Math.min(5, worth[k], over);
      worth[k] -= cut;
      over -= cut;
    }
  }
  return { ...plan, missions: plan.missions.map((p, i) => (worth[i] < plannedPoints(p, byId) ? { ...p, points: worth[i] } : p)) };
}

/** How far back ownDay plans the days again at most (the days before keep what was planned). */
export const OWN_DAY_REPLAY = 14;

/**
 * The user's own day, as it would be had the Plan that started `from` not run: the days from
 * `from` (at most OWN_DAY_REPLAY back) planned again without it, every mission proven (at noon),
 * then `day`. A Plan rests the user's own areas, so their own day planned on the real history
 * comes out fresher, and richer, than the days they'd have had without it; this is what an
 * UNSETLD+ Plan's day is capped at (PlanInput `program.ceiling`, state/store buildPlan).
 * Every day is planned at `hour`, the hour `day` is.
 */
export function ownDay(
  input: Pick<PlanInput, 'library' | 'profile' | 'salt' | 'hour'>,
  from: DayKey,
  day: DayKey,
  done: Readonly<Record<DayKey, Record<string, MissionDone>>>,
  plans: Readonly<Record<DayKey, DayPlan>>,
  skips: MissionHistory['skips'],
  byId: Readonly<Record<string, Mission>>,
  known?: (id: string) => boolean,
): DayPlan {
  const start = from > addDays(day, -OWN_DAY_REPLAY) ? from : addDays(day, -OWN_DAY_REPLAY);
  const p: Record<DayKey, DayPlan> = {};
  const d: Record<DayKey, Record<string, MissionDone>> = {};
  for (const [k, v] of Object.entries(plans)) if (k < start) p[k] = v;
  for (const [k, v] of Object.entries(done)) if (k < start) d[k] = v;
  for (let k = start < day ? start : day; ; k = addDays(k, 1)) {
    const plan = generatePlan({
      library: input.library,
      profile: input.profile,
      day: k,
      salt: input.salt,
      hour: input.hour,
      history: historyFrom(d, p, skips, k, known),
      program: null,
      adapt: learnFrom(p, d, byId, k),
    });
    if (k >= day) return plan;
    p[k] = plan;
    const at = parseDay(k);
    at.setHours(12, 0, 0, 0);
    const verification = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: at.getTime() };
    d[k] = Object.fromEntries(
      plan.missions.map(x => [
        x.missionId,
        { missionId: x.missionId, slot: x.slot, track: x.area ?? byId[x.missionId]?.track ?? 'discipline', points: plannedPoints(x, byId), doneAt: at.getTime(), photos: [], verification },
      ]),
    );
  }
}

function planDay(input: PlanInput): DayPlan {
  const { profile, day, salt } = input;
  const shape = dayShape(profile);
  const slots: MissionSlot[] = [...shape.slots];
  const areas = planAreas(input);
  const lead = leadArea(input, areas);
  const lean = leanFor(profile, day);
  // Day 1 (nothing planned before) leads with the area they came for, whatever the date.
  const firstDay = Object.keys(input.history.lastPlanned).length === 0;
  const goalAreas = lean.goalAreas.filter(a => areas.includes(a));
  // Day 1 also gives the goal's other areas the next slots: the first list is what they came for.
  // After that the goal's areas hold the focused slots on the days the lead doesn't rest (the lead
  // rests every third day, so an area the goal doesn't name still gets focused days). A week with a
  // weekly focus is the focus's: it leads every day, the others take turns as before.
  const focusLeads = Boolean(lead && lead === lean.focusArea);
  // The goal shapes the day: after Day 1, outside a weekly focus week, with a goal naming a plan area.
  const shaping = !firstDay && !focusLeads && goalAreas.length > 0;
  const tracks = slotTracks(profile, slots, day, areas, lead, firstDay || focusLeads, goalAreas, firstDay, !focusLeads);
  // One mission a day: the areas take turns (oneMissionArea), so each is in the week.
  if (slots.length === 1 && !firstDay) tracks[0] = oneMissionArea(input, areas, lead, goalAreas, focusLeads) ?? tracks[0];
  const drawn = [...tracks];
  // Money and Organization are all short missions: a focused slot drawn for one of them trades
  // areas with a short slot whose area has focused missions, so the day keeps its focused work; with
  // none in the day (Money and Organization on a two-mission day), it goes to an area with focused
  // missions that isn't.
  const focusedIn = (t: TrackId) => input.library.some(m => m.active && serves(m, t) && fitsSlot(m, 'main'));
  slots.forEach((s, i) => {
    if (s !== 'main' || focusedIn(tracks[i])) return;
    const j = slots.findIndex((x, k) => x === 'easy' && focusedIn(tracks[k]));
    if (j >= 0) [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    else tracks[i] = areas.find(t => focusedIn(t) && !tracks.includes(t)) ?? tracks[i];
  });
  // Two missions a day: an area that can't hold the short slot on its own today within the day's
  // time (Fitness, whose shortest is 20 minutes, next to a focused mission on a 30-minute day; or no
  // short mission but a support task) takes the focused slot, and the other area the short one, so
  // the day fits its time (20 + 15, not 20 + 20 or a support task alone).
  if (slots.length === 2) {
    const e = slots.indexOf('easy');
    const f = slots.indexOf('main');
    const alone = e >= 0 ? shortestAlone(input, tracks[e]) : 0;
    if (e >= 0 && f >= 0 && tracks[e] !== tracks[f] && focusedIn(tracks[e]) && alone >= EASY_MAX_MINUTES && alone + shape.focusedMin > shape.budget && shortestAlone(input, tracks[f]) < EASY_MAX_MINUTES)
      [tracks[e], tracks[f]] = [tracks[f], tracks[e]];
  }
  const budget = shape.budget;
  const chosenSlots: PlannedMission[] = [];
  const used = new Set<string>();
  const usedTracks: TrackId[] = [];
  let spent = 0;
  const filled = new Set<number>();

  // A Plan's missions all go in, each in a free slot it fits; one that fits none gets a slot of
  // its own size, so a Plan day never has fewer slots than the Plan's missions (7 Day Lock In's
  // Plan Tomorrow's Top 3 and Lock In for 30 Minutes on a 15-minute day).
  const byId = new Map(input.library.map(m => [m.id, m]));
  const focusArea = lean.focusArea && areas.includes(lean.focusArea) ? lean.focusArea : null;
  /** A mission the week's focus names or tags (pick's FOCUS_SHARE). */
  const onFocus = (m: Mission) => lean.ids.has(m.id) || (m.tags ?? []).some(t => lean.focusTags.has(t));
  // A mission that fits only one kind of slot goes in before a 20-minute one, which fits either:
  // School Reset's [S9 (20), S2 (15)] puts S2 in the short slot and S9 in a focused one.
  const either = (id: string) => {
    const m = byId.get(id);
    return m && fitsSlot(m, 'easy') && fitsSlot(m, 'main') ? 1 : 0;
  };
  const programIds = [...(input.program?.missionIds ?? [])].sort((x, y) => either(x) - either(y));
  let placed = 0;
  for (const id of programIds) {
    const m = byId.get(id);
    if (!m || !m.active || used.has(id)) continue;
    // A mission the user's answers rule out (Apply to One Job or Internship with no job search) stays out.
    if (!meetsRequirements(m.requires, profile, day)) continue;
    // Too late for a morning mission (or the wrong day of the week); the program day's other missions still move it on.
    if (m.when === 'morning' && tooLateForMorning(input.hour)) continue;
    if (m.days && !m.days.includes(parseDay(day).getDay())) continue;
    const area = areaFor(m, areas);
    let i = slots.findIndex((s, k) => fitsSlot(m, s) && !filled.has(k));
    if (i < 0) {
      slots.push(sizeOf(m));
      tracks.push(area);
      drawn.push(area);
      i = slots.length - 1;
    }
    filled.add(i);
    chosenSlots[i] = { slot: slots[i], missionId: id, area, programId: input.program!.id };
    for (const x of sameDayBlocked(input.library, m)) used.add(x);
    usedTracks.push(area);
    spent += m.minutes;
    placed += 1;
  }
  const planDay = placed > 0;

  // Focused missions first (they take most of the time), then the easy ones. With the goal's areas
  // holding the focused slots, one that an area the goal doesn't name took in the trade with Money
  // goes after the lead's and the goal's ("Build a clothing brand and save money" on a day Money
  // leads: the brand's 30 minutes before Fitness, so a 45-minute workout doesn't leave the brand 20).
  const goalSlot = (i: number) => slots[i] === 'main' && (tracks[i] === lead || goalAreas.includes(tracks[i]));
  const lastGoal = slots.reduce((k, _, i) => (goalSlot(i) ? i : k), -1);
  const turnAt = (i: number) => (shaping && slots[i] === 'main' && tracks[i] !== drawn[i] && !goalSlot(i) ? Math.max(i, lastGoal + 0.5) : i);
  const sortOrder = () => slots.map((s, i) => ({ s, i })).sort((a, b) => (a.s === b.s ? turnAt(a.i) - turnAt(b.i) : a.s === 'main' ? -1 : 1));
  let order = sortOrder();
  // A plan took the focus area's slot: the first free slot (focused first) goes to the focus
  // instead, and with none free the focus gets a short slot of its own. The focus keeps a mission
  // every Plan day its area has one free, whatever is left of the time (fill: `forced`).
  let focusSlot = -1;
  if (planDay && focusArea && !usedTracks.includes(focusArea) && !order.some(o => !filled.has(o.i) && tracks[o.i] === focusArea)) {
    const free = order.find(o => !filled.has(o.i));
    if (free) tracks[free.i] = focusArea;
    else {
      slots.push('easy');
      tracks.push(focusArea);
      drawn.push(focusArea);
      order = sortOrder();
    }
  }
  if (planDay && focusArea && !usedTracks.includes(focusArea)) focusSlot = order.find(o => !filled.has(o.i) && tracks[o.i] === focusArea)?.i ?? -1;
  // On a day with one focused slot (30 and 45 minutes), a weekly or rarer mission whose turn has come
  // in the area holding it can't take that slot (the day keeps its focused mission). On most such days
  // (DUE_SHARE) the two slots trade areas: it takes the short slot, and the short slot's area takes
  // the focused one, so the day still covers two areas (Review One Important Metric comes round for
  // someone whose Projects holds the focused slot). When the short slot's area has no focused
  // missions (Money, Organization), it waits a day; the week's focus can have both slots.
  let dueArea: TrackId | null = null;
  const mainAt = slots.indexOf('main');
  const easyAt = slots.indexOf('easy');
  if (!firstDay && slots.filter(x => x === 'main').length === 1 && easyAt >= 0 && !filled.has(mainAt) && !filled.has(easyAt)) {
    const [x, y] = [tracks[mainAt], tracks[easyAt]];
    const due = x === y ? [] : input.library.filter(m => serves(m, x) && dueLow(m, input) && fitsSlot(m, 'easy') && !used.has(m.id) && available(m, input));
    if (due.length && mulberry32(hash32(`${salt}:${day}:${easyAt}:due`))() < (due.some(weekPlan) ? WEEK_PLAN_SHARE : DUE_SHARE)) {
      if (x === focusArea) dueArea = x;
      else if (focusedIn(y)) {
        [tracks[mainAt], tracks[easyAt]] = [y, x];
        dueArea = x;
      }
    }
  }
  // The areas holding today's short slots: a focused slot of another area may take one of its short
  // missions long overdue (chooseForSlot, OVERDUE_TURNS).
  const shortAreas = slots.flatMap((x, k) => (x === 'easy' && !filled.has(k) ? [tracks[k]] : []));
  // A focused slot counts as holding the day's focused work only with a mission of 30 minutes or
  // more (LONG_MINUTES): only then, or while another focused slot is still to come, may a focused
  // slot take a short one, so the day doesn't shrink to 20 + 15 + 5. Once a focused slot holds a
  // short mission (with an hour or more, anything under 30 minutes), the next takes 30 or more when
  // one is free, so an hour's day of three gets at least 50.
  const hour = profile.minutes >= 60;
  const floor = hour ? LONG_MINUTES : MAIN_MIN_MINUTES;
  const isNew = (m: Mission) => m.frequency === 'low' && !input.history.lastPlanned[m.id] && !input.history.lastDone[m.id];
  const programmed = { chosen: [...chosenSlots], used: [...used], usedTracks: [...usedTracks], spent };
  const fill = (allowShort: boolean) => {
    // One weekly or rarer mission the user has never had is enough for a day: once one is in, the
    // others wait (a slot still takes one rather than stay empty), so the first weeks aren't full of them.
    const later = new Set<string>();
    /** The mission for slot `i`. `forced`: the week's focus on a Plan day, from its own area only and past the time if need be. */
    const pickFor = (s: MissionSlot, i: number, forced: boolean): SlotPick | null => {
      const rest = order.filter(o => !filled.has(o.i) && o.i !== i && !chosenSlots[o.i]);
      const laterMain = rest.filter(o => o.s === 'main').length;
      const laterEasy = rest.length - laterMain;
      // Later focused slots of areas the goal doesn't name: they get their focused time on the lead's
      // rest day, so a 45-minute workout before them doesn't leave them 20 minutes. Only for the
      // goal's other areas, the ones that take the focused slots before them on that day: the lead's
      // own slot keeps its room (a goal of "Build muscle" still gets Complete Your Workout at 45 minutes).
      const laterOther =
        shaping && tracks[i] !== lead && goalAreas.includes(tracks[i]) ? rest.filter(o => o.s === 'main' && !goalAreas.includes(tracks[o.i])).length : 0;
      // A focused slot takes what the later slots don't need (for each short one still to come, the
      // shortest mission free in its area, or its weekly one due: reserveFor; 20 for each focused one, 30 for an area the goal
      // doesn't name); short slots share what's left evenly, so the last one isn't squeezed. The day's
      // last slot rounds down instead.
      const easyReserve = rest.filter(o => o.s === 'easy').reduce((t, o) => t + reserveFor(input, tracks[o.i], used), 0);
      const last = rest.length === 0;
      let room =
        s === 'main'
          ? Math.max(20, budget - spent - laterMain * 20 - laterOther * (LONG_MINUTES - 20) - easyReserve)
          : last
            ? Math.max(5, Math.min(EASY_MAX_MINUTES, Math.floor((budget - spent) / 5) * 5))
            : Math.max(5, Math.min(EASY_MAX_MINUTES, Math.ceil((budget - spent - laterMain * 20) / (laterEasy + 1) / 5) * 5));
      // The slot's area, or the first of the user's areas not in the day yet.
      const area = usedTracks.includes(tracks[i]) ? (areas.find(t => !usedTracks.includes(t)) ?? tracks[i]) : tracks[i];
      // A short slot may run a little over what's left (DAY_SHAPE overshoot) when its area has
      // nothing within its share, rather than give the slot to another area; never past 20.
      let stretch = s === 'easy' ? Math.max(room, Math.min(EASY_MAX_MINUTES, budget - spent + shape.overshoot)) : room;
      // The week's focus on a Plan day past its time: a short mission of its own.
      if (forced) room = stretch = Math.max(room, EASY_MAX_MINUTES);
      const seed = `${salt}:${day}:${i}`;
      // A focused slot may take a short mission whose turn has come while the day keeps a focused one:
      // another focused slot already holds one, or one is still to come (and then takes 30 minutes).
      const mains = chosenSlots.flatMap(p => (p?.slot === 'main' ? [byId.get(p.missionId)?.minutes ?? 0] : []));
      const under = mains.some(n => n < floor);
      const held = realAreas(chosenSlots, byId, areas);
      const rules: SlotRules = {
        takeShort: allowShort && s === 'main' && !under && (mains.some(n => n >= LONG_MINUTES) || laterMain > 0),
        shortAreas,
        mainMin: under ? LONG_MINUTES : shape.focusedMin,
        overdueFocused: !under && shape.focusedMin > MAIN_MIN_MINUTES,
        held,
        only: forced && focusArea ? focusArea : undefined,
      };
      const out = later.size ? new Set([...used, ...later]) : used;
      // The day's last slot, with the day short of the least it should come to (DayShape least):
      // first a mission that gets it there, in the slot's own area (a 15-minute day: 10 or more).
      const short = last && !planDay ? shape.least - spent : 0;
      // Never a slot left empty while an approved mission in their areas is left: when every other
      // area is out, a third mission from one area beats a short day.
      const choose = (r: SlotRules) => {
        const got =
          (short > 0 ? chooseAtLeast(input, s, area, out, room, seed, usedTracks, stretch, r, short) : null) ||
          chooseForSlot(input, s, area, out, room, seed, usedTracks, false, stretch, false, r);
        // A short slot the last steps filled past the day's time (budget and overshoot: the areas
        // with room left have only long missions free): a near-twin of a mission in the day keeps the
        // time when it fits (Fitness's short missions are all cardio: Do 20 Minutes of Cardio next to
        // Walk for 30 Minutes, not a 45-minute workout); else a third mission from an area in the day,
        // a shorter one.
        const most = budget + shape.overshoot;
        if (got && s === 'easy' && spent + got.mission.minutes > most) {
          // Two planning missions still never (Plan Tomorrow's Top 3 and Write Your Next 3 Project Actions read as one task twice).
          const twinOf = (p: PlannedMission) => (byId.get(p.missionId)?.tags?.includes('planning') ? sameDayBlocked(input.library, byId.get(p.missionId)) : sameTask(p.missionId));
          const exact = new Set([...chosenSlots.flatMap(p => (p ? twinOf(p) : [])), ...later]);
          const twin = chooseForSlot(input, s, area, exact, room, seed, usedTracks, false, stretch, false, r);
          if (twin && spent + twin.mission.minutes <= most) return twin;
          const crowded = chooseForSlot(input, s, area, out, room, seed, usedTracks, false, stretch, true, r);
          if (crowded && crowded.mission.minutes < got.mission.minutes) return crowded;
        }
        return (
          got ||
          chooseForSlot(input, s, area, out, room, seed, usedTracks, false, stretch, true, r) ||
          (later.size ? chooseForSlot(input, s, area, used, room, seed, usedTracks, false, stretch, true, r) : null)
        );
      };
      const inArea = (p: SlotPick | null | false | undefined) => (p && (!rules.only || p.area === rules.only) ? p : null);
      let got =
        inArea(s === 'easy' && dueArea && dueShort(input, dueArea, out, room, seed)) ||
        inArea(s === 'easy' && supportFor(input, held, usedTracks, out, room, seed)) ||
        choose(rules);
      // The 30-minute floor is a preference: with none free, a 20-minute mission beats a short one.
      if (got && s === 'main' && under && !fitsSlot(got.mission, 'main')) got = choose({ ...rules, mainMin: MAIN_MIN_MINUTES }) ?? got;
      // So is the day's own (45 minutes: 30 or more): with none free, a 20-minute focused mission.
      if (got && s === 'main' && !under && shape.focusedMin > MAIN_MIN_MINUTES && got.mission.minutes < shape.focusedMin) {
        const again = choose({ ...rules, mainMin: MAIN_MIN_MINUTES });
        if (again && fitsSlot(again.mission, 'main')) got = again;
      }
      // The focused slot found only a short mission in the room its short slots keep (Write Your Next
      // 3 Project Actions where Skills' short slot keeps 15 of a 30-minute day), or, in the week's
      // focus area, nothing the focus names (Get Outside and Move in a gym week, its workouts 30
      // minutes), while another area has a shorter mission for the short slot (Plan Tomorrow's Top 3,
      // 5): the focused slot takes its real work in the room that leaves, and the short slot goes to
      // that area (30 + 5, not a support task alone; or the support task joins the real work).
      const offFocus = (m: Mission) => got?.area === focusArea && !onFocus(m);
      const next = rest.find(o => o.s === 'easy');
      if (got && next && laterEasy === 1 && s === 'main' && !rules.takeShort && (!fitsSlot(got.mission, 'main') || offFocus(got.mission))) {
        const mainArea = got.area;
        // The shortest mission the short slot could take instead: in an area not in the day yet, or a
        // support task joining the focused slot's own area once it holds real work.
        const shortest = (t: TrackId) => shortestFor(input, t, used, Infinity, t === mainArea);
        const candidates = areas.filter(t => t === mainArea || !usedTracks.includes(t));
        const least = Math.min(...candidates.map(shortest));
        const wider = budget - spent - laterMain * 20 - least + shape.overshoot;
        if (Number.isFinite(least) && wider > room) {
          const again = chooseForSlot(input, s, area, out, wider, seed, usedTracks, false, wider, false, rules);
          if (again && again.area === mainArea && fitsSlot(again.mission, 'main') && !offFocus(again.mission)) {
            got = again;
            // The short slot goes to the area with that shorter mission.
            tracks[next.i] = candidates.find(t => shortest(t) === least)!;
          }
        }
      }
      return got;
    };
    for (const { s, i } of order) {
      if (filled.has(i)) continue;
      // A Plan day: the day's own missions only while there's time left for one. The week's focus
      // keeps a mission whatever is left, from its own area; with nothing free there the slot is
      // like any other (filled only while there's time left), never another area past the time.
      const timeLeft = !planDay || budget - spent >= PLAN_DAY_MIN_LEFT;
      const got = (i === focusSlot ? pickFor(s, i, true) : null) ?? (timeLeft ? pickFor(s, i, false) : null);
      if (!got) continue;
      chosenSlots[i] = { slot: s, missionId: got.mission.id, area: got.area };
      for (const x of sameDayBlocked(input.library, got.mission)) used.add(x);
      if (!firstDay && isNew(got.mission)) for (const m of input.library) if (isNew(m) && m.id !== got.mission.id) later.add(m.id);
      usedTracks.push(got.area);
      spent += got.mission.minutes;
    }
  };
  fill(true);
  // A focused slot took a short mission on the promise of a later focused one that never came (that
  // slot went to Money or Organization, which have only short missions): plan the open slots again
  // without short missions in focused slots, so the day keeps its focused work.
  const focused = (p: PlannedMission | undefined) => p?.slot === 'main' && fitsSlot(byId.get(p.missionId) ?? { minutes: 0 }, 'main');
  if (!chosenSlots.some(focused) && chosenSlots.some(p => p?.slot === 'main' && !p.programId)) {
    chosenSlots.length = 0;
    programmed.chosen.forEach((p, k) => {
      if (p) chosenSlots[k] = p;
    });
    used.clear();
    for (const x of programmed.used) used.add(x);
    usedTracks.splice(0, usedTracks.length, ...programmed.usedTracks);
    spent = programmed.spent;
    fill(false);
  }

  return { day, missions: chosenSlots.filter(Boolean), rerolls: 0, replaced: [] };
}

/** The day's last slot: a mission of `min` minutes or more in its own area first (chooseForSlot), within what the slot may take. */
function chooseAtLeast(
  input: PlanInput,
  s: MissionSlot,
  area: TrackId,
  out: ReadonlySet<string>,
  room: number,
  seed: string,
  usedTracks: readonly TrackId[],
  stretch: number,
  rules: SlotRules,
  min: number,
): SlotPick | null {
  const got = chooseForSlot(input, s, area, out, room, seed, usedTracks, false, stretch, false, { ...rules, atLeast: min });
  // Only in the day's own area (a preference within it, never a reason to change area), and not
  // one the guarantee steps found over what the slot may take: then the usual draw.
  return got && got.area === area && got.mission.minutes <= Math.max(room, stretch) ? got : null;
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
  const fit = (p: SlotPick | null) => Boolean(p && p.area === track && fitsSlot(p.mission, slot));
  const rules: SlotRules = { held: realAreas(plan.missions, byId, areas, index) };
  const first = chooseForSlot(input, slot, track, apart, room, seed, others, true, room, false, rules);
  let next = first;
  if (!fit(first)) {
    const second = chooseForSlot(input, slot, track, exclude, room, seed, others, true, room, false, rules);
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
 *  - too-easy: longer than it (a focused one, up to the longest the day hands out: longestFor);
 *  - not-relevant: nothing of the same kind (its group and activity tags);
 *  - cant-today / already-did: nothing from its group (its near-twins);
 *  - another: the usual swap.
 * Too hard and too easy are about length, not kind, so a near-twin of another length counts. No
 * choice is still in its cooldown or was swapped away lately (chooseForSlot's last steps let those
 * back to fill a day, never a swap). When the reason leaves fewer than `count`, the usual swap's
 * picks fill in (not for too-hard: those would be no shorter; for too-easy only ones at least as
 * long). Pure: picking one is `replaceWith`.
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
  const mainMax = longestFor(input.profile);

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
  const held: SlotRules = { held: realAreas(plan.missions, byId, areas, index) };
  const draw = (rule: Rule, tag: string) => {
    const ex = new Set([...exclude, ...taken, ...(rule.apart ? sameDayBlocked(input.library, old) : [])]);
    for (let k = 0; out.length < count && k < count * 4; k++) {
      const seed = `${input.salt}:${input.day}:${index}:r${plan.rerolls + 1}:${tag}${k}`;
      const got = chooseForSlot(input, rule.slot, track, ex, rule.cap, seed, others, true, rule.cap, false, held);
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
  // Too easy fills only with missions at least as long: a focused slot takes 20-minute missions too,
  // so the usual swap's picks can be shorter than the one that was too easy.
  if (out.length < count && reason !== 'another' && reason !== 'too-hard')
    draw(reason === 'too-easy' ? { ...rules.another, ok: m => m.minutes >= oldMinutes } : rules.another, 'fill');
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
  // The slot stays what it was while the new mission fits it (a 20-minute one fits either), so a
  // focused slot swapped for Complete 10 Practice Problems still offers focused missions next time.
  const slot = fitsSlot(mission, current.slot) ? current.slot : sizeOf(mission);
  const next: PlannedMission = { slot, missionId: mission.id, area, ...(typeof points === 'number' ? { points } : {}) };
  return {
    ...plan,
    missions: plan.missions.map((p, i) => (i === index ? next : p)),
    rerolls: plan.rerolls + 1,
    replaced: [...plan.replaced, current.missionId],
    swaps: [...(plan.swaps ?? []), { from: current.missionId, to: mission.id, reason, area: current.area ?? area, at }],
  };
}

/**
 * History for the generator, from the proven missions, recent plans and skips. `known`: the
 * missions that can still be planned (the store passes the library and the user's own). Plans
 * from before a library update don't count as the user's week (`recent`), so an updated user's
 * first week with the new missions runs like a new user's: the new missions aren't all overdue
 * on the first day.
 */
export function historyFrom(
  done: Record<DayKey, Record<string, { missionId: string; verification?: { status: string } }>>,
  plans: Record<DayKey, DayPlan>,
  skips: MissionHistory['skips'],
  before: DayKey,
  known: (id: string) => boolean = () => true,
): MissionHistory {
  const lastDone: Record<string, DayKey> = {};
  for (const day of Object.keys(done).sort()) {
    if (day > before) continue;
    for (const [id, m] of Object.entries(done[day] ?? {})) if (!m?.verification || m.verification.status === 'accepted') lastDone[id] = day;
  }
  const lastPlanned: Record<string, DayKey> = {};
  const recent: Record<string, DayKey[]> = {};
  const weekStart = addDays(before, -6);
  for (const day of Object.keys(plans).sort()) {
    if (day >= before) continue;
    for (const p of plans[day]?.missions ?? []) {
      lastPlanned[p.missionId] = day;
      if (day >= weekStart && known(p.missionId)) (recent[p.missionId] ??= []).push(day);
    }
  }
  return { lastDone, lastPlanned, skips, recent };
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
