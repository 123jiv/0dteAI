// The daily time promise (launch pass P1-1): what the planner really plans against the time the
// user chose. Every combination of two to four areas (154) on three installs, planned at 8 AM,
// 1 PM and 7 PM, plus seven typed goals over every combination: four weeks each from Monday
// 19 October 2026, planned the way the store plans (planInput: historyFrom with the known-id
// filter, learnFrom, the hour of the day) with every planned mission proven. Measured per time
// choice (15, 30 and 45 minutes at the default intensity, an hour or more at each intensity): the
// minutes a day adds up to (p10 / p50 / p90 / p99 / max), the share of days inside the band the
// copy promises, and points a day with the perfect-day bonus.
//
// By default about a quarter of the grid runs (each combination on one install, a fifth of the
// goal runs), quick enough for every test run. `SIM_FULL=1` runs the whole grid (1,540 setups,
// 43,120 days per time choice) and `SIM_PRINT=1` prints the table:
//   SIM_FULL=1 SIM_PRINT=1 npx vitest run src/core/__tests__/day-shape.sim.test.ts
import { beforeAll, describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS } from '../../content';
import { DEFAULT_PROFILE, generatePlan, historyFrom, planAreas, slotsFor, type PlanInput } from '../missions';
import { leanFor, learnFrom } from '../personalize';
import { addDays, parseDay, type DayKey } from '../time';
import type { DayPlan, MissionDone, Profile, TrackId } from '../types';

const FULL = process.env.SIM_FULL === '1';
const PRINT = process.env.SIM_PRINT === '1';
const START: DayKey = '2026-10-19';
const DAYS = 28;
const AREAS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
const GOALS = ['Improve my grades', 'Build muscle', 'Launch my clothing brand', 'Save $1,000', 'Get an internship', 'Learn coding', 'Get organized'];
/** Three installs, each planning its day at its own hour (the hour decides morning and evening missions). */
const INSTALLS: readonly (readonly [string, number])[] = [
  ['s0', 8],
  ['s1', 13],
  ['s2', 19],
];

type Cell = '15' | '30' | '45' | '60/easy' | '60/lockin' | '60/push';
const CELLS: Record<Cell, Pick<Profile, 'minutes' | 'intensity'>> = {
  '15': { minutes: 15, intensity: 'lockin' },
  '30': { minutes: 30, intensity: 'lockin' },
  '45': { minutes: 45, intensity: 'lockin' },
  '60/easy': { minutes: 60, intensity: 'easy' },
  '60/lockin': { minutes: 60, intensity: 'lockin' },
  '60/push': { minutes: 60, intensity: 'push' },
};
const CELL_KEYS = Object.keys(CELLS) as Cell[];

/** The minutes each time choice promises (the brief's bands): a day inside them keeps the promise. */
const BAND: Record<Cell, readonly [number, number]> = {
  '15': [10, 20],
  '30': [25, 35],
  '45': [40, 55],
  '60/easy': [55, 75],
  '60/lockin': [60, 80],
  '60/push': [75, 110],
};
const SHORT_DAY = (c: Cell) => c === '15' || c === '30' || c === '45';

/** Every combination of two to four areas: 28 + 56 + 70 = 154. */
function combos(min = 2, max = 4): TrackId[][] {
  const out: TrackId[][] = [];
  const rec = (start: number, cur: TrackId[]) => {
    if (cur.length >= min) out.push([...cur]);
    if (cur.length === max) return;
    for (let i = start; i < AREAS.length; i++) rec(i + 1, [...cur, AREAS[i]]);
  };
  rec(0, []);
  return out;
}

interface Job {
  tracks: TrackId[];
  goal: string;
  salt: string;
  hour: number;
  school: boolean | null;
}

/** The setups: every combination on each install (one install, by turns, without SIM_FULL), then every goal over every combination on one install. */
function jobs(): Job[] {
  const all = combos();
  const out: Job[] = [];
  all.forEach((tracks, i) => {
    for (const [salt, hour] of FULL ? INSTALLS : [INSTALLS[i % INSTALLS.length]]) out.push({ tracks, goal: '', salt, hour, school: null });
  });
  all.forEach((tracks, i) =>
    GOALS.forEach((goal, g) => {
      if (!FULL && (i + g) % 5) return;
      const [salt, hour] = INSTALLS[(i + g) % INSTALLS.length];
      out.push({ tracks, goal, salt: `${salt}g${g}`, hour, school: goal === 'Improve my grades' ? true : null });
    }),
  );
  return out;
}

/** Four weeks as the store plans them (state/store planInput), every planned mission proven two hours after the plan is made. */
function fourWeeks(profile: Profile, salt: string, hour: number): DayPlan[] {
  const plans: Record<DayKey, DayPlan> = {};
  const done: Record<DayKey, Record<string, MissionDone>> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < DAYS; i++) {
    const day = addDays(START, i);
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt,
      history: historyFrom(done, plans, {}, day, id => id in MISSION_BY_ID),
      hour,
      program: null,
      adapt: learnFrom(plans, done, MISSION_BY_ID, day),
    };
    const plan = generatePlan(input);
    plans[day] = plan;
    const at = parseDay(day);
    at.setHours(Math.min(23, hour + 2));
    done[day] = Object.fromEntries(
      plan.missions.map(p => {
        const m = MISSION_BY_ID[p.missionId];
        const proof: MissionDone = {
          missionId: p.missionId,
          slot: p.slot,
          track: p.area ?? m.track,
          points: m.points,
          doneAt: at.getTime(),
          photos: [],
          verification: { status: 'accepted', method: 'on-device', checks: [], at: at.getTime() },
        };
        return [p.missionId, proof];
      }),
    );
    out.push(plan);
  }
  return out;
}

interface CellStats {
  days: number;
  slots: number;
  p10: number;
  p50: number;
  p90: number;
  p99: number;
  max: number;
  mean: number;
  /** Share of days inside the band, over it and under it. */
  inBand: number;
  over: number;
  under: number;
  /** Points a day, every mission proven, with the perfect-day bonus. */
  pts: number;
  /** Share of days with fewer missions than the day has slots. */
  short: number;
  /** Share of days with a mission of 30 minutes or more. */
  long: number;
  /** Share of goal-run days with a mission in one of the goal's areas. */
  goal: number;
  /** Share of runs where every picked area that has missions is in the day in each of the four weeks (Monday to Sunday). */
  weekly: number;
  /** Distinct missions in four weeks, on average. */
  distinct: number;
}

const quantile = (sorted: readonly number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

function simulate(): Record<Cell, CellStats> {
  const setups = jobs();
  const out = {} as Record<Cell, CellStats>;
  for (const cell of CELL_KEYS) {
    const band = BAND[cell];
    const totals: number[] = [];
    let points = 0;
    let short = 0;
    let long = 0;
    let goalDays = 0;
    let goalHit = 0;
    let weekly = 0;
    let distinct = 0;
    for (const j of setups) {
      const profile = { ...DEFAULT_PROFILE, ...CELLS[cell], tracks: j.tracks, goal: j.goal || undefined, school: j.school } as Profile;
      const want = slotsFor(profile).length;
      const areas = planAreas({ library: MISSIONS, profile, day: START });
      const goalAreas = j.goal ? leanFor(profile, START).goalAreas.filter(t => areas.includes(t)) : [];
      const usable = j.tracks.filter(t => areas.includes(t));
      const seenIn: Set<TrackId>[] = [new Set(), new Set(), new Set(), new Set()];
      const ids = new Set<string>();
      fourWeeks(profile, j.salt, j.hour).forEach((plan, d) => {
        const ms = plan.missions.map(p => MISSION_BY_ID[p.missionId]);
        totals.push(ms.reduce((t, m) => t + m.minutes, 0));
        points += ms.reduce((t, m) => t + m.points, 0) + (ms.length ? 15 : 0);
        if (ms.length < want) short += 1;
        if (ms.some(m => m.minutes >= 30)) long += 1;
        const inDay = plan.missions.map(p => p.area ?? MISSION_BY_ID[p.missionId].track);
        if (goalAreas.length) {
          goalDays += 1;
          if (inDay.some(t => goalAreas.includes(t))) goalHit += 1;
        }
        for (const t of inDay) seenIn[Math.floor(d / 7)].add(t);
        for (const m of ms) ids.add(m.id);
      });
      if (seenIn.every(week => usable.every(t => week.has(t)))) weekly += 1;
      distinct += ids.size;
    }
    const sorted = [...totals].sort((a, b) => a - b);
    const n = totals.length;
    const over = totals.filter(t => t > band[1]).length;
    const under = totals.filter(t => t < band[0]).length;
    out[cell] = {
      days: n,
      slots: slotsFor(CELLS[cell]).length,
      p10: quantile(sorted, 0.1),
      p50: quantile(sorted, 0.5),
      p90: quantile(sorted, 0.9),
      p99: quantile(sorted, 0.99),
      max: sorted[n - 1],
      mean: round(totals.reduce((t, x) => t + x, 0) / n, 1),
      inBand: round(1 - (over + under) / n),
      over: round(over / n),
      under: round(under / n),
      pts: round(points / n, 1),
      short: round(short / n),
      long: round(long / n),
      goal: goalDays ? round(goalHit / goalDays) : 0,
      weekly: round(weekly / setups.length),
      distinct: round(distinct / setups.length, 1),
    };
  }
  return out;
}

/**
 * The planner before the launch pass (repo acea784, Step 0 575e63b), measured on the whole grid
 * (SIM_FULL=1): kept so the change can be read against it, points a day above all.
 */
const BEFORE: Record<Cell, Pick<CellStats, 'slots' | 'p10' | 'p50' | 'p90' | 'p99' | 'max' | 'inBand' | 'pts'>> = {
  '15': { slots: 2, p10: 20, p50: 30, p90: 40, p99: 40, max: 60, inBand: 0.124, pts: 32.4 },
  '30': { slots: 2, p10: 30, p50: 45, p90: 50, p99: 50, max: 60, inBand: 0.235, pts: 36.9 },
  '45': { slots: 3, p10: 50, p50: 65, p90: 75, p99: 85, max: 105, inBand: 0.234, pts: 49.2 },
  '60/easy': { slots: 3, p10: 50, p50: 65, p90: 80, p99: 80, max: 90, inBand: 0.732, pts: 48.8 },
  '60/lockin': { slots: 3, p10: 50, p50: 65, p90: 80, p99: 95, max: 105, inBand: 0.662, pts: 49.8 },
  '60/push': { slots: 4, p10: 70, p50: 90, p90: 110, p99: 125, max: 150, inBand: 0.778, pts: 62.4 },
};

/**
 * Model J, the planner since the launch pass (core/missions DAY_SHAPE), on the whole grid
 * (SIM_FULL=1). Cross-checked against the time audit's J (launch-pass audit/results/J.json):
 * the same medians but 15 (15 here, 20 there: a one-mission day prefers 10 minutes or more only in
 * its own area, so a Money or Discipline day can be 5), fewer long days (30: max 40, not 60; 45: max
 * 60, not 75) and more days in the band at 30 and with an hour.
 */
const AFTER: Record<Cell, Pick<CellStats, 'slots' | 'p10' | 'p50' | 'p90' | 'p99' | 'max' | 'inBand' | 'pts'>> = {
  '15': { slots: 1, p10: 10, p50: 15, p90: 20, p99: 20, max: 20, inBand: 0.95, pts: 23.8 },
  '30': { slots: 2, p10: 30, p50: 35, p90: 40, p99: 40, max: 40, inBand: 0.88, pts: 33.8 },
  '45': { slots: 2, p10: 35, p50: 45, p90: 50, p99: 55, max: 60, inBand: 0.871, pts: 37.9 },
  '60/easy': { slots: 3, p10: 45, p50: 60, p90: 65, p99: 70, max: 70, inBand: 0.815, pts: 45.8 },
  '60/lockin': { slots: 3, p10: 55, p50: 65, p90: 75, p99: 75, max: 80, inBand: 0.822, pts: 49.2 },
  '60/push': { slots: 4, p10: 70, p50: 90, p90: 100, p99: 105, max: 115, inBand: 0.879, pts: 60.8 },
};

/**
 * What this grid measured when it was committed (the default grid, not SIM_FULL): the planner as
 * it is. A change to the planner that moves these is a change to the time promise: run the full
 * grid, check the gates and the founder's targets, then write the new numbers here and in AFTER.
 */
const MEASURED: Record<Cell, Pick<CellStats, 'p50' | 'p90' | 'max' | 'inBand' | 'pts'>> = {
  '15': { p50: 15, p90: 20, max: 20, inBand: 0.946, pts: 23.8 },
  '30': { p50: 35, p90: 40, max: 40, inBand: 0.879, pts: 33.8 },
  '45': { p50: 45, p90: 50, max: 60, inBand: 0.871, pts: 37.9 },
  '60/easy': { p50: 60, p90: 65, max: 70, inBand: 0.816, pts: 45.8 },
  '60/lockin': { p50: 65, p90: 75, max: 80, inBand: 0.819, pts: 49.2 },
  '60/push': { p50: 90, p90: 100, max: 115, inBand: 0.878, pts: 60.8 },
};

let stats: Record<Cell, CellStats>;
beforeAll(() => {
  stats = simulate();
  if (PRINT) {
    const head = 'cell        slots  p10  p50  p90  p99  max  inBand (before)  over  under  pts/day (before)  long  goal  weekly  distinct';
    const rows = CELL_KEYS.map(c => {
      const s = stats[c];
      return [
        c.padEnd(11),
        String(s.slots).padStart(5),
        ...[s.p10, s.p50, s.p90, s.p99, s.max].map(x => String(x).padStart(4)),
        `${s.inBand.toFixed(3).padStart(7)} (${BEFORE[c].inBand.toFixed(2)})`,
        s.over.toFixed(3).padStart(5),
        s.under.toFixed(3).padStart(6),
        `${s.pts.toFixed(1).padStart(7)} (${BEFORE[c].pts.toFixed(1)})`.padStart(17),
        s.long.toFixed(2).padStart(5),
        s.goal.toFixed(2).padStart(5),
        s.weekly.toFixed(2).padStart(7),
        s.distinct.toFixed(1).padStart(9),
      ].join(' ');
    });
    console.log([`${FULL ? 'full' : 'default'} grid, ${jobs().length} setups, ${stats['15'].days} days per time choice`, head, ...rows].join('\n'));
  }
}, 900_000);

describe('the time promise, as the planner is', () => {
  it('every day is planned in full: no slot left empty', () => {
    for (const c of CELL_KEYS) expect(stats[c].short, c).toBe(0);
  });

  it('measures what was committed (MEASURED): about the same median and p90, no longer a day, as many days in the band, about the same points', () => {
    for (const c of CELL_KEYS) {
      // Within 5 minutes: a goal keyword or a mission's metadata moving shifts a quantile by a step.
      expect(Math.abs(stats[c].p50 - MEASURED[c].p50), c).toBeLessThanOrEqual(5);
      expect(Math.abs(stats[c].p90 - MEASURED[c].p90), c).toBeLessThanOrEqual(5);
      expect(stats[c].max, c).toBeLessThanOrEqual(MEASURED[c].max);
      expect(stats[c].inBand, c).toBeGreaterThanOrEqual(MEASURED[c].inBand - 0.02);
      expect(Math.abs(stats[c].pts - MEASURED[c].pts), c).toBeLessThanOrEqual(1);
    }
  });
});

// The gates for model J (launch pass decision: two missions every day at 30 minutes). They failed on
// the planner before the launch pass (BEFORE) and hold on the whole grid (AFTER).
describe('the time promise, model J targets (gates)', () => {
  it('the day has the shape the copy states: one mission at 15, two at 30 and 45, three or four with an hour', () => {
    expect(CELL_KEYS.map(c => stats[c].slots)).toEqual([1, 2, 2, 3, 3, 4]);
    for (const c of CELL_KEYS) expect(stats[c].slots, c).toBe(AFTER[c].slots);
  });

  it('the median day is inside the band at every time choice', () => {
    for (const c of CELL_KEYS) {
      expect(stats[c].p50, c).toBeGreaterThanOrEqual(BAND[c][0]);
      expect(stats[c].p50, c).toBeLessThanOrEqual(BAND[c][1]);
    }
  });

  it('at least 80% of days are inside the band at 15, 30 and 45 minutes, and at least 70% with an hour or more', () => {
    for (const c of CELL_KEYS) expect(stats[c].inBand, c).toBeGreaterThanOrEqual(SHORT_DAY(c) ? 0.8 : 0.7);
  });

  it('at 15, 30 and 45 minutes, 99% of days run no more than 5 minutes over the band', () => {
    for (const c of CELL_KEYS.filter(SHORT_DAY)) expect(stats[c].p99, c).toBeLessThanOrEqual(BAND[c][1] + 5);
  });

  it('no day runs more than 10 minutes over the band', () => {
    for (const c of CELL_KEYS) expect(stats[c].max, c).toBeLessThanOrEqual(BAND[c][1] + 10);
  });

  it('a 15-minute day is never more than 20 minutes', () => {
    expect(stats['15'].max).toBeLessThanOrEqual(20);
  });
});

describe('one mission a day, and what the shapes cost', () => {
  it('at 15 minutes every area the user picked is in the day every week, and a goal\'s areas get about half the days', () => {
    expect(stats['15'].weekly).toBeGreaterThanOrEqual(0.99);
    expect(stats['15'].goal).toBeGreaterThanOrEqual(0.4);
    expect(stats['15'].goal).toBeLessThanOrEqual(0.6);
  });

  it('two missions a day still cover the areas weekly, and the goal is in the day on most days', () => {
    for (const c of ['30', '45'] as const) {
      expect(stats[c].weekly, c).toBeGreaterThanOrEqual(0.98);
      expect(stats[c].goal, c).toBeGreaterThanOrEqual(0.65);
    }
  });

  it('points a day fall with the shorter days (accepted, launch pass decision 2) but never rise', () => {
    for (const c of CELL_KEYS) expect(stats[c].pts, c).toBeLessThanOrEqual(BEFORE[c].pts + 0.5);
    // About a quarter less at 15 and 45, under a tenth at 30, about the same with an hour.
    expect(stats['15'].pts).toBeGreaterThanOrEqual(0.7 * BEFORE['15'].pts);
    expect(stats['45'].pts).toBeGreaterThanOrEqual(0.72 * BEFORE['45'].pts);
    expect(stats['30'].pts).toBeGreaterThanOrEqual(0.88 * BEFORE['30'].pts);
  });
});
