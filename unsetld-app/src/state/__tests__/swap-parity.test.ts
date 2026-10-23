// UNSETLD+ never raises what a day can earn (P0-2). A member has more swaps than a free user, and a
// "Too easy" swap turns a short mission into a focused one worth more; so every swap after the
// day's first earns at most what it replaces (state/store swapCap). Property, over every day shape
// and several area mixes: the most points a day can be made to earn with three swaps is exactly
// the most it can with one. Each swap takes the replacement worth the most extra, over every
// reason (from audit/plus/swap-points: before the cap, three swaps added up to +15 a day).
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROFILE, generatePlan, historyFrom, replacementChoices, replaceWith, type PlanInput } from '../../core/missions';
import { addDays } from '../../core/time';
import type { DayPlan, Profile, SwapReason, TrackId } from '../../core/types';
import { MISSION_BY_ID, MISSIONS, RULES } from '../../content';
import { swapCap } from '../store';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({ appStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const REASONS: SwapReason[] = ['too-easy', 'another', 'not-relevant', 'cant-today', 'already-did', 'too-hard'];

/** What a planned mission pays when proven (core/complete: never more than its planned points). */
const worth = (p: DayPlan['missions'][number]) => {
  const own = MISSION_BY_ID[p.missionId]?.points ?? 0;
  return typeof p.points === 'number' ? Math.min(p.points, own) : own;
};
const dayPoints = (plan: DayPlan) => plan.missions.reduce((t, p) => t + worth(p), 0);

/** Swaps the way the store does (replaceMission): the choice, planned at most at swapCap. */
function swap(plan: DayPlan, index: number, missionId: string, area: TrackId, reason: SwapReason): DayPlan | null {
  const m = MISSION_BY_ID[missionId];
  if (!m) return null;
  const cap = swapCap(plan, index);
  return replaceWith(plan, index, m, area, reason, 0, cap !== undefined && cap < m.points ? cap : undefined);
}

/** The most points the day can earn with up to `swaps` swaps, each the biggest gain on offer. */
function best(plan: DayPlan, input: PlanInput, swaps: number): DayPlan {
  let cur = plan;
  for (let k = 0; k < swaps; k++) {
    let top: { plan: DayPlan; gain: number } | null = null;
    for (let i = 0; i < cur.missions.length; i++) {
      for (const r of REASONS) {
        for (const c of replacementChoices(cur, i, input, r)) {
          const next = swap(cur, i, c.mission.id, c.area, r);
          if (!next) continue;
          const gain = dayPoints(next) - dayPoints(cur);
          if (gain > 0 && (!top || gain > top.gain)) top = { plan: next, gain };
        }
      }
    }
    if (!top) break;
    cur = top.plan;
  }
  return cur;
}

const AREAS: TrackId[][] = [
  ['discipline', 'school', 'fitness'],
  ['projects', 'money', 'fitness'],
  ['career', 'skills', 'organization'],
  ['money', 'organization'],
];
const SHAPES: Pick<Profile, 'minutes' | 'intensity'>[] = [
  { minutes: 15, intensity: 'lockin' },
  { minutes: 30, intensity: 'lockin' },
  { minutes: 45, intensity: 'lockin' },
  { minutes: 60, intensity: 'easy' },
  { minutes: 60, intensity: 'lockin' },
  { minutes: 60, intensity: 'push' },
];

describe('swap parity', () => {
  it('the first swap is free of the cap; every later one is capped at what it replaces', () => {
    expect(RULES.rerolls.full).toBeGreaterThan(RULES.rerolls.free);
    const plan: DayPlan = {
      day: '2026-10-19',
      missions: [
        { slot: 'easy', missionId: 'D4', area: 'discipline' },
        { slot: 'main', missionId: 'S1', area: 'school', points: 10 },
      ],
      rerolls: 0,
      replaced: [],
    };
    expect(swapCap(plan, 0)).toBeUndefined();
    expect(swapCap({ ...plan, rerolls: RULES.rerolls.free }, 0)).toBe(MISSION_BY_ID.D4!.points);
    expect(swapCap({ ...plan, rerolls: RULES.rerolls.free }, 1)).toBe(10);
    expect(swapCap({ ...plan, rerolls: 2 }, 5)).toBeUndefined();
  });

  it("a mission of an UNSETLD+ Plan capped to keep the day's points (core/missions capForPlan) keeps its cap through the first swap too", () => {
    const plan: DayPlan = {
      day: '2026-10-19',
      missions: [
        { slot: 'main', missionId: 'P1', area: 'projects', programId: 'build-something', points: 5 },
        { slot: 'easy', missionId: 'P6', area: 'projects', programId: 'build-something' },
        { slot: 'main', missionId: 'D1', area: 'discipline' },
      ],
      rerolls: 0,
      replaced: [],
    };
    expect(swapCap(plan, 0)).toBe(5);
    expect(swapCap(plan, 1)).toBeUndefined();
    expect(swapCap(plan, 2)).toBeUndefined();
    expect(swapCap({ ...plan, rerolls: RULES.rerolls.free }, 0)).toBe(5);
    // What it is swapped for is planned at the cap, and pays no more.
    const next = swap(plan, 0, 'D2', 'discipline', 'another');
    expect(next && worth(next.missions[0]!)).toBe(5);
  });

  for (const shape of SHAPES) {
    it(`${shape.minutes} min, ${shape.intensity}: three swaps never beat one`, () => {
      for (const tracks of AREAS) {
        const profile: Profile = { ...DEFAULT_PROFILE, ...shape, tracks, age: '16to17', school: true, schoolLevel: 'high', priority: null, gym: null, goal: null };
        for (let d = 0; d < 4; d++) {
          const day = addDays('2026-10-19', d);
          const input: PlanInput = { library: MISSIONS, profile, day, salt: `parity-${tracks.join('')}`, history: historyFrom({}, {}, {}, day), hour: 9, program: null };
          const plan = generatePlan(input);
          const one = dayPoints(best(plan, input, RULES.rerolls.free));
          const three = dayPoints(best(plan, input, RULES.rerolls.full));
          expect(three, `${tracks.join('+')} ${day}`).toBe(one);
        }
      }
    }, 60_000);
  }

  it('no later swap of any kind raises its slot', () => {
    const profile: Profile = { ...DEFAULT_PROFILE, minutes: 60, intensity: 'push', tracks: ['discipline', 'school', 'fitness'], school: true, schoolLevel: 'high' };
    const day = '2026-10-20';
    const input: PlanInput = { library: MISSIONS, profile, day, salt: 'parity-slot', history: historyFrom({}, {}, {}, day), hour: 9, program: null };
    const plan = { ...generatePlan(input), rerolls: RULES.rerolls.free };
    let tried = 0;
    plan.missions.forEach((p, i) => {
      for (const r of REASONS) {
        for (const c of replacementChoices(plan, i, input, r)) {
          const next = swap(plan, i, c.mission.id, c.area, r);
          if (!next) continue;
          tried++;
          expect(worth(next.missions[i]!)).toBeLessThanOrEqual(worth(p));
        }
      }
    });
    expect(tried).toBeGreaterThan(0);
  });
});
