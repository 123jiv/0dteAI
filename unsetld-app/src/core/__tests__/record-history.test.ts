// 3.2 The Record: the calendar's day states, a day's page, the day's size kept on the record,
// swap reasons (choices and what the plan learns) and missions of the user's own (no farming).
import { describe, expect, it } from 'vitest';
import missionsJson from '../../content/missions.json';
import { completeMission } from '../complete';
import { customPoints, customsIn, cleanTitle, CUSTOM_POINTS_MAX, makeCustomMission } from '../custom';
import { dayDetail, dayMark, dayNumberOf, indexRecord, levelOf, monthView, plannedOn, recentProofs, recordMonths, recordSummary, shiftMonth, weekMarks } from '../history';
import { DEFAULT_PROFILE, generatePlan, replacementChoices, replaceWith, type MissionHistory, type PlanInput } from '../missions';
import { learnFrom, NO_ADAPTATION, personalWeight, leanFor, kindsOf } from '../personalize';
import { emptyRecord } from '../record';
import type { DayKey } from '../time';
import type { DayPlan, Mission, MissionDone, Profile, ProofPhoto, RecordState } from '../types';

const LIB = (missionsJson as Mission[]).filter(m => m.active);
const BY_ID: Record<string, Mission> = Object.fromEntries((missionsJson as Mission[]).map(m => [m.id, m]));
const accepted = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at: 1 };
const photo = (uri: string, kind: ProofPhoto['kind'] = 'single'): ProofPhoto => ({ uri, kind, takenAt: 1, hash: uri || kind });

function done(id: string, extra: Partial<MissionDone> = {}): MissionDone {
  return { missionId: id, slot: 'main', track: 'school', points: 10, doneAt: 1, photos: [], verification: accepted, ...extra };
}

function rec(days: Record<DayKey, MissionDone[]>, extra: Partial<RecordState> = {}): RecordState {
  const missions = Object.fromEntries(Object.entries(days).map(([d, list]) => [d, Object.fromEntries(list.map(m => [m.missionId, m]))]));
  return { ...emptyRecord(), missions, ...extra };
}

const plan = (day: DayKey, ids: string[]): DayPlan => ({ day, missions: ids.map(id => ({ slot: 'main', missionId: id, area: 'school' })), rerolls: 0, replaced: [] });

describe('day states on the calendar', () => {
  it('reads none, one, two and perfect (the bonus), with a 2-of-4 Push day as two', () => {
    expect(levelOf(0, false)).toBe('none');
    expect(levelOf(1, false)).toBe('one');
    expect(levelOf(2, false)).toBe('two');
    expect(levelOf(3, false)).toBe('two');
    expect(levelOf(3, true)).toBe('perfect');
    expect(levelOf(2, true)).toBe('perfect');
  });

  it('builds a Monday-first month with today, the future and an Off Day', () => {
    // October 2026 starts on a Thursday. Proven 1st (1), 2nd (2), 3rd (3, perfect); 12th is today.
    const r = rec(
      {
        '2026-10-01': [done('a')],
        '2026-10-02': [done('a'), done('b')],
        '2026-10-03': [done('a'), done('b'), done('c')],
        '2026-10-04': [done('a')],
        '2026-10-05': [done('a')],
        '2026-10-06': [done('a')],
        '2026-10-07': [done('a')],
        '2026-10-09': [done('a')],
      },
      { bonuses: { '2026-10-03': 15 } },
    );
    const ix = indexRecord(r, '2026-10-12');
    const v = monthView(r, {}, '2026-10', ix);
    expect(v.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(v.weeks[0][3]?.date).toBe(1);
    expect(v.weeks.every(w => w.length === 7)).toBe(true);
    const marks = v.weeks.flat().filter(Boolean) as NonNullable<(typeof v.weeks)[0][0]>[];
    expect(marks).toHaveLength(31);
    const at = (d: number) => marks[d - 1];
    expect([at(1).level, at(2).level, at(3).level]).toEqual(['one', 'two', 'perfect']);
    // Seven active days bank an Off Day, which covers the 8th.
    expect(at(8).covered).toBe(true);
    expect(at(12).when).toBe('today');
    expect(at(13).when).toBe('future');
    expect(v.days).toBe(8);
    expect(v.missions).toBe(11);
    expect(v.perfect).toBe(1);
  });

  it('keeps the day size once plans are gone: the record, then the plan, then a perfect day', () => {
    const r = rec({ '2026-08-01': [done('a'), done('b')], '2026-08-02': [done('a'), done('b')], '2026-08-03': [done('a')] }, { planned: { '2026-08-01': 3 }, bonuses: { '2026-08-02': 15 } });
    expect(plannedOn(r, {}, '2026-08-01')).toBe(3);
    expect(plannedOn(r, {}, '2026-08-02')).toBe(2);
    expect(plannedOn(r, {}, '2026-08-03')).toBeNull();
    expect(plannedOn(r, { '2026-08-03': plan('2026-08-03', ['a', 'b', 'c']) }, '2026-08-03')).toBe(3);
  });

  it('shows a 2.x day as shown up, and spans the months from the first day on record', () => {
    const r = rec({ '2026-10-02': [done('a')] }, { days: { '2026-08-20': { verified: true }, '2026-10-02': { verified: true } } });
    const ix = indexRecord(r, '2026-10-12');
    const legacy = dayMark(r, {}, '2026-08-20', ix);
    expect(legacy.legacy).toBe(true);
    expect(legacy.level).toBe('one');
    expect(recordMonths(r, '2026-10-12')).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(recordMonths(emptyRecord(), '2026-10-12')).toEqual(['2026-10']);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it("Day 1's week row: today and nothing else", () => {
    const ix = indexRecord(emptyRecord(), '2026-10-14');
    const week = weekMarks(emptyRecord(), {}, '2026-10-12', ix);
    expect(week.map(d => d.when)).toEqual(['past', 'past', 'today', 'future', 'future', 'future', 'future']);
    expect(week.every(d => d.level === 'none')).toBe(true);
  });
});

describe("a day's page", () => {
  it('lists the proofs in order with points, the bonus and the total, and keeps a cleared photo', () => {
    const r = rec(
      {
        '2026-10-07': [
          done('school-study-30', { doneAt: 30, points: 15, photos: [photo('')], title: 'Study for 30 Minutes' }),
          done('a', { doneAt: 10, points: 5, photos: [photo('b.jpg', 'before'), photo('a.jpg', 'after')] }),
          done('t', { doneAt: 20, points: 20, timerSeconds: 1500 }),
        ],
        '2026-10-08': [done('a')],
      },
      { bonuses: { '2026-10-07': 15 }, planned: { '2026-10-07': 3 } },
    );
    const d = dayDetail(r, {}, '2026-10-07');
    expect(d.proven.map(p => p.missionId)).toEqual(['a', 't', 'school-study-30']);
    expect(d.proven[0].cover?.uri).toBe('a.jpg');
    expect(d.proven[1].timerSeconds).toBe(1500);
    // Cleared by the retention setting: the entry, its title and points stay.
    expect(d.proven[2].cover?.uri).toBe('');
    expect(d.proven[2].title).toBe('Study for 30 Minutes');
    expect([d.points, d.bonus, d.total]).toEqual([40, 15, 55]);
    expect(d.perfect).toBe(true);
    expect(d.level).toBe('perfect');
    expect(d.planned).toBe(3);
    expect(d.number).toBe(1);
    expect(dayNumberOf(r, '2026-10-08')).toBe(2);
    expect(dayNumberOf(r, '2026-10-09')).toBeNull();
  });

  it("names the missions left undone while the day's plan is kept, and 2.x tasks", () => {
    const r = rec({ '2026-10-07': [done('a')] }, { work: { '2026-10-07': { x: { text: 'Run', doneAt: 5, proof: null } } } });
    const d = dayDetail(r, { '2026-10-07': plan('2026-10-07', ['a', 'b', 'c']) }, '2026-10-07');
    expect(d.open).toEqual(['b', 'c']);
    expect(d.planned).toBe(3);
    expect(d.level).toBe('one');
    expect(d.legacy).toEqual([{ text: 'Run', doneAt: 5, uri: null }]);
  });

  it('sums the record and finds the newest proofs', () => {
    const r = rec({ '2026-10-01': [done('a', { doneAt: 1 })], '2026-10-02': [done('a', { doneAt: 2 }), done('b', { doneAt: 3 })] }, { bonuses: { '2026-10-02': 15 } });
    expect(recordSummary(r)).toEqual({ days: 2, missions: 3, perfect: 1 });
    expect(recentProofs(r, 2).map(e => e.key)).toEqual(['2026-10-02:b', '2026-10-02:a']);
  });
});

describe('proving a mission keeps the day on the record', () => {
  const mission = LIB.find(m => m.proofType === 'PHOTO')!;
  it('stores the day size and the title with the first proof', () => {
    const p = plan('2026-10-07', [mission.id, 'b', 'c']);
    const c = completeMission(emptyRecord(), '2026-10-07', p, mission, [photo('x')], accepted, { at: 1, verifiedClock: true });
    expect(c.record.planned?.['2026-10-07']).toBe(3);
    expect(c.record.missions['2026-10-07'][mission.id].title).toBe(mission.title);
  });

  it('pays a mission of the user own no more than the planned mission it replaced', () => {
    const own = makeCustomMission({ title: 'Fix my bike chain', track: 'fitness', proofType: 'TIMER', timerMinutes: 30 }, 'custom-1')!;
    expect(own.points).toBe(15);
    const p: DayPlan = { day: '2026-10-07', missions: [{ slot: 'main', missionId: own.id, area: 'fitness', points: 5 }], rerolls: 1, replaced: ['x'] };
    const c = completeMission(emptyRecord(), '2026-10-07', p, own, [], accepted, { at: 1, verifiedClock: true, timerSeconds: 1800 });
    expect(c.points).toBe(5);
  });
});

describe('missions of your own', () => {
  it('earn a small fixed amount by proof type, never above the cap', () => {
    expect(customPoints('PHOTO')).toBe(5);
    expect(customPoints('BEFORE_AFTER')).toBe(10);
    expect(customPoints('TIMER', 15)).toBe(10);
    expect(customPoints('TIMER_AND_PHOTO', 60)).toBe(15);
    for (const t of ['PHOTO', 'BEFORE_AFTER', 'TIMER', 'TIMER_AND_PHOTO'] as const) for (const min of [15, 30, 45, 60]) expect(customPoints(t, min)).toBeLessThanOrEqual(CUSTOM_POINTS_MAX);
  });

  it('need a real title, a known proof type and a timer length from the list', () => {
    expect(cleanTitle('  Email   my coach ')).toBe('Email my coach');
    expect(cleanTitle('ab')).toBeNull();
    expect(cleanTitle('x'.repeat(41))).toBeNull();
    expect(makeCustomMission({ title: 'Run', track: 'fitness', proofType: 'TIMER', timerMinutes: 7 }, 'custom-2')).toBeNull();
    expect(makeCustomMission({ title: 'Run laps', track: 'fitness', proofType: 'PHOTO' }, 'school-x')).toBeNull();
    const m = makeCustomMission({ title: 'Clean the garage', track: 'organization', proofType: 'BEFORE_AFTER' }, 'custom-3')!;
    expect(m).toMatchObject({ custom: true, proofType: 'BEFORE_AFTER', points: 10, repeatable: true, cooldownDays: 0 });
    expect(m.timerMinutes).toBeUndefined();
  });

  it('a day holds one: counted in its plan', () => {
    const p = plan('2026-10-07', ['custom-1', 'b', 'c']);
    expect(customsIn(p)).toBe(1);
    expect(customsIn(plan('2026-10-07', ['a', 'b']))).toBe(0);
  });
});

describe('swap reasons', () => {
  const NONE: MissionHistory = { lastDone: {}, lastPlanned: { 'x-seen': '2026-10-01' }, skips: {} };
  const profile = (p: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, tracks: ['school', 'fitness', 'projects'], school: true, gym: true, project: true, minutes: 60, intensity: 'lockin', ...p });
  const input = (p: Partial<PlanInput> = {}): PlanInput => ({ library: LIB, profile: profile(), day: '2026-10-14', salt: 's', history: NONE, ...p });

  it('offers up to three different missions, none already in the day', () => {
    const inp = input();
    const day = generatePlan(inp);
    for (let i = 0; i < day.missions.length; i++) {
      const choices = replacementChoices(day, i, inp, 'another');
      expect(choices.length).toBeGreaterThanOrEqual(2);
      const ids = choices.map(c => c.mission.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(day.missions.some(p => p.missionId === id)).toBe(false);
      const groups = choices.map(c => c.mission.group).filter(Boolean);
      expect(new Set(groups).size).toBe(groups.length);
    }
  });

  it('too hard offers shorter missions, too easy longer ones, not relevant another kind', () => {
    const inp = input();
    const day = generatePlan(inp);
    const main = day.missions.findIndex(p => BY_ID[p.missionId].minutes >= 25);
    expect(main).toBeGreaterThanOrEqual(0);
    const old = BY_ID[day.missions[main].missionId];
    const hard = replacementChoices(day, main, inp, 'too-hard');
    expect(hard.length).toBeGreaterThan(0);
    expect(hard.filter(c => c.mission.minutes < old.minutes).length).toBeGreaterThanOrEqual(Math.min(2, hard.length));
    const easy = day.missions.findIndex(p => BY_ID[p.missionId].minutes <= 15);
    const small = BY_ID[day.missions[easy].missionId];
    const harder = replacementChoices(day, easy, inp, 'too-easy');
    expect(harder.length).toBeGreaterThan(0);
    expect(harder[0].mission.minutes).toBeGreaterThan(small.minutes);
    const other = replacementChoices(day, main, inp, 'not-relevant');
    const kinds = new Set(kindsOf(old));
    expect(other[0] && kindsOf(other[0].mission).some(k => kinds.has(k))).toBe(false);
  });

  it('a swap with a reason is one swap, keeps the reason, and a mission of your own carries its cap', () => {
    const inp = input();
    const day = generatePlan(inp);
    const pick = replacementChoices(day, 0, inp, 'cant-today')[0];
    const next = replaceWith(day, 0, pick.mission, pick.area, 'cant-today', 9)!;
    expect(next.rerolls).toBe(1);
    expect(next.replaced).toEqual([day.missions[0].missionId]);
    expect(next.swaps?.[0]).toMatchObject({ from: day.missions[0].missionId, to: pick.mission.id, reason: 'cant-today' });
    const own = makeCustomMission({ title: 'Call grandma', track: 'discipline', proofType: 'PHOTO' }, 'custom-9')!;
    const withOwn = replaceWith(next, 1, own, 'discipline', 'another', 10, 5)!;
    expect(withOwn.missions[1]).toMatchObject({ missionId: 'custom-9', points: 5 });
    // The same mission twice in a day: refused.
    expect(replaceWith(withOwn, 2, own, 'discipline', 'another', 11)).toBeNull();
  });

  it('learns from the reasons: not relevant stays away, too hard twice eases the area, too easy twice steps it up', () => {
    const study = LIB.find(m => m.track === 'school' && m.minutes >= 30)!;
    const run = LIB.find(m => m.track === 'fitness' && m.minutes >= 20)!;
    const read = LIB.find(m => m.track === 'projects' && m.minutes >= 20)!;
    const p1: DayPlan = {
      ...plan('2026-10-10', ['n1', 'n2']),
      replaced: [study.id, run.id, read.id],
      swaps: [
        { from: study.id, to: 'n1', reason: 'not-relevant', at: 1 },
        { from: run.id, to: 'n2', reason: 'too-hard', area: 'fitness', at: 2 },
        { from: read.id, to: 'n3', reason: 'too-easy', area: 'projects', at: 3 },
      ],
    };
    const run2 = LIB.find(m => m.track === 'fitness' && m.minutes >= 20 && m.id !== run.id)!;
    const read2 = LIB.find(m => m.track === 'projects' && m.minutes >= 20 && m.id !== read.id)!;
    const p2: DayPlan = {
      ...plan('2026-10-11', ['n4']),
      replaced: [run2.id, read2.id],
      swaps: [
        { from: run2.id, to: 'n4', reason: 'too-hard', area: 'fitness', at: 4 },
        { from: read2.id, to: 'n5', reason: 'too-easy', area: 'projects', at: 5 },
      ],
    };
    const a = learnFrom({ '2026-10-10': p1, '2026-10-11': p2 }, {}, BY_ID, '2026-10-14');
    expect(a.notForMe?.[study.id]).toBe(1);
    expect(a.easeIn).toEqual(['fitness']);
    expect(a.stepUp).toContain('projects');
    const lean = leanFor(profile(), '2026-10-14');
    expect(personalWeight(study, 'school', lean, a)).toBeLessThan(personalWeight(study, 'school', lean, NO_ADAPTATION) * 0.3);
    // "Can't do this today" and "Already did this" teach nothing.
    const p3: DayPlan = { ...plan('2026-10-12', ['n6']), replaced: [study.id], swaps: [{ from: study.id, to: 'n6', reason: 'cant-today', at: 6 }] };
    const b = learnFrom({ '2026-10-12': p3 }, {}, BY_ID, '2026-10-14');
    expect(b.notForMe?.[study.id]).toBeUndefined();
    expect(Object.keys(b.swappedKinds)).toEqual([]);
  });
});

