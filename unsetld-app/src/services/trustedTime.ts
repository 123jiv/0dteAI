import { Platform } from 'react-native';
import { AppConfig } from '../config/app';
import { getDayOffset } from './clock';

export interface TimeCheck {
  /** True when the phone's clock matches the server within tolerance. */
  verified: boolean;
  /** Phone clock is clearly wrong (more than 10 minutes off). */
  suspect: boolean;
  skewMs: number | null;
}

const TOLERANCE_MS = 10 * 60 * 1000;

/**
 * Compares the phone's clock to unsetld.com's HTTPS Date header so changing
 * the date in Settings can't farm streaks. No identifiers are sent.
 * The browser preview can't read that header (CORS), so it reports unverified.
 */
export async function checkTrustedTime(): Promise<TimeCheck> {
  if (Platform.OS === 'web' || getDayOffset() !== 0) {
    return { verified: false, suspect: false, skewMs: null };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(AppConfig.timeCheckUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    const header = res.headers.get('date');
    if (!header) return { verified: false, suspect: false, skewMs: null };
    const skew = Date.now() - new Date(header).getTime();
    const ok = Math.abs(skew) <= TOLERANCE_MS;
    return { verified: ok, suspect: !ok, skewMs: skew };
  } catch {
    return { verified: false, suspect: false, skewMs: null };
  }
}
