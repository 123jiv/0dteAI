// Rotation and how often missions come round (spec-rotation, 15 Oct 2026): the founder's five users
// over four weeks, planned and proven the way the store does it (planInput: historyFrom over the
// record and the saved plans, learnFrom over the last four weeks, the plan made at 9 AM; every
// planned mission proven with core/complete), on three installs. The full measurements (ten
// installs, at 15, 30, 45 and 60 minutes, and a second run with about two in three proven) use the
// same engine; these are the deterministic checks, quick enough to run every time.
// `PRINT=1 npx vitest run src/core/__tests__/rotation.test.ts` prints what each check measured.
import { describe, expect, it } from 'vitest';
import { MISSION_BY_ID, MISSIONS } from '../../content';
import { completeMission } from '../complete';
import {
  available,
  DEFAULT_PROFILE,
  fitsSlot,
  generatePlan,
  historyFrom,
  MAIN_MAX_MINUTES,
  MAX_DAYS_IN_WEEK,
  meetsRequirements,
  planAreas,
  replacementChoices,
  replaceWith,
  serves,
  turnOf,
  TURN_DAYS,
  WEEK_START_DAYS,
  type PlanInput,
} from '../missions';
import { learnFrom, NO_ADAPTATION } from '../personalize';
import { emptyRecord } from '../record';
import { addDays, parseDay, type DayKey } from '../time';
import type { DayPlan, Profile, RecordState, TrackId } from '../types';

const MONDAY: DayKey = '2026-10-19';
const DAYS = 28;
const INSTALLS = ['rotation-0', 'rotation-1', 'rotation-2'];
const PROOF_HOURS = [10, 16, 20, 21];

const BASE: Profile = { ...DEFAULT_PROFILE, minutes: 45, intensity: 'lockin', priority: null, gym: null };
const PEOPLE: Record<'A' | 'B' | 'C' | 'D' | 'E', Profile> = {
  A: { ...BASE, age: '16to17', school: true, schoolLevel: 'high', tracks: ['school', 'fitness', 'discipline'], goal: 'Improve grades and train consistently.' },
  B: { ...BASE, age: '18plus', school: true, schoolLevel: 'college', project: true, tracks: ['projects', 'money', 'fitness'], goal: 'Build a clothing brand and save money.' },
  C: { ...BASE, age: '18plus', work: true, school: false, tracks: ['career', 'skills', 'organization'], skills: ['coding'], goal: 'Get a software job and improve coding.' },
  D: { ...BASE, age: '18plus', school: true, schoolLevel: 'college', project: true, tracks: ['projects', 'skills', 'discipline'], skills: ['coding'], goal: 'Build and ship an app.' },
  E: { ...BASE, age: '18plus', work: true, school: false, tracks: ['fitness', 'money', 'career'], goal: 'Improve fitness, save money, and find a better job.' },
};
type Key = keyof typeof PEOPLE;
const KEYS = Object.keys(PEOPLE) as Key[];
type Minutes = 15 | 30 | 45 | 60;

/** The weekly missions (cooldown 7). */
const WEEKLY = ['S12', 'M2', 'M3', 'P9', 'O9', 'C5'];

const print = (line: string) => {
  if (process.env.PRINT) console.log(line);
};

/** Four weeks from Monday 19 October: the day planned at 9 AM, every mission in it proven that day. */
function fourWeeks(profile: Profile, salt: string): DayPlan[] {
  let record: RecordState = emptyRecord();
  const plans: Record<DayKey, DayPlan> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < DAYS; i++) {
    const day = addDays(MONDAY, i);
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt,
      history: historyFrom(record.missions ?? {}, plans, {}, day),
      hour: 9,
      program: null,
      adapt: learnFrom(plans, record.missions, MISSION_BY_ID, day),
    };
    const plan = generatePlan(input);
    plans[day] = plan;
    plan.missions.forEach((p, k) => {
      const at = new Date(`${day}T${PROOF_HOURS[k] ?? 21}:00:00`).getTime();
      record = completeMission(record, day, plan, MISSION_BY_ID[p.missionId], [], { status: 'accepted', method: 'on-device', checks: [], at }, { at, verifiedClock: true }).record;
    });
    out.push(plan);
  }
  return out;
}

const runs = new Map<string, DayPlan[][]>();
/** The three installs' four weeks for a user at a time of day (made once, shared by the checks). */
function installs(key: Key, minutes: Minutes): DayPlan[][] {
  const id = `${key}${minutes}`;
  if (!runs.has(id)) runs.set(id, INSTALLS.map(salt => fourWeeks({ ...PEOPLE[key], minutes }, salt)));
  return runs.get(id)!;
}

/** The days (0–27) each mission was planned on in one install. */
function daysOf(run: DayPlan[]): Record<string, number[]> {
  const at: Record<string, number[]> = {};
  run.forEach((plan, i) => plan.missions.forEach(p => (at[p.missionId] ??= []).push(i)));
  return at;
}

/** Average times a mission came up in four weeks, over the installs. */
const average = (runs: DayPlan[][], id: string) => runs.reduce((t, run) => t + (daysOf(run)[id]?.length ?? 0), 0) / runs.length;

/** The approved missions in the user's plan areas that their answers and intensity allow. */
function allowed(profile: Profile): string[] {
  const areas = planAreas({ library: MISSIONS, profile, day: MONDAY });
  return MISSIONS.filter(m => areas.some(a => serves(m, a)) && meetsRequirements(m.requires, profile, MONDAY) && m.minutes <= MAIN_MAX_MINUTES[profile.intensity]).map(m => m.id);
}

describe('slots and turns', () => {
  it('a short slot takes 20 minutes or less, a focused slot 20 or more: a 20-minute mission fits either', () => {
    expect(fitsSlot({ minutes: 15 }, 'easy')).toBe(true);
    expect(fitsSlot({ minutes: 15 }, 'main')).toBe(false);
    expect(fitsSlot({ minutes: 20 }, 'easy')).toBe(true);
    expect(fitsSlot({ minutes: 20 }, 'main')).toBe(true);
    expect(fitsSlot({ minutes: 30 }, 'easy')).toBe(false);
    expect(fitsSlot({ minutes: 30 }, 'main')).toBe(true);
  });

  it("a mission's turn is the days since it was last shown, done or swapped away, over how often it should come round", () => {
    const none = { lastDone: {}, lastPlanned: {}, skips: {} };
    const day: DayKey = '2026-10-20';
    // Never shown: fully due.
    expect(turnOf(MISSION_BY_ID.S3, none, day)).toBe(Infinity);
    // High every 2–3 days, medium every 4–5, low its whole cooldown.
    expect(turnOf(MISSION_BY_ID.S3, { ...none, lastPlanned: { S3: '2026-10-15' } }, day)).toBeCloseTo(5 / TURN_DAYS.high);
    expect(turnOf(MISSION_BY_ID.C3, { ...none, lastPlanned: { C3: '2026-10-15' } }, day)).toBeCloseTo(5 / TURN_DAYS.medium);
    expect(turnOf(MISSION_BY_ID.S12, { ...none, lastPlanned: { S12: '2026-10-13' } }, day)).toBe(1);
    // The latest of shown, done and swapped away counts.
    expect(turnOf(MISSION_BY_ID.S3, { lastPlanned: { S3: '2026-10-10' }, lastDone: { S3: '2026-10-15' }, skips: { S3: { count: 1, last: '2026-10-18' } } }, day)).toBeCloseTo(2 / TURN_DAYS.high);
  });

  it('a mission swapped as Not relevant does not build up a turn: long away, it still mostly stays away', () => {
    // S11 last shown 20 days ago (eight turns overdue), School's other missions three or four days
    // ago. Over many installs, how often a day has it.
    const day: DayKey = '2026-11-09';
    const lately = Object.fromEntries(['S2', 'S3', 'S4', 'S6', 'S7', 'S9', 'S10', 'S13', 'S15'].map((id, k) => [id, k % 2 ? '2026-11-05' : '2026-11-06']));
    const history = { lastDone: {}, lastPlanned: { ...lately, S11: '2026-10-20', S12: '2026-11-04', S1: '2026-11-08', S5: '2026-11-07' }, skips: {} };
    const days = (notForMe: Record<string, number>) =>
      Array.from({ length: 200 }, (_, k) =>
        generatePlan({ library: MISSIONS, profile: PEOPLE.A, day, salt: `nfm-${k}`, history, hour: 9, adapt: { ...NO_ADAPTATION, notForMe } }),
      ).filter(plan => plan.missions.some(p => p.missionId === 'S11')).length;
    const owed = days({});
    const turnedDown = days({ S11: 2 });
    print(`S11 long away: in ${owed} of 200 days; swapped as Not relevant twice: ${turnedDown}`);
    expect(owed).toBeGreaterThan(40);
    expect(turnedDown).toBeLessThan(owed / 10);
  });

  it('a mission already on four of the last six days waits (core habits too), unless the guarantee lets it back', () => {
    const m1 = MISSION_BY_ID.M1;
    const plans: Record<DayKey, DayPlan> = {};
    for (const d of ['2026-10-14', '2026-10-15', '2026-10-17', '2026-10-18']) plans[d] = { day: d, missions: [{ slot: 'easy', missionId: 'M1', area: 'money' }], rerolls: 0, replaced: [] };
    const input = (day: DayKey) => ({ profile: PEOPLE.B, day, history: historyFrom({}, plans, {}, day), hour: 9 });
    expect(MAX_DAYS_IN_WEEK).toBe(4);
    expect(input('2026-10-20').history.recent?.M1).toEqual(['2026-10-14', '2026-10-15', '2026-10-17', '2026-10-18']);
    expect(available(m1, input('2026-10-20'))).toBe(false);
    expect(available(m1, input('2026-10-20'), { shown: true, skips: true })).toBe(false);
    expect(available(m1, input('2026-10-20'), { often: true })).toBe(true);
    // A day later the first of the four is a week back: three of the last six.
    expect(available(m1, input('2026-10-21'))).toBe(true);
  });
});

describe('four weeks, three installs, every mission proven', () => {
  it('at 45 and 60 minutes every mission in their areas comes up', () => {
    for (const key of KEYS) {
      for (const minutes of [45, 60] as const) {
        const profile = { ...PEOPLE[key], minutes };
        const seen = installs(key, minutes).map(run => new Set(run.flatMap(plan => plan.missions.map(p => p.missionId))));
        for (const id of allowed(profile)) {
          const installsWithIt = seen.filter(s => s.has(id)).length;
          print(`${key}${minutes} ${id}: ${installsWithIt}/3`);
          expect(installsWithIt, `${key} ${minutes} min: ${id}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('weekly missions come about weekly (3–4 times in four weeks at 45 and 60 minutes, at least twice at 15 and 30)', () => {
    for (const key of KEYS) {
      for (const minutes of [15, 30, 45, 60] as const) {
        const ids = allowed({ ...PEOPLE[key], minutes }).filter(id => WEEKLY.includes(id));
        for (const id of ids) {
          const n = average(installs(key, minutes), id);
          print(`${key}${minutes} ${id}: ${n.toFixed(2)}`);
          if (minutes >= 45) {
            expect(n, `${key} ${minutes} min: ${id}`).toBeGreaterThanOrEqual(3);
            expect(n, `${key} ${minutes} min: ${id}`).toBeLessThanOrEqual(4);
          } else expect(n, `${key} ${minutes} min: ${id}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('the rarer ones: M5 about monthly, M6 at most once, C1 and C10 about twice, C9 once or twice', () => {
    const rule: Record<string, [number, number]> = { M5: [1, 1], M6: [0, 1], C1: [1.5, 2], C10: [1.5, 2], C9: [1, 2] };
    for (const key of KEYS) {
      for (const minutes of [45, 60] as const) {
        for (const [id, [lo, hi]] of Object.entries(rule)) {
          if (!allowed({ ...PEOPLE[key], minutes }).includes(id)) continue;
          const n = average(installs(key, minutes), id);
          print(`${key}${minutes} ${id}: ${n.toFixed(2)}`);
          expect(n, `${key} ${minutes} min: ${id}`).toBeGreaterThanOrEqual(lo);
          expect(n, `${key} ${minutes} min: ${id}`).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  it('nothing comes back inside its cooldown, and Find 3 Opportunities Worth Applying To comes up for the software-job search', () => {
    for (const key of KEYS) {
      for (const minutes of [15, 30, 45, 60] as const) {
        for (const run of installs(key, minutes)) {
          for (const [id, days] of Object.entries(daysOf(run))) {
            const wait = MISSION_BY_ID[id].cooldownDays;
            for (let k = 1; k < days.length; k++) expect(days[k] - days[k - 1], `${key} ${minutes} min: ${id} on days ${days[k - 1] + 1} and ${days[k] + 1}`).toBeGreaterThanOrEqual(wait);
          }
        }
      }
    }
    // C3 is due every 4–5 days (medium) but shares Career's one slot a day with two core habits, four
    // weekly or rarer missions and three other medium ones: two to three times in four weeks. The
    // founder's 1–2 a week would leave too few Career days for the rest (spec-rotation, C3).
    for (const minutes of [45, 60] as const) {
      const n = average(installs('C', minutes), 'C3');
      print(`C${minutes} C3: ${n.toFixed(2)}`);
      expect(n, `C ${minutes} min`).toBeGreaterThanOrEqual(2);
    }
  });

  it('no mission on more than four days of any seven, and at 45 and 60 minutes nothing but a core habit two days running', () => {
    // A fifth day only through the guarantee (step 5), when the area has nothing else free and no
    // other area a short mission (Track Everything You Spend Today, where Money's other missions
    // are weekly or rarer and the day's cardio blocks the other short one): rare, never a sixth.
    const fifth: string[] = [];
    for (const key of KEYS) {
      for (const minutes of [15, 30, 45, 60] as const) {
        for (const run of installs(key, minutes)) {
          for (const [id, days] of Object.entries(daysOf(run))) {
            let worst = 0;
            for (let start = 0; start + 7 <= DAYS; start++) {
              const inWeek = days.filter(d => d >= start && d < start + 7).length;
              expect(inWeek, `${key} ${minutes} min: ${id} on ${inWeek} days from day ${start + 1}`).toBeLessThanOrEqual(MAX_DAYS_IN_WEEK + 1);
              worst = Math.max(worst, inWeek);
            }
            if (worst > MAX_DAYS_IN_WEEK) fifth.push(`${key} ${minutes} min: ${id}`);
            if (minutes >= 45 && !MISSION_BY_ID[id].anchor) for (let k = 1; k < days.length; k++) expect(days[k] - days[k - 1], `${key} ${minutes} min: ${id}`).toBeGreaterThan(1);
          }
        }
      }
    }
    print(`a fifth day in seven: ${fifth.join('; ') || 'none'}`);
    expect(fifth.length).toBeLessThanOrEqual(2);
  });

  it('core habits still lead: on a good share of the days an area holds a focused slot, and more than any other one mission of it', () => {
    for (const key of KEYS) {
      for (const minutes of [45, 60] as const) {
        const runs = installs(key, minutes);
        for (const area of PEOPLE[key].tracks) {
          const anchors = MISSIONS.filter(m => m.anchor && m.track === area).map(m => m.id);
          let focused = 0;
          let withAnchor = 0;
          for (const plan of runs.flat()) {
            if (!plan.missions.some(p => p.area === area && p.slot === 'main')) continue;
            focused += 1;
            if (plan.missions.some(p => p.area === area && anchors.includes(p.missionId))) withAnchor += 1;
          }
          const count = (id: string) => runs.flat().filter(plan => plan.missions.some(p => p.missionId === id && p.area === area)).length;
          const ids = MISSIONS.filter(m => serves(m, area as TrackId)).map(m => m.id);
          const anchorDays = anchors.reduce((t, id) => t + count(id), 0);
          const top = Math.max(...ids.filter(id => !anchors.includes(id)).map(count));
          print(`${key}${minutes} ${area}: anchors on ${withAnchor}/${focused} focused days; anchors ${anchorDays}, top other ${top}`);
          if (focused >= 10) expect(withAnchor / focused, `${key} ${minutes} min: ${area}`).toBeGreaterThanOrEqual(0.25);
          expect(anchorDays, `${key} ${minutes} min: ${area}`).toBeGreaterThan(top);
        }
      }
    }
  });
});

/** The planner's input for day `i` of an install's run (every mission before it proven), for swaps. */
function inputOn(profile: Profile, run: DayPlan[], i: number, salt: string): PlanInput {
  const before = run.slice(0, i);
  const plans = Object.fromEntries(before.map(plan => [plan.day, plan]));
  const done = Object.fromEntries(before.map(plan => [plan.day, Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }]))]));
  return { library: MISSIONS, profile, day: run[i].day, salt, history: historyFrom(done, plans, {}, run[i].day), hour: 9 };
}

const minutesOf = (plan: DayPlan) => plan.missions.reduce((t, p) => t + MISSION_BY_ID[p.missionId].minutes, 0);

describe('the shape of the day and the swaps (rotation reviews, 15 Oct 2026)', () => {
  it('a day with focused slots keeps a focused mission when Money or Organization holds one of them', () => {
    const base: Profile = { ...BASE, school: true, schoolLevel: 'high', age: '16to17', goal: '' };
    const cases: Profile[] = [
      { ...base, tracks: ['money', 'organization', 'school'] },
      { ...base, tracks: ['school', 'discipline', 'money'], minutes: 60, intensity: 'push' },
      { ...base, tracks: ['organization', 'career'], minutes: 60, school: false, age: '18plus' },
      { ...base, tracks: ['discipline', 'organization', 'money', 'career'], school: false, age: '18plus' },
    ];
    for (const profile of cases)
      for (const salt of ['focus-0', 'focus-1'])
        for (const plan of fourWeeks(profile, salt))
          expect(plan.missions.some(p => MISSION_BY_ID[p.missionId].minutes >= 20), `${profile.tracks.join('+')} ${profile.minutes} ${salt} ${plan.day}`).toBe(true);
  });

  it('the day fills the time chosen: 45 minutes or more at 45, 50 or more with an hour and most days the full hour', () => {
    for (const key of KEYS) {
      for (const minutes of [45, 60] as const) {
        const days = installs(key, minutes).flat().map(minutesOf);
        const full = days.filter(n => n >= minutes).length / days.length;
        print(`${key}${minutes}: shortest ${Math.min(...days)} min, ${Math.round(100 * full)}% of days ${minutes}+`);
        expect(Math.min(...days), `${key} ${minutes} min`).toBeGreaterThanOrEqual(minutes === 45 ? 45 : 50);
        expect(full, `${key} ${minutes} min`).toBeGreaterThanOrEqual(0.75);
      }
    }
  });

  it('a 30-minute day covers two areas: a weekly mission due where the focused slot is trades slots or waits a day', () => {
    for (const key of KEYS) for (const run of installs(key, 30)) for (const plan of run) expect(new Set(plan.missions.map(p => p.area)).size, `${key} ${plan.day}`).toBe(2);
  });

  it('Too easy only offers missions at least as long as the one it replaces', () => {
    for (const key of KEYS) {
      for (const minutes of [30, 45, 60] as const) {
        const profile = { ...PEOPLE[key], minutes };
        const run = installs(key, minutes)[0];
        for (let i = 1; i < 14; i++) {
          const input = inputOn(profile, run, i, INSTALLS[0]);
          run[i].missions.forEach((p, k) => {
            const was = MISSION_BY_ID[p.missionId].minutes;
            for (const c of replacementChoices(run[i], k, input, 'too-easy')) expect(c.mission.minutes, `${key} ${minutes} ${run[i].day} ${p.missionId} → ${c.mission.id}`).toBeGreaterThanOrEqual(was);
          });
        }
      }
    }
  });

  it('a swap keeps a focused slot focused when the new mission fits it (a 20-minute one fits either)', () => {
    const plan: DayPlan = { day: MONDAY, missions: [{ slot: 'main', missionId: 'S5', area: 'school' }, { slot: 'easy', missionId: 'S2', area: 'school' }], rerolls: 0, replaced: [] };
    expect(replaceWith(plan, 0, MISSION_BY_ID.S3, 'school', 'another', 0)!.missions[0].slot).toBe('main');
    expect(replaceWith(plan, 0, MISSION_BY_ID.S4, 'school', 'too-hard', 0)!.missions[0].slot).toBe('easy');
    expect(replaceWith(plan, 1, MISSION_BY_ID.S9, 'school', 'another', 0)!.missions[1].slot).toBe('easy');
  });

  it("a program day's mission that fits only the short slot gets it before a 20-minute one, which fits either", () => {
    const history = { lastDone: {}, lastPlanned: { D1: '2026-10-18' }, skips: {}, recent: {} };
    for (const ids of [['S9', 'S2'], ['S2', 'S9']]) {
      const plan = generatePlan({ library: MISSIONS, profile: PEOPLE.A, day: '2026-10-23', salt: 'prog', history, program: { id: 'school-reset', missionIds: ids } });
      const slot = (id: string) => plan.missions.find(p => p.missionId === id)?.slot;
      expect([slot('S2'), slot('S9')], ids.join(',')).toEqual(['easy', 'main']);
    }
  });
});

describe('what comes when (rotation reviews, 15 Oct 2026)', () => {
  it('plans for the week land at the start of the week (Sunday to Tuesday)', () => {
    let start = 0;
    let all = 0;
    for (const key of KEYS)
      for (const minutes of [45, 60] as const)
        for (const plan of installs(key, minutes).flat())
          for (const p of plan.missions) {
            const m = MISSION_BY_ID[p.missionId];
            if (m.frequency !== 'low' || !m.tags?.includes('planning')) continue;
            all += 1;
            if (WEEK_START_DAYS.includes(parseDay(plan.day).getDay())) start += 1;
          }
    print(`plans for the week: ${start} of ${all} Sunday to Tuesday`);
    expect(start / all).toBeGreaterThanOrEqual(0.8);
  });

  it("the first weeks aren't full of weekly and monthly missions: at most one a day the user never had", () => {
    for (const key of KEYS) {
      for (const minutes of [15, 30, 45, 60] as const) {
        for (const run of installs(key, minutes)) {
          const seen = new Set<string>();
          run.forEach((plan, i) => {
            const fresh = plan.missions.filter(p => MISSION_BY_ID[p.missionId].frequency === 'low' && !seen.has(p.missionId));
            if (i > 0) expect(fresh.length, `${key} ${minutes} min ${plan.day}`).toBeLessThanOrEqual(1);
            for (const p of plan.missions) seen.add(p.missionId);
          });
        }
      }
    }
  });

  it('Write Your Next 3 Project Actions joins a real Projects mission (20 minutes or more), not another short task', () => {
    for (const key of ['B', 'D'] as const)
      for (const minutes of [45, 60] as const)
        for (const plan of installs(key, minutes).flat()) {
          if (!plan.missions.some(p => p.missionId === 'P6')) continue;
          // Alone it's only there when no real Projects mission fitted the slot (personas.test.ts).
          const others = plan.missions.filter(p => p.area === 'projects' && p.missionId !== 'P6').map(p => MISSION_BY_ID[p.missionId]);
          for (const m of others) expect(m.minutes, `${key} ${minutes} ${plan.day}: P6 with ${m.id}`).toBeGreaterThanOrEqual(20);
        }
  });

  it('Improve Something You Made Yesterday comes after real project work the day before, hardly ever otherwise', () => {
    // D on a Wednesday: Projects' missions shown three to six days ago, P11 five days ago.
    const day: DayKey = '2026-11-04';
    const yesterday = addDays(day, -1);
    const shown = { P2: '2026-10-30', P3: '2026-10-31', P4: '2026-10-29', P5: '2026-11-01', P7: '2026-10-29', P10: '2026-10-31', P11: '2026-10-30', P12: '2026-11-01', P9: '2026-10-30', P6: '2026-10-30' };
    const plans = (made: boolean) =>
      Array.from({ length: 200 }, (_, k) =>
        generatePlan({
          library: MISSIONS,
          profile: PEOPLE.D,
          day,
          salt: `p11-${k}`,
          history: made
            ? { lastDone: { P1: yesterday }, lastPlanned: { ...shown, P1: yesterday }, skips: {} }
            : { lastDone: { P1: '2026-10-31', D2: yesterday }, lastPlanned: { ...shown, P1: '2026-10-31', D2: yesterday }, skips: {} },
          hour: 9,
        }),
      ).filter(plan => plan.missions.some(p => p.missionId === 'P11')).length;
    const after = plans(true);
    const without = plans(false);
    print(`P11 after a day of project work: ${after} of 200; after none: ${without}`);
    expect(after).toBeGreaterThan(20);
    expect(without).toBeLessThan(after / 5);
  });

  it('near-twins in one area share the four days in seven, and the few-times-a-week ones are rarely the day after each other', () => {
    for (const key of KEYS) {
      for (const minutes of [45, 60] as const) {
        for (const run of installs(key, minutes)) {
          const byGroup: Record<string, number[]> = {};
          let nextDay = 0;
          run.forEach((plan, i) => {
            for (const p of plan.missions) {
              const m = MISSION_BY_ID[p.missionId];
              if (!m.group || m.anchor) continue;
              (byGroup[`${m.track}:${m.group}`] ??= []).push(i);
              const before = i > 0 ? run[i - 1].missions.map(x => MISSION_BY_ID[x.missionId]) : [];
              if (m.frequency !== 'high' && before.some(x => x.id !== m.id && x.group === m.group && x.track === m.track && !x.anchor)) nextDay += 1;
            }
          });
          for (const [group, days] of Object.entries(byGroup))
            for (let start = 0; start + 7 <= DAYS; start++)
              expect(days.filter(d => d >= start && d < start + 7).length, `${key} ${minutes} min: ${group} from day ${start + 1}`).toBeLessThanOrEqual(MAX_DAYS_IN_WEEK + 1);
          expect(nextDay, `${key} ${minutes} min`).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});
