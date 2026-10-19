// The approved mission library against the founder's five users (15 Oct 2026), a week at a time.
// `PRINT=1 npx vitest run src/core/__tests__/personas.test.ts` prints each day's plan.
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import programsJson from '../../content/programs.json';
import { available, dayBudget, DEFAULT_PROFILE, EASY_MAX_MINUTES, eligibleAreas, fitsSlot, generatePlan, historyFrom, planAreas, rerollMission, serves, slotsFor, usableAreas, type PlanInput } from '../missions';
import { goalLean, leanFor } from '../personalize';
import { addDays, type DayKey } from '../time';
import { missionTitle } from '../titles';
import type { DayPlan, Mission, Profile, Program, TrackId } from '../types';

const LIBRARY = (missionsJson as Mission[]).filter(m => m.active);
const BY_ID = new Map(LIBRARY.map(m => [m.id, m]));

export const PERSONAS: { key: string; who: string; profile: Profile }[] = [
  {
    key: 'A',
    who: '17, student. School, Fitness, Discipline. "Improve grades and train consistently."',
    profile: { ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'discipline'], school: true, schoolLevel: 'high', work: false, gym: true, project: false, age: '16to17', minutes: 45, goal: 'Improve grades and train consistently.' },
  },
  {
    key: 'B',
    who: '20, college. Projects, Money, Fitness. "Build a clothing brand and save money."',
    profile: { ...DEFAULT_PROFILE, tracks: ['projects', 'money', 'fitness'], school: true, schoolLevel: 'college', work: false, gym: true, project: true, age: '18plus', minutes: 45, goal: 'Build a clothing brand and save money.' },
  },
  {
    key: 'C',
    who: '22, working. Career, Skills, Organization. "Get a software job and improve coding."',
    profile: { ...DEFAULT_PROFILE, tracks: ['career', 'skills', 'organization'], school: false, work: true, gym: null, project: false, age: '18plus', skills: ['coding'], minutes: 45, goal: 'Get a software job and improve coding.' },
  },
  {
    key: 'D',
    who: '19, college. Projects, Skills, Discipline. "Build and ship an app."',
    profile: { ...DEFAULT_PROFILE, tracks: ['projects', 'skills', 'discipline'], school: true, schoolLevel: 'college', work: false, gym: false, project: true, age: '18plus', skills: ['coding'], minutes: 45, goal: 'Build and ship an app.' },
  },
  {
    key: 'E',
    who: '24, working. Fitness, Money, Career. "Improve fitness, save money, and find a better job."',
    profile: { ...DEFAULT_PROFILE, tracks: ['fitness', 'money', 'career'], school: false, work: true, gym: true, project: false, age: '18plus', minutes: 45, goal: 'Improve fitness, save money, and find a better job.' },
  },
];
const persona = (key: string) => PERSONAS.find(p => p.key === key)!.profile;

/** A run of days where every planned mission gets proven (`proveAll`), so cooldowns and rotation do their work. */
export function simulateWeek(profile: Profile, start: DayKey = '2026-10-12', days = 7, hour = 8, salt = 'persona', proveAll = true): DayPlan[] {
  const done: Record<DayKey, Record<string, { missionId: string }>> = {};
  const plans: Record<DayKey, DayPlan> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const input: PlanInput = { library: LIBRARY, profile, day, salt, history: historyFrom(done, plans, {}, day), hour };
    const plan = generatePlan(input);
    plans[day] = plan;
    done[day] = proveAll ? Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }])) : {};
    out.push(plan);
  }
  return out;
}

const row = (id: string, profile: Profile) => {
  const m = BY_ID.get(id)!;
  return `${id.padEnd(4)} ${missionTitle(m, profile).padEnd(62)} ${m.track.padEnd(12)} ${String(m.minutes).padStart(3)}m  +${m.points}`;
};

describe('personas', () => {
  for (const p of PERSONAS) {
    it(`User ${p.key} (${p.who}) gets approved missions from their own goals`, () => {
      const week = simulateWeek(p.profile);
      if (process.env.PRINT) {
        console.log(`\nUSER ${p.key}: ${p.who}`);
        for (const plan of week) console.log(`  ${plan.day}\n` + plan.missions.map(x => `    ${row(x.missionId, p.profile)}`).join('\n'));
      }
      let focusedSlots = 0;
      let focusedFilled = 0;
      let doubled = 0;
      for (const plan of week) {
        expect(plan.missions.length).toBe(slotsFor(p.profile).length);
        const ms = plan.missions.map(x => BY_ID.get(x.missionId)!);
        // Every mission is an approved one, in the day for an area the user can get missions from.
        const eligible = eligibleAreas(p.profile, plan.day);
        for (const x of plan.missions) {
          expect(BY_ID.has(x.missionId)).toBe(true);
          expect(eligible).toContain(x.area);
          expect(serves(BY_ID.get(x.missionId)!, x.area as TrackId)).toBe(true);
        }
        // At least one focused mission every day (20 minutes or more in a focused slot: a 20-minute
        // mission fits either slot; a weekly one whose turn has come may take a second focused slot).
        expect(plan.missions.some(x => x.slot === 'main' && fitsSlot(BY_ID.get(x.missionId)!, 'main'))).toBe(true);
        focusedSlots += plan.missions.filter(x => x.slot === 'main').length;
        focusedFilled += plan.missions.filter(x => x.slot === 'main' && fitsSlot(BY_ID.get(x.missionId)!, 'main')).length;
        // Within the time they chose (a short mission over at most, when nothing shorter is left).
        expect(ms.reduce((t, m) => t + m.minutes, 0)).toBeLessThanOrEqual(dayBudget(p.profile) + 15);
        // The day covers as many of their areas as it has slots, never three from one. An area takes
        // a second slot only when another area's short missions are all resting, or for a support
        // task next to its real one (Write Your Next 3 Project Actions): at most one day a week.
        const areas = usableAreas(LIBRARY, p.profile);
        const per = plan.missions.reduce<Record<string, number>>((t, x) => ({ ...t, [x.area!]: (t[x.area!] ?? 0) + 1 }), {});
        expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2);
        if (Object.keys(per).length < Math.min(areas.length, plan.missions.length)) doubled += 1;
        // Missions tied to days of the week keep to them (the engine supports `days`; no approved mission uses it now).
        const weekday = new Date(`${plan.day}T12:00:00`).getDay();
        for (const m of ms) if (m.days) expect(m.days).toContain(weekday);
      }
      expect(doubled, 'days with two missions from one area').toBeLessThanOrEqual(1);
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
        // Same area it was in the day for, an approved mission.
        expect(next!.missions[i].area).toBe(plan.missions[i].area);
        expect(serves(after, plan.missions[i].area as TrackId)).toBe(true);
        swaps += 1;
        // The same size: a mission the slot takes (a 20-minute one fits either).
        if (fitsSlot(after, plan.missions[i].slot === 'easy' ? 'easy' : 'main')) sameSize += 1;
        lines.push(`    swap ${before.title} → ${after.title}`);
        plan = next;
      }
      if (process.env.PRINT) console.log(`\nUSER ${p.key} swaps\n${lines.join('\n')}`);
    }
    expect(sameSize / swaps).toBeGreaterThanOrEqual(0.8);
  });

  it('leaves morning missions out of a plan made in the afternoon', () => {
    const plans = simulateWeek(persona('A'), '2026-10-12', 14, 15);
    for (const plan of plans) for (const x of plan.missions) expect(BY_ID.get(x.missionId)!.when).not.toBe('morning');
  });
});

describe('the founder personas, from the goal they typed', () => {
  const NONE = { lastDone: {}, lastPlanned: {}, skips: {} };
  const areasOf = (key: string) => goalLean(persona(key).goal).areas;

  it('read every area each goal names (a brand is Projects)', () => {
    expect(areasOf('A')).toEqual(expect.arrayContaining(['school', 'fitness']));
    expect(areasOf('B')).toEqual(expect.arrayContaining(['projects', 'money']));
    expect(areasOf('C')).toEqual(expect.arrayContaining(['career', 'skills']));
    expect(areasOf('D')).toEqual(expect.arrayContaining(['projects']));
    expect(areasOf('E')).toEqual(expect.arrayContaining(['fitness', 'money', 'career']));
  });

  it('can get missions only from the areas they picked (their goals name nothing else they qualify for)', () => {
    for (const p of PERSONAS) {
      expect(eligibleAreas(p.profile, '2026-10-14')).toEqual(p.profile.tracks);
      expect(planAreas({ library: LIBRARY, profile: p.profile, day: '2026-10-14' })).toEqual(p.profile.tracks);
    }
  });

  it('read their goal into the titles: one slot filled, the action unchanged', () => {
    const title = (key: string, id: string) => missionTitle(BY_ID.get(id)!, persona(key));
    expect(title('B', 'P1')).toBe('Work on Your Clothing Brand for 30 Minutes');
    expect(title('D', 'P1')).toBe('Work on Your App for 30 Minutes');
    expect(title('C', 'C3')).toBe('Find 3 Software Jobs Worth Applying To');
    expect(title('C', 'K1')).toBe('Practice Coding for 30 Minutes');
    // "Improve grades" names no subject; "a better job" no field: the approved titles stand.
    expect(title('A', 'S1')).toBe('Study One Subject for 30 Minutes');
    expect(title('E', 'C2')).toBe('Apply to One Job or Internship');
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

  it('with three goal areas, each is in the day most days, and the ones with focused missions take turns leading', () => {
    // Money's missions are all short, so it never takes the focused slot; it still comes most days.
    // Two missions a day at 45 (launch pass): three areas share two slots, so each is in about two days in three.
    const e = persona('E');
    const led = new Set<string>();
    const week = simulateWeek(e, '2026-10-12', 9);
    for (const plan of week) {
      const first = plan.missions.find(x => x.slot === 'main');
      if (first?.area) led.add(first.area);
    }
    expect([...led].sort()).toEqual(['career', 'fitness']);
    for (const a of ['fitness', 'money', 'career']) expect(week.filter(plan => plan.missions.some(x => x.area === a)).length, a).toBeGreaterThanOrEqual(6);
  });

  it('with two goal areas, the first one gets focused days too, not only every third day', () => {
    // A: "Improve grades and train consistently" (School, Fitness); D: "Build and ship an app" (Projects, Skills).
    // One focused slot a day at 45 (launch pass), and an area the goal doesn't name takes it every
    // other rest day: each goal area holds it on about a third of the days, the two together on
    // about two days in three.
    for (const [key, area, other] of [['A', 'school', 'fitness'], ['D', 'projects', 'skills']] as const) {
      const days = simulateWeek(persona(key), '2026-10-12', 28, 9, `two-${key}`);
      const focused = (a: string) => days.filter(plan => plan.missions.some(x => x.area === a && x.slot === 'main')).length;
      expect(focused(area), `${key} ${area}`).toBeGreaterThanOrEqual(9);
      expect(focused(other), `${key} ${other}`).toBeGreaterThanOrEqual(9);
      expect(focused(area) + focused(other), key).toBeGreaterThanOrEqual(18);
    }
  });

  it('every Plan day keeps all of its missions at every time choice, and adds the day\'s own only while the time allows', () => {
    const programs = programsJson as Program[];
    for (const prog of programs) {
      for (const minutes of [15, 30, 45, 60] as const) {
        for (const intensity of ['easy', 'lockin', 'push'] as const) {
          const tracks = [...new Set<TrackId>([...(prog.tracks as TrackId[]), 'school', 'fitness', 'money'])].slice(0, 3);
          const profile: Profile = { ...DEFAULT_PROFILE, tracks, school: true, project: true, minutes, intensity };
          prog.plan.forEach((ids, d) => {
            const plan = generatePlan({
              library: LIBRARY,
              profile,
              day: addDays('2026-10-12', d),
              salt: `plan-days-${prog.id}`,
              history: { lastDone: {}, lastPlanned: { D3: '2026-09-01' }, skips: {} },
              hour: 9,
              program: { id: prog.id, missionIds: ids },
            });
            const label = `${prog.id} day ${d + 1}, ${minutes} ${intensity}`;
            for (const id of ids) expect(plan.missions.find(x => x.missionId === id)?.programId, `${label}: ${id}`).toBe(prog.id);
            const planned = ids.reduce((t, id) => t + BY_ID.get(id)!.minutes, 0);
            const own = plan.missions.filter(x => !x.programId);
            if (dayBudget(profile) - planned < 10) expect(own, label).toEqual([]);
          });
        }
      }
    }
  });

  it('a running plan never pushes the weekly focus out of the day', () => {
    const a = persona('A');
    const lockIn = [['D4', 'D1'], ['D2'], ['D5', 'D4']];
    for (const minutes of [15, 30, 45] as const) {
      for (let d = 0; d < 6; d++) {
        const day = addDays('2026-10-12', d);
        const profile = { ...a, minutes, focus: { week: '2026-10-12', id: 'exam' as const } };
        const plan = generatePlan({
          library: LIBRARY,
          profile,
          day,
          salt: `plan-${d}`,
          history: { lastDone: {}, lastPlanned: { D3: '2026-09-01' }, skips: {} },
          hour: 9,
          program: { id: 'lock-in-7', missionIds: lockIn[d % 3] },
        });
        expect(plan.missions.some(x => x.area === 'school'), `${minutes} min, ${day}`).toBe(true);
        expect(plan.missions.some(x => x.programId), `${minutes} min, ${day}`).toBe(true);
      }
    }
  });

  it("doesn't send someone working and out of school to look for internships only", () => {
    const e = persona('E');
    const internshipOnly = (id: string) => {
      const t = BY_ID.get(id)!.tags ?? [];
      return t.includes('internship') && !t.includes('job');
    };
    const weeks = [0, 1, 2, 3].flatMap(k => simulateWeek(e, addDays('2026-10-12', k * 7), 7));
    expect(weeks.flatMap(p => p.missions).filter(x => internshipOnly(x.missionId)).length).toBe(0);
  });

  it('Apply to One Job or Internship comes up only when a job or internship search is part of the goal or the week', () => {
    const advancing: Profile = { ...persona('E'), goal: 'Get stronger and advance professionally' };
    const four = (p: Profile) => [0, 1, 2, 3].flatMap(k => simulateWeek(p, addDays('2026-10-12', k * 7), 7)).flatMap(plan => plan.missions);
    expect(four(advancing).filter(x => x.missionId === 'C2').length).toBe(0);
    expect(four(persona('E')).filter(x => x.missionId === 'C2').length).toBeGreaterThan(0);
    // "Apply for jobs or internships" this week brings it in for the week.
    const applying = { ...advancing, focus: { week: '2026-10-12', id: 'apply' as const } };
    expect(simulateWeek(applying).flatMap(plan => plan.missions).filter(x => x.missionId === 'C2').length).toBeGreaterThan(0);
  });
});

describe('short days stay useful', () => {
  const salts = (n: number, f: (salt: string) => DayPlan[]) => Array.from({ length: n }, (_, k) => f(`s${k}`)).flat();
  const run = (profile: Profile, days: number, salt: string) => simulateWeek(profile, '2026-10-12', days, 9, salt);

  it('Projects is never just a support task (Write Your Next 3 Project Actions) at 15 or 30 minutes while a real one fits', () => {
    for (const key of ['B', 'D']) {
      for (const minutes of [15, 30] as const) {
        const p = { ...persona(key), minutes };
        for (let k = 0; k < 6; k++) {
          const plans = run(p, 14, `s${k}`);
          const byDay = Object.fromEntries(plans.map(pl => [pl.day, pl]));
          for (const plan of plans) {
            const own = plan.missions.filter(x => x.area === 'projects');
            if (!own.length || !own.every(x => BY_ID.get(x.missionId)!.tags?.includes('support'))) continue;
            // Only on a day every real Projects mission the slot could take was resting (cooldown, shown
            // lately): Projects has three short ones, and a 15-minute day can't take a 30-minute one.
            const before = plans.filter(pl => pl.day < plan.day);
            const done = Object.fromEntries(before.map(pl => [pl.day, Object.fromEntries(pl.missions.map(x => [x.missionId, { missionId: x.missionId }]))]));
            const input = { profile: p, day: plan.day, history: historyFrom(done, byDay, {}, plan.day), hour: 9 };
            const most = own.some(x => x.slot === 'main') ? Infinity : EASY_MAX_MINUTES;
            const real = LIBRARY.filter(m => serves(m, 'projects') && !m.tags?.includes('support') && m.minutes <= most && available(m, input, { shown: true }));
            expect(real.map(m => m.id), `${key} ${minutes} ${plan.day}`).toEqual([]);
          }
        }
      }
    }
  });

  it('a 15-minute day is one mission of 20 minutes or less, 10 or more when its area has one free', () => {
    const p: Profile = { ...DEFAULT_PROFILE, tracks: ['school', 'fitness'], school: true, minutes: 15 };
    for (const plan of salts(10, salt => run(p, 28, salt))) {
      expect(plan.missions.length).toBe(1);
      const m = BY_ID.get(plan.missions[0].missionId)!;
      expect(m.minutes).toBeLessThanOrEqual(dayBudget(p));
      // School's and Fitness's short missions all run 15 or 20 minutes.
      expect(m.minutes).toBeGreaterThanOrEqual(15);
    }
  });

  it('two areas at 15 minutes: they take turns, each in the day at least three days of every seven', () => {
    const p: Profile = { ...DEFAULT_PROFILE, tracks: ['fitness', 'organization'], school: false, gym: false, age: 'u16', minutes: 15 };
    for (let k = 0; k < 6; k++) {
      const days = run(p, 14, `s${k}`);
      for (let w = 0; w + 7 <= days.length; w++) {
        const week = days.slice(w, w + 7);
        for (const a of ['fitness', 'organization']) expect(week.filter(plan => plan.missions.some(x => x.area === a)).length, `s${k} ${week[0].day} ${a}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('one mission a day: every area the user picked is in every week, with a goal or without', () => {
    const goals = ['', 'Improve my grades', 'Build muscle', 'Save $1,000', 'Get organized'];
    for (const tracks of [
      ['discipline', 'school', 'fitness', 'money'],
      ['school', 'fitness', 'career', 'skills'],
      ['projects', 'money', 'fitness', 'organization'],
      ['fitness', 'money', 'career'],
    ] as TrackId[][]) {
      for (const goal of goals) {
        const p: Profile = { ...DEFAULT_PROFILE, tracks, school: tracks.includes('school') ? true : null, minutes: 15, goal: goal || undefined };
        const days = run(p, 28, `w-${goal}`);
        for (let w = 0; w < 4; w++) {
          const week = days.slice(w * 7, w * 7 + 7);
          for (const a of tracks) expect(week.some(plan => plan.missions.some(x => x.area === a)), `${tracks} "${goal}" week ${w + 1} ${a}`).toBe(true);
        }
      }
    }
  });

  it('one mission a day: Create Your Study Plan for the Week still comes every week, Sunday to Tuesday', () => {
    for (const tracks of [
      ['school', 'fitness'],
      ['discipline', 'school', 'fitness', 'money'],
      ['school', 'career', 'skills', 'organization'],
    ] as TrackId[][]) {
      for (const goal of ['', 'Build muscle']) {
        const p: Profile = { ...DEFAULT_PROFILE, tracks, school: true, minutes: 15, goal: goal || undefined };
        // From Monday 12 October: the first week's comes on the Monday or Tuesday, then every Sunday to Tuesday.
        const days = run(p, 28, `wk-${tracks.length}-${goal}`);
        const s12 = days.filter(plan => plan.missions.some(x => x.missionId === 'S12')).map(plan => plan.day);
        expect(s12.length, `${tracks} "${goal}" ${s12}`).toBeGreaterThanOrEqual(4);
        for (const d of s12) expect([0, 1, 2], `${tracks} ${d}`).toContain(new Date(`${d}T12:00:00`).getDay());
      }
    }
  });

  it('a 30-minute day is one short mission and one focused one', () => {
    for (const p of PERSONAS) {
      for (const plan of run({ ...p.profile, minutes: 30 }, 14, 'm30')) {
        expect(plan.missions.map(x => x.slot)).toEqual(['easy', 'main']);
        const [short, focused] = plan.missions.map(x => BY_ID.get(x.missionId)!);
        expect(fitsSlot(short, 'easy')).toBe(true);
        expect(fitsSlot(focused, 'main'), `${p.key} ${plan.day}`).toBe(true);
      }
    }
  });

  it('"Build and ship an app" starts with real project work on Day 1 at 30 and 45 minutes', () => {
    const d = persona('D');
    for (const minutes of [30, 45] as const) {
      for (let i = 0; i < 14; i++) {
        const plan = generatePlan({ library: LIBRARY, profile: { ...d, minutes }, day: addDays('2026-10-12', i), salt: 'd1', history: { lastDone: {}, lastPlanned: {}, skips: {} }, hour: 9 });
        expect(plan.missions.some(x => x.area === 'projects' && BY_ID.get(x.missionId)!.minutes >= 20), `${minutes} min, day ${i}`).toBe(true);
      }
    }
  });
});

describe('the founder test, round 3', () => {
  const run = (profile: Profile, days: number, salt: string) => simulateWeek(profile, '2026-10-12', days, 9, salt);
  const A = persona('A');

  it('a gym week has Fitness every day, mostly the workouts the focus names', () => {
    for (const minutes of [30, 45] as const) {
      const p = { ...A, minutes, focus: { week: '2026-10-12', id: 'gym' as const } };
      const lean = leanFor(p, '2026-10-13');
      let named = 0;
      let n = 0;
      for (let k = 0; k < 10; k++) {
        for (const plan of run(p, 7, `g${k}`)) {
          const fit = plan.missions.filter(x => x.area === 'fitness').map(x => BY_ID.get(x.missionId)!);
          expect(fit.length, `${minutes} ${plan.day}`).toBeGreaterThan(0);
          n += 1;
          if (fit.some(m => lean.ids.has(m.id))) named += 1;
        }
      }
      expect(named / n, `${minutes} min`).toBeGreaterThanOrEqual(0.75);
    }
  });

  it('every area comes round for C and E: at least four days in seven at 45 minutes, two at 30, one in four at 15', () => {
    for (const key of ['C', 'E']) {
      for (const minutes of [15, 30, 45] as const) {
        const p = { ...persona(key), minutes };
        const areas = usableAreas(LIBRARY, p);
        const days = Array.from({ length: 6 }, (_, k) => run(p, 28, `c${k}`)).flat();
        // Two slots (one at 15), three areas: each area about two days in three at 30 and 45 (one in
        // three at 15); Career's short missions are mostly weekly or rarer, so it comes less often at 30.
        const least = minutes === 45 ? 4 / 7 : minutes === 30 ? 2 / 7 : 1 / 4;
        for (const a of areas) expect(days.filter(plan => plan.missions.some(x => x.area === a)).length / days.length, `${key} ${minutes} ${a}`).toBeGreaterThanOrEqual(least);
      }
    }
  });

  it('the weekly focus steers its own slot ("Prepare for an exam" gets exam missions)', () => {
    for (const minutes of [30, 45] as const) {
      const p = { ...A, minutes, focus: { week: '2026-10-12', id: 'exam' as const } };
      const lean = leanFor(p, '2026-10-13');
      let hit = 0;
      let n = 0;
      for (let k = 0; k < 30; k++) {
        for (const plan of run(p, 5, `x${k}`)) {
          const school = plan.missions.filter(x => x.area === 'school').map(x => BY_ID.get(x.missionId)!);
          if (!school.length) continue;
          n += 1;
          if (school.some(m => lean.ids.has(m.id) || (m.tags ?? []).some(t => lean.focusTags.has(t)))) hit += 1;
        }
      }
      // FOCUS_SHARE (0.8) of the days, give or take: at 30 minutes School has the one focused slot.
      expect(hit / n, `${minutes} min`).toBeGreaterThanOrEqual(0.75);
    }
  });
});
