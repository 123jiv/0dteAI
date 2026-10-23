// UNSETLD+ never raises what anyone earns (rules review, 23 Oct 2026, finding 4). A members-only
// Plan's missions in areas the user didn't pick are longer, higher-point ones, and a Plan rests the
// user's own areas, so their own missions come back fresher: before the cap, a members-only Plan
// week out-earned every free option (no Plan, 7 Day Lock In, Get Organized) for 271 of 576 setups,
// by up to 55 points a week. A day running one is now capped at the least of the same day planned
// without it and the user's own day (ownDay), the way state/store buildPlan plans it; free Plans
// earn as they always have.
//
// By default a third of the setups run; `PLAN_EARN_FULL=1` runs all of them (every pair of areas and
// every other triple, at every time choice, on two installs: 576, the review's grid).
import { describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS, PROGRAMS } from '../../content';
import { planOpenToAll } from '../features';
import { capForPlan, dayPoints, DEFAULT_PROFILE, generatePlan, historyFrom, ownDay, plannedPoints, type PlanInput } from '../missions';
import { learnFrom } from '../personalize';
import { addDays, parseDay, type DayKey } from '../time';
import type { DayPlan, MissionDone, Profile, Program, TrackId } from '../types';

const FULL = process.env.PLAN_EARN_FULL === '1';
const AREAS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
const CELLS: Pick<Profile, 'minutes' | 'intensity'>[] = [
  { minutes: 15, intensity: 'lockin' },
  { minutes: 30, intensity: 'lockin' },
  { minutes: 45, intensity: 'lockin' },
  { minutes: 60, intensity: 'easy' },
  { minutes: 60, intensity: 'lockin' },
  { minutes: 60, intensity: 'push' },
];
const START: DayKey = '2026-10-05';
/** Two weeks of the user's own days first, so the Plan doesn't start on Day 1. */
const WARM = 14;
const HOUR = 8;
const BONUS = 15;
const known = (id: string) => id in MISSION_BY_ID;

function setups(): { profile: Profile; salt: string }[] {
  const combos: TrackId[][] = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) combos.push([AREAS[i], AREAS[j]]);
  for (let i = 0; i < 8; i += 2) for (let j = i + 1; j < 8; j++) for (let k = j + 1; k < 8; k += 2) combos.push([AREAS[i], AREAS[j], AREAS[k]]);
  const out: { profile: Profile; salt: string }[] = [];
  CELLS.forEach((cell, c) =>
    combos.forEach((tracks, t) =>
      ['a', 'b'].forEach((salt, s) => {
        if (FULL || (c + t + s) % 3 === 0) out.push({ profile: { ...DEFAULT_PROFILE, ...cell, tracks, goal: null } as Profile, salt });
      }),
    ),
  );
  return out;
}

/**
 * Three weeks as the store plans them (state/store planInput and buildPlan), every planned mission
 * proven at noon: two of the user's own, then a week with `program` running from its first day.
 * Returns what each day of that week earns, the perfect-day bonus included.
 */
function week(profile: Profile, salt: string, program: Program | null): { days: number[]; capped: boolean; plusOverOwn: boolean } {
  const plans: Record<DayKey, DayPlan> = {};
  const done: Record<DayKey, Record<string, MissionDone>> = {};
  const days: number[] = [];
  let capped = false;
  let plusOverOwn = false;
  const started = addDays(START, WARM);
  for (let i = 0; i < WARM + 7; i++) {
    const day = addDays(START, i);
    const k = i - WARM;
    const ids = program && k >= 0 ? program.plan[k] : undefined;
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt,
      hour: HOUR,
      history: historyFrom(done, plans, {}, day, known),
      adapt: learnFrom(plans, done, MISSION_BY_ID, day),
      program: program && ids ? { id: program.id, missionIds: ids, membersOnly: !planOpenToAll(program) } : null,
    };
    let plan: DayPlan;
    if (input.program?.membersOnly) {
      const own = ownDay(input, started, day, done, plans, {}, MISSION_BY_ID, known);
      plan = generatePlan({ ...input, program: { ...input.program, ceiling: dayPoints(own, MISSION_BY_ID) } });
      // Never more than the same day planned without the Plan, on the same history.
      if (dayPoints(plan, MISSION_BY_ID) > dayPoints(generatePlan({ ...input, program: null }), MISSION_BY_ID)) plusOverOwn = true;
      if (plan.missions.some(p => typeof p.points === 'number')) capped = true;
    } else plan = generatePlan(input);
    plans[day] = plan;
    const at = parseDay(day);
    at.setHours(12, 0, 0, 0);
    done[day] = Object.fromEntries(
      plan.missions.map(p => [
        p.missionId,
        {
          missionId: p.missionId,
          slot: p.slot,
          track: p.area ?? MISSION_BY_ID[p.missionId].track,
          points: plannedPoints(p, MISSION_BY_ID),
          doneAt: at.getTime(),
          photos: [],
          verification: { status: 'accepted', method: 'on-device', checks: [], at: at.getTime() },
        } as MissionDone,
      ]),
    );
    if (k >= 0) days.push(dayPoints(plan, MISSION_BY_ID) + (plan.missions.length ? BONUS : 0));
  }
  return { days, capped, plusOverOwn };
}

describe('capForPlan', () => {
  const plan: DayPlan = {
    day: '2026-10-19',
    missions: [
      { slot: 'easy', missionId: 'D4', area: 'discipline' }, // 5
      { slot: 'main', missionId: 'P1', area: 'projects', programId: 'build-something' }, // 15
      { slot: 'main', missionId: 'P6', area: 'projects', programId: 'build-something' }, // 5
      { slot: 'main', missionId: 'D1', area: 'discipline' }, // 15
    ],
    rerolls: 0,
    replaced: [],
  };

  it('leaves a day within its ceiling as it is', () => {
    expect(capForPlan(plan, 40, MISSION_BY_ID)).toBe(plan);
    expect(capForPlan(plan, 45, MISSION_BY_ID)).toBe(plan);
  });

  it("takes points from the Plan's missions, the highest first, 5 at a time", () => {
    const at30 = capForPlan(plan, 30, MISSION_BY_ID);
    expect(at30.missions.map(p => p.points)).toEqual([undefined, 5, undefined, undefined]);
    expect(dayPoints(at30, MISSION_BY_ID)).toBe(30);
    expect(capForPlan(plan, 25, MISSION_BY_ID).missions.map(p => p.points)).toEqual([undefined, 0, undefined, undefined]);
    expect(capForPlan(plan, 20, MISSION_BY_ID).missions.map(p => p.points)).toEqual([undefined, 0, 0, undefined]);
  });

  it("then from the day's own, only once the Plan's earn nothing", () => {
    const at10 = capForPlan(plan, 10, MISSION_BY_ID);
    expect(at10.missions.map(p => p.points)).toEqual([undefined, 0, 0, 5]);
    expect(dayPoints(at10, MISSION_BY_ID)).toBe(10);
    expect(dayPoints(capForPlan(plan, 0, MISSION_BY_ID), MISSION_BY_ID)).toBe(0);
  });

  it('caps a members-only Plan day in generatePlan, never a free one', () => {
    const profile = { ...DEFAULT_PROFILE, tracks: ['discipline', 'organization'] as TrackId[], minutes: 60 as const, intensity: 'push' as const, goal: null };
    const base: PlanInput = { library: MISSIONS, profile, day: '2026-10-19', salt: 's', hour: HOUR, history: { lastDone: {}, lastPlanned: {}, skips: {} } };
    const own = dayPoints(generatePlan(base), MISSION_BY_ID);
    let capped = 0;
    for (const program of PROGRAMS)
      program.plan.forEach(ids => {
        const membersOnly = !planOpenToAll(program);
        const plan = generatePlan({ ...base, program: { id: program.id, missionIds: ids, membersOnly } });
        const raw = generatePlan({ ...base, program: { id: program.id, missionIds: ids } });
        if (membersOnly) expect(dayPoints(plan, MISSION_BY_ID), `${program.id} ${ids}`).toBeLessThanOrEqual(own);
        else expect(plan).toEqual(raw);
        // The same missions, only what they pay differs.
        expect(plan.missions.map(p => p.missionId)).toEqual(raw.missions.map(p => p.missionId));
        if (dayPoints(raw, MISSION_BY_ID) > own && membersOnly) capped += 1;
      });
    // School Reset's first day (Create Your Study Plan for the Week) comes to 50 against 45.
    expect(capped).toBeGreaterThan(0);
  });
});

describe('a members-only Plan week never beats the best free option', () => {
  it('for the same user, over every time choice and mix of areas', () => {
    const free = PROGRAMS.filter(p => planOpenToAll(p));
    const plus = PROGRAMS.filter(p => !planOpenToAll(p));
    expect(free.length).toBeGreaterThanOrEqual(2);
    expect(plus.length).toBeGreaterThanOrEqual(1);
    const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
    const beat: string[] = [];
    let capped = 0;
    for (const { profile, salt } of setups()) {
      const best = Math.max(sum(week(profile, salt, null).days), ...free.map(p => sum(week(profile, salt, p).days)));
      for (const p of plus) {
        const run = week(profile, salt, p);
        if (run.capped) capped += 1;
        if (run.plusOverOwn) beat.push(`${profile.minutes}/${profile.intensity} ${profile.tracks.join('+')} ${salt} ${p.id}: a day over the same day without it`);
        if (sum(run.days) > best) beat.push(`${profile.minutes}/${profile.intensity} ${profile.tracks.join('+')} ${salt} ${p.id}: ${sum(run.days)} over ${best} (${run.days.join('/')})`);
      }
    }
    expect(beat).toEqual([]);
    // The cap is doing the work: most members-only Plan weeks have a capped day.
    expect(capped).toBeGreaterThan(0);
  }, 600_000);
});
