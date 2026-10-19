// The founder's five users (15 Oct 2026) on the approved library, simulated the way the app plans
// and proves a day: state/store.ts planInput (the approved missions, historyFrom over the record and
// the saved plans, learnFrom over the last four weeks, the plan made at 9 AM, no plan running) and
// every planned mission proven with core/complete as the store records it, so cooldowns, the shown
// gap and what the plan learns move on day by day. One fixed salt per user (the store's installSalt).
// personas.test.ts checks the engine's own rules on the same users; this checks the founder's list.
import { describe, expect, it } from 'vitest';
import { isApproved, MISSION_BY_ID, MISSIONS } from '../../content';
import { completeMission } from '../complete';
import {
  available,
  dayBudget,
  DEFAULT_PROFILE,
  eligibleAreas,
  generatePlan,
  historyFrom,
  longestFor,
  replacementChoices,
  rerollMission,
  serves,
  sizeOf,
  slotsFor,
  type PlanInput,
} from '../missions';
import { kindsOf, learnFrom } from '../personalize';
import { emptyRecord } from '../record';
import { addDays, diffDays, type DayKey } from '../time';
import { missionTitle } from '../titles';
import type { DayPlan, Mission, Profile, RecordState, SwapReason, TrackId } from '../types';

/** The week the founder asked for: Monday 19 to Sunday 25 October 2026. */
const MONDAY: DayKey = '2026-10-19';
/** The hour each day's plan is made (the app plans a day when it's first opened). */
const HOUR = 9;
/** When the day's missions get proven: no clear morning or evening pattern for learnFrom. */
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

interface SimDay {
  day: DayKey;
  plan: DayPlan;
  /** What the store's planInput passed for the day: what swaps that day draw with too. */
  input: PlanInput;
}

/** `days` days from `start`, each planned at 9 AM and every mission in it proven that day. */
function simulate(profile: Profile, salt: string, days: number, start: DayKey = MONDAY): { days: SimDay[]; record: RecordState } {
  let record: RecordState = emptyRecord();
  const plans: Record<DayKey, DayPlan> = {};
  const out: SimDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const input: PlanInput = {
      library: MISSIONS,
      profile,
      day,
      salt,
      history: historyFrom(record.missions ?? {}, plans, {}, day),
      hour: HOUR,
      program: null,
      adapt: learnFrom(plans, record.missions, MISSION_BY_ID, day),
    };
    const plan = generatePlan(input);
    plans[day] = plan;
    plan.missions.forEach((p, k) => {
      const m = MISSION_BY_ID[p.missionId];
      const at = new Date(`${day}T${String(PROOF_HOURS[k] ?? 21).padStart(2, '0')}:00:00`).getTime();
      const verification = { status: 'accepted' as const, method: 'on-device' as const, checks: [], at };
      // As the store's completeMission: the title the user saw goes on the record next to the id.
      record = completeMission(record, day, plan, m, [], verification, { at, verifiedClock: true, title: missionTitle(m, profile) }).record;
    });
    out.push({ day, plan, input });
  }
  return { days: out, record };
}

const salt = (key: Key) => `persona-${key}`;
const weeks = new Map<Key, ReturnType<typeof simulate>>();
const months = new Map<Key, ReturnType<typeof simulate>>();
const week = (key: Key) => weeks.get(key) ?? weeks.set(key, simulate(PEOPLE[key], salt(key), 7)).get(key)!;
const month = (key: Key) => months.get(key) ?? months.set(key, simulate(PEOPLE[key], salt(key), 28)).get(key)!;

/** The mission ids a mission of the day keeps out of the rest of it: itself and its group. */
function blockedBy(id: string): string[] {
  const m = MISSION_BY_ID[id];
  return m?.group ? MISSIONS.filter(x => x.group === m.group).map(x => x.id) : [id];
}

/**
 * Missions that aren't core habits shown the day before again, when another mission of the same
 * area and size, no longer, was free without letting anything back early (the shown gap in
 * core/missions available): "day: id (could have been …)". A support task (Write Your Next 3
 * Project Actions) doesn't count as free while it would be its area's only mission of the day.
 */
function backToBack(days: readonly SimDay[]): string[] {
  const out: string[] = [];
  days.forEach((d, i) => {
    if (i === 0) return;
    const yesterday = new Set(days[i - 1].plan.missions.map(p => p.missionId));
    d.plan.missions.forEach((p, k) => {
      const x = MISSION_BY_ID[p.missionId];
      if (x.anchor || !yesterday.has(x.id)) return;
      const area = p.area as TrackId;
      const others = d.plan.missions.filter((_, j) => j !== k);
      const blocked = new Set(others.flatMap(o => blockedBy(o.missionId)));
      const alone = !others.some(o => o.area === area);
      const free = MISSIONS.filter(
        m =>
          m.id !== x.id &&
          serves(m, area) &&
          sizeOf(m) === sizeOf(x) &&
          m.minutes <= x.minutes &&
          !blocked.has(m.id) &&
          !(alone && m.tags?.includes('support')) &&
          available(m, d.input),
      );
      if (free.length) out.push(`${d.day}: ${x.id} (could have been ${free.map(m => m.id).join(', ')})`);
    });
  });
  return out;
}

describe("the founder's five users, a week each, as the app plans and proves it", () => {
  for (const key of KEYS) {
    const profile = PEOPLE[key];

    it(`User ${key}: two approved missions a day at 45 minutes (one short, one focused), from areas they can get missions from, never three from one area`, () => {
      expect(slotsFor(profile)).toEqual(['easy', 'main']);
      for (const { day, plan } of week(key).days) {
        expect(plan.missions, day).toHaveLength(2);
        const eligible = eligibleAreas(profile, day);
        const perArea: Record<string, number> = {};
        for (const p of plan.missions) {
          expect(isApproved(p.missionId), `${day} ${p.missionId}`).toBe(true);
          const m = MISSION_BY_ID[p.missionId];
          expect(m.source).toBe('UNSETLD');
          expect(eligible, `${day} ${p.missionId}`).toContain(p.area);
          expect(serves(m, p.area as TrackId), `${day} ${p.missionId}`).toBe(true);
          expect(m.minutes).toBeLessThanOrEqual(longestFor(profile));
          perArea[p.area!] = (perArea[p.area!] ?? 0) + 1;
        }
        expect(Math.max(...Object.values(perArea)), day).toBeLessThanOrEqual(2);
      }
    });

    it(`User ${key}: nothing but a core habit two days running while another mission fits`, () => {
      expect(backToBack(week(key).days)).toEqual([]);
      expect(backToBack(month(key).days)).toEqual([]);
    });

    it(`User ${key}: weekly and rarer missions at most once a week, and never again within their cooldown over four weeks`, () => {
      const low = (p: { missionId: string }) => MISSION_BY_ID[p.missionId].frequency === 'low';
      const inWeek = week(key).days.flatMap(d => d.plan.missions.filter(low).map(p => p.missionId));
      expect(inWeek.length, inWeek.join()).toBe(new Set(inWeek).size);
      const last: Record<string, DayKey> = {};
      for (const { day, plan } of month(key).days) {
        for (const p of plan.missions.filter(low)) {
          const m = MISSION_BY_ID[p.missionId];
          if (last[m.id]) expect(diffDays(last[m.id], day), `${m.id} on ${last[m.id]} and ${day}`).toBeGreaterThanOrEqual(Math.max(7, m.cooldownDays));
          last[m.id] = day;
        }
      }
    });
  }

  it('Apply to One Job or Internship (C2) comes up for the two job searches (C, E) and never for A, B or D', () => {
    const c2 = (days: readonly SimDay[]) => days.filter(d => d.plan.missions.some(p => p.missionId === 'C2')).length;
    // Two missions a day at 45 (launch pass): Career holds the focused slot on fewer days, so C2 comes
    // within the first two weeks and at least twice in four, not every week.
    for (const key of ['C', 'E'] as const) {
      expect(c2(month(key).days.slice(0, 14)), key).toBeGreaterThan(0);
      expect(c2(month(key).days), key).toBeGreaterThanOrEqual(2);
    }
    for (const key of ['A', 'B', 'D'] as const) expect(c2(month(key).days), key).toBe(0);
  });
});

describe('their goal in the titles, and on the record', () => {
  /** Every mission each user got in four weeks, with the title they saw and the one the record kept. */
  const shown = (key: Key) =>
    month(key).days.flatMap(({ day, plan }) =>
      plan.missions.map(p => {
        const m = MISSION_BY_ID[p.missionId];
        return { id: m.id, title: missionTitle(m, PEOPLE[key]), kept: month(key).record.missions[day][m.id].title, approved: m.title, inWeek: day <= addDays(MONDAY, 6) };
      }),
    );
  const titlesOf = (key: Key, ids: readonly string[]) => shown(key).filter(x => ids.includes(x.id));

  it('the record keeps the title each user saw, next to the approved id', () => {
    for (const key of KEYS) for (const x of shown(key)) expect(x.kept, `${key} ${x.id}`).toBe(x.title);
  });

  it('B builds a clothing brand: Your Clothing Brand in P1, P2 and P5', () => {
    const want: Record<string, string> = {
      P1: 'Work on Your Clothing Brand for 30 Minutes',
      P2: 'Finish One Small Part of Your Clothing Brand',
      P5: 'Fix One Problem With Your Clothing Brand',
    };
    const got = titlesOf('B', Object.keys(want));
    expect(got.some(x => x.inWeek)).toBe(true);
    for (const x of got) expect(x.title).toBe(want[x.id]);
  });

  it('C looks for a software job and codes: Software Job(s) in C2 and C3, Coding in K1', () => {
    const want: Record<string, string> = {
      C2: 'Apply to One Software Job',
      C3: 'Find 3 Software Jobs Worth Applying To',
      K1: 'Practice Coding for 30 Minutes',
    };
    const got = titlesOf('C', Object.keys(want));
    for (const id of ['C2', 'K1']) expect(got.some(x => x.inWeek && x.id === id), id).toBe(true);
    for (const x of got) expect(x.title).toBe(want[x.id]);
  });

  it('D builds an app and codes: Your App in P1, P2 and P5, Coding in K1', () => {
    const want: Record<string, string> = {
      P1: 'Work on Your App for 30 Minutes',
      P2: 'Finish One Small Part of Your App',
      P5: 'Fix One Problem With Your App',
      K1: 'Practice Coding for 30 Minutes',
    };
    const got = titlesOf('D', Object.keys(want));
    expect(got.some(x => x.inWeek && x.id === 'K1') && got.some(x => x.inWeek && x.id !== 'K1')).toBe(true);
    for (const x of got) expect(x.title).toBe(want[x.id]);
  });

  it("A's goal names no subject and E's no field: every title stays the approved one", () => {
    for (const key of ['A', 'E'] as const) for (const x of shown(key)) expect(x.title, `${key} ${x.id}`).toBe(x.approved);
    expect(shown('A').some(x => MISSION_BY_ID[x.id].track === 'school')).toBe(true);
  });
});

describe('swapping on day 3 (Wednesday), for every reason', () => {
  const REASONS: SwapReason[] = ['another', 'not-relevant', 'cant-today', 'too-easy', 'too-hard', 'already-did'];
  /** The day-3 plan of each user, and for each of its missions what the swap button and each reason give. */
  const swaps = KEYS.flatMap(key => {
    const d = week(key).days[2];
    return d.plan.missions.map((p, index) => ({
      key,
      d,
      index,
      p,
      old: MISSION_BY_ID[p.missionId],
      reroll: rerollMission(d.plan, index, d.input)?.missions[index] ?? null,
      choices: Object.fromEntries(REASONS.map(r => [r, replacementChoices(d.plan, index, d.input, r)])) as Record<SwapReason, ReturnType<typeof replacementChoices>>,
    }));
  });
  const label = (s: (typeof swaps)[number], what: string) => `${s.key} ${s.d.day} ${s.old.id} ${what}`;

  /**
   * Missions of the swapped one's area that the reason allows and that could go in without
   * anything let back early but a recent showing: not in the day (nor a near-twin of what's left
   * in it), within the room and the longest the day hands out, of a size the slot takes. "Too hard"
   * and "Too easy" are about length, so a near-twin of another length counts (Do 20 Minutes of
   * Cardio for Do Your Planned Cardio Today); the other reasons ask for a different kind.
   */
  function sameArea(s: (typeof swaps)[number], reason: SwapReason | 'reroll'): Mission[] {
    const { d, index, old } = s;
    const others = d.plan.missions.filter((_, i) => i !== index);
    const out = new Set([old.id, ...others.flatMap(o => blockedBy(o.missionId))]);
    if (reason === 'not-relevant' || reason === 'cant-today' || reason === 'already-did') for (const id of blockedBy(old.id)) out.add(id);
    const spent = others.reduce((t, o) => t + MISSION_BY_ID[o.missionId].minutes, 0);
    const room = Math.max(old.minutes, dayBudget(d.input.profile) - spent);
    const most = longestFor(d.input.profile);
    const oldKinds = new Set(kindsOf(old));
    const fitsSlot = (m: Mission) => m.minutes <= room && (s.p.slot === 'main' || sizeOf(m) === 'easy');
    const ok = (m: Mission) =>
      reason === 'too-hard'
        ? m.minutes < old.minutes
        : reason === 'too-easy'
          ? m.minutes > old.minutes
          : fitsSlot(m) && (reason !== 'not-relevant' || !kindsOf(m).some(k => oldKinds.has(k)));
    return MISSIONS.filter(m => serves(m, s.p.area as TrackId) && !out.has(m.id) && m.minutes <= most && ok(m) && available(m, d.input, { shown: true }));
  }

  it('every swap and choice is an approved mission from an area the user can get missions from, not one already in the day', () => {
    for (const s of swaps) {
      const eligible = eligibleAreas(s.d.input.profile, s.d.day);
      const rest = s.d.plan.missions.filter((_, i) => i !== s.index).map(p => p.missionId);
      expect(s.reroll, label(s, 'swap')).not.toBeNull();
      for (const [why, picks] of [['swap', [{ mission: MISSION_BY_ID[s.reroll!.missionId], area: s.reroll!.area! }]], ...Object.entries(s.choices)] as const) {
        // "Too hard" on one of the shortest missions can leave nothing shorter to offer.
        if (why !== 'too-hard') expect(picks.length, label(s, why)).toBeGreaterThan(0);
        for (const c of picks) {
          expect(isApproved(c.mission.id), label(s, `${why} ${c.mission.id}`)).toBe(true);
          expect(eligible, label(s, `${why} ${c.mission.id}`)).toContain(c.area);
          expect(rest, label(s, `${why} ${c.mission.id}`)).not.toContain(c.mission.id);
          expect(c.mission.id, label(s, why)).not.toBe(s.old.id);
        }
      }
    }
  });

  it('the swap button and every reason stay in the same area first when it has a mission that fits', () => {
    const wrong: string[] = [];
    for (const s of swaps) {
      if (sameArea(s, 'reroll').length && s.reroll!.area !== s.p.area) wrong.push(label(s, `swap → ${s.reroll!.missionId} (${s.reroll!.area})`));
      for (const r of REASONS) {
        const first = s.choices[r][0];
        const fits = sameArea(s, r);
        if (fits.length && first?.area !== s.p.area) wrong.push(label(s, `${r} → ${first?.mission.id} (${first?.area}) while ${s.p.area} has ${fits.map(m => m.id).join(', ')}`));
      }
    }
    expect(wrong).toEqual([]);
  });

  it('"Too hard" offers only missions shorter than the one it replaces', () => {
    const longer = swaps.flatMap(s => s.choices['too-hard'].filter(c => c.mission.minutes >= s.old.minutes).map(c => label(s, `(${s.old.minutes} min) → ${c.mission.id} (${c.mission.minutes} min)`)));
    expect(longer).toEqual([]);
  });

  it('a swap never brings back a mission still in its cooldown (done lately, or a weekly one shown lately)', () => {
    const early: string[] = [];
    for (const s of swaps) {
      const picks = [...(s.reroll ? [['swap', s.reroll.missionId]] : []), ...REASONS.flatMap(r => s.choices[r].map(c => [r, c.mission.id]))];
      for (const [why, id] of picks) {
        const m = MISSION_BY_ID[id];
        if (!available(m, s.d.input, { shown: true, skips: true })) early.push(label(s, `${why} → ${id} (done ${s.d.input.history.lastDone[id] ?? '-'}, cooldown ${m.cooldownDays})`));
      }
    }
    expect(early).toEqual([]);
  });
});

describe('User A on shorter days', () => {
  for (const minutes of [15, 30] as const) {
    it(`${minutes} minutes: ${minutes === 15 ? 'one approved mission' : 'two approved missions'} a day from their areas, nothing but a core habit two days running while another fits`, () => {
      const profile: Profile = { ...PEOPLE.A, minutes };
      const run = simulate(profile, salt('A'), 7);
      for (const { day, plan } of run.days) {
        expect(plan.missions, day).toHaveLength(minutes === 15 ? 1 : 2);
        for (const p of plan.missions) {
          expect(isApproved(p.missionId)).toBe(true);
          expect(eligibleAreas(profile, day)).toContain(p.area);
        }
      }
      expect(backToBack(run.days)).toEqual([]);
    });
  }
});
