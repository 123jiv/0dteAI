// Reward rules from configuration (minimum purchase, cooldown, one time only, the alias
// names), "up next", and UNSETLD status tiers from the config (docs/ACCESS.md).
import { describe, expect, it } from 'vitest';
import configJson from '../../../Web/api/app/config.json';
import milestonesJson from '../../content/milestones.json';
import rewardsJson from '../../content/rewards.json';
import { emptyRecord, markLetterShown, milestoneStatus, pendingLetter, recordDay, roadPosition } from '../record';
import {
  cooldownEnds,
  cooldownLeft,
  effectiveStatus,
  isKnownStatus,
  letterTier,
  nextReward,
  nextStatus,
  parseRewardTier,
  parseRewards,
  parseStatus,
  parseStatusTier,
  pendingStatusLetter,
  redeem,
  rewardStatus,
  roadAt,
  statusAccess,
  statusFromMilestones,
  statusState,
  upNext,
} from '../rewards';
import { addDays } from '../time';
import type { CodeClaim, Milestone, RecordState, RewardTier, StatusTier } from '../types';

const DEFAULTS = statusFromMilestones(milestonesJson as Milestone[]);
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
    const both = { ...canonical, pointsRequired: 900, rewardType: 'limited', discountPercent: 50, maxDiscount: 99, startDate: '2027-01-01', endDate: '2027-02-01', redemptionCooldown: 3, redemptionCooldownDays: 7 };
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
      tier({ id: 'limited', type: 'limited', percent: undefined, points: 2000, active: false }),
    ];
    // 380 points: 5% off is in reach, so it's next; the two after it are up next.
    const r380 = withPoints(380);
    const next = nextReward(r380, tiers, '004', TODAY)!;
    expect(next.tier.id).toBe('five-off');
    expect(upNext(r380, tiers, '004', TODAY, next.tier).map(t => t.id)).toEqual(['ten-off', 'fifteen-off']);
    // 5% taken: 10% off is next, then 15% and 20%; the switched-off piece never shows.
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
  it('builds the defaults from milestones.json: switched on, with their actions and letters', () => {
    expect(DEFAULTS.map(t => [t.id, t.day, t.active, t.pausable])).toEqual([
      ['early-access', 7, true, true],
      ['patch', 90, true, false],
      ['piece-365', 365, true, false],
    ]);
    for (const t of DEFAULTS) {
      expect(isKnownStatus(t.id)).toBe(true);
      expect(t.action).toBeTruthy();
      expect(t.letter?.primary).toBeTruthy();
    }
  });

  it('reads a known id with its own action, pause and letter, and an unknown id as display only', () => {
    const early = parseStatusTier({ id: 'early-access', activeDays: 10, title: 'Early access' }, DEFAULTS)!;
    expect(early).toMatchObject({ id: 'early-access', day: 10, active: true, pausable: true, action: 'Turn on drop alerts' });
    // Text it leaves out comes from the built-in tier.
    expect(early.short).toBe(DEFAULTS[0].short);
    expect(early.letter).toEqual(DEFAULTS[0].letter);
    expect(parseStatusTier({ id: 'patch', day: 90, title: 'The patch', action: 'Claim the patch' }, DEFAULTS)).toMatchObject({ action: 'Claim the patch', pausable: false });

    const special = parseStatusTier({ id: 'special-30', day: 30, title: 'Special access', short: 'A members-only page.', action: 'Do something' }, DEFAULTS)!;
    expect(special).toEqual({ id: 'special-30', day: 30, title: 'Special access', short: 'A members-only page.', detail: '', active: true, pausable: false });
    expect(special).not.toHaveProperty('action');
    expect(special).not.toHaveProperty('letter');
    expect(isKnownStatus(special.id)).toBe(false);
  });

  it('lets day win over activeDays, and drops bad entries', () => {
    expect(parseStatusTier({ id: 'x', day: 30, activeDays: 40, title: 'X' }, DEFAULTS)).toMatchObject({ day: 30 });
    const good = { id: 'x', day: 30, title: 'X' };
    for (const bad of [{ id: '' }, { day: 0 }, { day: 2.5 }, { day: '30' }, { title: 'x'.repeat(41) }, { short: 3 }, { detail: false }, { active: 'yes' }, { action: '' }]) {
      expect(parseStatusTier({ ...good, ...bad }, DEFAULTS)).toBeNull();
    }
    for (const raw of [null, 'patch', 90, [good]]) expect(parseStatusTier(raw, DEFAULTS)).toBeNull();
    expect(parseStatus([good, { ...good, title: 'Again' }, { id: 'y' }], DEFAULTS)).toEqual([{ id: 'x', day: 30, title: 'X', short: '', detail: '', active: true, pausable: false }]);
    expect(parseStatus([], DEFAULTS)).toBeNull();
    expect(parseStatus(undefined, DEFAULTS)).toBeNull();
    expect(parseStatus({ status: [good] }, DEFAULTS)).toBeNull();
  });

  it("reads the site's config as the built-in tiers", () => {
    expect(parseStatus(configJson.status, DEFAULTS)).toEqual(DEFAULTS);
  });

  it('uses the server list when sent, switched-on tiers only, by day', () => {
    expect(effectiveStatus(DEFAULTS, null)).toEqual(DEFAULTS);
    const remote = parseStatus(
      [
        { id: 'piece-365', day: 365, title: 'The 365 piece', active: false },
        { id: 'special-30', day: 30, title: 'Special access' },
        { id: 'early-access', day: 7, title: 'Early access' },
      ],
      DEFAULTS,
    );
    expect(effectiveStatus(DEFAULTS, remote).map(t => t.id)).toEqual(['early-access', 'special-30']);
    expect(effectiveStatus(DEFAULTS, [])).toEqual(DEFAULTS);
  });
});

describe('status on the record', () => {
  const byId = (id: string) => DEFAULTS.find(t => t.id === id)!;
  const ms = milestonesJson as Milestone[];

  it('gives the same status as the milestone rules for the built-in tiers', () => {
    const records: [RecordState, string][] = [
      [emptyRecord(), TODAY],
      [onRecord(emptyRecord(), '2026-01-01', 31), '2026-01-31'],
      [onRecord(emptyRecord(), '2026-01-01', 31), '2026-03-01'], // paused
      [onRecord(emptyRecord(), '2025-01-01', 95), '2025-04-05'],
      [{ ...onRecord(emptyRecord(), '2025-01-01', 95), patchClaimed: '2025-04-05' }, '2025-04-05'],
    ];
    for (const [r, day] of records) for (const m of ms) expect(statusState(r, byId(m.id), day)).toEqual(milestoneStatus(r, m, day));
  });

  it('shows a display-only tier as open once reached, never paused or used', () => {
    const special: StatusTier = { id: 'special-30', day: 30, title: 'Special access', short: '', detail: '', active: true, pausable: false };
    const r = onRecord(emptyRecord(), '2026-01-01', 31);
    expect(statusState(onRecord(emptyRecord(), '2026-01-01', 12), special, '2026-01-12')).toEqual({ kind: 'locked', daysLeft: 18 });
    expect(statusState(r, special, '2026-03-01')).toEqual({ kind: 'open' });
  });

  it('names the next tier to reach', () => {
    expect(nextStatus(0, DEFAULTS)?.id).toBe('early-access');
    expect(nextStatus(7, DEFAULTS)?.id).toBe('patch');
    expect(nextStatus(12, DEFAULTS)?.id).toBe('patch');
    expect(nextStatus(365, DEFAULTS)).toBeNull();
  });

  it('sends the same letters as before with the built-in tiers', () => {
    let r = onRecord(emptyRecord(), '2026-01-01', 6);
    expect(pendingStatusLetter(r, '2026-01-06', DEFAULTS)).toBeNull();
    r = onRecord(r, '2026-01-07', 1);
    expect(pendingStatusLetter(r, '2026-01-07', DEFAULTS)).toEqual(pendingLetter(r, '2026-01-07'));
    r = markLetterShown(r, pendingLetter(r, '2026-01-07')!);
    expect(pendingStatusLetter(r, '2026-01-07', DEFAULTS)).toBeNull();
    const big = onRecord(emptyRecord(), '2025-01-01', 100);
    expect(pendingStatusLetter(big, '2025-04-10', DEFAULTS)).toEqual(pendingLetter(big, '2025-04-10'));
    // Paused: the early-access letter waits; the comeback letter comes after.
    let p = onRecord(emptyRecord(), '2026-01-01', 7);
    expect(pendingStatusLetter(p, '2026-01-25', DEFAULTS)).toBeNull();
    p = onRecord(p, '2026-01-25', 7);
    expect(pendingStatusLetter(p, '2026-01-31', DEFAULTS)).toEqual(pendingLetter(p, '2026-01-31'));
    // A comeback letter, as before.
    r = onRecord(r, '2026-02-01', 7);
    expect(pendingStatusLetter(r, '2026-02-07', DEFAULTS)).toEqual(pendingLetter(r, '2026-02-07'));
  });

  it("moves a known tier's letter with its day, and never writes one for a display-only tier", () => {
    const moved = DEFAULTS.map(t => (t.id === 'early-access' ? { ...t, day: 10 } : t));
    const special: StatusTier = { id: 'special-30', day: 30, title: 'Special access', short: '', detail: '', active: true, pausable: false };
    let r = onRecord(emptyRecord(), '2026-01-01', 7);
    expect(pendingStatusLetter(r, '2026-01-07', moved)).toBeNull();
    r = onRecord(r, '2026-01-08', 3);
    expect(pendingStatusLetter(r, '2026-01-10', moved)).toEqual({ kind: 'milestone', day: 10, key: '10', pausable: true });
    r = markLetterShown(r, { kind: 'milestone', day: 10, key: '10' });
    r = onRecord(r, '2026-01-11', 25);
    expect(pendingStatusLetter(r, '2026-02-04', [...moved, special])).toBeNull();
  });
});

describe('status letters follow the status config', () => {
  // The tiers in effect for a config that sends the built-in list with some fields changed.
  const config = (over: Record<string, Record<string, unknown>>) =>
    effectiveStatus(DEFAULTS, parseStatus(DEFAULTS.map(t => ({ id: t.id, day: t.day, title: t.title, ...over[t.id] })), DEFAULTS));
  const milestone = (day: number) => ({ kind: 'milestone' as const, day, key: String(day) });

  it('sends the early-access letter at the day the config moved it to, not at 7', () => {
    const moved = config({ 'early-access': { day: 10 } });
    let r = onRecord(emptyRecord(), '2026-01-01', 7);
    expect(pendingStatusLetter(r, '2026-01-07', moved)).toBeNull();
    // A day-7 letter left open from before the move has no tier: the letter screen closes it.
    expect(letterTier(milestone(7), moved)).toBeNull();
    r = onRecord(r, '2026-01-08', 3);
    const ten = pendingStatusLetter(r, '2026-01-10', moved)!;
    expect(ten).toEqual({ kind: 'milestone', day: 10, key: '10', pausable: true });
    expect(letterTier(ten, moved)).toMatchObject({ id: 'early-access', day: 10, letter: DEFAULTS[0].letter });
    r = markLetterShown(r, ten);
    expect(r.lettersShown).toContain('10');
    expect(pendingStatusLetter(r, '2026-01-10', moved)).toBeNull();
  });

  it('sends no early-access letter and no comeback letter while early access is switched off', () => {
    const off = config({ 'early-access': { active: false } });
    let r = onRecord(emptyRecord(), '2026-01-01', 7);
    expect(pendingStatusLetter(r, '2026-01-07', DEFAULTS)).toMatchObject({ day: 7 });
    expect(pendingStatusLetter(r, '2026-01-07', off)).toBeNull();
    expect(letterTier(milestone(7), off)).toBeNull();
    // Paused, then back on 7 more days: the comeback letter would say early access is open again.
    r = markLetterShown(r, milestone(7));
    r = onRecord(r, '2026-01-25', 7);
    expect(pendingStatusLetter(r, '2026-01-31', DEFAULTS)).toMatchObject({ kind: 'comeback', day: '2026-01-31' });
    expect(pendingStatusLetter(r, '2026-01-31', off)).toBeNull();
    expect(letterTier({ kind: 'comeback', day: '2026-01-31', key: 'comeback:2026-01-31' }, off)).toBeNull();
  });

  it('sends no patch letter while the patch is switched off, and the 365 letter still comes', () => {
    const off = config({ patch: { active: false } });
    let r = markLetterShown(onRecord(emptyRecord(), '2025-01-01', 90), milestone(7));
    expect(pendingStatusLetter(r, '2025-03-31', DEFAULTS)).toMatchObject({ day: 90 });
    expect(pendingStatusLetter(r, '2025-03-31', off)).toBeNull();
    expect(letterTier(milestone(90), off)).toBeNull();
    r = onRecord(r, '2025-04-01', 275);
    expect(pendingStatusLetter(r, '2025-12-31', off)).toEqual({ kind: 'milestone', day: 365, key: '365', pausable: false });
    expect(letterTier(milestone(365), off)?.id).toBe('piece-365');
  });

  it("doesn't bring back an older letter when a higher tier is switched off later", () => {
    const moved = config({ 'early-access': { day: 10 } });
    let r = onRecord(emptyRecord(), '2025-01-01', 100);
    const patch = pendingStatusLetter(r, '2025-04-10', moved)!;
    expect(patch).toMatchObject({ day: 90 });
    r = markLetterShown(r, patch);
    expect(pendingStatusLetter(r, '2025-04-10', config({ 'early-access': { day: 10 }, patch: { active: false } }))).toBeNull();
  });

  it('after a pause, sends one letter for a moved early access, and no comeback letter before reaching it', () => {
    // 8 days, 16 missed (paused), then 7 more: access reopens on 31 Jan with 15 active days.
    const r = onRecord(onRecord(emptyRecord(), '2026-01-01', 8), '2026-01-25', 7);
    const at10 = config({ 'early-access': { day: 10 } });
    const letter = pendingStatusLetter(r, '2026-01-31', at10)!;
    expect(letter).toEqual({ kind: 'milestone', day: 10, key: '10', pausable: true });
    // Its letter already says early access is open, so it covers the comeback letter.
    expect(pendingStatusLetter(markLetterShown(r, letter), '2026-01-31', at10)).toBeNull();
    // Moved past the 15 days: nothing is open yet, so nothing says it's open again.
    expect(pendingStatusLetter(r, '2026-01-31', config({ 'early-access': { day: 20 } }))).toBeNull();
  });

  it('places the walker the same as before for the built-in days, and for any others', () => {
    const days = DEFAULTS.map(t => t.day);
    for (const n of [0, 1, 7, 12, 90, 200, 365, 400]) expect(roadAt(n, days)).toBeCloseTo(roadPosition(n));
    expect(roadAt(15, [7, 30, 90, 365])).toBeCloseTo((1 + 8 / 23) / 4);
    expect(roadAt(5, [])).toBe(0);
  });
});

describe('the pause rule follows the configured early-access day', () => {
  // 8 active days, then 15 days without a proven mission.
  const r = onRecord(emptyRecord(), '2026-09-01', 8);
  const today = addDays('2026-09-08', 16);

  it('pauses after 14 missed days once early access is open (built-in day 7)', () => {
    expect(statusAccess(r, today, DEFAULTS).paused).toBe(true);
  });

  it("doesn't pause before a moved early access (day 10) has opened", () => {
    const moved = DEFAULTS.map(t => (t.id === 'early-access' ? { ...t, day: 10 } : t));
    expect(statusAccess(r, today, moved).paused).toBe(false);
    const ea = moved.find(t => t.id === 'early-access')!;
    expect(statusState(r, ea, today).kind).toBe('locked');
  });

  it('never pauses when early access is switched off', () => {
    expect(statusAccess(r, today, DEFAULTS.filter(t => t.id !== 'early-access')).paused).toBe(false);
  });
});
