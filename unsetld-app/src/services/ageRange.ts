// Apple's Declared Age Range (launch pass P0-4), through expo-age-range. Asked only on iOS 26 or
// later, and only where Apple says age rules apply to this account (isEligibleForAgeFeaturesAsync,
// iOS 26.2+). Anything short of a range someone declared (a decline, no service, an older iOS, the
// module's simulated adult) is null, and the Age screen asks for the birth year instead.
import { Platform } from 'react-native';
import { AGE_GATES, appleAnswer, canAskApple, type AgeResult, type AppleAgeRange } from '../core/age';

/** The two calls the gate makes. */
export interface AgeRangeApi {
  isEligibleForAgeFeaturesAsync: () => Promise<boolean | null>;
  requestAgeRangeAsync: (options: { threshold1: number; threshold2?: number; threshold3?: number }) => Promise<AppleAgeRange>;
}

// Loaded lazily: the browser preview and Android never touch the native module, and a dev
// client built before the module was added doesn't crash on launch.
let api: AgeRangeApi | null = null;
function lib(): AgeRangeApi | null {
  if (api) return api;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    api = require('expo-age-range') as AgeRangeApi;
  } catch {
    api = null;
  }
  return api;
}

/** The gate's question to Apple, for any platform and module (tests pass their own). */
export async function askWith(os: string, version: string | number | undefined, mod: AgeRangeApi | null): Promise<AgeResult | null> {
  if (!mod || !canAskApple(os, version)) return null;
  try {
    // true only: false means no age rules apply here, null that Apple can't say (before iOS 26.2).
    if ((await mod.isEligibleForAgeFeaturesAsync()) !== true) return null;
    return appleAnswer(await mod.requestAgeRangeAsync({ ...AGE_GATES }));
  } catch {
    // Declined (ERR_AGE_RANGE_USER_DECLINED), not available, no window to show it in.
    return null;
  }
}

/** Apple's answer on this phone, or null for the year question. */
export function askAppleAgeRange(): Promise<AgeResult | null> {
  if (!canAskApple(Platform.OS, Platform.Version)) return Promise.resolve(null);
  return askWith(Platform.OS, Platform.Version, lib());
}
