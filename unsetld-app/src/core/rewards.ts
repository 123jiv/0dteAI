// Points in and out, and the reward tiers they open. Tier settings come from
// content/rewards.json and can be replaced by unsetld.com's config.
import { addDays, type DayKey } from './time';
import type { RecordState, Redemption, RewardTier, RewardType } from './types';

/** Points as stored, or 0 when an old or damaged entry has none. */
const pts = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function pointsEarned(r: RecordState): number {
  let total = pts(r.legacyPoints);
  for (const byId of Object.values(r.missions ?? {})) for (const m of Object.values(byId ?? {})) total += pts(m?.points);
  for (const b of Object.values(r.bonuses ?? {})) total += pts(b);
  return total;
}

export function pointsSpent(r: RecordState): number {
  return (r.redemptions ?? []).reduce((t, x) => t + pts(x?.points), 0);
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

/**
 * How many of this tier were taken this collection: its redemptions, plus any
 * 2.x discount code from the same collection with the same percent (a 10% code
 * taken under the old points system uses up the 10% tier).
 */
export function takenThisCollection(r: RecordState, t: RewardTier, collection: string): number {
  const taken = (r.redemptions ?? []).filter(x => x?.rewardId === t.id && x.collection === collection).length;
  if (typeof t.percent !== 'number') return taken;
  const legacy = (Array.isArray(r.codes) ? r.codes : []).filter(c => c?.collection === collection && c.percent === t.percent).length;
  return taken + legacy;
}

export function rewardStatus(r: RecordState, t: RewardTier, collection: string, today: DayKey): RewardStatus {
  if (!isAvailable(t, today)) return 'unavailable';
  if (takenThisCollection(r, t, collection) >= t.perCollection) return 'used';
  return balance(r) >= t.points ? 'ready' : 'short';
}

/** Higher first: the one that costs more points, then the bigger discount. */
const moreValuable = (a: RewardTier, b: RewardTier) => b.points - a.points || (b.percent ?? 0) - (a.percent ?? 0);

/**
 * The reward to show: when one or more can be taken now, the most valuable of
 * them ("15% OFF IS READY"); otherwise the cheapest one still out of reach.
 * null when nothing is open (all used, switched off, out of dates or sold out).
 */
export function nextReward(
  r: RecordState,
  tiers: readonly RewardTier[],
  collection: string,
  today: DayKey,
): { tier: RewardTier; have: number; need: number; ready: boolean } | null {
  const have = balance(r);
  const open = tiers.filter(t => {
    const s = rewardStatus(r, t, collection, today);
    return s === 'ready' || s === 'short';
  });
  if (!open.length) return null;
  const ready = open.filter(t => t.points <= have).sort(moreValuable);
  if (ready.length) return { tier: ready[0], have, need: 0, ready: true };
  const short = [...open].sort((a, b) => a.points - b.points)[0];
  return { tier: short, have, need: short.points - have, ready: false };
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

// ── The server's reward config ──────────────────────────────────────────────

const REWARD_TYPES: readonly RewardType[] = ['discount', 'free-shipping', 'early-access', 'limited', 'drop'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

const isCount = (v: unknown, min: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
/** A date the window can compare against (YYYY-MM-DD first), null for none, or undefined when it's not a date. */
const dateOrNull = (v: unknown): string | null | undefined =>
  v === undefined || v === null ? null : typeof v === 'string' && ISO_DAY.test(v) && !Number.isNaN(Date.parse(v.slice(0, 10))) ? v : undefined;

/**
 * One tier from the server's config, or null if anything in it is off. Fields
 * the server leaves out get the same defaults as content/rewards.json.
 */
export function parseRewardTier(raw: unknown): RewardTier | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!isText(o.id, 64) || !isText(o.title, 40)) return null;
  if (o.detail !== undefined && typeof o.detail !== 'string') return null;
  if (typeof o.type !== 'string' || !REWARD_TYPES.includes(o.type as RewardType)) return null;
  const type = o.type as RewardType;
  if (!isCount(o.points, 1)) return null;
  // A discount needs its percent; anything else may carry one only if it's sane.
  const percent = o.percent;
  if (percent !== undefined && percent !== null && !(typeof percent === 'number' && percent > 0 && percent <= 100)) return null;
  if (type === 'discount' && typeof percent !== 'number') return null;
  const maxOff = o.maxOff;
  if (maxOff !== undefined && maxOff !== null && !(typeof maxOff === 'number' && Number.isFinite(maxOff) && maxOff > 0)) return null;
  if (o.active !== undefined && typeof o.active !== 'boolean') return null;
  const from = dateOrNull(o.availableFrom);
  const until = dateOrNull(o.availableUntil);
  if (from === undefined || until === undefined) return null;
  if (o.codeValidDays !== undefined && !isCount(o.codeValidDays, 1)) return null;
  if (o.inventory !== undefined && o.inventory !== null && !isCount(o.inventory, 0)) return null;
  if (o.perCollection !== undefined && !isCount(o.perCollection, 1)) return null;
  return {
    id: o.id.trim(),
    title: o.title.trim(),
    detail: typeof o.detail === 'string' ? o.detail.trim() : '',
    type,
    points: o.points,
    ...(typeof percent === 'number' ? { percent } : {}),
    ...(typeof maxOff === 'number' ? { maxOff } : {}),
    active: o.active ?? true,
    availableFrom: from,
    availableUntil: until,
    codeValidDays: (o.codeValidDays as number | undefined) ?? 30,
    inventory: (o.inventory as number | null | undefined) ?? null,
    perCollection: (o.perCollection as number | undefined) ?? 1,
  };
}

/** The config's `rewards` list: bad entries and repeated ids are dropped. null when nothing usable came. */
export function parseRewards(raw: unknown): RewardTier[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: RewardTier[] = [];
  for (const item of raw) {
    const tier = parseRewardTier(item);
    if (!tier || seen.has(tier.id)) continue;
    seen.add(tier.id);
    out.push(tier);
  }
  return out.length ? out : null;
}
