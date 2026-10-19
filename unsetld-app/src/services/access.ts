// Access: the remote switch, drops, check-in sync and reward codes, all on
// unsetld.com (see docs/ACCESS.md). Every call fails quietly; the app works
// without the network. Signed-in calls send the server's session token; a
// missing or rejected one (401) signs the phone out so the app asks to sign in
// again.
import { Linking, Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { parseMetricsSwitch } from '../core/metrics';
import { parseRewards, parseStatus, statusFromMilestones } from '../core/rewards';
import type { DayKey } from '../core/time';
import type { RewardTier, StatusTier } from '../core/types';
import { MILESTONES } from '../content';
import { useApp } from '../state/store';
import { saveSession, sessionToken, signOutApple, type SignedIn } from './account';
import type { Drop } from './notifications';

/** The config parsers live in core/rewards (pure, unit-tested); kept here for older imports. */
export { parseRewards, parseRewardTier, parseStatus } from '../core/rewards';

async function getJson<T>(url: string): Promise<T | null> {
  if (Platform.OS === 'web') return null; // the preview makes no outside requests
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The JSON reply, 'signed-out' when the server answered 401, or null on any other failure. */
type Reply<T> = T | 'signed-out' | null;

async function request<T>(path: string, body: object, session?: string): Promise<Reply<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${AppConfig.apiBase}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 401) return 'signed-out';
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function signOutHere() {
  await signOutApple();
  useApp.getState().signOut();
}

/** A signed-in call. With no session, or one the server rejects, the phone signs out. */
async function post<T>(path: string, body: object): Promise<Reply<T>> {
  if (Platform.OS !== 'ios') return null; // the preview has no server
  let session: string | null;
  try {
    session = await sessionToken();
  } catch {
    return null; // the Keychain is locked; try again later
  }
  const res = session ? await request<T>(path, body, session) : 'signed-out';
  if (res === 'signed-out') await signOutHere();
  return res;
}

/** The status tiers built in (content/milestones.json); the config's `status` list replaces them. */
export const STATUS_DEFAULTS: readonly StatusTier[] = statusFromMilestones(MILESTONES);

export interface RemoteConfig {
  accessEnabled: boolean;
  collection: string;
  /**
   * Reward tiers from unsetld.com, valid entries only. null when the config
   * sent none (or none were valid): the app then uses content/rewards.json.
   */
  rewards: RewardTier[] | null;
  /**
   * UNSETLD status tiers (by active days) from unsetld.com, valid entries only.
   * null when the config sent none (or none were valid): the app then uses
   * content/milestones.json.
   */
  status: StatusTier[] | null;
  /** Anonymous usage counts may be sent (docs/METRICS.md). Only a literal true; absent is false. */
  metrics: boolean;
}

export async function fetchConfig(): Promise<RemoteConfig | null> {
  const json = await getJson<Partial<Record<keyof RemoteConfig, unknown>>>(AppConfig.configUrl);
  if (!json || typeof json.accessEnabled !== 'boolean') return null;
  return {
    accessEnabled: json.accessEnabled,
    collection: String(json.collection ?? AppConfig.defaultCollection),
    rewards: parseRewards(json.rewards),
    status: parseStatus(json.status),
    metrics: parseMetricsSwitch(json.metrics),
  };
}

/**
 * A drop as drops.json should send it: an id, a collection and the time it opens to everyone.
 * Anything else an entry carries (an older file's `earlyAt`) is left out.
 */
function toDrop(d: unknown): Drop | null {
  if (!d || typeof d !== 'object') return null;
  const { id, collection, publicAt } = d as Record<string, unknown>;
  if (typeof id !== 'string' || typeof collection !== 'string' || typeof publicAt !== 'string') return null;
  return Number.isFinite(Date.parse(publicAt)) ? { id, collection, publicAt } : null;
}

/**
 * Valid entries only (a hand-edited file can hold a null or a half-filled drop); an empty list
 * means no drops. Null when the fetch fails, so the alerts already scheduled can stay.
 */
export async function fetchDrops(): Promise<Drop[] | null> {
  const json = await getJson<{ drops?: unknown }>(AppConfig.dropsUrl);
  return Array.isArray(json?.drops) ? json.drops.map(toDrop).filter((d): d is Drop => d !== null) : null;
}

/** One check-in per account per server day. */
export async function syncCheckIn(day: DayKey) {
  await post('checkin', { dayKey: day });
}

/**
 * Sign-in: trades Apple's identity token and one-time authorization code for
 * the server's session token, and sends the locally verified days (and the
 * days with proof) so the server can hold the user's place. False if it failed;
 * the phone then stays signed out. The preview simulates it.
 */
export async function syncRecord(apple: SignedIn['apple'], days: DayKey[], proofs: { day: DayKey; count: number; points?: number }[]): Promise<boolean> {
  if (IS_PREVIEW && Platform.OS === 'web') return true;
  if (!apple) return false;
  const body = { appleIdToken: apple.identityToken, authorizationCode: apple.authorizationCode, days, proofs };
  const res = await request<{ sessionToken?: string }>('sync', body);
  if (!res || res === 'signed-out' || !res.sessionToken) return false;
  return saveSession(res.sessionToken);
}

/**
 * Today's count of proven missions and, since 3.0, the points they earned
 * (missions plus the perfect-day bonus), so the server can recount a balance
 * at redeem time. Only the date and the numbers go up, never a photo.
 */
export async function syncProof(day: DayKey, count: number, points?: number) {
  await post('proof', { dayKey: day, count, ...(points === undefined ? {} : { points }) });
}

/**
 * ok: the code, the URL that applies it and, when the server sends it, its last day
 * (`expires`, YYYY-MM-DD). A status code taken before comes back this way too, with its own
 * last day, so a phone that never got the first reply still gets the code.
 * 'used': taken as many times as allowed this collection (or ever, for a one-time
 * reward); for a status code, only from a server that doesn't send the code again.
 * 'cooldown': taken within its redemptionCooldownDays. 'short': the server counts
 * fewer points (for a status code: fewer active days). 'unavailable': switched
 * off, out of its dates or sold out. 'needs-account': the session was gone or
 * rejected, and the phone is now signed out.
 */
export type RedeemResult =
  | { ok: true; code: string; url: string; expires?: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'used' | 'cooldown' | 'short' | 'unavailable' | 'needs-account' };

/** The preview's made-up code, shaped like the real ones: UNSETLD10-XXXXXX. */
function previewCode(tier: RewardTier): string {
  return `UNSETLD${tier.percent ?? ''}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * The status tier a reward stands for, when it's one (core/rewards statusReward: no points,
 * one time only): from the config's status list, else the built-in tiers.
 */
function statusFor(tier: RewardTier): StatusTier | null {
  if (tier.points !== 0 || !tier.oneTimeOnly) return null;
  const remote = useApp.getState().remote.status ?? [];
  return remote.find(t => t.id === tier.id) ?? STATUS_DEFAULTS.find(t => t.id === tier.id) ?? null;
}

/**
 * Trades points for a reward, or takes a status code. For points, the server
 * recounts them from its own proof days; for a status code (`kind: 'status'`) it
 * counts the user's active days itself. Either way it checks the tier against its
 * own config (dates, inventory, per collection, one-time, cooldown, minimum
 * purchase), mints the code and returns it with the URL that applies it. A status
 * code the user already took comes back again rather than as 'used' (one per
 * person, ever, so a reply lost to the timeout must not lose the code).
 * The browser preview simulates it.
 */
export async function redeem(tier: RewardTier): Promise<RedeemResult> {
  if (IS_PREVIEW && Platform.OS === 'web') return { ok: true, code: previewCode(tier), url: AppConfig.storeUrl, simulated: true };
  // The server checks the tier against its own config; these are sent so it can log a mismatch.
  const status = statusFor(tier);
  const body = status
    ? { rewardId: tier.id, kind: 'status', day: status.day, percent: status.percent, maxOff: status.maxOff ?? null, codeValidDays: status.codeValidDays }
    : { rewardId: tier.id, points: tier.points, type: tier.type, percent: tier.percent ?? null, minimumPurchase: tier.minimumPurchase ?? null };
  const res = await post<{ code?: string; url?: string; expires?: string; error?: string }>('redeem', body);
  if (res === 'signed-out') return { ok: false, reason: 'needs-account' };
  if (res?.code && res.url) return { ok: true, code: res.code, url: res.url, ...(typeof res.expires === 'string' ? { expires: res.expires } : {}) };
  if (res?.error === 'used' || res?.error === 'cooldown' || res?.error === 'short' || res?.error === 'unavailable') return { ok: false, reason: res.error };
  return { ok: false, reason: 'network' };
}

/**
 * Deletes the account on unsetld.com (the server also revokes the Apple token)
 * and then signs out on this phone. The record and photos stay on the phone.
 * 'failed' if the server didn't confirm. 'needs-account' if the session was
 * gone or rejected: the phone is signed out but the account may still be there,
 * so the user has to sign in again to delete it. The preview simulates it.
 */
export async function deleteAccount(): Promise<'deleted' | 'failed' | 'needs-account'> {
  if (!(IS_PREVIEW && Platform.OS === 'web')) {
    const res = await post<{ deleted?: boolean }>('account/delete', {});
    if (res === 'signed-out') return 'needs-account';
    if (!res?.deleted) return 'failed';
  }
  await signOutHere();
  return 'deleted';
}

/** Store links open in Safari (or a new tab in the preview), never an in-app browser. */
export function openStore(url: string = AppConfig.storeUrl) {
  Linking.openURL(url).catch(() => {});
}
