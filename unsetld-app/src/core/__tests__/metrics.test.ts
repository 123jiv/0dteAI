// Anonymous usage counts (launch pass P1-20; docs/METRICS.md): the allowlist drops everything
// else, the queue keeps to its cap and age limit, the stamps make retention countable without an
// ID, and the records the call sites build carry no text the user wrote.
import { describe, expect, it } from 'vitest';
import { isApproved, MISSION_BY_ID, MISSIONS, PROGRAM_BY_ID } from '../../content';
import {
  AREAS,
  cohortOf,
  dayClosed,
  describeSchema,
  enqueue,
  EVENT_NAMES,
  firstStart,
  focusFacts,
  MAX_QUEUE,
  missionRef,
  nothingProven,
  onboardingFacts,
  parseMetricsSwitch,
  partOf,
  planLeft,
  provenEvents,
  rejectFacts,
  sanitize,
  schema,
  stamp,
  streakBucket,
  swapFacts,
  type EventName,
  type Input,
  type QueuedEvent,
} from '../metrics';
import { TRACK_IDS } from '../progress';
import { emptyRecord } from '../record';
import type { DayPlan, MissionDone, RecordState } from '../types';

const S = schema(isApproved, id => Object.prototype.hasOwnProperty.call(PROGRAM_BY_ID, id));
const DAY = '2026-10-21'; // a Wednesday

const accepted = (missionId: string): MissionDone =>
  ({ missionId, slot: 'main', track: 'school', points: 10, doneAt: 1, photos: [], verification: { status: 'accepted', method: 'on-device', checks: [], at: 1 } }) as MissionDone;

function recordWith(days: Record<string, string[]>): RecordState {
  const r = emptyRecord();
  for (const [d, ids] of Object.entries(days)) {
    r.days[d] = { verified: true };
    r.missions[d] = Object.fromEntries(ids.map(id => [id, accepted(id)]));
  }
  return r;
}

const plan = (missions: DayPlan['missions'], extra: Partial<DayPlan> = {}): DayPlan => ({ day: DAY, missions, rerolls: 0, replaced: [], ...extra });

describe('the allowlist', () => {
  it('drops unknown events, and names that only look like events', () => {
    expect(sanitize(S, 'goal_text', { text: 'lose 20 pounds' })).toBeNull();
    expect(sanitize(S, 'toString', {})).toBeNull();
    expect(sanitize(S, '__proto__', {})).toBeNull();
  });

  it('drops free text in any field and keeps the categories', () => {
    expect(sanitize(S, 'weekly_focus_set', { focus: 'other', text: 'stop vaping', area: 'discipline', week: 'this' })).toEqual({ focus: 'other', week: 'this' });
    expect(sanitize(S, 'weekly_focus_set', { focus: 'stop vaping', week: 'this' })).toEqual({ week: 'this' });
  });

  it('never sends a custom mission id or title, or a retired id', () => {
    expect(sanitize(S, 'mission_proven', { mission: 'custom-lx3k9a12', title: 'Call grandma', area: 'discipline' })).toEqual({ area: 'discipline' });
    expect(sanitize(S, 'mission_proven', { mission: 'custom' })).toEqual({ mission: 'custom' });
    expect(sanitize(S, 'mission_proven', { mission: MISSIONS[0].id })).toEqual({ mission: MISSIONS[0].id });
    expect(sanitize(S, 'mission_proven', { mission: 'R99' })).toEqual({});
  });

  it('drops About you answers, age and names even when a caller passes them', () => {
    const p = sanitize(S, 'onboarding_completed', {
      areas: ['school', 'fitness', 'nope'],
      age: 'u16',
      school: true,
      schoolLevel: 'high',
      work: false,
      gym: true,
      project: true,
      skills: ['coding'],
      name: 'Alex',
      goal: 'Get better grades',
      minutes: 30,
    });
    expect(p).toEqual({ areas: ['fitness', 'school'], minutes: '30' });
  });

  it('keeps a value only inside its spec: ints are clamped and rounded, lists capped and sorted', () => {
    expect(sanitize(S, 'mission_swapped', { used: 99, max: -2 })).toEqual({ used: 9, max: 1 });
    expect(sanitize(S, 'day_closed', { planned_min: 37.4, proven: Number.NaN })).toEqual({ planned_min: 37 });
    expect(sanitize(S, 'onboarding_completed', { areas: ['money', 'school', 'school', 'career', 'skills', 'fitness'] })).toEqual({ areas: ['career', 'fitness', 'money', 'school'] });
    expect(sanitize(S, 'perfect_day', { minutes: 20 })).toEqual({});
    expect(sanitize(S, 'plan_started', { plan: 'my-own-plan', free: 'yes' })).toEqual({});
  });

  it('covers every area, and every event has a doc entry', () => {
    expect([...AREAS]).toEqual([...TRACK_IDS]);
    expect(Object.keys(describeSchema())).toEqual(EVENT_NAMES);
    expect(EVENT_NAMES).toHaveLength(16);
  });

  it('the remote switch is on only for a literal true', () => {
    expect(parseMetricsSwitch(true)).toBe(true);
    for (const v of [undefined, null, false, 'true', 1, {}, []]) expect(parseMetricsSwitch(v)).toBe(false);
  });
});

describe('the queue', () => {
  const ev = (e: EventName, day: string, p: QueuedEvent['p'] = {}): QueuedEvent => ({ e, p, ...stamp(day, day) });

  it('caps at MAX_QUEUE, the oldest repeatable records first, and keeps the funnel steps', () => {
    let q: QueuedEvent[] = [ev('onboarding_completed', DAY), ev('first_mission_proven', DAY)];
    for (let i = 0; i < 700; i++) q = enqueue(q, ev('mission_proven', DAY, { n_today: i % 9 }), DAY);
    expect(q).toHaveLength(MAX_QUEUE);
    expect(q.slice(0, 2).map(x => x.e)).toEqual(['onboarding_completed', 'first_mission_proven']);
    expect(q[q.length - 1].p).toEqual({ n_today: 699 % 9 });
  });

  it('drops records older than 30 days', () => {
    let q = enqueue([], ev('mission_proven', '2026-09-01'), '2026-09-01');
    q = enqueue(q, ev('mission_proven', '2026-09-20'), '2026-09-20');
    q = enqueue(q, ev('mission_proven', '2026-10-19'), '2026-10-19');
    expect(q.map(x => x.day)).toEqual(['2026-09-20', '2026-10-19']);
  });
});

describe('stamps', () => {
  it('cohort is the Monday of the setup week, or pre', () => {
    expect(cohortOf('2026-10-21')).toBe('2026-10-19');
    expect(cohortOf('2026-10-19')).toBe('2026-10-19');
    expect(cohortOf('2026-10-25')).toBe('2026-10-19');
    expect(cohortOf(null)).toBe('pre');
  });

  it('dn counts days since setup, capped at 400; null without a setup day', () => {
    expect(stamp('2026-10-19', '2026-10-26')).toEqual({ day: '2026-10-26', dn: 7, cohort: '2026-10-19' });
    expect(stamp('2024-01-01', '2026-10-26').dn).toBe(400);
    expect(stamp(null, '2026-10-26')).toEqual({ day: '2026-10-26', dn: null, cohort: 'pre' });
  });

  it('buckets', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 13, 14, 29, 30, 400].map(streakBucket)).toEqual(['1', '1', '2-3', '2-3', '4-6', '4-6', '7-13', '7-13', '14-29', '14-29', '30+', '30+']);
    expect([4, 11, 12, 16, 17, 21, 22, 0, 3].map(partOf)).toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night', 'night']);
  });
});

describe('what the call sites build', () => {
  const S1 = MISSION_BY_ID.S1;
  const F3 = MISSION_BY_ID.F3;
  const custom = { id: 'custom-mv6xfa80oh', track: 'school' as const, proofType: 'TIMER' as const };

  it('a mission of the user\'s own is "custom"', () => {
    expect(missionRef('custom-mv6xfa80oh')).toBe('custom');
    expect(missionRef('S1')).toBe('S1');
    expect(swapFacts('S9', 'custom-mv6xfa80oh', 'another', 2, 3)).toEqual({ from: 'S9', to: 'custom', reason: 'another', used: 2, max: 3 });
    expect(rejectFacts(custom, [{ id: 'timer', ok: false }, { id: 'photos', ok: true }])).toEqual({ mission: 'custom', proof: 'TIMER', failed: ['timer'] });
  });

  it('first_mission_started only while nothing was ever proven', () => {
    expect(nothingProven(emptyRecord())).toBe(true);
    expect(firstStart(emptyRecord(), S1, 'school')).toEqual({ mission: 'S1', area: 'school', proof: S1.proofType });
    expect(firstStart(recordWith({ '2026-10-20': ['F3'] }), S1, 'school')).toBeNull();
    expect(firstStart(emptyRecord(), undefined, undefined)).toBeNull();
  });

  it('onboarding_completed: the goal as a category, intensity only with an hour', () => {
    const p = { tracks: ['school' as const, 'fitness' as const], minutes: 30 as const, intensity: 'push' as const, goal: null, goalArea: null };
    expect(onboardingFacts(p, [], false)).toEqual({ areas: ['school', 'fitness'], minutes: 30, goal: 'none', returning: false });
    expect(onboardingFacts({ ...p, goal: 'Get better grades' }, ['school'], false)).toMatchObject({ goal: 'matched' });
    expect(onboardingFacts({ ...p, goal: 'Be better', goalArea: 'school' }, [], true)).toMatchObject({ goal: 'picked', returning: true });
    expect(onboardingFacts({ ...p, goal: 'Be better' }, [], false)).toMatchObject({ goal: 'unmatched' });
    expect(onboardingFacts({ ...p, minutes: 60 }, [], false)).toMatchObject({ minutes: 60, intensity: 'push' });
  });

  it('weekly_focus_set: the choice only', () => {
    expect(focusFacts({ id: 'other', week: '2026-10-19', text: 'stop vaping', area: 'discipline' } as never, false)).toEqual({ focus: 'other', week: 'this' });
    expect(focusFacts(null, true)).toEqual({ focus: 'none', week: 'next' });
    expect(focusFacts('skip', false)).toEqual({ focus: 'skip', week: 'this' });
  });

  it('plan_left: left, switched or unavailable; clearing a finished plan is not leaving', () => {
    const running = { id: 'lock-in-7', startedDay: DAY, doneDays: ['2026-10-21', '2026-10-22'], finishedDay: null };
    const known = (id: string) => id in PROGRAM_BY_ID;
    expect(planLeft(running, known, 'left')).toEqual({ plan: 'lock-in-7', at_day: 2, why: 'left' });
    expect(planLeft(running, known, 'switched')).toMatchObject({ why: 'switched' });
    expect(planLeft({ ...running, id: 'retired-plan' }, known, 'left')).toMatchObject({ why: 'unavailable' });
    expect(planLeft({ ...running, finishedDay: DAY }, known, 'left')).toBeNull();
    expect(planLeft(null, known, 'left')).toBeNull();
  });

  it('a proof: the first ever, the proof, the perfect day once, the Plan finished', () => {
    const p = plan([
      { slot: 'easy', missionId: 'F3', area: 'fitness' },
      { slot: 'main', missionId: 'S1', area: 'school', programId: 'lock-in-7' },
    ], { swaps: [{ from: 'F8', to: 'F3', reason: 'cant-today', at: 1 }], rerolls: 1 });
    const before = emptyRecord();
    const one = recordWith({ [DAY]: ['F3'] });
    const facts = { day: DAY, plan: p, streak: 1, clock: true, hour: 19, minutes: 30 as const, finished: null };
    const first = provenEvents({ ...facts, before, after: one, mission: F3 });
    expect(first.map(([e]) => e)).toEqual(['first_mission_proven', 'mission_proven']);
    expect(first[1][1]).toEqual({
      mission: 'F3',
      area: 'fitness',
      proof: F3.proofType,
      n_today: 1,
      planned: 2,
      first_today: true,
      first_this_week: true,
      streak: '1',
      plan: 'none',
      swapped_in: true,
      clock: true,
      part: 'evening',
    });
    const both = recordWith({ [DAY]: ['F3', 'S1'] });
    const finished = { id: 'lock-in-7', startedDay: '2026-10-14', days: 7, finishedDay: DAY };
    const second = provenEvents({ ...facts, before: one, after: both, mission: S1, streak: 2, finished });
    expect(second.map(([e]) => e)).toEqual(['mission_proven', 'perfect_day', 'plan_completed']);
    expect(second[0][1]).toMatchObject({ n_today: 2, first_today: false, first_this_week: false, plan: 'lock-in-7', swapped_in: false, streak: '2-3' });
    expect(second[1][1]).toEqual({ planned: 2, minutes: 30 });
    expect(second[2][1]).toEqual({ plan: 'lock-in-7', days_over: 1 });
    // An extra proof after the day was already perfect: no second perfect day.
    const extra = provenEvents({ ...facts, before: both, after: recordWith({ [DAY]: ['F3', 'S1', 'M1'] }), mission: MISSION_BY_ID.M1 ?? S1 });
    expect(extra.map(([e]) => e)).toEqual(['mission_proven']);
  });

  it('first_this_week looks back to Monday only', () => {
    const facts = { day: DAY, plan: null, mission: S1, streak: 1, clock: false, hour: 9, minutes: 15 as const, finished: null };
    // Sunday before: a new week. With no plan, planned is what's proven today.
    const [lastWeek] = provenEvents({ ...facts, before: recordWith({ '2026-10-18': ['F3'] }), after: recordWith({ '2026-10-18': ['F3'], [DAY]: ['S1'] }) });
    expect(lastWeek).toEqual(['mission_proven', expect.objectContaining({ first_this_week: true, first_today: true, n_today: 1, planned: 1 })]);
    // Monday: the week already has a day.
    const [thisWeek] = provenEvents({ ...facts, before: recordWith({ '2026-10-19': ['F3'] }), after: recordWith({ '2026-10-19': ['F3'], [DAY]: ['S1'] }) });
    expect(thisWeek[1]).toMatchObject({ first_this_week: false, first_today: true });
  });

  it('day_closed: planned against proven, the minutes planned rounded to 5', () => {
    const p = plan([{ slot: 'easy', missionId: 'F3' }, { slot: 'main', missionId: 'S1', programId: 'lock-in-7' }], { rerolls: 1 });
    const r = recordWith({ [DAY]: ['S1'] });
    const minutes = (id: string) => MISSION_BY_ID[id]?.minutes;
    const total = (F3.minutes ?? 0) + (S1.minutes ?? 0);
    expect(dayClosed(p, r, 30, minutes)).toEqual({ planned: 2, proven: 1, swaps: 1, planned_min: Math.round(total / 5) * 5, minutes: 30, plan: true });
    expect(sanitize(S, 'day_closed', dayClosed(p, r, 30, minutes)!)).toMatchObject({ minutes: '30', plan: true });
  });
});

describe('nothing the user wrote leaks', () => {
  it('goal, own mission and Something else text never appear in a serialized batch', () => {
    const GOAL = 'Launch my clothing brand by June';
    const OWN = 'Call grandma about the trip';
    const ELSE = 'Stop vaping before prom';
    const own = { id: 'custom-lx3k9a12', track: 'discipline' as const, proofType: 'PHOTO' as const, title: OWN };
    const profile = { tracks: ['projects' as const, 'discipline' as const], minutes: 45 as const, intensity: 'lockin' as const, goal: GOAL, goalArea: null };
    const p = plan([{ slot: 'easy', missionId: own.id, area: 'discipline', points: 5 }]);
    const after = recordWith({ [DAY]: [own.id] });
    after.missions[DAY][own.id].title = OWN;
    const built: [EventName, Input][] = [
      ['onboarding_completed', { ...onboardingFacts(profile, [], false), goalText: GOAL, goal_text: GOAL }],
      ['first_mission_started', firstStart(emptyRecord(), own, 'discipline')],
      ...provenEvents({ before: emptyRecord(), after, day: DAY, plan: p, mission: own, streak: 1, clock: true, hour: 8, minutes: 45, finished: null }),
      ['mission_swapped', swapFacts('S1', own.id, 'another', 1, 1)],
      ['proof_rejected', rejectFacts(own, [{ id: 'fresh', ok: false }])],
      ['weekly_focus_set', focusFacts({ id: 'other', text: ELSE } as never, false)],
      ['weekly_focus_set', { focus: ELSE, text: ELSE, week: 'this' }],
      ['day_closed', dayClosed(p, after, 45, () => 15)],
    ];
    const events = built.map(([e, input]) => ({ e, p: sanitize(S, e, input ?? {}), ...stamp(DAY, DAY) }));
    const body = JSON.stringify({ s: 1, app: '3.3.0', batch: 'b', events });
    for (const s of [GOAL, OWN, ELSE, 'clothing', 'grandma', 'vaping', own.id, 'lx3k9a12']) expect(body).not.toContain(s);
    expect(events.every(x => x.p !== null)).toBe(true);
    expect(body).toContain('"mission":"custom"');
  });
});
