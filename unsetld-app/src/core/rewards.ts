// Points in and out, and the reward tiers they open. Tier settings come from
// content/rewards.json and can be replaced by unsetld.com's config.
import { addDays, type DayKey } from './time';
import type { RecordState, Redemption, RewardTier } from './types';

export function pointsEarned(r: RecordState): number {
  let total = r.legacyPoints ?? 0;
  for (const byId of Object.values(r.missions ?? {})) for (const m of Object.values(byId)) total += m.points;
  for (const b of Object.values(r.bonuses ?? {})) total += b;
  return total;
}

export function pointsSpent(r: RecordState): number {
  return (r.redemptions ?? []).reduce((t, x) => t + x.points, 0);
}

export function balance(r: RecordState): number {
  return Math.max(0, pointsEarned(r) - pointsSpent(r));
}

/** Within its dates, switched on and not sold out. */
export function isAvailable(t: RewardTier, today: DayKey): boolean {
  if (!t.active) return false;
  if (t.inventory === 0) return false;
  if (t.availableFrom && today < t.availableFrom.slice(0, 10)) return false;
  if (t.availableUntil && today > t.availableUntil.slice(0, 10)) return false;
  return true;
}

export type RewardStatus = 'ready' | 'short' | 'used' | 'unavailable';

export function takenThisCollection(r: RecordState, tierId: string, collection: string): number {
  return (r.redemptions ?? []).filter(x => x.rewardId === tierId && x.collection === collection).length;
}

export function rewardStatus(r: RecordState, t: RewardTier, collection: string, today: DayKey): RewardStatus {
  if (!isAvailable(t, today)) return 'unavailable';
  if (takenThisCollection(r, t.id, collection) >= t.perCollection) return 'used';
  return balance(r) >= t.points ? 'ready' : 'short';
}

/** The reward to show progress toward: the cheapest one still out of reach, or the best one in reach. */
export function nextReward(
  r: RecordState,
  tiers: readonly RewardTier[],
  collection: string,
  today: DayKey,
): { tier: RewardTier; have: number; need: number; ready: boolean } | null {
  const open = tiers.filter(t => rewardStatus(r, t, collection, today) !== 'unavailable' && rewardStatus(r, t, collection, today) !== 'used');
  if (!open.length) return null;
  const have = balance(r);
  const sorted = [...open].sort((a, b) => a.points - b.points);
  const short = sorted.find(t => t.points > have);
  if (short) return { tier: short, have, need: short.points - have, ready: false };
  const best = sorted[sorted.length - 1];
  return { tier: best, have, need: 0, ready: true };
}

export function redeem(r: RecordState, t: RewardTier, collection: string, today: DayKey, minted: { code: string; url: string }): RecordState {
  const red: Redemption = {
    rewardId: t.id,
    points: t.points,
    collection,
    day: today,
    code: minted.code,
    url: minted.url,
    expires: addDays(today, t.codeValidDays),
  };
  return { ...r, redemptions: [...(r.redemptions ?? []), red] };
}

/** Default tiers merged with the server's: the server's list wins when it sends one. */
export function effectiveTiers(defaults: readonly RewardTier[], remote: readonly RewardTier[] | null | undefined): RewardTier[] {
  return remote && remote.length ? [...remote] : [...defaults];
}
