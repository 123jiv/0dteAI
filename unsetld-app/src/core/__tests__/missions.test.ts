import { describe, expect, it } from 'vitest';
import { completeMission, provenInPlan } from '../complete';
import { addSkip, DEFAULT_PROFILE, generatePlan, historyFrom, meetsRequirements, rerollMission, slotTracks, SLOTS_BY_INTENSITY, type MissionHistory, type PlanInput } from '../missions';
import { programDay, programMissions, programProgress, startProgram } from '../programs';
import { clearPhotos, fingerprint, photosToClear, usedHashes } from '../proofs';
import { completion, levelFor, levelStart, milestones, totals, trackProgress } from '../progress';
import { emptyRecord } from '../record';
import { reviewWeekFor, weekStart, weeklyReview } from '../review';
import { balance, effectiveTiers, isAvailable, nextReward, redeem, rewardStatus } from '../rewards';
import { computeStreak } from '../streak';
import { addDays, type DayKey } from '../time';
import { clock, elapsedSeconds, endsAt, pauseTimer, remainingSeconds, resumeTimer, startTimer, timerDone } from '../timer';
import type { DayPlan, Mission, MissionSlot, Profile, Program, ProofPhoto, RecordState, RewardTier, TrackId, Verification } from '../types';
import { localChecks } from '../verify';

const POINTS: Record<MissionSlot, [1 | 2 | 3, number]> = { quick: [1, 10], progress: [2, 15], challenge: [3, 25] };
let n = 0;
function m(track: TrackId, slot: MissionSlot, extra: Partial<Mission> = {}): Mission {
  n += 1;
  const [difficulty, points] = POINTS[slot];
  return {
    id: `${track}-m${n}`,
    track,
    slot,
    title: `Mission ${n}`,
    short: 'Do it.',
    why: 'Because.',
    how: ['One.', 'Two.'],
    proof: 'The result.',
    proofType: 'PHOTO',
    points,
    difficulty,
    minutes: slot === 'quick' ? 5 : slot === 'progress' ? 20 : 40,
    cooldownDays: 7,
    repeatable: true,
    tags: ['t'],
    active: true,
    ...extra,
  };
}
const TRACKS: TrackId[] = ['focus', 'fitness', 'school', 'money', 'skills', 'reset', 'mindset'];
const LIB: Mission[] = TRACKS.flatMap(t => [
  ...Array.from({ length: 6 }, () => m(t, 'quick')),
  ...Array.from({ length: 8 }, () => m(t, 'progress')),
  ...Array.from({ length: 6 }, () => m(t, 'challenge')),
]);
const NO_HISTORY: MissionHistory = { lastDone: {}, lastPlanned: {}, skips: {} };
const profile = (p: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, tracks: ['focus', 'school', 'fitness'], ...p });
const input = (p: Partial<PlanInput> = {}): PlanInput => ({ library: LIB, profile: profile(), day: '2026-10-09', salt: 's', history: NO_HISTORY, ...p });
const byId = new Map(LIB.map(x => [x.id, x]));
const accepted: Verification = { status: 'accepted', method: 'on-device', checks: [], at: 0 };
const photo = (hash: string, kind: ProofPhoto['kind'] = 'single', takenAt = 1000): ProofPhoto => ({ uri: `file://${hash}`, takenAt, kind, hash });

describe('daily missions', () => {
  it('gives a quick win, a progress mission and a challenge from the chosen tracks', () => {
    const plan = generatePlan(input());
    expect(plan.missions.map(p => p.slot)).toEqual(['quick', 'progress', 'challenge']);
    for (const p of plan.missions) expect(['focus', 'school', 'fitness']).toContain(byId.get(p.missionId)!.track);
    expect(new Set(plan.missions.map(p => p.missionId)).size).toBe(3);
  });

  it('is the same plan for the same day and input, and a different one tomorrow', () => {
    expect(generatePlan(input())).toEqual(generatePlan(input()));
    const a = generatePlan(input()).missions.map(p => p.missionId).join();
    const b = generatePlan(input({ day: '2026-10-10' })).missions.map(p => p.missionId).join();
    expect(a).not.toBe(b);
  });

  it('follows intensity: easy is three easier missions, push adds a second challenge', () => {
    expect(generatePlan(input({ profile: profile({ intensity: 'easy' }) })).missions.map(p => p.slot)).toEqual(SLOTS_BY_INTENSITY.easy);
    expect(generatePlan(input({ profile: profile({ intensity: 'push', minutes: 90 }) })).missions.map(p => p.slot)).toEqual(SLOTS_BY_INTENSITY.push);
  });

  it('keeps a short day short: with 5–15 minutes the plan fits about 20 minutes', () => {
    const plan = generatePlan(input({ profile: profile({ minutes: 15 }) }));
    const total = plan.missions.reduce((t, p) => t + byId.get(p.missionId)!.minutes, 0);
    expect(total).toBeLessThanOrEqual(30);
    expect(plan.missions.length).toBe(3);
  });

  it('respects requirements: no gym missions without a gym, no work missions without a job, 18+ only when known', () => {
    const p = profile({ gym: null, work: false, age: 'u16' });
    expect(meetsRequirements(['gym'], p)).toBe(false);
    expect(meetsRequirements(['work'], p)).toBe(false);
    expect(meetsRequirements(['age16'], p)).toBe(false);
    expect(meetsRequirements(['school'], p)).toBe(true);
    expect(meetsRequirements(['age18'], profile({ age: null }))).toBe(false);
    expect(meetsRequirements(['age16'], profile({ age: null }))).toBe(true);
    const gymOnly = LIB.map(x => (x.track === 'fitness' ? { ...x, requires: ['gym' as const] } : x));
    for (let i = 0; i < 10; i++) {
      const plan = generatePlan(input({ library: gymOnly, day: addDays('2026-10-09', i), profile: p }));
      for (const x of plan.missions) expect(gymOnly.find(y => y.id === x.missionId)!.requires ?? []).not.toContain('gym');
    }
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
    const anchor = m('focus', 'quick', { id: 'focus-anchor', anchor: true, cooldownDays: 1 });
    const lib = [anchor, ...LIB];
    let seen = 0;
    let lastPlanned: Record<string, DayKey> = {};
    for (let i = 0; i < 30; i++) {
      const day = addDays('2026-10-01', i);
      const plan = generatePlan(input({ library: lib, day, profile: profile({ tracks: ['focus'] }), history: { ...NO_HISTORY, lastPlanned } }));
      if (plan.missions.some(p => p.missionId === 'focus-anchor')) seen += 1;
      lastPlanned = { ...lastPlanned, ...Object.fromEntries(plan.missions.map(p => [p.missionId, day])) };
    }
    expect(seen).toBeGreaterThan(2);
  });

  it('swaps a mission for another in the same slot and never brings back what was swapped out', () => {
    const plan = generatePlan(input());
    const next = rerollMission(plan, 0, input())!;
    expect(next.rerolls).toBe(1);
    expect(next.replaced).toEqual([plan.missions[0].missionId]);
    expect(next.missions[0].missionId).not.toBe(plan.missions[0].missionId);
    expect(next.missions[0].slot).toBe('quick');
    expect(next.missions.slice(1)).toEqual(plan.missions.slice(1));
    const again = rerollMission(next, 0, input())!;
    expect([plan.missions[0].missionId, next.missions[0].missionId]).not.toContain(again.missions[0].missionId);
  });

  it('keeps skipped missions away for weeks', () => {
    const plan = generatePlan(input());
    const id = plan.missions[0].missionId;
    const history = { ...NO_HISTORY, skips: addSkip({}, id, '2026-10-09') };
    for (let i = 1; i < 21; i++) expect(generatePlan(input({ day: addDays('2026-10-09', i), history })).missions.map(p => p.missionId)).not.toContain(id);
  });

  it('puts the priority track on the progress slot most days', () => {
    let hits = 0;
    for (let i = 0; i < 30; i++) {
      const t = slotTracks(profile({ priority: 'fitness' }), SLOTS_BY_INTENSITY.lockin, addDays('2026-10-01', i));
      if (t[1] === 'fitness') hits += 1;
      expect(new Set(t).size).toBe(3);
    }
    expect(hits).toBeGreaterThanOrEqual(19);
  });

  it("places a program's missions first", () => {
    const ids = [LIB.find(x => x.track === 'money' && x.slot === 'progress')!.id];
    const plan = generatePlan(input({ program: { id: 'p', missionIds: ids } }));
    expect(plan.missions.find(p => p.missionId === ids[0])).toMatchObject({ slot: 'progress', programId: 'p' });
    expect(plan.missions.length).toBe(3);
  });

  it('builds history from proven missions and earlier plans', () => {
    const plans = { '2026-10-08': { day: '2026-10-08', missions: [{ slot: 'quick' as const, missionId: 'a' }], rerolls: 0, replaced: [] } };
    const h = historyFrom({ '2026-10-07': { b: { missionId: 'b' } } }, plans, {}, '2026-10-09');
    expect(h.lastDone).toEqual({ b: '2026-10-07' });
    expect(h.lastPlanned).toEqual({ a: '2026-10-08' });
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
      expect(c.bonus).toBe(i === 2 ? 15 : 0);
    });
    expect(r.days[plan.day]).toEqual({ verified: true });
    expect(provenInPlan(r, plan)).toBe(3);
    expect(balance(r)).toBe(10 + 15 + 25 + 15);
    // Proving one again earns nothing.
    const again = completeMission(r, plan.day, plan, byId.get(plan.missions[0].missionId)!, [photo('h9')], accepted, { at: 9, verifiedClock: true });
    expect(again.points).toBe(0);
    expect(balance(again.record)).toBe(balance(r));
  });

  it('a rejected proof earns nothing and does not count as a day', () => {
    const rejected: Verification = { ...accepted, status: 'rejected' };
    const c = completeMission(emptyRecord(), '2026-10-09', null, LIB[0], [photo('x')], rejected, { at: 0, verifiedClock: true });
    expect(c.points).toBe(0);
    expect(c.record.days['2026-10-09']).toBeUndefined();
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
    const q = LIB.find(x => x.track === 'focus' && x.slot === 'challenge')!;
    const entries = Array.from({ length: 10 }, (_, i) => ({ day: addDays('2026-10-01', i), mission: q, timer: 1500, hash: `t${i}` }));
    const r = recordWith(entries);
    expect(totals(r)).toMatchObject({ missions: 10, points: 250, focusMinutes: 250, activeDays: 10 });
    expect(trackProgress(r).focus).toMatchObject({ xp: 250, missions: 10, level: 3 });
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
    const f = LIB.find(x => x.track === 'focus' && x.slot === 'progress')!;
    const s = LIB.find(x => x.track === 'skills' && x.slot === 'quick')!;
    const r = recordWith([
      { day: '2026-10-05', mission: f, timer: 1500 },
      { day: '2026-10-06', mission: f, timer: 1500 },
      { day: '2026-10-07', mission: s },
    ]);
    const plans: Record<DayKey, DayPlan> = { '2026-10-05': { day: '2026-10-05', missions: [{ slot: 'quick', missionId: 'x' }, { slot: 'progress', missionId: f.id }, { slot: 'challenge', missionId: 'y' }], rerolls: 0, replaced: [] } };
    const w = weeklyReview(r, plans, { tracks: ['focus', 'skills', 'fitness'] }, '2026-10-05');
    expect(w).toMatchObject({ missions: 3, focusMinutes: 50, points: 40, activeDays: 3, strongest: 'focus', ignored: 'fitness' });
    expect(completion(r, plans, '2026-10-05', '2026-10-11')).toEqual({ done: 3, planned: 3 });
  });
});

describe('rewards', () => {
  const tiers: RewardTier[] = [
    { id: 'ship', title: 'Free shipping', detail: '', type: 'free-shipping', points: 300, active: true, codeValidDays: 30, perCollection: 1 },
    { id: 'ten', title: '10% off', detail: '', type: 'discount', points: 600, percent: 10, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1 },
    { id: 'off', title: 'Off', detail: '', type: 'limited', points: 100, active: false, codeValidDays: 30, perCollection: 1 },
    { id: 'gone', title: 'Gone', detail: '', type: 'limited', points: 100, active: true, inventory: 0, codeValidDays: 30, perCollection: 1 },
    { id: 'later', title: 'Later', detail: '', type: 'drop', points: 100, active: true, availableFrom: '2027-01-01', codeValidDays: 30, perCollection: 1 },
  ];
  const r450: RecordState = { ...emptyRecord(), legacyPoints: 450 };
  it('shows how close the next reward is', () => {
    expect(nextReward(r450, tiers, '004', '2026-10-09')).toMatchObject({ tier: { id: 'ten' }, have: 450, need: 150, ready: false });
    expect(rewardStatus(r450, tiers[0], '004', '2026-10-09')).toBe('ready');
    for (const t of tiers.slice(2)) expect(isAvailable(t, '2026-10-09')).toBe(false);
  });

  it('spends points once per collection and takes the server list when there is one', () => {
    const r = redeem(r450, tiers[0], '004', '2026-10-09', { code: 'C', url: 'u' });
    expect(balance(r)).toBe(150);
    expect(r.redemptions[0]).toMatchObject({ rewardId: 'ship', expires: '2026-11-08' });
    expect(rewardStatus(r, tiers[0], '004', '2026-10-09')).toBe('used');
    expect(rewardStatus(r, tiers[0], '005', '2026-10-09')).toBe('short');
    expect(effectiveTiers(tiers, null)).toHaveLength(5);
    expect(effectiveTiers(tiers, [tiers[1]])).toEqual([tiers[1]]);
  });
});

describe('programs', () => {
  const p: Program = { id: 'lock', title: '7 Day Lock In', short: '', days: 3, tracks: ['focus'], free: true, plan: [['a'], ['b'], ['c']] };
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
