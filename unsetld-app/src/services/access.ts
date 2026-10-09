// Access: the remote switch, drops, check-in sync and claims, all on
// unsetld.com (see docs/ACCESS.md). Every call fails quietly; the app works
// without the network. Signed-in calls send the server's session token; a
// missing or rejected one (401) signs the phone out so the app asks to sign in
// again.
import { Linking, Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import type { DayKey } from '../core/time';
import type { RewardTier, RewardType } from '../core/types';
import { useApp } from '../state/store';
import { saveSession, sessionToken, signOutApple, type SignedIn } from './account';
import type { Drop } from './notifications';

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

export interface RemoteConfig {
  accessEnabled: boolean;
  collection: string;
  /**
   * Reward tiers from unsetld.com, valid entries only. null when the config
   * sent none (or none were valid): the app then uses content/rewards.json.
   */
  rewards: RewardTier[] | null;
}

export async function fetchConfig(): Promise<RemoteConfig | null> {
  const json = await getJson<Partial<Record<keyof RemoteConfig, unknown>>>(AppConfig.configUrl);
  if (!json || typeof json.accessEnabled !== 'boolean') return null;
  return {
    accessEnabled: json.accessEnabled,
    collection: String(json.collection ?? AppConfig.defaultCollection),
    rewards: parseRewards(json.rewards),
  };
}

const REWARD_TYPES: readonly RewardType[] = ['discount', 'free-shipping', 'early-access', 'limited', 'drop'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

const isCount = (v: unknown, min: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
/** A date the window can compare against (YYYY-MM-DD first), or nothing. */
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

/** Null when the fetch fails, so the alerts already scheduled can stay. */
export async function fetchDrops(): Promise<Drop[] | null> {
  const json = await getJson<{ drops?: Drop[] }>(AppConfig.dropsUrl);
  return Array.isArray(json?.drops) ? json.drops : null;
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

export type Perk = 'patch' | 'early-access' | 'piece-365';

/** 'needs-account': the session was gone or rejected, and the phone is now signed out. */
export type ClaimResult =
  | { ok: true; url: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'paused' | 'used' | 'needs-account' };

/**
 * 'used': taken as many times as allowed this collection. 'short': the server
 * counts fewer points. 'unavailable': switched off, out of its dates or sold out.
 */
export type RedeemResult =
  | { ok: true; code: string; url: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'used' | 'short' | 'unavailable' | 'needs-account' };

/** The preview's made-up code, shaped like the real ones: UNSETLD10-, UNSETLDSHIP-, UNSETLD-. */
function previewCode(tier: RewardTier): string {
  const kind = tier.type === 'discount' && tier.percent ? String(tier.percent) : tier.type === 'free-shipping' ? 'SHIP' : '';
  return `UNSETLD${kind}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Trades points for a reward. The server recounts points from its own proof
 * days, checks the tier against its own config (dates, inventory, one per
 * collection), mints the code and returns it with the URL that applies it.
 * The browser preview simulates it.
 */
export async function redeem(tier: RewardTier): Promise<RedeemResult> {
  if (IS_PREVIEW && Platform.OS === 'web') return { ok: true, code: previewCode(tier), url: AppConfig.storeUrl, simulated: true };
  const body = { rewardId: tier.id, points: tier.points, type: tier.type, percent: tier.percent ?? null };
  const res = await post<{ code?: string; url?: string; error?: string }>('redeem', body);
  if (res === 'signed-out') return { ok: false, reason: 'needs-account' };
  if (res?.code && res.url) return { ok: true, code: res.code, url: res.url };
  if (res?.error === 'used' || res?.error === 'short' || res?.error === 'unavailable') return { ok: false, reason: res.error };
  return { ok: false, reason: 'network' };
}

/**
 * Claims a milestone (patch, early access, the 365 piece) and returns the store URL.
 * Preview builds simulate the claim and open the store front.
 */
export async function claim(perk: Perk): Promise<ClaimResult> {
  if (IS_PREVIEW && Platform.OS === 'web') return { ok: true, url: AppConfig.storeUrl, simulated: true };
  const res = await post<{ url?: string; error?: string }>('claim', { perk });
  if (res === 'signed-out') return { ok: false, reason: 'needs-account' };
  if (res?.url) return { ok: true, url: res.url };
  if (res?.error === 'paused' || res?.error === 'used') return { ok: false, reason: res.error };
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
