// The real mission library against five very different users, a week at a time.
// `PRINT=1 npx vitest run src/core/__tests__/personas.test.ts` prints each day's plan.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { dayBudget, DEFAULT_PROFILE, generatePlan, historyFrom, rerollMission, serves, usableAreas, type PlanInput } from '../missions';
import { addDays, type DayKey } from '../time';
import type { DayPlan, Mission, Profile, TrackId } from '../types';

const LIBRARY = (missionsJson as Mission[]).filter(m => m.active);
const BY_ID = new Map(LIBRARY.map(m => [m.id, m]));

export const PERSONAS: { key: string; who: string; profile: Profile }[] = [
  { key: 'A', who: '18, student. Goals: School, Fitness, Discipline', profile: { ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'discipline'], school: true, work: false, gym: true, project: false, age: '18plus' } },
  { key: 'B', who: '20, college student. Goals: Business, Money, Fitness', profile: { ...DEFAULT_PROFILE, tracks: ['business', 'money', 'fitness'], school: true, work: false, gym: true, project: true, age: '18plus' } },
  { key: 'C', who: '22, not in school. Goals: Career, Skills, Organization', profile: { ...DEFAULT_PROFILE, tracks: ['career', 'skills', 'organization'], school: false, work: false, gym: null, project: false, age: '18plus', skills: ['coding'] } },
  { key: 'D', who: '17, student. Goals: School, Skills, Projects', profile: { ...DEFAULT_PROFILE, tracks: ['school', 'skills', 'projects'], school: true, work: false, gym: false, project: true, age: '16to17', skills: ['design'] } },
  { key: 'E', who: '24, working. Goals: Fitness, Money, Career', profile: { ...DEFAULT_PROFILE, tracks: ['fitness', 'money', 'career'], school: false, work: true, gym: true, project: false, age: '18plus' } },
];

/** A week where every planned mission gets proven, so cooldowns and rotation do their work. */
export function simulateWeek(profile: Profile, start: DayKey = '2026-10-12', days = 7, hour = 8): DayPlan[] {
  const done: Record<DayKey, Record<string, { missionId: string }>> = {};
  const plans: Record<DayKey, DayPlan> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const input: PlanInput = { library: LIBRARY, profile, day, salt: 'persona', history: historyFrom(done, plans, {}, day), hour };
    const plan = generatePlan(input);
    plans[day] = plan;
    done[day] = Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }]));
    out.push(plan);
  }
  return out;
}

const row = (id: string) => {
  const m = BY_ID.get(id)!;
  return `${m.title.padEnd(48)} ${m.track.padEnd(12)} ${String(m.minutes).padStart(3)}m  +${m.points}`;
};

describe('personas', () => {
  for (const p of PERSONAS) {
    it(`User ${p.key} (${p.who}) gets missions from their own goals`, () => {
      const week = simulateWeek(p.profile);
      if (process.env.PRINT) {
        console.log(`\nUSER ${p.key}: ${p.who}`);
        for (const plan of week) console.log(`  ${plan.day}\n` + plan.missions.map(x => `    ${row(x.missionId)}`).join('\n'));
      }
      for (const plan of week) {
        expect(plan.missions.length).toBe(3);
        const ms = plan.missions.map(x => BY_ID.get(x.missionId)!);
        // Every mission serves one of the user's goals (or is a universal basic on the easy slot).
        for (const m of ms) expect(p.profile.tracks.some(t => serves(m, t)) || ['discipline', 'organization'].includes(m.track)).toBe(true);
        // One easy mission, two focused ones.
        expect(ms.filter(m => m.minutes <= 15).length).toBe(1);
        // No school missions for someone not in school; no gym missions without a gym.
        if (p.profile.school === false) expect(ms.some(m => m.requires?.includes('school'))).toBe(false);
        if (p.profile.gym !== true) expect(ms.some(m => m.requires?.includes('gym'))).toBe(false);
        // Within the time they chose (a little over at most, when nothing shorter is left).
        expect(ms.reduce((t, m) => t + m.minutes, 0)).toBeLessThanOrEqual(dayBudget(p.profile) + 15);
        // Each mission is in the day for one of their areas, and the day covers as many areas as it can.
        const areas = usableAreas(LIBRARY, p.profile);
        for (const x of plan.missions) expect(x.area && serves(BY_ID.get(x.missionId)!, x.area)).toBeTruthy();
        expect(new Set(plan.missions.map(x => x.area)).size).toBe(Math.min(areas.length, plan.missions.length));
        // Missions tied to a school day keep to their days ("Review Today's Notes" never on a Saturday).
        const weekday = new Date(`${plan.day}T12:00:00`).getDay();
        for (const m of ms) if (m.days) expect(m.days).toContain(weekday);
      }
      // Days differ.
      const keys = week.map(plan => plan.missions.map(x => x.missionId).sort().join());
      for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
      // Over a week, every goal shows up.
      const tracks = new Set(week.flatMap(plan => plan.missions.map(x => BY_ID.get(x.missionId)!.track)));
      for (const t of p.profile.tracks) expect(tracks.has(t)).toBe(true);
    });
  }

  it('a swap stays in the same goal area', () => {
    for (const p of PERSONAS) {
      const day: DayKey = '2026-10-12';
      const input: PlanInput = { library: LIBRARY, profile: p.profile, day, salt: 'persona', history: { lastDone: {}, lastPlanned: {}, skips: {} }, hour: 8 };
      let plan: DayPlan | null = generatePlan(input);
      const lines: string[] = [];
      for (let i = 0; i < plan.missions.length; i++) {
        const before = BY_ID.get(plan.missions[i].missionId)!;
        const next = rerollMission(plan, i, input);
        expect(next).not.toBeNull();
        const after = BY_ID.get(next!.missions[i].missionId)!;
        // Same area it was in the day for, same size.
        expect(next!.missions[i].area).toBe(plan.missions[i].area);
        expect(serves(after, plan.missions[i].area as TrackId)).toBe(true);
        expect(after.minutes <= 15).toBe(before.minutes <= 15);
        lines.push(`    swap ${before.title} → ${after.title}`);
        plan = next;
      }
      if (process.env.PRINT) console.log(`\nUSER ${p.key} swaps\n${lines.join('\n')}`);
    }
  });

  it('leaves morning missions out of a plan made in the afternoon', () => {
    const plans = simulateWeek(PERSONAS[0].profile, '2026-10-12', 14, 15);
    for (const plan of plans) for (const x of plan.missions) expect(BY_ID.get(x.missionId)!.when).not.toBe('morning');
  });
});
