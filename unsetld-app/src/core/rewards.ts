// Points in and out, the reward tiers they open, and UNSETLD status (a discount code for
// each tier of active days). Point tiers come from content/rewards.json and status tiers from
// content/milestones.json; unsetld.com's config can replace either list (docs/ACCESS.md).
// Nothing here knows a threshold, a price or a product: they all come from those lists.
import { activeDays } from './progress';
import { letterKey, type Letter } from './record';
import { addDays, diffDays, type DayKey } from './time';
import type { RecordState, Redemption, RewardTier, RewardType, StatusTier } from './types';

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

/**
 * ready: can be taken now. short: not enough points yet. used: taken as often as this
 * collection allows (or, for a oneTimeOnly tier, ever). cooldown: taken within its
 * redemptionCooldownDays. unavailable: switched off, out of its dates or sold out.
 */
export type RewardStatus = 'ready' | 'short' | 'used' | 'cooldown' | 'unavailable';

/**
 * A 2.x discount code counts as taking the points tier with the same percent. 2.x codes were
 * bought with points, so they never count against a status code (no points: statusReward).
 */
function legacyFor(r: RecordState, t: RewardTier) {
  if (typeof t.percent !== 'number' || !(t.points > 0)) return [];
  return (Array.isArray(r.codes) ? r.codes : []).filter(c => c?.percent === t.percent);
}

/**
 * How many of this tier were taken this collection: its redemptions, plus any
 * 2.x discount code from the same collection with the same percent (a 10% code
 * taken under the old points system uses up the 10% tier).
 */
export function takenThisCollection(r: RecordState, t: RewardTier, collection: string): number {
  const taken = (r.redemptions ?? []).filter(x => x?.rewardId === t.id && x.collection === collection).length;
  return taken + legacyFor(r, t).filter(c => c.collection === collection).length;
}

/** Every day this tier was taken, in any collection, oldest first (2.x codes included, as above). */
export function takenDays(r: RecordState, t: RewardTier): DayKey[] {
  const days = (r.redemptions ?? []).filter(x => x?.rewardId === t.id).map(x => x.day);
  for (const c of legacyFor(r, t)) days.push(c.day);
  return days.filter((d): d is DayKey => typeof d === 'string').sort();
}

/** Days until a tier with a cooldown can be taken again: 0 when it can (or has no cooldown). */
export function cooldownLeft(r: RecordState, t: RewardTier, today: DayKey): number {
  const n = t.redemptionCooldownDays;
  if (typeof n !== 'number' || n <= 0) return 0;
  const days = takenDays(r, t);
  const last = days[days.length - 1];
  if (!last) return 0;
  // A clock set back before the last code still waits the full cooldown, never longer.
  return Math.min(n, Math.max(0, n - diffDays(last, today)));
}

/** The day a cooling-down tier opens again, or null when it isn't cooling down. */
export function cooldownEnds(r: RecordState, t: RewardTier, today: DayKey): DayKey | null {
  const left = cooldownLeft(r, t, today);
  return left > 0 ? addDays(today, left) : null;
}

export function rewardStatus(r: RecordState, t: RewardTier, collection: string, today: DayKey): RewardStatus {
  if (!isAvailable(t, today)) return 'unavailable';
  if (t.oneTimeOnly && takenDays(r, t).length > 0) return 'used';
  if (takenThisCollection(r, t, collection) >= t.perCollection) return 'used';
  if (cooldownLeft(r, t, today) > 0) return 'cooldown';
  return balance(r) >= t.points ? 'ready' : 'short';
}

/** Higher first: the one that costs more points, then the bigger discount. */
const moreValuable = (a: RewardTier, b: RewardTier) => b.points - a.points || (b.percent ?? 0) - (a.percent ?? 0);
/** Cheapest first. */
const cheaper = (a: RewardTier, b: RewardTier) => -moreValuable(a, b);

/** The tiers that can be taken now or once there are enough points, cheapest first. */
function openTiers(r: RecordState, tiers: readonly RewardTier[], collection: string, today: DayKey): RewardTier[] {
  return tiers
    .filter(t => {
      const s = rewardStatus(r, t, collection, today);
      return s === 'ready' || s === 'short';
    })
    .sort(cheaper);
}

/**
 * The reward to show: when one or more can be taken now, the most valuable of
 * them ("15% OFF IS READY"); otherwise the cheapest one still out of reach.
 * null when nothing is open (all used, cooling down, switched off, out of dates or sold out).
 */
export function nextReward(
  r: RecordState,
  tiers: readonly RewardTier[],
  collection: string,
  today: DayKey,
): { tier: RewardTier; have: number; need: number; ready: boolean } | null {
  const have = balance(r);
  const open = openTiers(r, tiers, collection, today);
  if (!open.length) return null;
  const ready = open.filter(t => t.points <= have).sort(moreValuable);
  if (ready.length) return { tier: ready[0], have, need: 0, ready: true };
  const short = open[0];
  return { tier: short, have, need: short.points - have, ready: false };
}

/** Up next: the open tiers after `after` (the next reward), cheapest first, at most `count`. */
export function upNext(r: RecordState, tiers: readonly RewardTier[], collection: string, today: DayKey, after: RewardTier | null, count = 2): RewardTier[] {
  const open = openTiers(r, tiers, collection, today);
  const from = after ? open.findIndex(t => t.id === after.id) + 1 : 0;
  return open.slice(from, from + count);
}

/** A whole day as YYYY-MM-DD (the shape of a DayKey), or undefined for anything else. */
function dayKeyOrUndefined(v: unknown): DayKey | undefined {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
}

/**
 * Records a code taken. Its last day is the one unsetld.com sent with it (`expires`: a status
 * code taken before, on another phone or when the reply never arrived, comes back with its
 * own last day), else `codeValidDays` from today. A code-less one (`code: ''`) marks a status
 * tier taken whose code never reached this phone (see statusState); the code lists leave it out.
 */
export function redeem(r: RecordState, t: RewardTier, collection: string, today: DayKey, minted: { code: string; url: string; expires?: string }): RecordState {
  const red: Redemption = {
    rewardId: t.id,
    points: t.points,
    collection,
    day: today,
    code: minted.code,
    url: minted.url,
    expires: dayKeyOrUndefined(minted.expires) ?? addDays(today, t.codeValidDays),
  };
  return { ...r, redemptions: [...(r.redemptions ?? []), red] };
}

/** Default tiers merged with the server's: the server's list wins when it sends one. */
export function effectiveTiers(defaults: readonly RewardTier[], remote: readonly RewardTier[] | null | undefined): RewardTier[] {
  return remote && remote.length ? [...remote] : [...defaults];
}

// ── The server's reward config ──────────────────────────────────────────────

/** Every reward is a discount: a config entry of another type (free-shipping, limited, drop from earlier builds) is dropped. */
const REWARD_TYPES: readonly RewardType[] = ['discount'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

const isCount = (v: unknown, min: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isMoney = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
/** A date the window can compare against (YYYY-MM-DD first), null for none, or undefined when it's not a date. */
const dateOrNull = (v: unknown): string | null | undefined =>
  v === undefined || v === null ? null : typeof v === 'string' && ISO_DAY.test(v) && !Number.isNaN(Date.parse(v.slice(0, 10))) ? v : undefined;

/**
 * Other names the config may use for a field (the founder's names for them). The
 * canonical name wins when both are sent.
 */
const REWARD_ALIASES: Record<string, string[]> = {
  points: ['pointsRequired'],
  type: ['rewardType'],
  percent: ['discountPercent'],
  maxOff: ['maxDiscount'],
  availableFrom: ['startDate'],
  availableUntil: ['endDate'],
  redemptionCooldownDays: ['redemptionCooldown'],
};

function withAliases(o: Record<string, unknown>, aliases: Record<string, string[]>): Record<string, unknown> {
  const out = { ...o };
  for (const [name, others] of Object.entries(aliases)) {
    if (out[name] !== undefined) continue;
    const alias = others.find(a => o[a] !== undefined);
    if (alias) out[name] = o[alias];
  }
  return out;
}

/**
 * One tier from the server's config, or null if anything in it is off (a tier
 * that isn't a discount with its percent is off). Fields the server leaves out
 * get the same defaults as content/rewards.json. The rule
 * fields (minimumPurchase, redemptionCooldownDays, oneTimeOnly) are kept only
 * when sent.
 */
export function parseRewardTier(raw: unknown): RewardTier | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = withAliases(raw as Record<string, unknown>, REWARD_ALIASES);
  if (!isText(o.id, 64) || !isText(o.title, 40)) return null;
  if (o.detail !== undefined && typeof o.detail !== 'string') return null;
  if (typeof o.type !== 'string' || !REWARD_TYPES.includes(o.type as RewardType)) return null;
  const type = o.type as RewardType;
  if (!isCount(o.points, 1)) return null;
  // Every reward is a discount, so it needs its percent.
  const percent = o.percent;
  if (!(typeof percent === 'number' && percent > 0 && percent <= 100)) return null;
  const maxOff = o.maxOff;
  if (maxOff !== undefined && maxOff !== null && !isMoney(maxOff)) return null;
  if (o.active !== undefined && typeof o.active !== 'boolean') return null;
  const from = dateOrNull(o.availableFrom);
  const until = dateOrNull(o.availableUntil);
  if (from === undefined || until === undefined) return null;
  if (o.codeValidDays !== undefined && !isCount(o.codeValidDays, 1)) return null;
  if (o.inventory !== undefined && o.inventory !== null && !isCount(o.inventory, 0)) return null;
  if (o.perCollection !== undefined && !isCount(o.perCollection, 1)) return null;
  const minimum = o.minimumPurchase;
  // 0 is no minimum, like null (content/rewards.json is validated the same way).
  if (minimum !== undefined && minimum !== null && !(minimum === 0 || isMoney(minimum))) return null;
  const cooldown = o.redemptionCooldownDays;
  if (cooldown !== undefined && cooldown !== null && !isCount(cooldown, 0)) return null;
  if (o.oneTimeOnly !== undefined && typeof o.oneTimeOnly !== 'boolean') return null;
  return {
    id: o.id.trim(),
    title: o.title.trim(),
    detail: typeof o.detail === 'string' ? o.detail.trim() : '',
    type,
    points: o.points,
    percent,
    ...(typeof maxOff === 'number' ? { maxOff } : {}),
    active: o.active ?? true,
    availableFrom: from,
    availableUntil: until,
    codeValidDays: (o.codeValidDays as number | undefined) ?? 30,
    inventory: (o.inventory as number | null | undefined) ?? null,
    perCollection: (o.perCollection as number | undefined) ?? 1,
    ...(minimum !== undefined ? { minimumPurchase: minimum as number | null } : {}),
    ...(cooldown !== undefined ? { redemptionCooldownDays: cooldown as number | null } : {}),
    ...(o.oneTimeOnly !== undefined ? { oneTimeOnly: o.oneTimeOnly as boolean } : {}),
  };
}

/** Repeated ids are dropped (the first one wins), and so are bad entries. null when nothing usable came. */
function parseList<T extends { id: string }>(raw: unknown, one: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of raw) {
    const t = one(item);
    if (!t || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out.length ? out : null;
}

/** The config's `rewards` list: bad entries and repeated ids are dropped. null when nothing usable came. */
export function parseRewards(raw: unknown): RewardTier[] | null {
  return parseList(raw, parseRewardTier);
}

// ── UNSETLD status: a discount code for each tier of active days ────────────

/** content/milestones.json as status tiers: switched on unless the file says `active: false`, no cap unless it gives one. */
export function statusFromMilestones(json: readonly (Omit<StatusTier, 'active'> & { active?: boolean })[]): StatusTier[] {
  return json.map(t => ({
    id: t.id,
    day: t.day,
    title: t.title,
    short: t.short ?? '',
    detail: t.detail ?? '',
    active: t.active ?? true,
    percent: t.percent,
    maxOff: t.maxOff ?? null,
    codeValidDays: t.codeValidDays ?? 30,
  }));
}

const STATUS_ALIASES: Record<string, string[]> = { day: ['activeDays'], percent: ['discountPercent'], maxOff: ['maxDiscount'] };

/**
 * One status tier from the server's config, or null if anything in it is off. It needs an
 * id, a title, the active days (`day`, or `activeDays`) and a whole percent off from 1 to 90.
 * short and detail default to empty, active to true, maxOff to no cap, codeValidDays to 30.
 */
export function parseStatusTier(raw: unknown): StatusTier | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = withAliases(raw as Record<string, unknown>, STATUS_ALIASES);
  if (!isText(o.id, 64) || !isText(o.title, 40) || !isCount(o.day, 1)) return null;
  if (!isCount(o.percent, 1) || o.percent > 90) return null;
  for (const k of ['short', 'detail']) if (o[k] !== undefined && typeof o[k] !== 'string') return null;
  if (o.active !== undefined && typeof o.active !== 'boolean') return null;
  if (o.maxOff !== undefined && o.maxOff !== null && !isMoney(o.maxOff)) return null;
  if (o.codeValidDays !== undefined && !isCount(o.codeValidDays, 1)) return null;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    id: o.id.trim(),
    day: o.day,
    title: o.title.trim(),
    short: text(o.short),
    detail: text(o.detail),
    active: (o.active as boolean | undefined) ?? true,
    percent: o.percent,
    maxOff: typeof o.maxOff === 'number' ? o.maxOff : null,
    codeValidDays: (o.codeValidDays as number | undefined) ?? 30,
  };
}

/** The config's `status` list: bad entries and repeated ids are dropped. null when nothing usable came. */
export function parseStatus(raw: unknown): StatusTier[] | null {
  return parseList(raw, parseStatusTier);
}

/** The status tiers in effect: the server's list when it sent one, else the defaults; switched-on ones only, by day. */
export function effectiveStatus(defaults: readonly StatusTier[], remote: readonly StatusTier[] | null | undefined): StatusTier[] {
  const list = remote && remote.length ? remote : defaults;
  return list.filter(t => t.active).sort((a, b) => a.day - b.day);
}

/**
 * The days that count toward status: days on record (2.x days stay counted, so nothing
 * earned before 3.0 is taken away) and days with a proven mission. Since 3.0 a day only goes
 * on record with a proven mission, so every new day is one of these.
 */
export function statusDays(r: RecordState): number {
  const days = new Set(Object.keys(r.days ?? {}));
  for (const d of activeDays(r)) days.add(d);
  return days.size;
}

/**
 * A status tier as a reward the redeem flow can take (screens/rewards/redeem useRedeem →
 * services/access redeem → store redeemReward): one discount code, for no points, once per
 * person. Its redemption leaves the points balance as it was.
 */
export function statusReward(t: StatusTier): RewardTier {
  return {
    id: t.id,
    title: t.title,
    detail: t.short,
    type: 'discount',
    points: 0,
    percent: t.percent,
    ...(typeof t.maxOff === 'number' ? { maxOff: t.maxOff } : {}),
    active: t.active,
    codeValidDays: t.codeValidDays,
    perCollection: 1,
    oneTimeOnly: true,
  };
}

/** The redemption for this tier, if any: the latest one with its id (a code, or the code-less marker). */
function statusCode(r: RecordState, t: StatusTier): Redemption | undefined {
  const taken = (r.redemptions ?? []).filter(x => x?.rewardId === t.id);
  return taken[taken.length - 1];
}

/** The tier's code has been taken: a redemption with its id, with its code or without one. */
export function statusTaken(r: RecordState, t: StatusTier): boolean {
  return statusCode(r, t) !== undefined;
}

/**
 * locked: not enough active days yet (`daysLeft` to go). ready: reached, the code can be
 * taken. taken: the code was taken (`code`: its redemption, for the code and its last day;
 * `expired`: that day has passed). A tier unsetld.com says was taken before, without sending
 * the code again, is taken with no `code` (core/rewards redeem with `code: ''`).
 */
export type StatusState = { kind: 'locked'; daysLeft: number } | { kind: 'ready' } | { kind: 'taken'; code?: Redemption; expired: boolean };

/** Where a status tier stands on `today`. A code taken stays taken, even if the config later moves the tier's day. */
export function statusState(r: RecordState, t: StatusTier, today: DayKey): StatusState {
  const code = statusCode(r, t);
  if (code && !code.code) return { kind: 'taken', expired: false };
  if (code) return { kind: 'taken', code, expired: typeof code.expires === 'string' && today > code.expires };
  const n = statusDays(r);
  if (n < t.day) return { kind: 'locked', daysLeft: t.day - n };
  return { kind: 'ready' };
}

/** The next tier to reach with `n` active days, or null when every one is reached. */
export function nextStatus(n: number, tiers: readonly StatusTier[]): StatusTier | null {
  return [...tiers].sort((a, b) => a.day - b.day).find(t => t.day > n) ?? null;
}

/** The highest day a status letter was shown for, or 0: it covers every tier at that day or lower. */
function shownUpTo(r: RecordState): number {
  let top = 0;
  for (const k of Array.isArray(r.lettersShown) ? r.lettersShown : []) {
    const m = typeof k === 'string' ? /^status:(\d+)$/.exec(k) : null;
    if (m) top = Math.max(top, Number(m[1]));
  }
  return top;
}

/**
 * The status letter to show, if any: the highest tier in effect that's reached, whose code
 * isn't taken, and that no letter has covered yet (a letter covers its own tier and every
 * lower one). One at a time: someone restoring a long record gets one letter, not four.
 * The rule doesn't depend on the date; `today` is taken so callers pass the same arguments
 * as statusState.
 */
export function pendingStatusLetter(r: RecordState, today: DayKey, tiers: readonly StatusTier[]): Letter | null {
  const n = statusDays(r);
  const covered = shownUpTo(r);
  const due = tiers.filter(t => t.active && n >= t.day && t.day > covered && !statusTaken(r, t)).sort((a, b) => a.day - b.day);
  const top = due[due.length - 1];
  return top ? { kind: 'status', day: top.day, key: letterKey(top.day) } : null;
}

/**
 * The tier a status letter speaks for: the one in effect at the letter's day. null when the
 * config has since moved it or switched it off: the letter isn't shown.
 */
export function letterTier(letter: Letter, tiers: readonly StatusTier[]): StatusTier | null {
  return tiers.find(t => t.active && t.day === letter.day) ?? null;
}

/** The walker's place on the road, 0..1: piecewise-linear over 0 and each tier's day. */
export function roadAt(n: number, days: readonly number[]): number {
  const stops = [0, ...[...new Set(days.filter(d => d > 0))].sort((a, b) => a - b)];
  if (stops.length < 2 || n <= 0) return 0;
  const last = stops[stops.length - 1];
  if (n >= last) return 1;
  for (let i = 1; i < stops.length; i++) {
    if (n <= stops[i]) {
      const t = (n - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return (i - 1 + t) / (stops.length - 1);
    }
  }
  return 1;
}
