// Personalization: the weekly focus, the goal text and what the user did lately.
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, generatePlan, type PlanInput } from '../missions';
import { activeFocus, goalLean, learnFrom, leanFor, mondayOf, NO_ADAPTATION, personalWeight, type Adaptation } from '../personalize';
import { addDays, type DayKey } from '../time';
import type { DayPlan, Mission, MissionDone, Profile, TrackId } from '../types';

let n = 0;
function m(track: TrackId, minutes: number, extra: Partial<Mission> = {}): Mission {
  n += 1;
  return {
    id: `${track}-p${n}`,
    track,
    title: `Mission ${n}`,
    short: 'Do it.',
    proof: 'The result.',
    proofType: 'PHOTO',
    points: minutes <= 5 ? 5 : minutes <= 20 ? 10 : 15,
    minutes,
    cooldownDays: 1,
    repeatable: true,
    tags: [track],
    active: true,
    ...extra,
  };
}
const AREAS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'business', 'skills', 'projects', 'organization'];
const LIB: Mission[] = AREAS.flatMap(t => [
  ...Array.from({ length: 5 }, () => m(t, 5)),
  ...Array.from({ length: 5 }, () => m(t, 10)),
  ...Array.from({ length: 6 }, () => m(t, 30)),
]);
const profile = (p: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, tracks: ['school', 'skills', 'money'], ...p });
const input = (p: Partial<PlanInput> = {}): PlanInput => ({
  library: LIB,
  profile: profile(),
  day: '2026-10-14',
  salt: 's',
  // Not the user's first day (Day 1 has its own rules, tested below).
  history: { lastDone: {}, lastPlanned: { 'retired-mission': '2026-09-01' }, skips: {} },
  ...p,
});
const accepted = (id: string, at = Date.UTC(2026, 9, 10, 9)): MissionDone => ({
  missionId: id,
  slot: 'main',
  track: 'school',
  points: 10,
  doneAt: at,
  photos: [],
  verification: { status: 'accepted', method: 'on-device', checks: [], at },
});
/** How many of `days` days starting Monday 12 Oct have a mission matching `pick` (summed over `salts` installs). */
function count(days: number, pick: (m: Mission) => boolean, p: Partial<PlanInput> = {}, lib = LIB, salts = 1): number {
  const byId = new Map(lib.map(x => [x.id, x]));
  let hits = 0;
  for (let k = 0; k < salts; k++) {
    for (let i = 0; i < days; i++) {
      const plan = generatePlan(input({ library: lib, day: addDays('2026-10-12', i), salt: `s${k}`, ...p }));
      if (plan.missions.some(x => pick(byId.get(x.missionId)!))) hits += 1;
    }
  }
  return hits;
}

describe('weekly focus', () => {
  it('belongs to the week it was set for (Monday to Sunday)', () => {
    expect(mondayOf('2026-10-14')).toBe('2026-10-12');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    const p = { focus: { week: '2026-10-12', id: 'gym' as const } };
    expect(activeFocus(p, '2026-10-17')).not.toBeNull();
    expect(activeFocus(p, '2026-10-19')).toBeNull();
  });

  it("brings its area into the week and leads with it, even if it wasn't one of the user's areas", () => {
    const focus = { week: '2026-10-12' as DayKey, id: 'gym' as const };
    const without = count(7, x => x.track === 'fitness');
    const withFocus = count(7, x => x.track === 'fitness', { profile: profile({ focus }) });
    expect(without).toBe(0);
    expect(withFocus).toBe(7);
    // Next week it's gone again.
    expect(count(7, x => x.track === 'fitness', { profile: profile({ focus }), day: '2026-10-19' })).toBe(0);
  });

  it('favours the missions it names', () => {
    const named = m('school', 30, { id: 'school-test-prep' });
    const lib = [...LIB, named];
    const focus = { week: '2026-10-12' as DayKey, id: 'exam' as const };
    const base = count(7, x => x.id === named.id, {}, lib, 12);
    const leaned = count(7, x => x.id === named.id, { profile: profile({ focus }) }, lib, 12);
    expect(leaned).toBeGreaterThan(base * 1.3);
  });

  it('"Something else" reads what the user typed', () => {
    const lean = leanFor({ focus: { week: '2026-10-12', id: 'other', text: 'Finish my portfolio site' } }, '2026-10-13');
    expect(lean.focusArea).toBe('projects');
  });
});

describe('goal text', () => {
  it('maps plain goals to areas and keywords', () => {
    expect(goalLean('Get my GPA up').areas).toEqual(['school']);
    expect(goalLean('Launch my clothing brand').areas).toContain('business');
    expect(goalLean('Get an internship').tags).toContain('internship');
    expect(goalLean('Build muscle').areas).toEqual(['fitness']);
    expect(goalLean('Make varsity basketball').tags).toContain('sport');
    expect(goalLean('Learn coding').tags).toContain('coding');
    expect(goalLean('Save $1,000').areas).toEqual(['money']);
    expect(goalLean('').areas).toEqual([]);
    expect(goalLean('something vague').areas).toEqual([]);
  });

  it('favours missions tagged with its keywords, within the user’s own areas', () => {
    const coding = m('skills', 30, { tags: ['skills', 'coding'] });
    const lib = [...LIB, coding];
    const base = count(7, x => x.id === coding.id, {}, lib, 12);
    const leaned = count(7, x => x.id === coding.id, { profile: profile({ goal: 'Learn coding and build an app' }) }, lib, 12);
    expect(leaned).toBeGreaterThan(base * 1.3);
  });

  it('stacks with the weekly focus: a mission both point at beats one only the focus points at', () => {
    const p = { focus: { week: '2026-10-12', id: 'exam' as const }, goal: 'Get my GPA up' };
    const lean = leanFor(p, '2026-10-14');
    const both = m('school', 30, { tags: ['school', 'test', 'grades'] });
    const focusOnly = m('school', 30, { tags: ['school', 'test'] });
    const neither = m('school', 30, { tags: ['school'] });
    const w = (x: Mission) => personalWeight(x, 'school', lean, NO_ADAPTATION);
    expect(w(both)).toBeGreaterThan(w(focusOnly));
    expect(w(focusOnly)).toBeGreaterThan(w(neither));
  });

  it('leads with an area the goal points at when no focus or priority is set', () => {
    const p = profile({ tracks: ['skills', 'money', 'school'], goal: 'Get my GPA up' });
    // School leads two days in three: it has a focused slot on (at least) those days.
    expect(count(9, x => x.track === 'school' && x.minutes > 15, { profile: p })).toBeGreaterThanOrEqual(6);
  });
});

describe('learning from what the user did', () => {
  const byId = Object.fromEntries(LIB.map(x => [x.id, x]));
  const school30 = LIB.filter(x => x.track === 'school' && x.minutes === 30);
  const plan = (day: DayKey, ids: string[], replaced: string[] = []): DayPlan => ({
    day,
    missions: ids.map(id => ({ slot: 'main', missionId: id, area: byId[id].track })),
    rerolls: replaced.length,
    replaced,
  });

  it('counts a mission as ignored only on a day the user proved something else', () => {
    const [a, b] = school30;
    const plans = { '2026-10-05': plan('2026-10-05', [a.id, b.id]), '2026-10-06': plan('2026-10-06', [a.id, b.id]) };
    const done = { '2026-10-05': { [b.id]: accepted(b.id) } };
    const ad = learnFrom(plans, done, byId, '2026-10-12');
    expect(ad.ignored).toEqual({ [a.id]: 1 });
  });

  it('notices a kind of mission swapped away again and again', () => {
    const reading = LIB.filter(x => x.track === 'skills' && x.minutes === 30).slice(0, 3).map(x => ({ ...x, group: 'reading' }));
    const lib = { ...byId, ...Object.fromEntries(reading.map(x => [x.id, x])) };
    const plans = {
      '2026-10-05': plan('2026-10-05', [school30[0].id], [reading[0].id]),
      '2026-10-07': plan('2026-10-07', [school30[1].id], [reading[1].id]),
    };
    expect(learnFrom(plans, {}, lib, '2026-10-12').swappedKinds['g:reading']).toBe(2);
  });

  it('prefers shorter focused missions when only the shorter ones get done', () => {
    const long = LIB.filter(x => x.minutes === 30).slice(0, 4).map(x => ({ ...x, minutes: 60 }));
    const mid = LIB.filter(x => x.minutes === 30).slice(4, 8);
    const lib = { ...byId, ...Object.fromEntries(long.map(x => [x.id, x])) };
    const plans: Record<DayKey, DayPlan> = {};
    const done: Record<DayKey, Record<string, MissionDone>> = {};
    for (let i = 0; i < 4; i++) {
      const day = addDays('2026-10-01', i);
      plans[day] = plan(day, [long[i].id, mid[i].id]);
      done[day] = { [mid[i].id]: accepted(mid[i].id) };
    }
    expect(learnFrom(plans, done, lib, '2026-10-12').preferShort).toBe(true);
    // And then no focused mission over 35 minutes.
    const ad: Adaptation = { ...NO_ADAPTATION, preferShort: true };
    const hour60 = m('school', 45, {});
    const libList = [...LIB, hour60];
    expect(count(14, x => x.minutes > 35, { adapt: ad, profile: profile({ minutes: 60 }) }, libList)).toBe(0);
  });

  it('steps up an area the user proves consistently, and reads when they usually prove', () => {
    const plans: Record<DayKey, DayPlan> = {};
    const done: Record<DayKey, Record<string, MissionDone>> = {};
    for (let i = 0; i < 9; i++) {
      const day = addDays('2026-10-01', i);
      const id = school30[i % school30.length].id;
      plans[day] = plan(day, [id]);
      done[day] = { [id]: accepted(id, new Date(2026, 9, 1 + i, 20, 0).getTime()) };
    }
    const ad = learnFrom(plans, done, byId, '2026-10-12');
    expect(ad.stepUp).toEqual(['school']);
    expect(ad.timeOfDay).toBe('evening');
  });

  it('turns down a mission the user keeps leaving', () => {
    const target = LIB.find(x => x.track === 'school' && x.minutes === 30)!;
    const base = count(7, x => x.id === target.id, {}, LIB, 12);
    const ad: Adaptation = { ...NO_ADAPTATION, ignored: { [target.id]: 3 } };
    expect(count(7, x => x.id === target.id, { adapt: ad }, LIB, 12)).toBeLessThan(base * 0.8);
  });
});

describe('staples and niche missions', () => {
  it('a niche mission comes up only when nothing else fits, unless the goal points at it', () => {
    const typing = m('skills', 30, { tags: ['skills', 'typing', 'niche'], weight: 0.1 });
    const coding = m('skills', 30, { tags: ['skills', 'coding', 'niche'], weight: 0.1 });
    const lib = [...LIB, typing, coding];
    expect(count(14, x => x.id === typing.id || x.id === coding.id, {}, lib, 12)).toBe(0);
    expect(count(14, x => x.id === coding.id, { profile: profile({ goal: 'Learn coding' }) }, lib, 12)).toBeGreaterThan(0);
    // Alone in its area at that size, it still fills the slot rather than leave the day short.
    const only = [...LIB.filter(x => x.track !== 'skills' || x.minutes < 30), typing];
    expect(count(14, x => x.id === typing.id, {}, only, 4)).toBeGreaterThan(0);
  });

  it("Day 1 is the areas' core habits wherever an area has one that fits", () => {
    const anchored = LIB.map(x => (Number(x.id.split('-p')[1]) % 3 === 0 ? { ...x, anchor: true } : x));
    const byId = new Map(anchored.map(x => [x.id, x]));
    let first = 0;
    let later = 0;
    let total = 0;
    for (let k = 0; k < 24; k++) {
      const day1 = generatePlan(input({ library: anchored, salt: `d${k}`, history: { lastDone: {}, lastPlanned: {}, skips: {} } }));
      first += day1.missions.filter(p => byId.get(p.missionId)!.anchor).length;
      total += day1.missions.length;
      const day5 = generatePlan(input({ library: anchored, salt: `d${k}`, history: { lastDone: {}, lastPlanned: { [LIB[0].id]: '2026-10-10' }, skips: {} } }));
      later += day5.missions.filter(p => byId.get(p.missionId)!.anchor).length;
    }
    expect(first).toBe(total);
    expect(later).toBeLessThan(total);
  });
});
