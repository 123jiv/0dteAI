// The real mission library against five very different users, a week at a time.
// `PRINT=1 npx vitest run src/core/__tests__/personas.test.ts` prints each day's plan.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { dayBudget, DEFAULT_PROFILE, generatePlan, historyFrom, rerollMission, serves, usableAreas, type PlanInput } from '../missions';
import { goalLean } from '../personalize';
import { addDays, type DayKey } from '../time';
import type { DayPlan, Mission, Profile, TrackId } from '../types';

const LIBRARY = (missionsJson as Mission[]).filter(m => m.active);
const BY_ID = new Map(LIBRARY.map(m => [m.id, m]));

export const PERSONAS: { key: string; who: string; profile: Profile }[] = [
  {
    key: 'A',
    who: '17, student. School, Fitness, Discipline. "Improve grades and work out consistently."',
    profile: { ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'discipline'], school: true, schoolLevel: 'high', work: false, gym: true, project: false, age: '16to17', minutes: 45, goal: 'Improve grades and work out consistently.' },
  },
  {
    key: 'B',
    who: '20, college. Business, Money, Fitness. "Build a clothing business and save more money."',
    profile: { ...DEFAULT_PROFILE, tracks: ['business', 'money', 'fitness'], school: true, schoolLevel: 'college', work: false, gym: true, project: true, age: '18plus', minutes: 45, goal: 'Build a clothing business and save more money.' },
  },
  {
    key: 'C',
    who: '22, working. Career, Skills, Organization. "Get a better job and learn coding."',
    profile: { ...DEFAULT_PROFILE, tracks: ['career', 'skills', 'organization'], school: false, work: true, gym: null, project: false, age: '18plus', skills: ['coding'], minutes: 45, goal: 'Get a better job and learn coding.' },
  },
  {
    key: 'D',
    who: '19, college. Projects, Skills, Discipline. "Build and ship an app."',
    profile: { ...DEFAULT_PROFILE, tracks: ['projects', 'skills', 'discipline'], school: true, schoolLevel: 'college', work: false, gym: false, project: true, age: '18plus', skills: ['coding'], minutes: 60, goal: 'Build and ship an app.' },
  },
  {
    key: 'E',
    who: '24, working. Fitness, Money, Career. "Get in shape, save money and advance professionally."',
    profile: { ...DEFAULT_PROFILE, tracks: ['fitness', 'money', 'career'], school: false, work: true, gym: true, project: false, age: '18plus', minutes: 45, goal: 'Get in shape, save money and advance professionally.' },
  },
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
      let focusedSlots = 0;
      let focusedFilled = 0;
      for (const plan of week) {
        expect(plan.missions.length).toBe(3);
        const ms = plan.missions.map(x => BY_ID.get(x.missionId)!);
        // Every mission serves one of the user's goals (or is a universal basic on the easy slot).
        for (const m of ms) expect(p.profile.tracks.some(t => serves(m, t)) || ['discipline', 'organization'].includes(m.track)).toBe(true);
        // At least one focused mission every day (an area with nothing focused left gives a short one instead).
        expect(ms.some(m => m.minutes > 15)).toBe(true);
        focusedSlots += plan.missions.filter(x => x.slot === 'main').length;
        // 15 minutes counts (Clean Your Room for 15 Minutes in a 20-minute focused slot); 5- and 10-minute fillers don't.
        focusedFilled += plan.missions.filter(x => x.slot === 'main' && BY_ID.get(x.missionId)!.minutes >= 15).length;
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
      // Focused slots hold focused missions on most days.
      expect(focusedFilled / focusedSlots).toBeGreaterThanOrEqual(0.75);
      // Days differ.
      const keys = week.map(plan => plan.missions.map(x => x.missionId).sort().join());
      for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
      // A mission that isn't a core habit never runs three days in a row.
      for (let i = 2; i < week.length; i++) {
        for (const x of week[i].missions) {
          const m = BY_ID.get(x.missionId)!;
          if (m.anchor) continue;
          const run = [week[i - 1], week[i - 2]].every(d => d.missions.some(y => y.missionId === m.id));
          expect(run, `${m.title} three days running`).toBe(false);
        }
      }
      // Over a week, every goal shows up.
      const tracks = new Set(week.flatMap(plan => plan.missions.map(x => BY_ID.get(x.missionId)!.track)));
      for (const t of p.profile.tracks) expect(tracks.has(t)).toBe(true);
    });
  }

  it('a swap stays in the same goal area, and keeps its size when the area can', () => {
    let swaps = 0;
    let sameSize = 0;
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
        swaps += 1;
        if ((after.minutes <= 15) === (before.minutes <= 15)) sameSize += 1;
        lines.push(`    swap ${before.title} → ${after.title}`);
        plan = next;
      }
      if (process.env.PRINT) console.log(`\nUSER ${p.key} swaps\n${lines.join('\n')}`);
    }
    expect(sameSize / swaps).toBeGreaterThanOrEqual(0.8);
  });

  it('leaves morning missions out of a plan made in the afternoon', () => {
    const plans = simulateWeek(PERSONAS[0].profile, '2026-10-12', 14, 15);
    for (const plan of plans) for (const x of plan.missions) expect(BY_ID.get(x.missionId)!.when).not.toBe('morning');
  });
});

describe('the founder personas, from the goal they typed', () => {
  const NONE = { lastDone: {}, lastPlanned: {}, skips: {} };
  const areasOf = (key: string) => goalLean(PERSONAS.find(p => p.key === key)!.profile.goal).areas;

  it('read every area each goal names', () => {
    expect(areasOf('A')).toEqual(expect.arrayContaining(['school', 'fitness']));
    expect(areasOf('B')).toEqual(expect.arrayContaining(['business', 'money']));
    expect(areasOf('C')).toEqual(expect.arrayContaining(['career', 'skills']));
    expect(areasOf('D')).toEqual(expect.arrayContaining(['projects']));
    expect(areasOf('E')).toEqual(expect.arrayContaining(['fitness', 'money', 'career']));
  });

  it('Day 1 gives a focused mission to an area the goal names, whatever the date', () => {
    for (const p of PERSONAS) {
      const goal = goalLean(p.profile.goal).areas.filter(a => p.profile.tracks.includes(a));
      for (let d = 0; d < 9; d++) {
        const day = addDays('2026-10-12', d);
        const plan = generatePlan({ library: LIBRARY, profile: p.profile, day, salt: `day1-${d}`, history: NONE, hour: 9 });
        const focused = plan.missions.filter(x => x.slot === 'main').map(x => x.area);
        expect(focused.some(a => a && goal.includes(a)), `${p.key} on ${day}`).toBe(true);
      }
    }
  });

  it('Day 1 in the morning is things to do now, not tonight', () => {
    for (const p of PERSONAS) {
      for (let d = 0; d < 7; d++) {
        const plan = generatePlan({ library: LIBRARY, profile: p.profile, day: addDays('2026-10-12', d), salt: `am-${d}`, history: NONE, hour: 9 });
        for (const x of plan.missions) expect(BY_ID.get(x.missionId)!.when, `${p.key} ${x.missionId}`).not.toBe('evening');
      }
    }
  });

  it('with three goal areas, each one leads (takes the first focused slot) on some days', () => {
    const e = PERSONAS.find(p => p.key === 'E')!.profile;
    const led = new Set<string>();
    for (const plan of simulateWeek(e, '2026-10-12', 9)) {
      const first = plan.missions.find(x => x.slot === 'main');
      if (first?.area) led.add(first.area);
    }
    expect([...led].sort()).toEqual(['career', 'fitness', 'money']);
  });

  it('a running plan never pushes the weekly focus out of the day', () => {
    const a = PERSONAS.find(p => p.key === 'A')!.profile;
    const lockIn = [['discipline-plan-tomorrow', 'discipline-lock-in-30'], ['discipline-top-3', 'discipline-lock-in-30'], ['discipline-clear-3-small', 'discipline-lock-in-30']];
    for (const minutes of [15, 30, 45] as const) {
      for (let d = 0; d < 6; d++) {
        const day = addDays('2026-10-12', d);
        const profile = { ...a, minutes, focus: { week: '2026-10-12', id: 'exam' as const } };
        const plan = generatePlan({
          library: LIBRARY,
          profile,
          day,
          salt: `plan-${d}`,
          history: { lastDone: {}, lastPlanned: { 'retired-mission': '2026-09-01' }, skips: {} },
          hour: 9,
          program: { id: 'lock-in-7', missionIds: lockIn[d % 3] },
        });
        expect(plan.missions.some(x => x.area === 'school'), `${minutes} min, ${day}`).toBe(true);
        expect(plan.missions.some(x => x.programId), `${minutes} min, ${day}`).toBe(true);
      }
    }
  });

  it('missions made for one medium (Film One Video) wait for a user who named it', () => {
    const builder: Profile = { ...DEFAULT_PROFILE, tracks: ['projects', 'discipline'], project: true, skills: [], age: '18plus', minutes: 60 };
    const medium = (id: string) => Boolean(BY_ID.get(id)!.fits?.length);
    const plans = simulateWeek(builder, '2026-10-12', 28);
    expect(plans.flatMap(p => p.missions).filter(x => medium(x.missionId)).length).toBe(0);
    const filmmaker = simulateWeek({ ...builder, goal: 'Start a YouTube channel and get better at video editing' }, '2026-10-12', 28);
    expect(filmmaker.flatMap(p => p.missions).filter(x => medium(x.missionId)).length).toBeGreaterThan(0);
  });
});
