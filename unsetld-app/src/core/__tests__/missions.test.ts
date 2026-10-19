import { describe, expect, it } from 'vitest';
import promptsJson from '../../content/reminders.json';
import { completeMission, provenInPlan } from '../complete';
import {
  addSkip,
  available,
  chooseForSlot,
  dayBudget,
  dayShape,
  DEFAULT_PROFILE,
  EASY_MAX_MINUTES,
  generatePlan,
  historyFrom,
  longestFor,
  MAX_PER_AREA,
  meetsRequirements,
  PLAN_DAY_MIN_LEFT,
  planAreas,
  rerollMission,
  sizeOf,
  slotsFor,
  slotTracks,
  SLOTS_BY_INTENSITY,
  swapArea,
  tooLateForMorning,
  usableAreas,
  type MissionHistory,
  type PlanInput,
} from '../missions';
import { NO_ADAPTATION } from '../personalize';
import { programDay, programMissions, programProgress, startProgram } from '../programs';
import { clearPhotos, fingerprint, photosToClear, usedHashes } from '../proofs';
import { activeDays, allDone, completionIn, isProven, levelFor, levelStart, milestones, photosOf, totals, trackProgress } from '../progress';
import { emptyRecord } from '../record';
import { reviewWeekFor, weekStart, weeklyReview } from '../review';
import { balance, effectiveTiers, isAvailable, nextReward, pointsEarned, redeem, rewardStatus, takenThisCollection } from '../rewards';
import { dayReminderTimes, daysAhead, MAX_PENDING, planNotifications, slotOf } from '../reminders';
import { computeStreak } from '../streak';
import { addDays, atMinutes, type DayKey } from '../time';
import { clock, elapsedSeconds, endsAt, pauseTimer, remainingSeconds, resumeTimer, startTimer, timerDone } from '../timer';
import type { CodeClaim, DayPlan, Mission, MissionDone, Profile, Program, ProofPhoto, RecordState, ReminderPrompt, RewardTier, TrackId, Verification } from '../types';
import { localChecks } from '../verify';

/** Test missions by size, like the approved library's: a 5-minute short one, a 30-minute and a 45-minute focused one. */
type Kind = 'quick' | 'progress' | 'challenge';
const SIZE: Record<Kind, [number, number]> = { quick: [5, 5], progress: [30, 15], challenge: [45, 20] };
let n = 0;
function m(track: TrackId, kind: Kind, extra: Partial<Mission> = {}): Mission {
  n += 1;
  const [minutes, points] = SIZE[kind];
  return {
    id: `${track}-m${n}`,
    track,
    title: `Mission ${n}`,
    short: 'Do it.',
    proof: 'The result.',
    proofType: 'PHOTO',
    points,
    minutes,
    cooldownDays: 7,
    repeatable: true,
    tags: ['t'],
    active: true,
    ...extra,
  };
}
const TRACKS: TrackId[] = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
const LIB: Mission[] = TRACKS.flatMap(t => [
  ...Array.from({ length: 6 }, () => m(t, 'quick')),
  ...Array.from({ length: 8 }, () => m(t, 'progress')),
  ...Array.from({ length: 6 }, () => m(t, 'challenge')),
]);
const NO_HISTORY: MissionHistory = { lastDone: {}, lastPlanned: {}, skips: {} };
const profile = (p: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, tracks: ['discipline', 'school', 'fitness'], ...p });
const input = (p: Partial<PlanInput> = {}): PlanInput => ({ library: LIB, profile: profile(), day: '2026-10-09', salt: 's', history: NO_HISTORY, ...p });
const byId = new Map(LIB.map(x => [x.id, x]));
const accepted: Verification = { status: 'accepted', method: 'on-device', checks: [], at: 0 };
const photo = (hash: string, kind: ProofPhoto['kind'] = 'single', takenAt = 1000): ProofPhoto => ({ uri: `file://${hash}`, takenAt, kind, hash });

describe('daily missions', () => {
  it('gives one easy mission and two focused ones, each from a different chosen goal', () => {
    const plan = generatePlan(input({ profile: profile({ minutes: 60 }) }));
    expect(plan.missions.map(p => p.slot)).toEqual(['easy', 'main', 'main']);
    expect(byId.get(plan.missions[0].missionId)!.minutes).toBeLessThanOrEqual(EASY_MAX_MINUTES);
    for (const p of plan.missions.slice(1)) expect(byId.get(p.missionId)!.minutes).toBeGreaterThan(EASY_MAX_MINUTES);
    for (const p of plan.missions) expect(['discipline', 'school', 'fitness']).toContain(byId.get(p.missionId)!.track);
    expect(new Set(plan.missions.map(p => byId.get(p.missionId)!.track)).size).toBe(3);
    expect(new Set(plan.missions.map(p => p.missionId)).size).toBe(3);
  });

  it('is the same plan for the same day and input, and a different one tomorrow', () => {
    expect(generatePlan(input())).toEqual(generatePlan(input()));
    const a = generatePlan(input()).missions.map(p => p.missionId).join();
    const b = generatePlan(input({ day: '2026-10-10' })).missions.map(p => p.missionId).join();
    expect(a).not.toBe(b);
  });

  it('follows intensity with an hour or more: Start easy two short missions and a focused one, Push me a fourth; Start easy keeps them short', () => {
    expect(generatePlan(input({ profile: profile({ intensity: 'easy', minutes: 60 }) })).missions.map(p => p.slot)).toEqual(SLOTS_BY_INTENSITY.easy);
    expect(generatePlan(input({ profile: profile({ intensity: 'lockin', minutes: 60 }) })).missions.map(p => p.slot)).toEqual(SLOTS_BY_INTENSITY.lockin);
    expect(generatePlan(input({ profile: profile({ intensity: 'push', minutes: 60 }) })).missions.map(p => p.slot)).toEqual(SLOTS_BY_INTENSITY.push);
    expect(SLOTS_BY_INTENSITY).toEqual({ easy: ['easy', 'easy', 'main'], lockin: ['easy', 'main', 'main'], push: ['easy', 'main', 'main', 'main'] });
    for (let i = 0; i < 10; i++) {
      const plan = generatePlan(input({ day: addDays('2026-10-09', i), profile: profile({ intensity: 'easy', minutes: 60 }) }));
      for (const p of plan.missions) expect(byId.get(p.missionId)!.minutes).toBeLessThanOrEqual(30);
    }
  });

  it('ignores intensity under an hour: the same day for Start easy, Lock in and Push me at 15, 30 and 45 minutes', () => {
    const history: MissionHistory = { lastDone: {}, lastPlanned: { 'school-m1': '2026-09-01' }, skips: {} };
    for (const minutes of [15, 30, 45] as const) {
      expect(new Set((['easy', 'lockin', 'push'] as const).map(intensity => JSON.stringify(dayShape({ minutes, intensity }))))).toHaveProperty('size', 1);
      for (let i = 0; i < 14; i++) {
        const day = addDays('2026-10-09', i);
        const plans = (['easy', 'lockin', 'push'] as const).map(intensity => generatePlan(input({ day, history, profile: profile({ minutes, intensity }) })));
        expect(plans[0], `${minutes} ${day}`).toEqual(plans[1]);
        expect(plans[2], `${minutes} ${day}`).toEqual(plans[1]);
      }
    }
  });

  it('keeps a short day short: with 15 minutes it is one mission of 20 minutes or less', () => {
    for (let i = 0; i < 14; i++) {
      const plan = generatePlan(input({ day: addDays('2026-10-09', i), profile: profile({ minutes: 15 }) }));
      expect(plan.missions.map(p => p.slot)).toEqual(['easy']);
      expect(byId.get(plan.missions[0].missionId)!.minutes).toBeLessThanOrEqual(dayBudget(profile({ minutes: 15 })));
    }
  });

  it('on a 15-minute day: one mission, the chosen areas take turns, and a mission of 10 minutes or more goes first in its area', () => {
    const lib = [
      ...Array.from({ length: 4 }, () => m('money', 'quick', { minutes: 5 })),
      ...Array.from({ length: 4 }, () => m('skills', 'quick', { minutes: 10 })),
      ...Array.from({ length: 4 }, () => m('skills', 'quick', { minutes: 5 })),
      ...Array.from({ length: 3 }, () => m('money', 'progress')),
      ...Array.from({ length: 3 }, () => m('skills', 'challenge')),
      ...Array.from({ length: 3 }, () => m('organization', 'quick', { minutes: 3 })),
    ];
    const ids = new Map(lib.map(x => [x.id, x]));
    const history: MissionHistory = { lastDone: {}, lastPlanned: { other: '2026-09-01' }, skips: {} };
    const areas: string[] = [];
    for (let i = 0; i < 6; i++) {
      const plan = generatePlan(input({ library: lib, day: addDays('2026-10-09', i), history, profile: profile({ tracks: ['money', 'skills'], minutes: 15, intensity: 'push' }) }));
      expect(plan.missions.length).toBe(1);
      const mission = ids.get(plan.missions[0].missionId)!;
      areas.push(plan.missions[0].area!);
      expect(mission.minutes).toBeLessThanOrEqual(EASY_MAX_MINUTES);
      // Skills has 10-minute missions: never its 5-minute ones. Money has only 5-minute short ones: still its day.
      if (plan.missions[0].area === 'skills') expect(mission.minutes).toBe(10);
      // Organization was never chosen: its 3-minute missions never fill in.
      expect(mission.track).not.toBe('organization');
    }
    expect(areas.filter(a => a === 'money').length).toBe(3);
    expect(areas.filter(a => a === 'skills').length).toBe(3);
  });

  it('respects requirements: no gym missions without a gym, no work missions without a job, 18+ only when known', () => {
    const p = profile({ gym: null, work: false, age: 'u16' });
    expect(meetsRequirements(['gym'], p)).toBe(false);
    expect(meetsRequirements(['work'], p)).toBe(false);
    expect(meetsRequirements(['age16'], p)).toBe(false);
    expect(meetsRequirements(['school'], p)).toBe(true);
    expect(meetsRequirements(['age18'], profile({ age: null }))).toBe(false);
    expect(meetsRequirements(['age16'], profile({ age: null }))).toBe(true);
    // Apply to One Job or Internship: only with a job or internship search in the goal or (with the day) this week's focus.
    expect(meetsRequirements(['jobsearch'], profile({ goal: 'Get fit and save money' }))).toBe(false);
    expect(meetsRequirements(['jobsearch'], profile({ goal: 'Land a summer internship' }))).toBe(true);
    expect(meetsRequirements(['jobsearch'], profile({ goal: 'Get hired as a designer' }))).toBe(true);
    const applying = profile({ focus: { week: '2026-10-12', id: 'apply' } });
    expect(meetsRequirements(['jobsearch'], applying, '2026-10-14')).toBe(true);
    expect(meetsRequirements(['jobsearch'], applying, '2026-10-20')).toBe(false);
    expect(meetsRequirements(['jobsearch'], applying)).toBe(false);
    const gymOnly = LIB.map(x => (x.track === 'fitness' ? { ...x, requires: ['gym' as const] } : x));
    for (let i = 0; i < 10; i++) {
      const plan = generatePlan(input({ library: gymOnly, day: addDays('2026-10-09', i), profile: p }));
      for (const x of plan.missions) expect(gymOnly.find(y => y.id === x.missionId)!.requires ?? []).not.toContain('gym');
    }
  });

  it('keeps "your product" missions from people with no business yet, and "pick an idea" ones from people with one', () => {
    const p = (project: boolean | null) => profile({ project });
    expect([true, null, false].map(x => meetsRequirements(['building'], p(x)))).toEqual([true, true, false]);
    expect([true, null, false].map(x => meetsRequirements(['starting'], p(x)))).toEqual([false, true, true]);
    expect(meetsRequirements(['school', 'highschool'], profile({ school: true, schoolLevel: 'college' }))).toBe(false);
    expect(meetsRequirements(['school', 'highschool'], profile({ school: true, schoolLevel: 'high' }))).toBe(true);
    expect(meetsRequirements(['school', 'highschool'], profile({ school: null }))).toBe(true);
  });

  it('rests a mission after it was done (cooldown) and drops one-off missions for good', () => {
    const plan = generatePlan(input());
    const id = plan.missions[1].missionId;
    const history: MissionHistory = { ...NO_HISTORY, lastDone: { [id]: '2026-10-09' } };
    for (let i = 1; i < 7; i++) expect(generatePlan(input({ day: addDays('2026-10-09', i), history })).missions.map(p => p.missionId)).not.toContain(id);
    const once = LIB.map(x => (x.id === id ? { ...x, repeatable: false } : x));
    const later = { ...NO_HISTORY, lastDone: { [id]: '2026-01-01' } };
    for (let i = 0; i < 30; i++) expect(generatePlan(input({ library: once, day: addDays('2026-10-09', i), history: later })).missions.map(p => p.missionId)).not.toContain(id);
  });

  it('lets anchors come back often but not every new mission', () => {
    const anchor = m('discipline', 'quick', { id: 'discipline-anchor', anchor: true, cooldownDays: 1 });
    const lib = [anchor, ...LIB];
    let seen = 0;
    let lastPlanned: Record<string, DayKey> = {};
    for (let i = 0; i < 30; i++) {
      const day = addDays('2026-10-01', i);
      const plan = generatePlan(input({ library: lib, day, profile: profile({ tracks: ['discipline'] }), history: { ...NO_HISTORY, lastPlanned } }));
      if (plan.missions.some(p => p.missionId === 'discipline-anchor')) seen += 1;
      lastPlanned = { ...lastPlanned, ...Object.fromEntries(plan.missions.map(p => [p.missionId, day])) };
    }
    // A core habit comes back about every other day (less often the day after it was planned), never every day.
    expect(seen).toBeGreaterThanOrEqual(9);
    expect(seen).toBeLessThan(30);
  });

  it('swaps a mission for another of the same size and goal, and never brings back what was swapped out', () => {
    const plan = generatePlan(input());
    const next = rerollMission(plan, 0, input())!;
    expect(next.rerolls).toBe(1);
    expect(next.replaced).toEqual([plan.missions[0].missionId]);
    expect(next.missions[0].missionId).not.toBe(plan.missions[0].missionId);
    expect(next.missions[0].slot).toBe('easy');
    expect(byId.get(next.missions[0].missionId)!.track).toBe(byId.get(plan.missions[0].missionId)!.track);
    expect(next.missions.slice(1)).toEqual(plan.missions.slice(1));
    const again = rerollMission(next, 0, input())!;
    expect([plan.missions[0].missionId, next.missions[0].missionId]).not.toContain(again.missions[0].missionId);
  });

  it('keeps a swapped mission away a week, three weeks after a third swap in a month, two days for a core habit', () => {
    const plain = LIB.find(x => x.track === 'school' && x.minutes === 30)!;
    const core = { ...plain, id: 'school-core', anchor: true };
    const at = (skips: MissionHistory['skips'], day: DayKey, m = plain) => available(m, input({ day, history: { ...NO_HISTORY, skips } }));
    const once = addSkip({}, plain.id, '2026-10-01');
    expect(at(once, '2026-10-07')).toBe(false);
    expect(at(once, '2026-10-08')).toBe(true);
    const thrice = addSkip(addSkip(once, plain.id, '2026-10-10'), plain.id, '2026-10-20');
    expect(thrice[plain.id].count).toBe(3);
    expect(at(thrice, '2026-11-09')).toBe(false);
    expect(at(thrice, '2026-11-10')).toBe(true);
    // A swap more than a month after the last one starts the count again.
    expect(addSkip(thrice, plain.id, '2026-12-01')[plain.id].count).toBe(1);
    const coreSkip = addSkip({}, core.id, '2026-10-01');
    expect(at(coreSkip, '2026-10-02', core)).toBe(false);
    expect(at(coreSkip, '2026-10-03', core)).toBe(true);
  });

  it('never leaves a day short, however much the user swaps, and never leaves their areas', () => {
    // A small library: two areas, a handful of missions each, three swaps a day for two months.
    // Discipline and Organization are in the library but not chosen: they never fill in.
    const small = (['money', 'career'] as TrackId[]).flatMap(t => [
      ...Array.from({ length: 3 }, () => m(t, 'quick', { cooldownDays: 3 })),
      ...Array.from({ length: 3 }, () => m(t, 'progress', { cooldownDays: 3 })),
    ]);
    const lib = [...small, ...LIB.filter(x => x.track === 'discipline' || x.track === 'organization')];
    const prof = profile({ tracks: ['money', 'career'] });
    let skips: MissionHistory['skips'] = {};
    const plans: Record<DayKey, DayPlan> = {};
    for (let i = 0; i < 60; i++) {
      const day = addDays('2026-10-12', i);
      const inp = input({ library: lib, profile: prof, day, history: historyFrom({}, plans, skips, day) });
      let plan = generatePlan(inp);
      for (let k = 0; k < 3; k++) {
        const old = plan.missions[k % plan.missions.length].missionId;
        const next = rerollMission(plan, k % plan.missions.length, { ...inp, history: historyFrom({}, plans, skips, day) });
        if (next) {
          plan = next;
          skips = addSkip(skips, old, day);
        }
      }
      plans[day] = plan;
      expect(plan.missions.length).toBe(slotsFor(prof).length);
      for (const p of plan.missions) expect(['money', 'career']).toContain(lib.find(x => x.id === p.missionId)!.track);
    }
  });

  it('gives the lead area a focused mission two days in three and shares the rest evenly', () => {
    const counts: Record<string, number> = {};
    let leadFirst = 0;
    for (let i = 0; i < 60; i++) {
      const t = slotTracks(profile(), SLOTS_BY_INTENSITY.lockin, addDays('2026-10-01', i));
      expect(new Set(t).size).toBe(3);
      for (const x of t.slice(1)) counts[x] = (counts[x] ?? 0) + 1;
      if (t[1] === 'discipline') leadFirst += 1;
    }
    expect(leadFirst).toBe(40);
    for (const a of ['discipline', 'school', 'fitness']) expect(counts[a]).toBe(40);
    // Push me with three areas: the extra slot goes to the other areas in turn, never always the lead.
    const easy = Array.from({ length: 30 }, (_, i) => slotTracks(profile(), SLOTS_BY_INTENSITY.push, addDays('2026-10-01', i))[0]);
    expect(easy.filter(x => x === 'discipline').length).toBeLessThan(5);
  });

  it('with two areas, the two take turns at the extra slot; with one focused slot, each area gets it in turn', () => {
    const two = profile({ tracks: ['money', 'projects'] });
    const count: Record<string, number> = {};
    const easy: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const t = slotTracks(two, SLOTS_BY_INTENSITY.lockin, addDays('2026-10-01', i));
      t.forEach((x, k) => {
        count[x] = (count[x] ?? 0) + 1;
        if (k === 0) easy[x] = (easy[x] ?? 0) + 1;
      });
    }
    for (const a of ['money', 'projects']) {
      expect(count[a]).toBeGreaterThanOrEqual(40);
      expect(easy[a]).toBeGreaterThanOrEqual(10);
    }
    const focused: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const t = slotTracks(profile({ minutes: 30 }), slotsFor(profile({ minutes: 30 })), addDays('2026-10-01', i));
      focused[t[1]] = (focused[t[1]] ?? 0) + 1;
    }
    for (const a of ['discipline', 'school', 'fitness']) expect(focused[a]).toBeGreaterThanOrEqual(5);
  });

  it('fills each slot from an area not in the day yet, and records which area', () => {
    for (const minutes of [45, 60] as const) {
      for (let i = 0; i < 30; i++) {
        const prof = profile({ minutes, tracks: ['money', 'career', 'skills'] });
        const plan = generatePlan(input({ day: addDays('2026-10-01', i), profile: prof }));
        expect(new Set(plan.missions.map(p => p.area)).size).toBe(slotsFor(prof).length);
        for (const p of plan.missions) expect(['money', 'career', 'skills']).toContain(p.area);
      }
    }
  });

  it('shares an hour between its two short missions (Start easy) instead of letting the first take it all', () => {
    // Start easy with an hour: the focused mission first, then the two short slots share what's left evenly.
    const lib = (['discipline', 'school', 'fitness'] as TrackId[]).flatMap(t => [
      ...[5, 10, 15, 15, 20, 20].map(minutes => m(t, 'quick', { minutes, points: minutes <= 10 ? 5 : 10 })),
      m(t, 'progress'),
      m(t, 'progress'),
    ]);
    const prof = profile({ minutes: 60, intensity: 'easy' });
    let fifteens = 0;
    for (let i = 0; i < 20; i++) {
      const plan = generatePlan(input({ library: lib, profile: prof, day: addDays('2026-10-01', i) }));
      const mins = plan.missions.map(p => lib.find(x => x.id === p.missionId)!.minutes);
      expect(plan.missions.map(p => p.slot)).toEqual(['easy', 'easy', 'main']);
      expect(mins.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(dayBudget(prof));
      fifteens += mins.slice(0, 2).filter(x => x >= 15).length;
    }
    expect(fifteens).toBeGreaterThanOrEqual(15);
  });

  it('keeps to the time the user chose (DAY_SHAPE): 15 is one short mission, 30 and 45 one short and one focused, 60+ by intensity', () => {
    for (const intensity of ['easy', 'lockin', 'push'] as const) {
      expect(slotsFor({ minutes: 15, intensity })).toEqual(['easy']);
      expect(slotsFor({ minutes: 30, intensity })).toEqual(['easy', 'main']);
      expect(slotsFor({ minutes: 45, intensity })).toEqual(['easy', 'main']);
      expect(slotsFor({ minutes: 60, intensity })).toEqual(SLOTS_BY_INTENSITY[intensity]);
      for (const minutes of [15, 30, 45, 60] as const) {
        const prof = profile({ minutes, intensity });
        expect(slotsFor(prof)).toEqual(dayShape(prof).slots);
        expect(dayBudget(prof)).toBe(dayShape(prof).budget);
        for (let i = 0; i < 20; i++) {
          const plan = generatePlan(input({ day: addDays('2026-10-01', i), profile: prof }));
          expect(plan.missions.map(p => p.slot)).toEqual(slotsFor(prof));
          expect(plan.missions.reduce((t, p) => t + byId.get(p.missionId)!.minutes, 0)).toBeLessThanOrEqual(dayBudget(prof));
          for (const p of plan.missions) expect(byId.get(p.missionId)!.minutes).toBeLessThanOrEqual(longestFor(prof));
        }
      }
    }
    expect([15, 30, 45, 60].map(minutes => dayBudget({ minutes: minutes as Profile['minutes'], intensity: 'lockin' }))).toEqual([20, 35, 55, 75]);
    expect([15, 30, 45, 60].map(minutes => dayBudget({ minutes: minutes as Profile['minutes'], intensity: 'push' }))).toEqual([20, 35, 55, 100]);
    expect(dayBudget({ minutes: 60, intensity: 'easy' })).toBe(65);
    // The most a day can earn stays 95 (docs/ACCESS.md): four missions of at most 20 points, and the perfect-day bonus.
    expect(Math.max(...[15, 30, 45, 60].flatMap(minutes => (['easy', 'lockin', 'push'] as const).map(intensity => slotsFor({ minutes: minutes as Profile['minutes'], intensity }).length)))).toBe(4);
  });

  it('drops an area that can never get a mission, and never falls back to one the user did not choose', () => {
    const lib = LIB.map(x => (x.track === 'school' ? { ...x, requires: ['school' as const] } : x));
    const prof = profile({ tracks: ['school', 'fitness'], school: false });
    expect(usableAreas(lib, prof)).toEqual(['fitness']);
    // 3.3: no universal basics (Discipline, Organization) for an area that can't get missions.
    expect(usableAreas(lib, profile({ tracks: ['school'], school: false }))).toEqual([]);
    expect(generatePlan(input({ library: lib, profile: profile({ tracks: ['school'], school: false }) })).missions).toEqual([]);
    const plan = generatePlan(input({ library: lib, profile: prof }));
    for (const p of plan.missions) expect(byId.get(p.missionId)!.track).toBe('fitness');
  });

  it('leaves morning missions out after noon and after midnight (the day runs to 4 AM)', () => {
    expect([1, 3, 4, 11, 12, 23].map(tooLateForMorning)).toEqual([true, true, false, false, true, true]);
    expect(tooLateForMorning(undefined)).toBe(false);
    const bed = m('discipline', 'quick', { when: 'morning', anchor: true, weight: 3 });
    const lib = [...LIB, bed];
    const at = (hour: number) => generatePlan(input({ library: lib, profile: profile({ tracks: ['discipline'] }), hour, program: { id: 'p', missionIds: [bed.id] } }));
    expect(at(8).missions.map(p => p.missionId)).toContain(bed.id);
    for (const hour of [1, 3, 15]) expect(at(hour).missions.map(p => p.missionId)).not.toContain(bed.id);
  });

  it('swaps within the area the mission was in the day for, and tries a different kind of mission first', () => {
    // A Career mission that also counts for Skills, planned for a Skills user: the swap stays in Skills.
    const both = m('career', 'progress', { also: ['skills'] });
    const lib = [...LIB, both];
    const prof = profile({ tracks: ['skills', 'fitness'] });
    const plan: DayPlan = { day: '2026-10-09', missions: [{ slot: 'main', missionId: both.id, area: 'skills' }], rerolls: 0, replaced: [] };
    const next = rerollMission(plan, 0, input({ library: lib, profile: prof }))!;
    expect(next.missions[0].area).toBe('skills');
    expect(byId.get(next.missions[0].missionId)!.track).toBe('skills');
    // Twins (same group) only when nothing else in the area is left.
    const twinA = m('money', 'progress', { group: 'twins' });
    const twinB = m('money', 'progress', { group: 'twins' });
    const other = m('money', 'progress');
    const lib2 = [twinA, twinB, other];
    const p2: DayPlan = { day: '2026-10-09', missions: [{ slot: 'main', missionId: twinA.id, area: 'money' }], rerolls: 0, replaced: [] };
    const inp2 = input({ library: lib2, profile: profile({ tracks: ['money'] }) });
    const s1 = rerollMission(p2, 0, inp2)!;
    expect(s1.missions[0].missionId).toBe(other.id);
    expect(rerollMission(s1, 0, inp2)!.missions[0].missionId).toBe(twinB.id);
    // Same size beats a different kind: a focused twin rather than a 5-minute mission.
    const short = m('money', 'quick');
    const lib3 = [twinA, twinB, short];
    const p3: DayPlan = { day: '2026-10-09', missions: [{ slot: 'main', missionId: twinA.id, area: 'money' }], rerolls: 0, replaced: [] };
    expect(rerollMission(p3, 0, input({ library: lib3, profile: profile({ tracks: ['money'] }) }))!.missions[0].missionId).toBe(twinB.id);
  });

  it("keeps a program mission's swap in the program's area, and says so", () => {
    const prog = m('discipline', 'progress');
    const lib = [...LIB, prog];
    const prof = profile({ tracks: ['fitness', 'money'] });
    const plan: DayPlan = { day: '2026-10-09', missions: [{ slot: 'main', missionId: prog.id, area: 'discipline', programId: 'p' }], rerolls: 0, replaced: [] };
    const inp = input({ library: lib, profile: prof });
    expect(swapArea(plan, 0, inp)).toBe('discipline');
    expect(byId.get(rerollMission(plan, 0, inp)!.missions[0].missionId)!.track).toBe('discipline');
    // An area the user has since dropped: the swap (and the dialog) moves to one of their areas not in the day.
    const stale: DayPlan = { ...plan, missions: [{ slot: 'main', missionId: prog.id, area: 'discipline' }] };
    expect(swapArea(stale, 0, inp)).toBe('fitness');
  });

  it("puts the lead goal (first pick or this week's priority) on a focused mission most days", () => {
    let hits = 0;
    for (let i = 0; i < 30; i++) {
      const t = slotTracks(profile({ priority: 'fitness' }), SLOTS_BY_INTENSITY.lockin, addDays('2026-10-01', i));
      if (t[1] === 'fitness') hits += 1;
      expect(new Set(t).size).toBe(3);
    }
    expect(hits).toBeGreaterThanOrEqual(19);
  });

  it("places a program's missions first, and adds the day's own only while the day has time left", () => {
    const ids = [LIB.find(x => x.track === 'money' && x.minutes === 30)!.id];
    // 45 minutes: 30 of the Plan, 25 left: the short slot is filled too.
    const plan = generatePlan(input({ program: { id: 'p', missionIds: ids } }));
    expect(plan.missions.find(p => p.missionId === ids[0])).toMatchObject({ slot: 'main', programId: 'p' });
    expect(plan.missions.length).toBe(2);
    // 30 minutes: 5 left, under PLAN_DAY_MIN_LEFT: the Plan's mission is the day.
    expect(generatePlan(input({ program: { id: 'p', missionIds: ids }, profile: profile({ minutes: 30 }) })).missions).toEqual([
      { slot: 'main', missionId: ids[0], area: 'money', programId: 'p' },
    ]);
  });

  it('keeps every one of a Plan day\'s missions at every time choice, in a slot of its size', () => {
    const two = [LIB.find(x => x.track === 'discipline' && x.minutes === 5)!.id, LIB.find(x => x.track === 'discipline' && x.minutes === 30)!.id];
    const three = [...two, LIB.find(x => x.track === 'school' && x.minutes === 45)!.id];
    for (const missionIds of [two, three])
      for (const minutes of [15, 30, 45, 60] as const)
        for (const intensity of ['easy', 'lockin', 'push'] as const) {
          const prof = profile({ minutes, intensity });
          const plan = generatePlan(input({ profile: prof, program: { id: 'p', missionIds } }));
          for (const id of missionIds) expect(plan.missions.find(p => p.missionId === id), `${minutes} ${intensity}`).toMatchObject({ slot: sizeOf(byId.get(id)!), programId: 'p' });
          const planned = missionIds.reduce((t, id) => t + byId.get(id)!.minutes, 0);
          const own = plan.missions.filter(p => !p.programId);
          // The day's own missions only in a slot the Plan left free, while PLAN_DAY_MIN_LEFT minutes of its budget were left.
          if (dayBudget(prof) - planned < PLAN_DAY_MIN_LEFT || missionIds.length >= slotsFor(prof).length) expect(own).toEqual([]);
          else expect(own.length).toBeGreaterThan(0);
          expect(plan.missions.length).toBeGreaterThanOrEqual(missionIds.length);
        }
  });

  it("leaves a program's morning mission out of an afternoon plan", () => {
    const morning = m('discipline', 'quick', { when: 'morning' });
    const other = LIB.find(x => x.track === 'discipline' && x.minutes === 30)!;
    const program = { id: 'p', missionIds: [morning.id, other.id] };
    const early = generatePlan(input({ library: [...LIB, morning], program, hour: 8 }));
    const late = generatePlan(input({ library: [...LIB, morning], program, hour: 15 }));
    expect(early.missions.map(p => p.missionId)).toContain(morning.id);
    expect(late.missions.map(p => p.missionId)).not.toContain(morning.id);
    expect(late.missions.find(p => p.missionId === other.id)).toMatchObject({ programId: 'p' });
  });

  it('keeps a school-day mission to its days of the week', () => {
    const notes = m('school', 'quick', { days: [1, 2, 3, 4, 5], weight: 3 });
    const lib = [...LIB, notes];
    // 2026-10-10 is a Saturday, 2026-10-12 a Monday.
    expect(available(notes, input({ library: lib, day: '2026-10-10' }))).toBe(false);
    expect(available(notes, input({ library: lib, day: '2026-10-12' }))).toBe(true);
    const program = { id: 'p', missionIds: [notes.id] };
    expect(generatePlan(input({ library: lib, day: '2026-10-10', program })).missions.map(p => p.missionId)).not.toContain(notes.id);
    expect(generatePlan(input({ library: lib, day: '2026-10-12', program })).missions.map(p => p.missionId)).toContain(notes.id);
  });

  it('never puts two missions from one group on the same day, even after a swap', () => {
    // One track, every quick and progress mission in the same group: only one of them fits a day.
    const lib = [
      ...Array.from({ length: 4 }, () => m('organization', 'quick', { group: 'room' })),
      ...Array.from({ length: 4 }, () => m('organization', 'progress', { group: 'room' })),
      ...Array.from({ length: 3 }, () => m('organization', 'progress')),
      ...Array.from({ length: 3 }, () => m('organization', 'challenge')),
    ];
    const ids = new Map(lib.map(x => [x.id, x]));
    const inp = input({ library: lib, profile: profile({ tracks: ['organization'] }) });
    for (const day of ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']) {
      const plan = generatePlan({ ...inp, day });
      const groups = plan.missions.map(p => ids.get(p.missionId)!.group).filter(Boolean);
      expect(groups.length).toBeLessThanOrEqual(1);
      let p: DayPlan | null = plan;
      for (let k = 0; k < 3 && p; k++) {
        p = rerollMission(p, 2, { ...inp, day });
        if (p) expect(p.missions.map(x => ids.get(x.missionId)!.group).filter(Boolean).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('picks low-weight (situational) missions less often', () => {
    const lib = [
      ...Array.from({ length: 5 }, () => m('school', 'quick', { weight: 0.1 })),
      ...Array.from({ length: 5 }, () => m('school', 'quick')),
      ...Array.from({ length: 3 }, () => m('school', 'progress')),
      ...Array.from({ length: 3 }, () => m('school', 'challenge')),
    ];
    const light = new Set(lib.filter(x => x.weight).map(x => x.id));
    let picked = 0;
    for (let d = 0; d < 60; d++) {
      const plan = generatePlan(input({ library: lib, profile: profile({ tracks: ['school'] }), day: addDays('2026-10-01', d), salt: `w${d}` }));
      if (light.has(plan.missions[0].missionId)) picked++;
    }
    expect(picked).toBeLessThan(15);
  });

  it('builds history from proven missions and earlier plans', () => {
    const plans = { '2026-10-08': { day: '2026-10-08', missions: [{ slot: 'quick' as const, missionId: 'a' }], rerolls: 0, replaced: [] } };
    const h = historyFrom({ '2026-10-07': { b: { missionId: 'b' } } }, plans, {}, '2026-10-09');
    expect(h.lastDone).toEqual({ b: '2026-10-07' });
    expect(h.lastPlanned).toEqual({ a: '2026-10-08' });
  });
});

describe('how often missions come round, and the slot never left empty (3.3)', () => {
  it('keeps a weekly mission away its whole cooldown after it was shown, done or not; letting shown missions back does not', () => {
    const weekly = m('money', 'quick', { frequency: 'low', cooldownDays: 7 });
    const often = m('money', 'quick', { frequency: 'high', cooldownDays: 1 });
    // Shown on Monday 5 Oct and left undone.
    const at = (x: Mission, day: DayKey, relax = {}) => available(x, input({ day, history: { ...NO_HISTORY, lastPlanned: { [x.id]: '2026-10-05' } } }), relax);
    expect(at(weekly, '2026-10-08')).toBe(false);
    expect(at(weekly, '2026-10-08', { shown: true, skips: true })).toBe(false);
    expect(at(weekly, '2026-10-11', { shown: true })).toBe(false);
    expect(at(weekly, '2026-10-12')).toBe(true);
    // Only the guarantee's own step lets it back early.
    expect(at(weekly, '2026-10-08', { shown: true, lowShown: true })).toBe(true);
    // An everyday mission waits the usual couple of days, and is let back when nothing else fits.
    expect(at(often, '2026-10-06')).toBe(false);
    expect(at(often, '2026-10-06', { shown: true })).toBe(true);
    // Done: its cooldown, which only the last step relaxes.
    const done = { ...NO_HISTORY, lastDone: { [weekly.id]: '2026-10-05' } };
    expect(available(weekly, input({ day: '2026-10-09', history: done }), { shown: true, skips: true, lowShown: true })).toBe(false);
    expect(available(weekly, input({ day: '2026-10-09', history: done }), { cooldown: true })).toBe(true);
  });

  it('plans a weekly mission about once a week, even when nothing gets done', () => {
    const weekly = m('money', 'quick', { frequency: 'low', cooldownDays: 7, weight: 3 });
    const lib = [weekly, ...Array.from({ length: 3 }, () => m('money', 'quick', { cooldownDays: 1 })), ...LIB.filter(x => x.track === 'skills')];
    const prof = profile({ tracks: ['money', 'skills'], minutes: 15 });
    const plans: Record<DayKey, DayPlan> = {};
    const days: DayKey[] = [];
    for (let i = 0; i < 28; i++) {
      const day = addDays('2026-10-05', i);
      plans[day] = generatePlan(input({ library: lib, profile: prof, day, history: historyFrom({}, plans, {}, day) }));
      if (plans[day].missions.some(p => p.missionId === weekly.id)) days.push(day);
    }
    expect(days.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < days.length; i++) expect(addDays(days[i - 1], 7) <= days[i]).toBe(true);
  });

  it('fills a slot from the user’s own areas only, letting things back step by step', () => {
    // One area of three missions, Push me (four slots): three, never one from an area they didn't choose.
    const own = [m('money', 'quick', { frequency: 'low', cooldownDays: 30 }), m('money', 'quick', { cooldownDays: 3 }), m('money', 'progress', { cooldownDays: 3 })];
    const lib = [...own, ...LIB.filter(x => x.track === 'discipline' || x.track === 'organization')];
    const prof = profile({ tracks: ['money'], minutes: 60, intensity: 'push' });
    const done: Record<DayKey, Record<string, { missionId: string }>> = {};
    const plans: Record<DayKey, DayPlan> = {};
    for (let i = 0; i < 10; i++) {
      const day = addDays('2026-10-05', i);
      const plan = generatePlan(input({ library: lib, profile: prof, day, history: historyFrom(done, plans, {}, day) }));
      plans[day] = plan;
      done[day] = Object.fromEntries(plan.missions.map(p => [p.missionId, { missionId: p.missionId }]));
      // Every money mission every day: cooldowns and the monthly one's wait give way rather than leave a slot empty.
      expect(plan.missions.map(p => p.missionId).sort()).toEqual(own.map(x => x.id).sort());
    }
  });

  it('lets a mission still in its cooldown back last, the one done longest ago first', () => {
    const a = m('money', 'quick', { cooldownDays: 30 });
    const b = m('money', 'quick', { cooldownDays: 30 });
    const history = { ...NO_HISTORY, lastDone: { [a.id]: '2026-10-01', [b.id]: '2026-10-08' } };
    const inp = input({ library: [a, b], profile: profile({ tracks: ['money'] }), day: '2026-10-09', history });
    expect(chooseForSlot(inp, 'easy', 'money', new Set(), 15, 's')?.mission.id).toBe(a.id);
    expect(chooseForSlot(inp, 'easy', 'money', new Set([a.id]), 15, 's')?.mission.id).toBe(b.id);
    // Never one that can only be done once, never one in `exclude`.
    const once = { ...a, repeatable: false };
    expect(chooseForSlot({ ...inp, library: [once] }, 'easy', 'money', new Set(), 15, 's')).toBeNull();
  });

  it("relaxes a cooldown as little as it can: not yesterday's, then a weekly one before a monthly one done the same day", () => {
    const weekly = m('money', 'quick', { cooldownDays: 7, frequency: 'low' });
    const monthly = m('money', 'quick', { cooldownDays: 30, frequency: 'low' });
    const lastDay = m('money', 'quick', { cooldownDays: 7, frequency: 'low' });
    const history = { ...NO_HISTORY, lastDone: { [weekly.id]: '2026-10-05', [monthly.id]: '2026-10-05', [lastDay.id]: '2026-10-08' } };
    const inp = input({ library: [lastDay, monthly, weekly], profile: profile({ tracks: ['money'] }), day: '2026-10-09', history });
    expect(chooseForSlot(inp, 'easy', 'money', new Set(), 15, 's')?.mission.id).toBe(weekly.id);
    expect(chooseForSlot(inp, 'easy', 'money', new Set([weekly.id]), 15, 's')?.mission.id).toBe(monthly.id);
    // Yesterday's only when nothing else is left.
    expect(chooseForSlot(inp, 'easy', 'money', new Set([weekly.id, monthly.id]), 15, 's')?.mission.id).toBe(lastDay.id);
  });

  it('takes a longer mission rather than leave a slot empty when the plan learned to keep them shorter', () => {
    const short = m('fitness', 'quick', { group: 'cardio' });
    const long = m('fitness', 'progress', { group: 'workout' });
    const prof = profile({ tracks: ['fitness'], minutes: 45 });
    const plan = generatePlan(input({ library: [short, long], profile: prof, adapt: { ...NO_ADAPTATION, preferShort: true } }));
    expect(plan.missions.map(p => p.missionId).sort()).toEqual([short.id, long.id].sort());
  });

  it('puts at most two missions from one area in a day, unless it is the week’s focus or their only area', () => {
    const prof = profile({ tracks: ['money', 'skills'], minutes: 60, intensity: 'push' });
    for (let i = 0; i < 14; i++) {
      const plan = generatePlan(input({ profile: prof, day: addDays('2026-10-05', i) }));
      expect(plan.missions.length).toBe(4);
      for (const a of ['money', 'skills']) expect(plan.missions.filter(p => p.area === a).length).toBeLessThanOrEqual(MAX_PER_AREA);
    }
    // Two Money missions in the day already and nothing left in Skills: no third Money mission...
    const two: TrackId[] = ['money', 'money'];
    const noSkills = new Set(LIB.filter(x => x.track === 'skills').map(x => x.id));
    const pickFor = (p: Profile, crowd = false) => chooseForSlot(input({ profile: p, day: '2026-10-14' }), 'main', 'money', noSkills, 45, 's', two, false, 45, crowd)?.area ?? null;
    expect(pickFor(prof)).toBeNull();
    // ...unless Money is the week's focus or their only area, or (generatePlan's last try) the slot would stay empty.
    expect(pickFor({ ...prof, focus: { week: '2026-10-12', id: 'save' } })).toBe('money');
    expect(pickFor({ ...prof, tracks: ['money'] })).toBe('money');
    expect(pickFor(prof, true)).toBe('money');
  });

  it('keeps every plan in the plan areas: the focus area, the chosen ones, and the goal’s only with fewer than three', () => {
    const p = profile({ tracks: ['fitness', 'money'], project: null, goal: 'Launch my clothing brand' });
    expect(planAreas({ library: LIB, profile: p, day: '2026-10-14' })).toEqual(['fitness', 'money', 'projects']);
    expect(planAreas({ library: LIB, profile: { ...p, tracks: ['fitness', 'money', 'skills'] }, day: '2026-10-14' })).toEqual(['fitness', 'money', 'skills']);
    const gym = { ...p, focus: { week: '2026-10-12', id: 'gym' as const } };
    expect(planAreas({ library: LIB, profile: { ...gym, tracks: ['school', 'money'] }, day: '2026-10-14' })).toEqual(['fitness', 'school', 'money', 'projects']);
  });
});

describe('streak and off days', () => {
  const run = (start: DayKey, len: number) => Array.from({ length: len }, (_, i) => addDays(start, i));
  it('counts days in a row with a proven mission; today only once something is proven', () => {
    expect(computeStreak(run('2026-10-01', 5), '2026-10-05')).toMatchObject({ current: 5, activeToday: true });
    expect(computeStreak(run('2026-10-01', 5), '2026-10-06')).toMatchObject({ current: 5, activeToday: false });
    expect(computeStreak(run('2026-10-01', 5), '2026-10-08').current).toBe(0);
  });

  it('earns an Off Day every 7 active days that covers a missed day by itself', () => {
    const days = [...run('2026-10-01', 7), ...run('2026-10-09', 3)]; // missed the 8th
    const s = computeStreak(days, '2026-10-11');
    expect(s.covered).toEqual(['2026-10-08']);
    expect(s.current).toBe(10);
    expect(s.offDays).toBe(0);
    // Without the 7 days first there's nothing banked, so a gap resets it.
    expect(computeStreak([...run('2026-10-01', 3), ...run('2026-10-05', 2)], '2026-10-06').current).toBe(2);
  });

  it('banks at most two and keeps the longest streak', () => {
    expect(computeStreak(run('2026-09-01', 28), '2026-09-28').offDays).toBe(2);
    const s = computeStreak([...run('2026-09-01', 4), ...run('2026-09-10', 2)], '2026-09-11');
    expect(s.longest).toBe(4);
    expect(s.current).toBe(2);
  });
});

function recordWith(entries: { day: DayKey; mission: Mission; timer?: number; hash?: string }[]): RecordState {
  let r = emptyRecord();
  for (const e of entries) {
    r = completeMission(r, e.day, null, e.mission, [photo(e.hash ?? `${e.day}${e.mission.id}`)], accepted, { at: 0, verifiedClock: true, timerSeconds: e.timer }).record;
  }
  return r;
}

describe('proving a mission', () => {
  it('credits points, puts the day on record and pays the perfect-day bonus once', () => {
    const plan: DayPlan = generatePlan(input());
    let r = emptyRecord();
    plan.missions.forEach((p, i) => {
      const c = completeMission(r, plan.day, plan, byId.get(p.missionId)!, [photo(`h${i}`)], accepted, { at: i, verifiedClock: true });
      r = c.record;
      expect(c.points).toBe(byId.get(p.missionId)!.points);
      expect(c.bonus).toBe(i === plan.missions.length - 1 ? 15 : 0);
    });
    expect(plan.missions.length).toBe(slotsFor(input().profile).length);
    expect(r.days[plan.day]).toEqual({ verified: true });
    expect(provenInPlan(r, plan)).toBe(plan.missions.length);
    expect(balance(r)).toBe(plan.missions.reduce((t, p) => t + byId.get(p.missionId)!.points, 0) + 15);
    // Proving one again earns nothing.
    const again = completeMission(r, plan.day, plan, byId.get(plan.missions[0].missionId)!, [photo('h9')], accepted, { at: 9, verifiedClock: true });
    expect(again.points).toBe(0);
    expect(balance(again.record)).toBe(balance(r));
  });

  it('counts a proof for the area the plan put it in', () => {
    const both = m('career', 'progress', { also: ['projects'] });
    const plan: DayPlan = { day: '2026-10-09', missions: [{ slot: 'main', missionId: both.id, area: 'projects' }], rerolls: 0, replaced: [] };
    const c = completeMission(emptyRecord(), plan.day, plan, both, [photo('hp')], accepted, { at: 1, verifiedClock: true });
    expect(c.record.missions[plan.day][both.id].track).toBe('projects');
    // A plan from an earlier build has no area: the mission's own.
    const old: DayPlan = { ...plan, missions: [{ slot: 'main', missionId: both.id }] };
    expect(completeMission(emptyRecord(), plan.day, old, both, [photo('hq')], accepted, { at: 1, verifiedClock: true }).record.missions[plan.day][both.id].track).toBe('career');
  });

  it('a rejected proof earns nothing and does not count as a day', () => {
    const rejected: Verification = { ...accepted, status: 'rejected' };
    const c = completeMission(emptyRecord(), '2026-10-09', null, LIB[0], [photo('x')], rejected, { at: 0, verifiedClock: true });
    expect(c.points).toBe(0);
    expect(c.record.days['2026-10-09']).toBeUndefined();
    // A good proof after a rejected one still earns its points; a second good proof earns nothing.
    const again = completeMission(c.record, '2026-10-09', null, LIB[0], [photo('y')], accepted, { at: 5, verifiedClock: true });
    expect(again.points).toBe(LIB[0].points);
    expect(again.record.missions['2026-10-09'][LIB[0].id].doneAt).toBe(5);
    const twice = completeMission(again.record, '2026-10-09', null, LIB[0], [photo('z')], accepted, { at: 9, verifiedClock: true });
    expect(twice.points).toBe(0);
    expect(twice.record).toBe(again.record);
  });
});

describe('proof checks (on device)', () => {
  const now = 10_000_000;
  const base = { now, usedHashes: new Set<string>(), fromCamera: true };
  it('accepts a fresh photo and says what it checked, never that it looked at the content', () => {
    const v = localChecks({ ...base, mission: { proofType: 'PHOTO' }, photos: [photo('a', 'single', now - 60_000)] });
    expect(v).toMatchObject({ status: 'accepted', method: 'on-device' });
    expect(v.checks.map(c => c.id)).toEqual(['photos', 'fresh', 'duplicate']);
  });

  it('rejects an old photo, a reused photo, and a timer that did not finish', () => {
    expect(localChecks({ ...base, mission: { proofType: 'PHOTO' }, photos: [photo('a', 'single', now - 60 * 60_000)] }).status).toBe('rejected');
    expect(localChecks({ ...base, usedHashes: new Set(['a']), mission: { proofType: 'PHOTO' }, photos: [photo('a', 'single', now)] }).status).toBe('rejected');
    const timer = { proofType: 'TIMER_AND_PHOTO' as const, timerMinutes: 25 };
    expect(localChecks({ ...base, mission: timer, timerSeconds: 600, photos: [photo('a', 'single', now)] }).status).toBe('rejected');
    expect(localChecks({ ...base, mission: timer, timerSeconds: 1500, timerEndedAt: now - 1000, photos: [photo('a', 'single', now)] }).status).toBe('accepted');
  });

  it('needs a before and an after, a few minutes apart, and two different photos', () => {
    const ba = { proofType: 'BEFORE_AFTER' as const };
    expect(localChecks({ ...base, mission: ba, photos: [photo('a', 'after', now)] }).status).toBe('rejected');
    expect(localChecks({ ...base, mission: ba, photos: [photo('a', 'before', now - 30_000), photo('b', 'after', now)] }).status).toBe('rejected');
    expect(localChecks({ ...base, mission: ba, photos: [photo('a', 'before', now - 600_000), photo('a', 'after', now)] }).status).toBe('rejected');
    expect(localChecks({ ...base, mission: ba, photos: [photo('a', 'before', now - 600_000), photo('b', 'after', now)] }).status).toBe('accepted');
  });
});

describe('focus timer', () => {
  it('counts wall-clock time, pauses, and reports when it ends', () => {
    let t = startTimer('x', '2026-10-09', 25, 0);
    expect(clock(remainingSeconds(t, 0))).toBe('25:00');
    t = pauseTimer(t, 60_000);
    expect(elapsedSeconds(t, 600_000)).toBe(60);
    expect(endsAt(t)).toBeNull();
    t = resumeTimer(t, 600_000);
    expect(elapsedSeconds(t, 660_000)).toBe(120);
    expect(timerDone(t, 600_000 + 24 * 60_000)).toBe(true);
    expect(endsAt(t)).toBe(540_000 + 1_500_000);
    expect(timerDone(startTimer('x', 'd', 25, 0, 60), 25_000)).toBe(true);
  });
});

describe('progress', () => {
  it('levels each track by its points', () => {
    expect([levelStart(1), levelStart(2), levelStart(3), levelStart(4), levelStart(5)]).toEqual([0, 50, 150, 300, 500]);
    expect(levelFor(0)).toEqual({ level: 1, into: 0, span: 50 });
    expect(levelFor(160)).toEqual({ level: 3, into: 10, span: 150 });
  });

  it('adds up missions, points, focus time, tracks and milestones', () => {
    const q = LIB.find(x => x.track === 'discipline' && x.minutes === 45)!;
    const entries = Array.from({ length: 10 }, (_, i) => ({ day: addDays('2026-10-01', i), mission: q, timer: 1500, hash: `t${i}` }));
    const r = recordWith(entries);
    expect(totals(r)).toMatchObject({ missions: 10, points: 200, focusMinutes: 250, activeDays: 10 });
    expect(trackProgress(r).discipline).toMatchObject({ xp: 200, missions: 10, level: 3 });
    const ms = milestones(r, '2026-10-10');
    expect(ms.find(x => x.key === 'missions-10')!.reached).toBe('2026-10-10');
    expect(ms.find(x => x.key === 'streak-7')!.reached).toBe('2026-10-07');
    expect(ms.find(x => x.key === 'missions-30')!).toMatchObject({ reached: null, progress: 10 });
  });

  it('works out the week, the strongest area and the one left out, without shaming', () => {
    expect(weekStart('2026-10-09')).toBe('2026-10-05'); // a Friday → Monday
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(reviewWeekFor('2026-10-11')).toBe('2026-10-05');
    expect(reviewWeekFor('2026-10-12')).toBe('2026-10-05');
    expect(reviewWeekFor('2026-10-09')).toBeNull();
    const f = LIB.find(x => x.track === 'discipline' && x.minutes === 30)!;
    const s = LIB.find(x => x.track === 'skills' && x.minutes === 5)!;
    const r = recordWith([
      { day: '2026-10-05', mission: f, timer: 1500 },
      { day: '2026-10-06', mission: f, timer: 1500 },
      { day: '2026-10-07', mission: s },
    ]);
    const plans: Record<DayKey, DayPlan> = { '2026-10-05': { day: '2026-10-05', missions: [{ slot: 'quick', missionId: 'x' }, { slot: 'progress', missionId: f.id }, { slot: 'challenge', missionId: 'y' }], rerolls: 0, replaced: [] } };
    const w = weeklyReview(r, plans, { tracks: ['discipline', 'skills', 'fitness'] }, '2026-10-05');
    expect(w).toMatchObject({ missions: 3, focusMinutes: 50, points: 35, activeDays: 3, strongest: 'discipline', ignored: 'fitness' });
    // Completion counts each proven day at its own size: the 1-of-3 Monday, then two days with no plan kept.
    expect(w.planned).toBe(5);
    expect(completionIn(r, plans, '2026-10-05', '2026-10-11')).toMatchObject({ days: 3, proven: 3, planned: 5, percent: 60 });
  });
});

describe('old or damaged records', () => {
  const q = LIB.find(x => x.track === 'discipline' && x.minutes === 5)!;
  // A track that was renamed or removed, a 3.0 beta entry without verification or photos, and an empty day.
  const odd = { missionId: 'gone-x', slot: 'quick', track: 'chess', points: 10, doneAt: 1, photos: [], verification: accepted } as unknown as MissionDone;
  const bare = { missionId: 'bare', slot: 'quick', track: 'discipline', points: 10, doneAt: 2 } as unknown as MissionDone;
  const base = recordWith([{ day: '2026-10-01', mission: q }]);
  const r: RecordState = {
    ...base,
    missions: {
      ...base.missions,
      '2026-10-02': { 'gone-x': odd, bare },
      '2026-10-03': null as unknown as Record<string, MissionDone>,
      '2026-10-04': { empty: null as unknown as MissionDone },
    },
  };

  it('skips unknown tracks and entries without verification instead of crashing', () => {
    const tp = trackProgress(r);
    expect(tp.discipline).toMatchObject({ xp: 5, missions: 1 });
    expect(Object.keys(tp)).not.toContain('chess');
    // The odd track's proof still counts as a proven mission and a day; the bare entry does not.
    expect(totals(r)).toMatchObject({ missions: 2, points: 15, activeDays: 2 });
    expect([...activeDays(r)].sort()).toEqual(['2026-10-01', '2026-10-02']);
    expect(allDone(r).map(m => m.missionId)).toEqual([q.id, 'gone-x', 'bare']);
    expect(milestones(r, '2026-10-04').find(x => x.key === 'first-mission')!.reached).toBe('2026-10-01');
    expect(completionIn(r, {}, '2026-10-01', '2026-10-04')).toEqual({ days: 2, proven: 2, planned: 2, perfect: 0, percent: 100 });
    expect(isProven(bare)).toBe(false);
    expect(isProven(undefined)).toBe(false);
    expect(photosOf(bare)).toEqual([]);
    expect(photosOf(odd)).toEqual([]);
  });

  it('counts no points from an entry that has none', () => {
    const noPoints = { ...bare, points: undefined } as unknown as MissionDone;
    const p: RecordState = { ...emptyRecord(), legacyPoints: 40, missions: { '2026-10-05': { x: noPoints } } };
    expect(pointsEarned(p)).toBe(40);
    expect(balance(p)).toBe(40);
  });
});

describe('rewards', () => {
  const tiers: RewardTier[] = [
    { id: 'five', title: '5% off', detail: '', type: 'discount', points: 300, percent: 5, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1 },
    { id: 'ten', title: '10% off', detail: '', type: 'discount', points: 600, percent: 10, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1 },
    { id: 'off', title: 'Off', detail: '', type: 'discount', points: 100, percent: 20, active: false, codeValidDays: 30, perCollection: 1 },
    { id: 'gone', title: 'Gone', detail: '', type: 'discount', points: 100, percent: 20, active: true, inventory: 0, codeValidDays: 30, perCollection: 1 },
    { id: 'later', title: 'Later', detail: '', type: 'discount', points: 100, percent: 20, active: true, availableFrom: '2027-01-01', codeValidDays: 30, perCollection: 1 },
  ];
  const r450: RecordState = { ...emptyRecord(), legacyPoints: 450 };
  it('shows how close the next reward is', () => {
    const r250: RecordState = { ...emptyRecord(), legacyPoints: 250 };
    expect(nextReward(r250, tiers, '004', '2026-10-09')).toMatchObject({ tier: { id: 'five' }, have: 250, need: 50, ready: false });
    // 5% off is in reach at 450: that's the news, not the 150 left to 10% off.
    expect(nextReward(r450, tiers, '004', '2026-10-09')).toMatchObject({ tier: { id: 'five' }, have: 450, need: 0, ready: true });
    expect(rewardStatus(r450, tiers[0], '004', '2026-10-09')).toBe('ready');
    for (const t of tiers.slice(2)) expect(isAvailable(t, '2026-10-09')).toBe(false);
  });

  it('names the most valuable reward in reach, and the cheapest one out of reach once those are taken', () => {
    const fifteen: RewardTier = { ...tiers[1], id: 'fifteen', title: '15% off', points: 1000, percent: 15 };
    const all = [...tiers, fifteen];
    const r700: RecordState = { ...emptyRecord(), legacyPoints: 700 };
    expect(nextReward(r700, all, '004', '2026-10-09')).toMatchObject({ tier: { id: 'ten' }, need: 0, ready: true });
    const r1200: RecordState = { ...emptyRecord(), legacyPoints: 1200 };
    expect(nextReward(r1200, all, '004', '2026-10-09')).toMatchObject({ tier: { id: 'fifteen' }, have: 1200, need: 0, ready: true });
    // Same price: the bigger discount.
    const twelve: RewardTier = { ...tiers[1], id: 'twelve', percent: 12 };
    expect(nextReward(r700, [tiers[1], twelve], '004', '2026-10-09')!.tier.id).toBe('twelve');
    // 15% off taken leaves 200: nothing is in reach, so the cheapest one out of reach (5% off) is next.
    const took = redeem(r1200, fifteen, '004', '2026-10-09', { code: 'C', url: 'u' });
    expect(nextReward(took, all, '004', '2026-10-09')).toMatchObject({ tier: { id: 'five' }, have: 200, need: 100, ready: false });
    const both = redeem({ ...took, legacyPoints: 2000 }, tiers[1], '004', '2026-10-09', { code: 'D', url: 'u' });
    expect(nextReward(both, all, '004', '2026-10-09')).toMatchObject({ tier: { id: 'five' }, ready: true });
    const none = redeem(both, tiers[0], '004', '2026-10-09', { code: 'E', url: 'u' });
    expect(nextReward(none, all, '004', '2026-10-09')).toBeNull();
  });

  it('counts a 2.x code against the tier with the same percent, in the same collection only', () => {
    const code = (percent: number, collection = '004'): CodeClaim => ({ day: '2026-09-01', collection, points: 600, percent, code: 'OLD', url: 'u', expires: '2026-10-01' });
    const r: RecordState = { ...emptyRecord(), legacyPoints: 1200, codes: [code(10)] };
    expect(takenThisCollection(r, tiers[1], '004')).toBe(1);
    expect(rewardStatus(r, tiers[1], '004', '2026-10-09')).toBe('used');
    expect(rewardStatus(r, tiers[1], '005', '2026-10-09')).toBe('ready');
    // Another percent: untouched.
    expect(rewardStatus(r, tiers[0], '004', '2026-10-09')).toBe('ready');
    const fifteen: RewardTier = { ...tiers[1], id: 'fifteen', points: 1000, percent: 15 };
    expect(rewardStatus(r, fifteen, '004', '2026-10-09')).toBe('ready');
    expect(nextReward(r, [tiers[0], tiers[1]], '004', '2026-10-09')).toMatchObject({ tier: { id: 'five' }, ready: true });
    // Two allowed per collection: one 2.x code leaves one.
    const twice: RewardTier = { ...tiers[1], perCollection: 2 };
    expect(rewardStatus(r, twice, '004', '2026-10-09')).toBe('ready');
    expect(rewardStatus({ ...r, codes: [code(10), code(10)] }, twice, '004', '2026-10-09')).toBe('used');
    // Records from before codes existed.
    expect(takenThisCollection({ ...r, codes: undefined as unknown as CodeClaim[] }, tiers[1], '004')).toBe(0);
  });

  it('spends points once per collection and takes the server list when there is one', () => {
    const r = redeem(r450, tiers[0], '004', '2026-10-09', { code: 'C', url: 'u' });
    expect(balance(r)).toBe(150);
    expect(r.redemptions[0]).toMatchObject({ rewardId: 'five', expires: '2026-11-08' });
    expect(rewardStatus(r, tiers[0], '004', '2026-10-09')).toBe('used');
    expect(rewardStatus(r, tiers[0], '005', '2026-10-09')).toBe('short');
    expect(effectiveTiers(tiers, null)).toHaveLength(5);
    expect(effectiveTiers(tiers, [tiers[1]])).toEqual([tiers[1]]);
  });
});

describe('programs', () => {
  const p: Program = { id: 'lock', title: '7 Day Lock In', short: '', days: 3, tracks: ['discipline'], free: true, plan: [['a'], ['b'], ['c']] };
  it('moves on a day once a program mission is proven, so a missed day just waits', () => {
    let s = startProgram('lock', '2026-10-01');
    expect(programDay(p, s, '2026-10-01')).toBe(1);
    expect(programMissions(p, s, '2026-10-01')).toEqual(['a']);
    s = programProgress(p, s, '2026-10-01');
    expect(programDay(p, s, '2026-10-01')).toBe(1);
    expect(programDay(p, s, '2026-10-03')).toBe(2); // skipped the 2nd: still day 2
    s = programProgress(p, s, '2026-10-03');
    s = programProgress(p, s, '2026-10-04');
    expect(s.finishedDay).toBe('2026-10-04');
    expect(programDay(p, s, '2026-10-05')).toBeNull();
  });
});

describe('proof photos', () => {
  it('fingerprints the same bytes the same way', () => {
    expect(fingerprint('data:image/jpeg;base64,AAAA')).toBe(fingerprint('AAAA'));
    expect(fingerprint('AAAA')).not.toBe(fingerprint('AAAB'));
  });

  it('clears old photos but keeps the mission and its fingerprint', () => {
    const q = LIB[0];
    const r = recordWith([{ day: '2026-08-01', mission: q, hash: 'old' }, { day: '2026-10-08', mission: { ...q, id: 'focus-other' }, hash: 'new' }]);
    const clear = photosToClear(r, 30, '2026-10-09');
    expect(clear.map(c => c.day)).toEqual(['2026-08-01']);
    expect(photosToClear(r, 0, '2026-10-09')).toEqual([]);
    const after = clearPhotos(r, clear);
    expect(after.missions['2026-08-01'][q.id].photos[0]).toMatchObject({ uri: '', hash: 'old' });
    expect(usedHashes(after).has('old')).toBe(true);
  });
});

describe('reminders', () => {
  const PROMPTS = promptsJson as ReminderPrompt[];
  const base = { day: '2026-10-07', first: 7 * 60, last: 22 * 60, seed: 's' };

  it('spreads the day from First to Last, with no night check to move around', () => {
    for (const seed of ['s', 'a', 'b', 'c', 'd']) {
      for (let i = 0; i < 20; i++) {
        const t = dayReminderTimes({ ...base, seed, day: addDays('2026-10-07', i), count: 3 });
        expect(t.map(x => x.kind)).toEqual(['today', 'task', 'task']);
        expect(t[0].minutes).toBe(7 * 60);
        expect(Math.abs(t[1].minutes - (14 * 60 + 30))).toBeLessThanOrEqual(10);
        // The last one stays near Last (10:00 PM), never pulled earlier.
        expect(t[2].minutes).toBeLessThanOrEqual(22 * 60);
        expect(t[2].minutes).toBeGreaterThanOrEqual(22 * 60 - 10);
      }
    }
  });

  it('never stacks reminders on one minute and never runs past the end of the day', () => {
    const cases = [
      { first: 23 * 60, last: 22 * 60, count: 3 }, // reversed
      { first: 8 * 60, last: 8 * 60, count: 5 }, // equal
      { first: 20 * 60, last: 4 * 60 + 30, count: 3 }, // ends after 4:00 AM
      { first: 19 * 60, last: 22 * 60, count: 10 },
    ];
    for (const c of cases) {
      const t = dayReminderTimes({ ...base, ...c });
      expect(t.length).toBe(c.count);
      expect(t[0].minutes).toBe(c.first);
      for (let i = 1; i < t.length; i++) expect(t[i].minutes).toBeGreaterThan(t[i - 1].minutes);
      expect(t[t.length - 1].minutes).toBeLessThanOrEqual(28 * 60 - 1);
    }
    const narrow = dayReminderTimes({ ...base, first: 8 * 60, last: 8 * 60 + 3, count: 10 }).map(x => x.minutes);
    expect(narrow[0]).toBe(480);
    expect(new Set(narrow).size).toBe(narrow.length);
    expect(narrow.every(x => x <= 483)).toBe(true);
  });

  it("schedules floor(56 / reminders a day) days ahead, reminders only: the budget's share for reminders", () => {
    expect(MAX_PENDING).toBe(56);
    expect([0, 1, 3, 5, 10].map(c => daysAhead(c))).toEqual([56, 56, 18, 11, 5]);
    const now = new Date(2026, 9, 7, 6, 0);
    const opts = { now, today: '2026-10-07', first: 7 * 60, last: 22 * 60, prompts: PROMPTS, seed: 's' };
    for (const count of [1, 3, 10]) {
      const plan = planNotifications({ ...opts, count });
      expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
      expect(plan.every(p => p.id.startsWith('rem-') && (p.kind === 'today' || p.kind === 'task'))).toBe(true);
      expect(plan.every(p => p.date > now)).toBe(true);
    }
    expect(planNotifications({ ...opts, count: 3 }).some(p => p.id === `rem-${addDays('2026-10-07', 17)}-2`)).toBe(true);
    expect(planNotifications({ ...opts, count: 3 }).some(p => p.day === addDays('2026-10-07', 18))).toBe(false);
    // Rebuilt later in the day: what's still ahead keeps its prompt.
    const early = new Map(planNotifications({ ...opts, count: 3 }).map(p => [p.id, p.prompt]));
    const later = planNotifications({ ...opts, count: 3, now: atMinutes('2026-10-07', 16 * 60) });
    for (const p of later) expect(p.prompt).toBe(early.get(p.id));
  });

  it("picks each nudge's fallback text from its time of day, and rotates it day to day", () => {
    const plan = planNotifications({ now: new Date(2026, 9, 7, 6, 0), today: '2026-10-07', count: 10, first: 7 * 60, last: 22 * 60, prompts: PROMPTS, seed: 's' });
    for (const p of plan.filter(x => x.kind === 'task')) {
      expect(PROMPTS.find(x => x.text === p.prompt)?.slot).toBe(slotOf(p.date.getHours() * 60 + p.date.getMinutes()));
    }
    const midday = [0, 1, 2, 3].map(i => {
      const day = addDays('2026-10-07', i);
      return planNotifications({ now: atMinutes(day, 9 * 60), today: day, count: 3, first: 7 * 60, last: 22 * 60, prompts: PROMPTS, seed: 's' }).find(p => p.id === `rem-${day}-1`)!.prompt;
    });
    for (let i = 1; i < midday.length; i++) expect(midday[i]).not.toBe(midday[i - 1]);
  });
});
