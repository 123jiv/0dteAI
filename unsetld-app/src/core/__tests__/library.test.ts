// The approved mission library (founder decision, 15 Oct 2026): exactly the 66 approved missions,
// the only ones the planner, swaps and programs ever use; retired ones only for showing past proofs.
// Eligibility, the day shapes, how often missions come round, the never-empty slot and swaps,
// against the real library. scripts/validate-content.mjs checks the same content rules on `npm run validate`.
import { describe, expect, it } from 'vitest';
import { APPROVED_IDS, historyMission, isApproved, MISSION_BY_ID, MISSIONS, PROGRAMS, registerCustomMissions } from '../../content';
import legacyJson from '../../content/legacy-missions.json';
import tracksJson from '../../content/tracks.json';
import { makeCustomMission } from '../custom';
import {
  available,
  dayBudget,
  DEFAULT_PROFILE,
  EASY_MAX_MINUTES,
  eligibleAreas,
  generatePlan,
  historyFrom,
  MAX_PER_AREA,
  planAreas,
  replacementChoices,
  serves,
  sizeOf,
  slotsFor,
  usableAreas,
  type MissionHistory,
} from '../missions';
import { TRACK_IDS } from '../progress';
import { addDays, diffDays, type DayKey } from '../time';
import type { DayPlan, Profile, TrackId } from '../types';

/** The founder's approved ids, in order. The gaps are deliberate: never renumbered. */
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
const AREAS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
const LEGACY = legacyJson as Record<string, { title: string; track: string }>;
const NONE: MissionHistory = { lastDone: {}, lastPlanned: {}, skips: {} };

/** The founder's five users (personas.test.ts has their weeks). */
const PEOPLE: Record<string, Profile> = {
  A: { ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'discipline'], school: true, schoolLevel: 'high', work: false, gym: true, project: false, age: '16to17', goal: 'Improve grades and train consistently.' },
  B: { ...DEFAULT_PROFILE, tracks: ['projects', 'money', 'fitness'], school: true, schoolLevel: 'college', work: false, gym: true, project: true, age: '18plus', goal: 'Build a clothing brand and save money.' },
  C: { ...DEFAULT_PROFILE, tracks: ['career', 'skills', 'organization'], school: false, work: true, project: false, age: '18plus', skills: ['coding'], goal: 'Get a software job and improve coding.' },
  D: { ...DEFAULT_PROFILE, tracks: ['projects', 'skills', 'discipline'], school: true, schoolLevel: 'college', work: false, project: true, age: '18plus', skills: ['coding'], goal: 'Build and ship an app.' },
  E: { ...DEFAULT_PROFILE, tracks: ['fitness', 'money', 'career'], school: false, work: true, gym: true, project: false, age: '18plus', goal: 'Improve fitness, save money, and find a better job.' },
};
const SHAPES: Pick<Profile, 'minutes' | 'intensity'>[] = [
  { minutes: 15, intensity: 'lockin' },
  { minutes: 30, intensity: 'lockin' },
  { minutes: 45, intensity: 'lockin' },
  { minutes: 60, intensity: 'easy' },
  { minutes: 60, intensity: 'lockin' },
  { minutes: 60, intensity: 'push' },
];

/** `days` days of plans; every mission proven when `prove`, none otherwise. */
function run(profile: Profile, days: number, prove = true, salt = 'lib', start: DayKey = '2026-10-12'): DayPlan[] {
  const done: Record<DayKey, Record<string, { missionId: string }>> = {};
  const plans: Record<DayKey, DayPlan> = {};
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const plan = generatePlan({ library: MISSIONS, profile, day, salt, history: historyFrom(done, plans, {}, day), hour: 9 });
    plans[day] = plan;
    done[day] = prove ? Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }])) : {};
    out.push(plan);
  }
  return out;
}

describe('the approved library', () => {
  it('is exactly the 66 approved missions, in order, eight areas, every one from UNSETLD', () => {
    expect(APPROVED_IDS).toEqual(APPROVED);
    expect(MISSIONS.map(m => m.id)).toEqual(APPROVED);
    expect((tracksJson as { id: string }[]).map(t => t.id)).toEqual(AREAS);
    expect(TRACK_IDS).toEqual(AREAS);
    const count = (t: TrackId) => MISSIONS.filter(m => m.track === t).length;
    expect(AREAS.map(count)).toEqual([6, 13, 7, 5, 10, 9, 11, 5]);
    for (const m of MISSIONS) {
      expect(m).toMatchObject({ source: 'UNSETLD', active: true, repeatable: true });
      expect(['high', 'medium', 'low']).toContain(m.frequency);
      // The id's letter is its area.
      expect(m.track).toBe(AREAS[['D', 'S', 'F', 'M', 'C', 'K', 'P', 'O'].indexOf(m.id[0])]);
    }
  });

  it('looks up approved missions and your own only; retired ones are for history', () => {
    expect(Object.keys(LEGACY).length).toBe(235);
    for (const id of Object.keys(LEGACY)) {
      expect(isApproved(id)).toBe(false);
      expect(MISSION_BY_ID[id]).toBeUndefined();
      // Past proofs still show what they were.
      expect(historyMission(id)?.title).toBe(LEGACY[id].title);
      expect(AREAS).toContain(historyMission(id)?.track);
    }
    for (const id of Object.keys(MISSION_BY_ID)) expect(isApproved(id) || id.startsWith('custom-')).toBe(true);
    expect(historyMission('S1')).toBe(MISSION_BY_ID.S1);
    expect(historyMission('school-study-30')?.title).toBe(LEGACY['school-study-30'].title);
    expect(historyMission('nothing-like-this')).toBeUndefined();
    expect(historyMission('constructor')).toBeUndefined();
    // A link to unsetld://mission/constructor finds no mission either.
    expect(MISSION_BY_ID.constructor).toBeUndefined();
    expect(isApproved('P1')).toBe(true);
    expect(isApproved('custom-1')).toBe(false);
  });

  it('marks missions of your own USER_CREATED, also ones saved before there was a source', () => {
    const own = makeCustomMission({ title: 'Fix my bike chain', track: 'fitness', proofType: 'PHOTO' }, 'custom-lib-1')!;
    expect(own.source).toBe('USER_CREATED');
    const old = { ...own, id: 'custom-lib-2', source: undefined };
    registerCustomMissions([own, old, { ...own, id: 'S1' }]);
    expect(MISSION_BY_ID['custom-lib-1'].source).toBe('USER_CREATED');
    expect(MISSION_BY_ID['custom-lib-2'].source).toBe('USER_CREATED');
    // An approved mission is never replaced, and the planner's library never holds your own.
    expect(MISSION_BY_ID.S1.source).toBe('UNSETLD');
    expect(MISSIONS.some(m => m.custom || m.source !== 'UNSETLD')).toBe(false);
    delete MISSION_BY_ID['custom-lib-1'];
    delete MISSION_BY_ID['custom-lib-2'];
  });

  it('runs programs on approved missions only, at least two of them free', () => {
    for (const p of PROGRAMS) for (const id of p.plan.flat()) expect(isApproved(id), `${p.id} ${id}`).toBe(true);
    expect(PROGRAMS.filter(p => p.free).length).toBeGreaterThanOrEqual(2);
    expect(PROGRAMS.find(p => p.id === 'business-week')).toMatchObject({ tracks: ['projects'] });
    expect(PROGRAMS.find(p => p.id === 'lock-in-7')!.plan).toEqual([['D4', 'D1'], ['D2'], ['D5', 'D4'], ['D6', 'D1'], ['D3'], ['D1'], ['D4', 'D2']]);
    expect(PROGRAMS.find(p => p.id === 'fitness-base')!.plan).toEqual([['F2'], ['F5'], ['F3'], ['F5'], ['F6'], ['F5'], ['F2']]);
  });

  it('never plans, swaps in or recommends anything else, for anyone, at any time they chose', () => {
    for (const [key, base] of Object.entries(PEOPLE)) {
      for (const shape of SHAPES) {
        const profile = { ...base, ...shape };
        for (const plan of run(profile, 14, true, `w${key}`)) {
          for (const p of plan.missions) expect(isApproved(p.missionId)).toBe(true);
          for (let i = 0; i < plan.missions.length; i++) {
            for (const c of replacementChoices(plan, i, { library: MISSIONS, profile, day: plan.day, salt: 'r', history: NONE }, 'another')) {
              expect(isApproved(c.mission.id)).toBe(true);
              expect(eligibleAreas(profile, plan.day)).toContain(c.area);
            }
          }
        }
      }
    }
  });
});

describe('who can get which areas', () => {
  const day: DayKey = '2026-10-14';
  const p = (patch: Partial<Profile>): Profile => ({ ...DEFAULT_PROFILE, tracks: ['fitness', 'money'], ...patch });

  it('gives the founder’s five users exactly the areas they picked', () => {
    for (const profile of Object.values(PEOPLE)) {
      expect(eligibleAreas(profile, day)).toEqual(profile.tracks);
      expect(usableAreas(MISSIONS, profile)).toEqual(profile.tracks);
    }
  });

  it('School: picked, or in school with a goal about school; never age alone', () => {
    expect(eligibleAreas(p({ age: '16to17' }), day)).not.toContain('school');
    expect(eligibleAreas(p({ age: '16to17', school: null, goal: 'Get better grades' }), day)).not.toContain('school');
    expect(eligibleAreas(p({ school: true }), day)).not.toContain('school');
    expect(eligibleAreas(p({ school: true, goal: 'Get better grades' }), day)).toContain('school');
    expect(eligibleAreas(p({ school: false, tracks: ['school'] }), day)).toEqual(['school']);
  });

  it('Career: picked, or a job or internship search in the goal or this week', () => {
    expect(eligibleAreas(p({ goal: 'Land a summer internship' }), day)).toContain('career');
    expect(eligibleAreas(p({ goal: 'Advance professionally' }), day)).not.toContain('career');
    expect(eligibleAreas(p({ focus: { week: '2026-10-12', id: 'apply' } }), day)).toContain('career');
    // Applying to college and the job they already have aren't a job search.
    expect(eligibleAreas(p({ goal: 'Apply to college', school: true }), day)).not.toContain('career');
    expect(eligibleAreas(p({ goal: 'Get promoted at my job', work: true }), day)).not.toContain('career');
    expect(eligibleAreas(p({ goal: 'Apply to jobs and colleges' }), day)).toContain('career');
  });

  it('Projects: picked, building something, or a goal that names what they build; not "Build muscle" or "a software job"', () => {
    expect(eligibleAreas(p({ project: true }), day)).toContain('projects');
    expect(eligibleAreas(p({ goal: 'Launch my clothing brand' }), day)).toContain('projects');
    expect(eligibleAreas(p({ goal: 'Build and ship an app' }), day)).toContain('projects');
    expect(eligibleAreas(p({ goal: 'Build muscle' }), day)).not.toContain('projects');
    expect(eligibleAreas(p({ goal: 'Get a software job' }), day)).not.toContain('projects');
    for (const goal of ['Build Muscle', 'Start Running', 'Become a software engineer', 'Land a software engineering job', 'Get a job in software', 'Get a job at a startup', 'Open a savings account', 'Make my basketball game better', 'Finish one book a month']) {
      expect(eligibleAreas(p({ goal }), day), goal).not.toContain('projects');
    }
  });

  it('Fitness, Money, Skills, Organization and Discipline: only when picked (or this week’s focus)', () => {
    const student = p({ tracks: ['school', 'skills'], school: true, goal: 'Save money, get organized, get fit, be disciplined' });
    expect(eligibleAreas(student, day)).toEqual(['school', 'skills']);
    expect(eligibleAreas({ ...student, focus: { week: '2026-10-12', id: 'gym' } }, day)).toEqual(['school', 'skills', 'fitness']);
  });

  it('adds the goal’s areas to the day only when fewer than three were picked, and never without missions for them', () => {
    const brand = p({ goal: 'Launch my clothing brand' });
    expect(planAreas({ library: MISSIONS, profile: brand, day })).toEqual(['fitness', 'money', 'projects']);
    expect(planAreas({ library: MISSIONS, profile: { ...brand, tracks: ['fitness', 'money', 'skills'] }, day })).toEqual(['fitness', 'money', 'skills']);
    expect(planAreas({ library: MISSIONS.filter(m => m.track !== 'projects'), profile: brand, day })).toEqual(['fitness', 'money']);
    // Before onboarding (no areas yet), the defaults.
    expect(planAreas({ library: MISSIONS, profile: { ...DEFAULT_PROFILE, tracks: [] }, day })).toEqual(DEFAULT_PROFILE.tracks);
  });

  it('plans every mission in an eligible area, for every kind of user and day', () => {
    const others: Profile[] = [
      p({ goal: 'Launch my clothing brand' }),
      p({ tracks: ['skills'], goal: 'Get a summer internship' }),
      p({ tracks: ['organization', 'discipline'], school: true, goal: 'Pass calculus' }),
      p({ tracks: ['money'], focus: { week: '2026-10-12', id: 'gym' } }),
    ];
    for (const profile of [...Object.values(PEOPLE), ...others]) {
      for (const shape of SHAPES) {
        for (const plan of run({ ...profile, ...shape }, 14, false)) {
          const eligible = eligibleAreas({ ...profile, ...shape }, plan.day);
          for (const x of plan.missions) {
            expect(eligible).toContain(x.area);
            expect(serves(MISSION_BY_ID[x.missionId], x.area!)).toBe(true);
          }
        }
      }
    }
  });
});

describe('the day, by the time the user has', () => {
  it('15 minutes: two short missions; 30: one short and one focused; 45: one short and two focused; 60: by intensity', () => {
    for (const [key, base] of Object.entries(PEOPLE)) {
      for (const shape of SHAPES) {
        const profile = { ...base, ...shape };
        for (const plan of run(profile, 14, true, `s${key}`)) {
          const ms = plan.missions.map(x => MISSION_BY_ID[x.missionId]);
          expect(plan.missions.map(x => x.slot)).toEqual(slotsFor(profile));
          if (shape.minutes === 15) for (const m of ms) expect(m.minutes).toBeLessThanOrEqual(EASY_MAX_MINUTES);
          // Within the budget, or one short mission over it (an area whose shortest run 20 minutes).
          expect(ms.reduce((t, m) => t + m.minutes, 0), `${key} ${shape.minutes} ${plan.day}`).toBeLessThanOrEqual(dayBudget(profile) + EASY_MAX_MINUTES);
          // Start easy never gets a 45-minute mission.
          if (shape.intensity === 'easy') for (const m of ms) expect(m.minutes).toBeLessThanOrEqual(30);
        }
      }
    }
  });

  it('never puts three missions from one area in a day unless it is the week’s focus or their only area', () => {
    for (const base of Object.values(PEOPLE)) {
      for (const shape of SHAPES) {
        for (const plan of run({ ...base, ...shape }, 21, false)) {
          for (const a of AREAS) expect(plan.missions.filter(x => x.area === a).length).toBeLessThanOrEqual(MAX_PER_AREA);
        }
      }
    }
    // Two areas, Push me (four slots): two each.
    const two = { ...DEFAULT_PROFILE, tracks: ['money', 'organization'] as TrackId[], minutes: 60 as const, intensity: 'push' as const };
    for (const plan of run(two, 21)) {
      expect(plan.missions.length).toBe(4);
      for (const a of two.tracks) expect(plan.missions.filter(x => x.area === a).length).toBe(2);
    }
  });

  it('never leaves a slot empty while an approved mission in their areas is left, and never leaves their areas', () => {
    // One area, Push me: four Money missions a day out of five, weekly and monthly ones too, rather than a short day.
    const money = { ...DEFAULT_PROFILE, tracks: ['money'] as TrackId[], minutes: 60 as const, intensity: 'push' as const };
    for (const prove of [true, false]) {
      for (const plan of run(money, 28, prove)) {
        expect(plan.missions.length).toBe(4);
        for (const x of plan.missions) expect(MISSION_BY_ID[x.missionId].track).toBe('money');
      }
    }
    // Every slot of every day, for everyone, whether they prove things or not.
    for (const base of Object.values(PEOPLE)) {
      for (const shape of SHAPES) {
        for (const prove of [true, false]) for (const plan of run({ ...base, ...shape }, 28, prove)) expect(plan.missions.length).toBe(slotsFor(shape).length);
      }
    }
  });
});

describe('how often missions come round', () => {
  const low = MISSIONS.filter(m => m.frequency === 'low');

  it('keeps every weekly or rarer mission to its cooldown after it was shown, done or not', () => {
    expect(low.map(m => m.id)).toEqual(['S12', 'M2', 'M3', 'M5', 'M6', 'C1', 'C5', 'C9', 'C10', 'P9', 'O9']);
    for (const base of Object.values(PEOPLE)) {
      for (const prove of [true, false]) {
        const seen: Record<string, DayKey[]> = {};
        for (const plan of run(base, 42, prove)) for (const x of plan.missions) (seen[x.missionId] ??= []).push(plan.day);
        for (const m of low) {
          const days = seen[m.id] ?? [];
          for (let i = 1; i < days.length; i++) expect(diffDays(days[i - 1], days[i]), `${m.id} ${days[i - 1]} → ${days[i]}`).toBeGreaterThanOrEqual(m.cooldownDays);
        }
      }
    }
  });

  it('a weekly mission shown on Monday and left is not back until the next Monday, even when shown missions are let back', () => {
    const s12 = MISSION_BY_ID.S12;
    const shown = (day: DayKey, relax = {}) => available(s12, { profile: PEOPLE.A, day, history: { ...NONE, lastPlanned: { S12: '2026-10-12' } } }, relax);
    // Sunday to Tuesday only: Tuesday the 13th would be one of its days.
    expect(shown('2026-10-13', { shown: true, skips: true })).toBe(false);
    expect(shown('2026-10-18', { shown: true })).toBe(false);
    expect(shown('2026-10-19')).toBe(true);
  });

  it('shows medium-frequency missions a couple of times a week', () => {
    for (const base of Object.values(PEOPLE)) {
      const seen: Record<string, number> = {};
      for (const plan of run(base, 28)) for (const x of plan.missions) seen[x.missionId] = (seen[x.missionId] ?? 0) + 1;
      for (const m of MISSIONS.filter(x => x.frequency === 'medium')) expect(seen[m.id] ?? 0, m.id).toBeLessThanOrEqual(4 * 3);
    }
  });
});

describe('swaps stay with the approved library', () => {
  const input = (profile: Profile, day: DayKey = '2026-10-14') => ({ library: MISSIONS, profile, day, salt: 's', history: { ...NONE, lastPlanned: { D3: '2026-09-01' } } });

  it('too hard: a shorter mission from the same area when it has one (a 20-minute one for a 30-minute workout)', () => {
    const profile = { ...PEOPLE.A, minutes: 60 as const };
    for (const [id, area] of [['F5', 'fitness'], ['F1', 'fitness'], ['S1', 'school'], ['D1', 'discipline'], ['K1', 'skills']] as const) {
      const plan: DayPlan = { day: '2026-10-14', missions: [{ slot: 'main', missionId: id, area }], rerolls: 0, replaced: [] };
      const hard = replacementChoices(plan, 0, input({ ...profile, tracks: [area, 'money'] }), 'too-hard');
      expect(hard.length, id).toBeGreaterThan(0);
      expect(hard[0].area, id).toBe(area);
      expect(hard[0].mission.minutes, id).toBeLessThan(MISSION_BY_ID[id].minutes);
      for (const c of hard) expect(isApproved(c.mission.id)).toBe(true);
    }
    const f5: DayPlan = { day: '2026-10-14', missions: [{ slot: 'main', missionId: 'F5', area: 'fitness' }], rerolls: 0, replaced: [] };
    expect(['F3', 'F6']).toContain(replacementChoices(f5, 0, input(profile), 'too-hard')[0].mission.id);
  });

  it('swaps for another approved mission from the same area first, for every reason', () => {
    const profile = { ...PEOPLE.B, minutes: 60 as const };
    const plan = generatePlan(input(profile));
    for (const reason of ['not-relevant', 'cant-today', 'too-easy', 'too-hard', 'already-did', 'another'] as const) {
      for (let i = 0; i < plan.missions.length; i++) {
        const choices = replacementChoices(plan, i, input(profile), reason);
        expect(choices.length).toBeGreaterThan(0);
        for (const c of choices) {
          expect(isApproved(c.mission.id)).toBe(true);
          expect(profile.tracks).toContain(c.area);
        }
        // An area with something left that fits the reason keeps the swap.
        const own = MISSIONS.filter(m => m.track === plan.missions[i].area && !plan.missions.some(p => p.missionId === m.id));
        if (reason === 'another' && own.length) expect(choices[0].area).toBe(plan.missions[i].area);
      }
    }
  });

  it('keeps a slot’s size class when the area has one: the short slot gets a short mission', () => {
    const plan = generatePlan(input({ ...PEOPLE.C, minutes: 45 }));
    const i = plan.missions.findIndex(p => p.slot === 'easy');
    const choices = replacementChoices(plan, i, input({ ...PEOPLE.C, minutes: 45 }), 'another');
    expect(sizeOf(choices[0].mission)).toBe('easy');
  });
});
