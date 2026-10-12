// Reward rules from configuration (minimum purchase, cooldown, one time only, the alias
// names), "up next", and UNSETLD status: a discount code for each tier of active days, from
// content/milestones.json or the config (docs/ACCESS.md).
import { describe, expect, it } from 'vitest';
import configJson from '../../../Web/api/app/config.json';
import milestonesJson from '../../content/milestones.json';
import rewardsJson from '../../content/rewards.json';
import { emptyRecord, markLetterShown, recordDay } from '../record';
import {
  balance,
  cooldownEnds,
  cooldownLeft,
  effectiveStatus,
  letterTier,
  nextReward,
  nextStatus,
  parseRewardTier,
  parseRewards,
  parseStatus,
  parseStatusTier,
  pendingStatusLetter,
  pointsSpent,
  redeem,
  rewardStatus,
  roadAt,
  statusDays,
  statusFromMilestones,
  statusReward,
  statusState,
  statusTaken,
  upNext,
} from '../rewards';
import { addDays } from '../time';
import type { CodeClaim, MissionDone, RecordState, RewardTier } from '../types';

const DEFAULTS = statusFromMilestones(milestonesJson);
const TODAY = '2026-10-14';

const tier = (over: Partial<RewardTier> = {}): RewardTier => ({
  id: 'ten-off',
  title: '10% off',
  detail: 'One order at unsetld.com.',
  type: 'discount',
  points: 600,
  percent: 10,
  maxOff: 25,
  active: true,
  availableFrom: null,
  availableUntil: null,
  codeValidDays: 30,
  inventory: null,
  perCollection: 1,
  ...over,
});
const withPoints = (n: number): RecordState => ({ ...emptyRecord(), legacyPoints: n });
const take = (r: RecordState, t: RewardTier, day: string, collection = '004') => redeem({ ...r, legacyPoints: (r.legacyPoints ?? 0) + t.points }, t, collection, day, { code: 'C', url: 'u' });

/** `n` days in a row on record from `start`. */
function onRecord(r: RecordState, start: string, n: number): RecordState {
  let out = r;
  for (let i = 0; i < n; i++) out = recordDay(out, addDays(start, i), true);
  return out;
}

describe('reward config: names and rule fields', () => {
  const canonical = {
    id: 'ten-off',
    title: '10% off',
    detail: 'One order at unsetld.com.',
    type: 'discount',
    points: 600,
    percent: 10,
    maxOff: 25,
    availableFrom: '2026-10-01',
    availableUntil: '2026-12-31',
  };
  const aliased = {
    id: 'ten-off',
    title: '10% off',
    detail: 'One order at unsetld.com.',
    rewardType: 'discount',
    pointsRequired: 600,
    discountPercent: 10,
    maxDiscount: 25,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
  };

  it('reads the alias names the same as the canonical ones', () => {
    expect(parseRewardTier(aliased)).toEqual(parseRewardTier(canonical));
    expect(parseRewardTier(aliased)).toMatchObject({ type: 'discount', points: 600, percent: 10, maxOff: 25, availableFrom: '2026-10-01', availableUntil: '2026-12-31' });
    expect(parseRewardTier({ ...canonical, redemptionCooldown: 14 })).toMatchObject({ redemptionCooldownDays: 14 });
  });

  it('lets the canonical name win when both are sent', () => {
    const both = { ...canonical, pointsRequired: 900, rewardType: 'free-shipping', discountPercent: 50, maxDiscount: 99, startDate: '2027-01-01', endDate: '2027-02-01', redemptionCooldown: 3, redemptionCooldownDays: 7 };
    expect(parseRewardTier(both)).toMatchObject({ points: 600, type: 'discount', percent: 10, maxOff: 25, availableFrom: '2026-10-01', availableUntil: '2026-12-31', redemptionCooldownDays: 7 });
    // A bad alias next to a good canonical value doesn't matter; a bad alias alone does.
    expect(parseRewardTier({ ...canonical, pointsRequired: 'lots' })).not.toBeNull();
    const { points: _p, ...noPoints } = canonical;
    expect(parseRewardTier({ ...noPoints, pointsRequired: 'lots' })).toBeNull();
  });

  it('reads minimumPurchase, redemptionCooldownDays and oneTimeOnly, and keeps them only when sent', () => {
    expect(parseRewardTier({ ...canonical, minimumPurchase: 50, redemptionCooldownDays: 14, oneTimeOnly: true })).toMatchObject({
      minimumPurchase: 50,
      redemptionCooldownDays: 14,
      oneTimeOnly: true,
    });
    expect(parseRewardTier({ ...canonical, minimumPurchase: null, redemptionCooldownDays: null, oneTimeOnly: false })).toMatchObject({
      minimumPurchase: null,
      redemptionCooldownDays: null,
      oneTimeOnly: false,
    });
    const plain = parseRewardTier(canonical)!;
    for (const k of ['minimumPurchase', 'redemptionCooldownDays', 'oneTimeOnly']) expect(plain).not.toHaveProperty(k);
  });

  it('drops a tier with a bad rule field', () => {
    for (const bad of [{ minimumPurchase: -5 }, { minimumPurchase: '50' }, { minimumPurchase: Infinity }, { redemptionCooldownDays: -1 }, { redemptionCooldownDays: 1.5 }, { oneTimeOnly: 'yes' }]) {
      expect(parseRewardTier({ ...canonical, ...bad })).toBeNull();
    }
    // 0 days is no cooldown and $0 no minimum, not an error that drops the reward.
    expect(parseRewardTier({ ...canonical, redemptionCooldownDays: 0 })).toMatchObject({ redemptionCooldownDays: 0 });
    expect(parseRewardTier({ ...canonical, minimumPurchase: 0 })).toMatchObject({ minimumPurchase: 0 });
  });

  it('accepts the shipped defaults and the site config as they are', () => {
    expect(parseRewards(rewardsJson)).toEqual(rewardsJson);
    expect(parseRewards(configJson.rewards)).toEqual(configJson.rewards);
  });
});

describe('reward rules', () => {
  it('a one-time reward is used for good once taken, in any collection', () => {
    const once = tier({ oneTimeOnly: true });
    const r = take(withPoints(2000), once, '2026-10-01');
    expect(rewardStatus(r, once, '004', TODAY)).toBe('used');
    expect(rewardStatus(r, once, '005', TODAY)).toBe('used');
    expect(rewardStatus(r, once, '009', '2027-10-01')).toBe('used');
    // Without the flag, the next collection opens it again.
    expect(rewardStatus(r, tier(), '005', TODAY)).toBe('ready');
    // A 2.x code with the same percent counts as taking it.
    const code: CodeClaim = { day: '2026-09-01', collection: '003', points: 600, percent: 10, code: 'OLD', url: 'u', expires: '2026-10-01' };
    expect(rewardStatus({ ...withPoints(2000), codes: [code] }, once, '004', TODAY)).toBe('used');
    expect(nextReward(r, [once], '005', TODAY)).toBeNull();
  });

  it('cools down for its days after each code, then opens', () => {
    const cool = tier({ perCollection: 3, redemptionCooldownDays: 7 });
    const r = take(withPoints(2000), cool, '2026-10-10');
    expect(rewardStatus(r, cool, '004', '2026-10-10')).toBe('cooldown');
    expect(cooldownLeft(r, cool, '2026-10-10')).toBe(7);
    expect(rewardStatus(r, cool, '004', '2026-10-16')).toBe('cooldown');
    expect(cooldownLeft(r, cool, '2026-10-16')).toBe(1);
    expect(cooldownEnds(r, cool, '2026-10-16')).toBe('2026-10-17');
    expect(rewardStatus(r, cool, '004', '2026-10-17')).toBe('ready');
    expect(cooldownEnds(r, cool, '2026-10-17')).toBeNull();
    // A new collection doesn't skip the wait.
    expect(rewardStatus(r, cool, '005', '2026-10-12')).toBe('cooldown');
    // The last code counts: two codes, the wait runs from the second.
    const again = take(r, cool, '2026-10-20');
    expect(rewardStatus(again, cool, '004', '2026-10-25')).toBe('cooldown');
    expect(rewardStatus(again, cool, '004', '2026-10-27')).toBe('ready');
    // A clock set back waits the full cooldown, no longer.
    expect(cooldownLeft(r, cool, '2026-10-01')).toBe(7);
    // No cooldown, or 0 days: nothing to wait for.
    expect(cooldownLeft(r, tier({ perCollection: 3 }), '2026-10-10')).toBe(0);
    expect(cooldownLeft(r, tier({ perCollection: 3, redemptionCooldownDays: 0 }), '2026-10-10')).toBe(0);
  });

  it('shows used before cooldown, and leaves both out of the next reward', () => {
    const cool = tier({ redemptionCooldownDays: 30 });
    const r = take(withPoints(2000), cool, '2026-10-10');
    expect(rewardStatus(r, cool, '004', '2026-10-12')).toBe('used');
    const five = tier({ id: 'five-off', title: '5% off', points: 300, percent: 5 });
    const coolFive = { ...five, perCollection: 2, redemptionCooldownDays: 30 };
    const r2 = take(r, coolFive, '2026-10-11');
    expect(rewardStatus(r2, coolFive, '004', '2026-10-12')).toBe('cooldown');
    expect(nextReward(r2, [cool, coolFive], '004', '2026-10-12')).toBeNull();
    // Inactive still wins over everything.
    expect(rewardStatus(r2, { ...coolFive, active: false }, '004', '2026-10-12')).toBe('unavailable');
  });

  it('lists the two open tiers after the next reward as up next', () => {
    const tiers = [
      tier({ id: 'five-off', points: 300, percent: 5 }),
      tier({ id: 'ten-off', points: 600, percent: 10 }),
      tier({ id: 'fifteen-off', points: 1000, percent: 15 }),
      tier({ id: 'twenty-off', points: 1500, percent: 20 }),
      tier({ id: 'thirty-off', points: 2000, percent: 30, active: false }),
    ];
    // 380 points: 5% off is in reach, so it's next; the two after it are up next.
    const r380 = withPoints(380);
    const next = nextReward(r380, tiers, '004', TODAY)!;
    expect(next.tier.id).toBe('five-off');
    expect(upNext(r380, tiers, '004', TODAY, next.tier).map(t => t.id)).toEqual(['ten-off', 'fifteen-off']);
    // 5% taken: 10% off is next, then 15% and 20%; the switched-off tier never shows.
    const took = redeem(r380, tiers[0], '004', TODAY, { code: 'C', url: 'u' });
    const n2 = nextReward(took, tiers, '004', TODAY)!;
    expect(n2).toMatchObject({ tier: { id: 'ten-off' }, have: 80, need: 520 });
    expect(upNext(took, tiers, '004', TODAY, n2.tier).map(t => t.id)).toEqual(['fifteen-off', 'twenty-off']);
    // Near the top there's less to show.
    expect(upNext(withPoints(1600), tiers, '004', TODAY, tiers[3])).toEqual([]);
    expect(upNext(withPoints(0), tiers, '004', TODAY, null, 1).map(t => t.id)).toEqual(['five-off']);
  });
});

describe('status config', () => {
  it('builds the four discount tiers from milestones.json', () => {
    expect(DEFAULTS.map(t => [t.id, t.day, t.percent, t.maxOff, t.codeValidDays, t.active])).toEqual([
      ['status-7', 7, 10, 25, 30, true],
      ['status-30', 30, 15, 25, 30, true],
      ['status-90', 90, 20, 25, 30, true],
      ['status-365', 365, 25, 25, 30, true],
    ]);
    for (const t of DEFAULTS) {
      expect(t.title).toBe(`${t.percent}% off`);
      expect(t.short).toBe(`${t.percent}% off your next order, up to $25.`);
      expect(t.detail).toBeTruthy();
      for (const k of ['pausable', 'action', 'letter']) expect(t).not.toHaveProperty(k);
    }
  });

  it('reads a tier from the config, with defaults for what it leaves out, and no special ids', () => {
    expect(parseStatusTier({ id: 'status-7', activeDays: 10, title: '10% off', discountPercent: 10 })).toEqual({
      id: 'status-7',
      day: 10,
      title: '10% off',
      short: '',
      detail: '',
      active: true,
      percent: 10,
      maxOff: null,
      codeValidDays: 30,
    });
    expect(parseStatusTier({ id: ' x ', day: 14, title: ' 12% off ', percent: 12, maxDiscount: 30, codeValidDays: 14, short: ' One line. ', detail: ' More. ', active: false })).toEqual({
      id: 'x',
      day: 14,
      title: '12% off',
      short: 'One line.',
      detail: 'More.',
      active: false,
      percent: 12,
      maxOff: 30,
      codeValidDays: 14,
    });
    expect(parseStatusTier({ id: 'x', day: 14, title: 'X', percent: 12, maxOff: null })).toMatchObject({ maxOff: null });
  });

  it('lets the canonical name win over its alias, and drops bad entries', () => {
    expect(parseStatusTier({ id: 'x', day: 30, activeDays: 40, title: 'X', percent: 10, discountPercent: 20, maxOff: 25, maxDiscount: 50 })).toMatchObject({ day: 30, percent: 10, maxOff: 25 });
    const good = { id: 'x', day: 30, title: 'X', percent: 15 };
    const bads = [
      { id: '' },
      { day: 0 },
      { day: 2.5 },
      { day: '30' },
      { title: 'x'.repeat(41) },
      { percent: undefined },
      { percent: 0 },
      { percent: 91 },
      { percent: 12.5 },
      { percent: '10' },
      { short: 3 },
      { detail: false },
      { active: 'yes' },
      { maxOff: 0 },
      { maxOff: -5 },
      { maxOff: '25' },
      { codeValidDays: 0 },
      { codeValidDays: 1.5 },
    ];
    for (const bad of bads) expect(parseStatusTier({ ...good, ...bad })).toBeNull();
    for (const raw of [null, 'status-7', 90, [good]]) expect(parseStatusTier(raw)).toBeNull();
    expect(parseStatus([good, { ...good, title: 'Again' }, { id: 'y' }])).toEqual([
      { id: 'x', day: 30, title: 'X', short: '', detail: '', active: true, percent: 15, maxOff: null, codeValidDays: 30 },
    ]);
    expect(parseStatus([])).toBeNull();
    expect(parseStatus(undefined)).toBeNull();
    expect(parseStatus({ status: [good] })).toBeNull();
  });

  it("reads an earlier build's tiers (early access, the patch, the 365 piece) as nothing usable", () => {
    const old = [
      { id: 'early-access', day: 7, title: 'Early access', short: '', detail: '', active: true, pausable: true, action: 'Turn on drop alerts' },
      { id: 'patch', day: 90, title: 'The patch', active: true, pausable: false },
      { id: 'piece-365', day: 365, title: 'The 365 piece', active: true, pausable: false },
    ];
    expect(parseStatus(old)).toBeNull();
    expect(effectiveStatus(DEFAULTS, parseStatus(old))).toEqual(DEFAULTS);
  });

  it("reads the site's config as the built-in tiers", () => {
    expect(parseStatus(configJson.status)).toEqual(DEFAULTS);
    // Parsing a parsed list changes nothing (the store reads a saved list again on launch).
    expect(parseStatus(DEFAULTS)).toEqual(DEFAULTS);
  });

  it('uses the server list when sent, switched-on tiers only, by day', () => {
    expect(effectiveStatus(DEFAULTS, null)).toEqual(DEFAULTS);
    const remote = parseStatus([
      { id: 'status-365', day: 365, title: '25% off', percent: 25, active: false },
      { id: 'status-60', day: 60, title: '18% off', percent: 18 },
      { id: 'status-7', day: 7, title: '10% off', percent: 10 },
    ]);
    expect(effectiveStatus(DEFAULTS, remote).map(t => t.id)).toEqual(['status-7', 'status-60']);
    expect(effectiveStatus(DEFAULTS, [])).toEqual(DEFAULTS);
  });
});

const byId = (id: string) => DEFAULTS.find(t => t.id === id)!;
/** `n` days in a row on record from 1 Jan 2025. */
const at = (n: number) => onRecord(emptyRecord(), '2025-01-01', n);
/** The day the `n`th of those days falls on. */
const dayOf = (n: number) => addDays('2025-01-01', n - 1);

describe('status rewards', () => {
  it('turns a tier into a one-time discount for no points', () => {
    expect(statusReward(byId('status-30'))).toEqual({
      id: 'status-30',
      title: '15% off',
      detail: '15% off your next order, up to $25.',
      type: 'discount',
      points: 0,
      percent: 15,
      maxOff: 25,
      active: true,
      codeValidDays: 30,
      perCollection: 1,
      oneTimeOnly: true,
    });
    // No cap: no maxOff.
    expect(statusReward({ ...byId('status-7'), maxOff: null })).not.toHaveProperty('maxOff');
  });

  it('takes the code through redeem: taken, for 0 points, with the balance as it was', () => {
    const r: RecordState = { ...at(7), legacyPoints: 450 };
    const t = byId('status-7');
    expect(statusState(r, t, dayOf(7))).toEqual({ kind: 'ready' });
    expect(rewardStatus(r, statusReward(t), '004', dayOf(7))).toBe('ready');
    const took = redeem(r, statusReward(t), '004', dayOf(7), { code: 'UNSETLD10-ABC123', url: 'u' });
    expect(took.redemptions).toEqual([{ rewardId: 'status-7', points: 0, collection: '004', day: '2025-01-07', code: 'UNSETLD10-ABC123', url: 'u', expires: '2025-02-06' }]);
    expect(balance(took)).toBe(450);
    expect(pointsSpent(took)).toBe(0);
    expect(statusTaken(took, t)).toBe(true);
    expect(statusTaken(took, byId('status-30'))).toBe(false);
    expect(statusState(took, t, dayOf(7))).toEqual({ kind: 'taken', code: took.redemptions[0], expired: false });
    expect(statusState(took, t, '2025-02-06')).toMatchObject({ kind: 'taken', expired: false });
    expect(statusState(took, t, '2025-02-07')).toMatchObject({ kind: 'taken', expired: true });
    // Once per person, in any collection.
    expect(rewardStatus(took, statusReward(t), '005', '2025-06-01')).toBe('used');
  });

  it("isn't used up by a 2.x code with the same percent (those were bought with points)", () => {
    const code: CodeClaim = { day: '2024-12-01', collection: '004', points: 600, percent: 10, code: 'OLD', url: 'u', expires: '2024-12-31' };
    const r: RecordState = { ...at(7), codes: [code], legacyPoints: 2000 };
    expect(rewardStatus(r, statusReward(byId('status-7')), '004', dayOf(7))).toBe('ready');
    expect(statusState(r, byId('status-7'), dayOf(7))).toEqual({ kind: 'ready' });
    // A points tier with that percent still counts it.
    expect(rewardStatus(r, tier(), '004', dayOf(7))).toBe('used');
  });
});

describe('status on the record', () => {
  const proven = (id: string, day: string): MissionDone => ({
    missionId: id,
    slot: 'main',
    track: 'school',
    points: 10,
    doneAt: Date.parse(`${day}T12:00:00Z`),
    photos: [],
    verification: { status: 'accepted', method: 'on-device', checks: [], at: Date.parse(`${day}T12:00:00Z`) },
  });

  it('counts active days: days on record and days with a proven mission, each once', () => {
    expect(statusDays(emptyRecord())).toBe(0);
    const r: RecordState = {
      ...at(5),
      missions: {
        '2025-01-05': { a: proven('a', '2025-01-05') },
        '2025-02-01': { a: proven('a', '2025-02-01') },
        '2025-02-02': { b: { ...proven('b', '2025-02-02'), verification: { status: 'rejected', method: 'on-device', checks: [], at: 0 } } },
      },
    };
    expect(statusDays(r)).toBe(6);
  });

  it('locks a tier until its day, then it is ready, and a long gap takes nothing away', () => {
    expect(statusState(emptyRecord(), byId('status-365'), TODAY)).toEqual({ kind: 'locked', daysLeft: 365 });
    expect(statusState(at(6), byId('status-7'), dayOf(6))).toEqual({ kind: 'locked', daysLeft: 1 });
    expect(statusState(at(7), byId('status-7'), dayOf(7))).toEqual({ kind: 'ready' });
    expect(statusState(at(7), byId('status-30'), dayOf(7))).toEqual({ kind: 'locked', daysLeft: 23 });
    // Months without a proven mission: still ready (status never pauses).
    expect(statusState(at(7), byId('status-7'), '2025-09-01')).toEqual({ kind: 'ready' });
  });

  it('keeps a code taken as taken, even if the config later moves the tier past the days', () => {
    const t = byId('status-7');
    const took = redeem(at(7), statusReward(t), '004', dayOf(7), { code: 'C', url: 'u' });
    expect(statusState(took, { ...t, day: 10 }, dayOf(7))).toMatchObject({ kind: 'taken' });
  });

  it('names the next tier to reach', () => {
    expect(nextStatus(0, DEFAULTS)?.id).toBe('status-7');
    expect(nextStatus(7, DEFAULTS)?.id).toBe('status-30');
    expect(nextStatus(29, DEFAULTS)?.id).toBe('status-30');
    expect(nextStatus(30, DEFAULTS)?.id).toBe('status-90');
    expect(nextStatus(364, DEFAULTS)?.id).toBe('status-365');
    expect(nextStatus(365, DEFAULTS)).toBeNull();
  });
});

describe('status letters', () => {
  const take = (r: RecordState, id: string, day: string) => redeem(r, statusReward(byId(id)), '004', day, { code: 'C', url: 'u' });
  const config = (over: Record<string, Record<string, unknown>>) =>
    effectiveStatus(DEFAULTS, parseStatus(DEFAULTS.map(t => ({ ...t, ...over[t.id] }))));

  it('sends one letter when a tier is reached, then none until the next', () => {
    expect(pendingStatusLetter(at(6), dayOf(6), DEFAULTS)).toBeNull();
    let r = at(7);
    const seven = pendingStatusLetter(r, dayOf(7), DEFAULTS)!;
    expect(seven).toEqual({ kind: 'status', day: 7, key: 'status:7' });
    expect(letterTier(seven, DEFAULTS)?.id).toBe('status-7');
    r = markLetterShown(r, seven, DEFAULTS);
    expect(r.lettersShown).toEqual(['status:7']);
    expect(pendingStatusLetter(r, dayOf(7), DEFAULTS)).toBeNull();
    r = onRecord(r, dayOf(8), 23);
    expect(pendingStatusLetter(r, dayOf(30), DEFAULTS)).toEqual({ kind: 'status', day: 30, key: 'status:30' });
  });

  it("uses new keys: someone who saw an earlier build's letters still hears about a code once", () => {
    expect(pendingStatusLetter({ ...at(7), lettersShown: ['7'] }, dayOf(7), DEFAULTS)).toMatchObject({ day: 7 });
    const old = { ...at(100), lettersShown: ['7', '90', 'comeback:2025-02-01'] };
    const letter = pendingStatusLetter(old, dayOf(100), DEFAULTS)!;
    expect(letter).toEqual({ kind: 'status', day: 90, key: 'status:90' });
    const seen = markLetterShown(old, letter, DEFAULTS);
    expect(seen.lettersShown).toEqual(['7', '90', 'comeback:2025-02-01', 'status:90', 'status:7', 'status:30']);
    expect(pendingStatusLetter(seen, dayOf(100), DEFAULTS)).toBeNull();
  });

  it('gives a long restored record one letter, not four', () => {
    const r = at(400);
    const letter = pendingStatusLetter(r, dayOf(400), DEFAULTS)!;
    expect(letter).toMatchObject({ day: 365 });
    const seen = markLetterShown(r, letter, DEFAULTS);
    expect([...seen.lettersShown].sort()).toEqual(['status:30', 'status:365', 'status:7', 'status:90']);
    expect(pendingStatusLetter(seen, dayOf(400), DEFAULTS)).toBeNull();
    // Marked without the tiers, the letter still covers every tier below it.
    const bare = markLetterShown(r, letter);
    expect(bare.lettersShown).toEqual(['status:365']);
    expect(pendingStatusLetter(bare, dayOf(400), DEFAULTS)).toBeNull();
  });

  it("doesn't show the 7-day letter after the 30-day one when it was skipped", () => {
    const r = at(30);
    const letter = pendingStatusLetter(r, dayOf(30), DEFAULTS)!;
    expect(letter.day).toBe(30);
    expect(pendingStatusLetter(markLetterShown(r, letter, DEFAULTS), dayOf(30), DEFAULTS)).toBeNull();
  });

  it('skips a tier whose code is already taken, or that is switched off', () => {
    let r = take(at(30), 'status-30', dayOf(30));
    // 15% off was taken from the Status page before its letter: the untaken 10% off gets one.
    expect(pendingStatusLetter(r, dayOf(30), DEFAULTS)).toMatchObject({ day: 7 });
    r = take(r, 'status-7', dayOf(30));
    expect(pendingStatusLetter(r, dayOf(30), DEFAULTS)).toBeNull();
    expect(pendingStatusLetter(at(30), dayOf(30), config({ 'status-30': { active: false } }))).toMatchObject({ day: 7 });
  });

  it('moves the letter with a tier the config moves, and closes one whose tier has gone', () => {
    const moved = config({ 'status-7': { day: 10 } });
    expect(pendingStatusLetter(at(7), dayOf(7), moved)).toBeNull();
    expect(pendingStatusLetter(at(10), dayOf(10), moved)).toEqual({ kind: 'status', day: 10, key: 'status:10' });
    // A 7-day letter left open from before the move has no tier: the letter screen closes it.
    const seven = { kind: 'status' as const, day: 7, key: 'status:7' };
    expect(letterTier(seven, moved)).toBeNull();
    expect(letterTier(seven, config({ 'status-7': { active: false } }))).toBeNull();
    expect(letterTier(seven, DEFAULTS)?.id).toBe('status-7');
  });

  it('sends nothing with no tiers in effect', () => {
    expect(pendingStatusLetter(at(400), dayOf(400), [])).toBeNull();
  });
});

describe('the status road', () => {
  it('places the walker piecewise over 0 and each tier day', () => {
    const days = DEFAULTS.map(t => t.day);
    expect(roadAt(0, days)).toBe(0);
    expect(roadAt(7, days)).toBeCloseTo(1 / 4);
    expect(roadAt(30, days)).toBeCloseTo(2 / 4);
    expect(roadAt(15, days)).toBeCloseTo((1 + 8 / 23) / 4);
    expect(roadAt(90, days)).toBeCloseTo(3 / 4);
    expect(roadAt(400, days)).toBe(1);
    expect(roadAt(5, [])).toBe(0);
  });
});
