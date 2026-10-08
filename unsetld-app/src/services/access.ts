// Access: the remote switch, drops, check-in sync and claims, all on
// unsetld.com (see docs/ACCESS.md). Every call fails quietly; the app works
// without the network. Signed-in calls send the server's session token; a
// missing or rejected one (401) signs the phone out so the app asks to sign in
// again.
import { Linking, Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import type { DayKey } from '../core/time';
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
}

export async function fetchConfig(): Promise<RemoteConfig | null> {
  const json = await getJson<Partial<RemoteConfig>>(AppConfig.configUrl);
  if (!json || typeof json.accessEnabled !== 'boolean') return null;
  return { accessEnabled: json.accessEnabled, collection: String(json.collection ?? AppConfig.defaultCollection) };
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
export async function syncRecord(apple: SignedIn['apple'], days: DayKey[], proofs: { day: DayKey; count: number }[]): Promise<boolean> {
  if (IS_PREVIEW && Platform.OS === 'web') return true;
  if (!apple) return false;
  const body = { appleIdToken: apple.identityToken, authorizationCode: apple.authorizationCode, days, proofs };
  const res = await request<{ sessionToken?: string }>('sync', body);
  if (!res || res === 'signed-out' || !res.sessionToken) return false;
  return saveSession(res.sessionToken);
}

/** Today's count of proven tasks (0 to the daily cap). Only the date and the count go up, never a photo. */
export async function syncProof(day: DayKey, count: number) {
  await post('proof', { dayKey: day, count });
}

export type Perk = 'patch' | 'early-access' | 'piece-365';

/** 'needs-account': the session was gone or rejected, and the phone is now signed out. */
export type ClaimResult =
  | { ok: true; url: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'paused' | 'used' | 'needs-account' };

export type RedeemResult =
  | { ok: true; code: string; url: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'used' | 'short' | 'needs-account' };

/**
 * Trades points for a single-use code. The server recounts points from its own
 * proof days, mints the Shopify code and returns it with the URL that applies it.
 */
export async function redeem(points: number, percent: number): Promise<RedeemResult> {
  if (IS_PREVIEW && Platform.OS === 'web') {
    const code = `UNSETLD${percent}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return { ok: true, code, url: AppConfig.storeUrl, simulated: true };
  }
  const res = await post<{ code?: string; url?: string; error?: string }>('redeem', { points, percent });
  if (res === 'signed-out') return { ok: false, reason: 'needs-account' };
  if (res?.code && res.url) return { ok: true, code: res.code, url: res.url };
  if (res?.error === 'used' || res?.error === 'short') return { ok: false, reason: res.error };
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
