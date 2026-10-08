// Access: the remote switch, drops, check-in sync and claims, all on
// unsetld.com (see docs/DESIGN_SPEC.md section 5). Every call fails quietly;
// the app works without the network.
import { Linking, Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import type { DayKey } from '../core/time';
import { identityToken } from './account';
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

async function post<T>(path: string, body: object): Promise<T | null> {
  const token = await identityToken();
  if (!token) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${AppConfig.apiBase}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appleIdToken: token, ...body }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
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

export async function fetchDrops(): Promise<Drop[]> {
  const json = await getJson<{ drops?: Drop[] }>(AppConfig.dropsUrl);
  return Array.isArray(json?.drops) ? json!.drops! : [];
}

/** One check-in per account per server day. */
export async function syncCheckIn(day: DayKey) {
  await post('checkin', { dayKey: day });
}

/** First sign-in: send the locally verified days (and the days with proof) so the server can hold the user's place. */
export async function syncRecord(days: DayKey[], proofDays: DayKey[]) {
  await post('sync', { days, proofDays });
}

/** One proof per account per server day. Only the date goes up, never the photo. */
export async function syncProof(day: DayKey) {
  await post('proof', { dayKey: day });
}

export type Perk = 'patch' | 'early-access' | 'piece-365';

export type ClaimResult = { ok: true; url: string; simulated?: boolean } | { ok: false; reason: 'network' | 'paused' | 'used' };

export type RedeemResult =
  | { ok: true; code: string; url: string; simulated?: boolean }
  | { ok: false; reason: 'network' | 'used' | 'short' };

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
  if (res?.url) return { ok: true, url: res.url };
  if (res?.error === 'paused' || res?.error === 'used') return { ok: false, reason: res.error };
  return { ok: false, reason: 'network' };
}

/** Store links open in Safari (or a new tab in the preview), never an in-app browser. */
export function openStore(url: string = AppConfig.storeUrl) {
  Linking.openURL(url).catch(() => {});
}
