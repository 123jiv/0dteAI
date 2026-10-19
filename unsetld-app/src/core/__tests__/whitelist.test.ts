// The whitelist (founder decision, 15 Oct 2026, "very important test"): no built-in mission
// outside the 66 approved can ever be planned, swapped in, recommended or placed by a program.
// First the ids against the founder's own list; then a seeded run of many kinds of users over
// 60 days each (every set of one to four areas, their answers, goals, weekly focuses and
// programs; proving, swapping for every reason, leaving missions, retired missions in their
// history) checks every mission planned or offered: approved, in an area the user chose (or the
// week's focus, their goal, their program), never an empty day, Apply to One Job or Internship
// only with a job search.
import { describe, expect, it } from 'vitest';
import { APPROVED_IDS, isApproved, MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID, PROGRAMS, registerCustomMissions } from '../../content';
import legacyJson from '../../content/legacy-missions.json';
import missionsJson from '../../content/missions.json';
import { isCustomId, makeCustomMission } from '../custom';
import {
  addSkip,
  available,
  dayBudget,
  DEFAULT_PROFILE,
  eligibleAreas,
  generatePlan,
  historyFrom,
  longestFor,
  PLAN_DAY_MIN_LEFT,
  planAreas,
  replacementChoices,
  replaceWith,
  rerollMission,
  serves,
  slotsFor,
  type MissionHistory,
  type PlanInput,
} from '../missions';
import { FOCUS_LEAN, jobSearch, leanFor, learnFrom, LONG_MINUTES, mondayOf } from '../personalize';
import { programMissions, programProgress, startProgram } from '../programs';
import { hash32, mulberry32, seededShuffle } from '../random';
import { addDays, type DayKey } from '../time';
import type { DayPlan, FocusId, Mission, MissionDone, PlannedMission, Profile, ProgramState, SkillId, SwapReason, TrackId, WeeklyFocus } from '../types';

/** The founder's approved ids, in order, as he listed them. The gaps are deliberate: never renumbered. */
const APPROVED = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S9', 'S10', 'S11', 'S12', 'S13', 'S15',
  'F1', 'F2', 'F3', 'F5', 'F6', 'F7', 'F8',
  'M1', 'M2', 'M3', 'M5', 'M6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C9', 'C10', 'C11', 'C12',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9', 'P10', 'P11', 'P12',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K9', 'K10',
  'O1', 'O2', 'O5', 'O8', 'O9',
];
const WHITELIST = new Set(APPROVED);
const LEGACY = legacyJson as Record<string, { title: string; track: string }>;

const AREAS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
/** Areas a user gets only by picking them (or as the week's focus, or a program they started). */
const PICKED_ONLY: readonly TrackId[] = ['discipline', 'fitness', 'money', 'skills', 'organization'];
const FOCUS_IDS: FocusId[] = ['school-catchup', 'exam', 'business', 'gym', 'project', 'apply', 'routine', 'organize', 'save', 'skill', 'other'];
const REASONS: SwapReason[] = ['not-relevant', 'cant-today', 'too-easy', 'too-hard', 'already-did', 'another'];
const SKILLS: SkillId[] = ['coding', 'design', 'video', 'writing', 'language', 'music'];
const GOALS: (string | null)[] = [
  null,
  '',
  'Improve grades and train consistently.',
  'Build a clothing brand and save money.',
  'Get a software job and improve coding.',
  'Build and ship an app.',
  'Improve fitness, save money, and find a better job.',
  'Get a finance internship',
  'Land a summer internship',
  'Pass calculus',
  'Build muscle',
  'Launch my clothing brand',
  'Get hired before graduation',
  'Start a YouTube channel',
  'Learn Spanish',
  'Get organized and stop procrastinating',
  'Pay off my debt',
  'Apply to colleges',
  'Grow my Etsy shop',
  'Run a 5k',
  'Read 20 books this year',
  'Make varsity',
  'Get a promotion at work',
  'Become a better person',
  'Ace the SAT and get into a good college',
];
/** What someone types for a weekly focus of their own ("Something else"). */
const TYPED = ['Get back into running', 'Finish my portfolio', 'Study for finals', 'Sell my first shirts', 'Rest', ''];
/** The hour a plan is made (none: a day planned ahead). */
const HOURS = [undefined, 5, 8, 11, 13, 16, 20, 23, 2];
const DAYS = 60;
/** The most swaps a day allows (content/rules.json rerolls.full). */
const SWAPS = 3;

/** Every set of `k` areas, in the areas' order. */
function sets(k: number, from = 0): TrackId[][] {
  if (k === 0) return [[]];
  const out: TrackId[][] = [];
  for (let i = from; i <= AREAS.length - k; i++) for (const rest of sets(k - 1, i + 1)) out.push([AREAS[i], ...rest]);
  return out;
}
const AREA_SETS = [1, 2, 3, 4].flatMap(k => sets(k));

const oneOf = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

function profileFor(k: number, tracks: TrackId[], r: () => number): Profile {
  const school = oneOf(r, [true, false, null] as const);
  return {
    ...DEFAULT_PROFILE,
    // The picks in any order: the first one leads.
    tracks: seededShuffle(tracks, `areas:${k}`),
    school,
    schoolLevel: school ? oneOf(r, ['high', 'college', null] as const) : undefined,
    work: oneOf(r, [true, false, null] as const),
    gym: oneOf(r, [true, false, null] as const),
    project: oneOf(r, [true, false, null] as const),
    skills: SKILLS.filter(() => r() < 0.25),
    age: oneOf(r, ['u16', '16to17', '18plus', null] as const),
    minutes: ([15, 30, 45, 60] as const)[k % 4],
    intensity: oneOf(r, ['easy', 'lockin', 'push'] as const),
    priority: null,
    goal: oneOf(r, GOALS),
  };
}

function proof(p: PlannedMission, day: DayKey, hour: number): MissionDone {
  const m = MISSION_BY_ID[p.missionId] ?? { track: (LEGACY[p.missionId]?.track ?? 'discipline') as TrackId, points: 10 };
  return {
    missionId: p.missionId,
    slot: p.slot,
    track: p.area ?? m.track,
    points: m.points,
    doneAt: new Date(`${day}T${String(hour).padStart(2, '0')}:30:00`).getTime(),
    photos: [],
    verification: { status: 'accepted', method: 'on-device', checks: [], at: 0 },
    ...(p.programId ? { programId: p.programId } : {}),
  };
}

/** A mission's id and every other one in its group: none of them can join a day that has it. */
const blockedBy = (m: Mission) => (m.group ? MISSIONS.filter(x => x.group === m.group).map(x => x.id) : [m.id]);

/**
 * Approved missions that could still have filled a slot left empty: what generatePlan's last
 * step draws from (any size within the longest the day hands out, in the plan areas, nothing
 * relaxed but the waits, nothing that clashes with the day).
 */
function leftFor(plan: DayPlan, input: PlanInput): string[] {
  const areas = planAreas(input);
  const blocked = new Set(plan.missions.flatMap(p => (MISSION_BY_ID[p.missionId] ? blockedBy(MISSION_BY_ID[p.missionId]) : [p.missionId])));
  const cap = Math.min(longestFor(input.profile), input.adapt?.preferShort ? LONG_MINUTES - 5 : Infinity);
  const loose = { shown: true, skips: true, lowShown: true, cooldown: true };
  return MISSIONS.filter(m => !blocked.has(m.id) && m.minutes <= cap && areas.some(a => serves(m, a)) && available(m, input, loose)).map(m => m.id);
}

interface Seen {
  ids: Set<string>;
  focus: Set<FocusId>;
  programs: Set<string>;
  reasons: Set<SwapReason>;
  replaced: Set<SwapReason>;
  rerolls: number;
  offered: number;
  days: number;
  shortDays: number;
}

/** One user's 60 days. Every problem goes into `bad` (the first few), so a failure says what and when. */
function live(k: number, picked: TrackId[], seen: Seen, bad: string[], own: Mission) {
  const r = mulberry32(hash32(`whitelist:${k}`));
  const fail = (what: string) => {
    if (bad.length < 25) bad.push(`#${k} ${what}`);
  };
  let profile = profileFor(k, picked, r);
  const start = addDays('2026-09-07', k % 7);
  const plans: Record<DayKey, DayPlan> = {};
  const done: Record<DayKey, Record<string, MissionDone>> = {};
  let skips: MissionHistory['skips'] = {};

  // Updating from before the approved library: retired missions planned, proven and swapped away.
  const retired = Object.keys(LEGACY);
  for (let b = 1; b <= 3; b++) {
    const day = addDays(start, -b);
    const missions = [0, 1, 2].map(() => {
      const id = oneOf(r, retired);
      return { slot: 'main' as const, missionId: id, area: LEGACY[id].track as TrackId };
    });
    plans[day] = { day, missions, rerolls: 0, replaced: [] };
    done[day] = { [missions[0].missionId]: proof(missions[0], day, 18) };
    skips = addSkip(skips, missions[1].missionId, day);
  }

  // A program for most users (each program in turn), started on a day of the run; the next one may follow.
  let progIndex = k % (PROGRAMS.length + 1);
  let progStart = progIndex < PROGRAMS.length ? addDays(start, Math.floor(r() * 40)) : null;
  let program: ProgramState | null = null;
  // A weekly focus for most weeks; some picked ahead on Sunday (nextFocus), some left over from last week.
  const weekFocus = new Map<DayKey, WeeklyFocus | null>();
  const focusOf = (week: DayKey): WeeklyFocus | null => {
    if (!weekFocus.has(week)) {
      const id = r() < 0.25 ? null : FOCUS_IDS[Math.floor(r() * FOCUS_IDS.length)];
      weekFocus.set(week, id ? { week, id, ...(id === 'other' ? { text: oneOf(r, TYPED) } : {}) } : null);
    }
    return weekFocus.get(week)!;
  };

  for (let n = 0; n < DAYS; n++) {
    const day = addDays(start, n);
    // Halfway, some users change their areas and goal: what they did before stays in the history.
    if (n === 30 && r() < 0.3) profile = { ...profile, tracks: seededShuffle(oneOf(r, AREA_SETS), `change:${k}`), goal: oneOf(r, GOALS) };
    const week = mondayOf(day);
    const focus = focusOf(week);
    const ahead = r() < 0.3;
    profile = ahead ? { ...profile, focus: focusOf(addDays(week, -7)), nextFocus: focus } : { ...profile, focus, nextFocus: null };
    if (focus) seen.focus.add(focus.id);

    if (progStart === day) program = startProgram(PROGRAMS[progIndex].id, day);
    const prog = program ? PROGRAM_BY_ID[program.id] : null;
    const programIds = prog && program ? programMissions(prog, program, day) : [];
    const hour = oneOf(r, HOURS);
    const salt = `install-${k}`;
    // As the store makes it (state/store planInput): today's proofs and swaps count once they happen.
    const inputNow = (): PlanInput => ({
      library: MISSIONS,
      profile,
      day,
      salt,
      history: historyFrom(done, plans, skips, day),
      hour,
      program: prog && programIds.length ? { id: prog.id, missionIds: programIds } : null,
      adapt: learnFrom(plans, done, MISSION_BY_ID, day),
    });
    const input = inputNow();
    const areas = planAreas(input);
    const eligible = eligibleAreas(profile, day);
    const focusArea = leanFor(profile, day).focusArea;
    const chosen = profile.tracks.length ? profile.tracks : DEFAULT_PROFILE.tracks;
    for (const a of areas) if (!eligible.includes(a)) fail(`${day}: plan area ${a} is not eligible (${eligible})`);

    /** Is this built-in mission one the day may hold, for this area? `programId`: placed by that program. */
    const allowed = (id: string, area: TrackId | undefined, programId: string | undefined, what: string) => {
      const m = MISSION_BY_ID[id];
      if (!WHITELIST.has(id) || !isApproved(id) || !m || m.source !== 'UNSETLD' || m.custom) return fail(`${day} ${what}: ${id} is not an approved mission`);
      const progAreas = programId ? (PROGRAM_BY_ID[programId]?.tracks ?? []) : [];
      if (!area || !(areas.includes(area) || progAreas.includes(area))) fail(`${day} ${what}: ${id} in ${area}, not one of ${areas} ${progAreas}`);
      else if (!serves(m, area)) fail(`${day} ${what}: ${id} doesn't count for ${area}`);
      // Checked again without planAreas: these areas come only from the user's picks, the week's focus or their program.
      if (area && PICKED_ONLY.includes(area) && !chosen.includes(area) && area !== focusArea && !progAreas.includes(area)) fail(`${day} ${what}: ${id} in ${area}, never picked`);
      if (area === 'school' && !chosen.includes('school') && focusArea !== 'school' && !progAreas.includes('school') && profile.school !== true) fail(`${day} ${what}: ${id} in School for someone not in school`);
      if (area === 'career' && !chosen.includes('career') && focusArea !== 'career' && !jobSearch(profile, day)) fail(`${day} ${what}: ${id} in Career without a job search`);
      if (id === 'C2' && !jobSearch(profile, day)) fail(`${day} ${what}: C2 without a job or internship search`);
      seen.ids.add(id);
    };

    let plan = generatePlan(input);
    seen.days += 1;
    for (const x of plan.missions) {
      allowed(x.missionId, x.area, x.programId, 'planned');
      if (x.programId && (x.programId !== program?.id || !programIds.includes(x.missionId))) fail(`${day}: ${x.missionId} placed by ${x.programId}, not today's program day`);
      if (x.programId) seen.programs.add(x.programId);
    }
    if (new Set(plan.missions.map(x => x.missionId)).size !== plan.missions.length) fail(`${day}: a mission twice in one day`);
    if (eligible.length && !plan.missions.length) fail(`${day}: an empty day for areas ${eligible}`);
    // A Plan day adds the day's own missions only while PLAN_DAY_MIN_LEFT minutes of the budget are left.
    const minutes = plan.missions.reduce((t, x) => t + (MISSION_BY_ID[x.missionId]?.minutes ?? 0), 0);
    const planDayFull = plan.missions.some(x => x.programId) && dayBudget(profile) - minutes < PLAN_DAY_MIN_LEFT;
    if (plan.missions.length < slotsFor(profile).length && !planDayFull) {
      seen.shortDays += 1;
      const left = leftFor(plan, input);
      if (left.length) fail(`${day}: ${plan.missions.length} of ${slotsFor(profile).length} missions while ${left} were left`);
    }

    // The day: prove some, swap some (for every reason), leave the rest.
    done[day] = {};
    const prove = (p: PlannedMission) => {
      done[day][p.missionId] = proof(p, day, hour ?? 18);
      if (program && prog && p.programId === program.id) program = programProgress(prog, program, day);
    };
    for (let i = 0; i < plan.missions.length; i++) {
      const p = plan.missions[i];
      const x = r();
      if (x < 0.4) {
        prove(p);
        continue;
      }
      if (x >= 0.75 || plan.rerolls >= SWAPS) continue;
      const now = inputNow();
      const y = r();
      let next: DayPlan | null = null;
      if (y < 0.3) {
        next = rerollMission(plan, i, now);
        seen.rerolls += 1;
        if (next) {
          const q = next.missions[i];
          allowed(q.missionId, q.area, p.programId, 'swapped in');
          skips = addSkip(skips, p.missionId, day);
        }
      } else if (y < 0.36) {
        // One of the user's own instead: it never comes back through the generator.
        next = replaceWith(plan, i, own, own.track, 'another', 0, p.points ?? MISSION_BY_ID[p.missionId]?.points);
      } else {
        const reason = REASONS[(k + n + i) % REASONS.length];
        seen.reasons.add(reason);
        const choices = replacementChoices(plan, i, now, reason, 3);
        for (const c of choices) {
          seen.offered += 1;
          allowed(c.mission.id, c.area, p.programId, `offered (${reason})`);
          if (c.mission.id === p.missionId || plan.missions.some(q => q.missionId === c.mission.id)) fail(`${day}: offered ${c.mission.id}, already in the day`);
        }
        if (choices.length) {
          const c = oneOf(r, choices);
          next = replaceWith(plan, i, c.mission, c.area, reason, 0);
          if (next) {
            seen.replaced.add(reason);
            if (reason !== 'cant-today') skips = addSkip(skips, p.missionId, day);
          }
        }
      }
      if (!next) continue;
      plan = next;
      if (r() < 0.5) prove(plan.missions[i]);
    }
    plans[day] = plan;

    if (program && prog && program.finishedDay && r() < 0.5) {
      progIndex = (progIndex + 1) % PROGRAMS.length;
      progStart = addDays(day, 1);
      program = null;
    }
  }
}

describe('the whitelist', () => {
  it('is exactly the founder’s 66 approved missions, every one from UNSETLD, with nothing retired or hidden behind them', () => {
    expect(APPROVED.length).toBe(66);
    expect(WHITELIST.size).toBe(66);
    // The library file itself holds nothing else: no inactive or other-source mission behind the filter.
    const file = missionsJson as Mission[];
    expect(file.map(m => m.id)).toEqual(APPROVED);
    for (const m of file) expect(m, m.id).toMatchObject({ source: 'UNSETLD', active: true });
    expect(file.some(m => m.custom)).toBe(false);
    expect(MISSIONS.map(m => m.id)).toEqual(APPROVED);
    expect(APPROVED_IDS).toEqual(APPROVED);
    for (const m of MISSIONS) expect(m.source, m.id).toBe('UNSETLD');
    for (const id of APPROVED) expect(isApproved(id), id).toBe(true);

    // The lookup holds the approved missions and, once registered, the user's own; nothing else.
    const builtIn = Object.keys(MISSION_BY_ID).filter(id => !isCustomId(id));
    expect([...builtIn].sort()).toEqual([...APPROVED].sort());
    for (const id of Object.keys(MISSION_BY_ID)) expect(WHITELIST.has(id) || (isCustomId(id) && MISSION_BY_ID[id].custom)).toBe(true);

    // The retired missions (shown in past proofs only) share no id with the approved ones and can't be looked up for a plan.
    const retired = Object.keys(LEGACY);
    expect(retired.length).toBeGreaterThan(0);
    expect(retired.filter(id => WHITELIST.has(id))).toEqual([]);
    for (const id of retired) {
      expect(isApproved(id), id).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(MISSION_BY_ID, id), id).toBe(false);
    }

    // Registering missions of the user's own can't slip a built-in one in, or replace an approved one.
    const own = makeCustomMission({ title: 'Fix my bike chain', track: 'fitness', proofType: 'PHOTO' }, 'custom-wl-a')!;
    const fake = { ...own, id: retired[0], custom: true } as Mission;
    const unmarked = { ...own, id: 'custom-wl-b', custom: undefined } as Mission;
    registerCustomMissions([fake, { ...own, id: 'S1' }, unmarked]);
    try {
      expect(MISSION_BY_ID[retired[0]]).toBeUndefined();
      expect(MISSION_BY_ID['custom-wl-b']).toBeUndefined();
      expect(MISSION_BY_ID.S1.source).toBe('UNSETLD');
      expect(MISSIONS.map(m => m.id)).toEqual(APPROVED);
    } finally {
      delete MISSION_BY_ID['custom-wl-b'];
    }

    // Programs and weekly focuses only name approved missions.
    for (const p of PROGRAMS) for (const id of p.plan.flat()) expect(WHITELIST.has(id), `${p.id} ${id}`).toBe(true);
    for (const [focus, lean] of Object.entries(FOCUS_LEAN)) for (const id of lean.ids) expect(WHITELIST.has(id), `${focus} ${id}`).toBe(true);
    // Every weekly focus is in the run below.
    expect([...Object.keys(FOCUS_LEAN), 'other'].sort()).toEqual([...FOCUS_IDS].sort());
  });

  it('never plans, swaps in or offers anything else, for every set of areas, over 60 days of proving, swapping and leaving missions', () => {
    const own = makeCustomMission({ title: 'Fix my bike chain', track: 'fitness', proofType: 'PHOTO' }, 'custom-wl-own')!;
    registerCustomMissions([own]);
    const seen: Seen = { ids: new Set(), focus: new Set(), programs: new Set(), reasons: new Set(), replaced: new Set(), rerolls: 0, offered: 0, days: 0, shortDays: 0 };
    const bad: string[] = [];
    try {
      AREA_SETS.forEach((picked, k) => live(k, picked, seen, bad, own));
    } finally {
      delete MISSION_BY_ID[own.id];
    }
    expect(bad).toEqual([]);

    // The run covered what it says it does.
    expect(AREA_SETS.length).toBe(8 + 28 + 56 + 70);
    expect(seen.days).toBe(AREA_SETS.length * DAYS);
    expect([...seen.focus].sort()).toEqual([...FOCUS_IDS].sort());
    expect([...seen.programs].sort()).toEqual(PROGRAMS.map(p => p.id).sort());
    expect([...seen.reasons].sort()).toEqual([...REASONS].sort());
    expect([...seen.replaced].sort()).toEqual([...REASONS].sort());
    expect(seen.rerolls).toBeGreaterThan(100);
    expect(seen.offered).toBeGreaterThan(1000);
    // Every approved mission came up for someone; nothing else did.
    expect(APPROVED.filter(id => !seen.ids.has(id))).toEqual([]);
    expect([...seen.ids].filter(id => !WHITELIST.has(id))).toEqual([]);
  }, 60_000);
});
