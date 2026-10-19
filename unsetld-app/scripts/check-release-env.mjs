#!/usr/bin/env node
// Runs on EAS Build before `npm install` (the `eas-build-pre-install` npm hook in package.json).
// A production iPhone build must carry the RevenueCat App Store key (appl_...): without one the
// app can't sell UNSETLD+ (services/purchases fails closed to 'unavailable'), so the build stops
// here instead of reaching the App Store. Set the key as an EAS environment variable in the
// production environment (README, "Before launch" 1).
//
//   EAS_BUILD_PROFILE=production EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_... node scripts/check-release-env.mjs
import { pathToFileURL } from 'node:url';

/**
 * What a build's environment means for UNSETLD+. Only a production build is checked; other
 * profiles (development, preview) may run without a key: the app then shows preview mode in a
 * dev build, or UNSETLD+ as unavailable in any other.
 * @param {Record<string, string | undefined>} env
 * @returns {{ ok: boolean, message: string }}
 */
export function checkReleaseEnv(env) {
  const profile = env.EAS_BUILD_PROFILE ?? '';
  const platform = env.EAS_BUILD_PLATFORM ?? '';
  const key = (env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '').trim();
  if (profile !== 'production') return { ok: true, message: `check-release-env: ${profile || 'local'} build, nothing to check.` };
  if (platform === 'android') return { ok: true, message: 'check-release-env: Android build, UNSETLD+ is iPhone only.' };
  if (!key) {
    return {
      ok: false,
      message:
        'check-release-env: EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set for this production build. ' +
        'Add the RevenueCat public App Store key (appl_...) as an EAS environment variable in the production environment.',
    };
  }
  if (!key.startsWith('appl_')) {
    return {
      ok: false,
      message:
        'check-release-env: EXPO_PUBLIC_REVENUECAT_IOS_KEY is not an App Store key (it must start with appl_). ' +
        'A Test Store key (test_) never sells UNSETLD+ in a release build.',
    };
  }
  return { ok: true, message: 'check-release-env: production RevenueCat key present.' };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { ok, message } = checkReleaseEnv(process.env);
  (ok ? console.log : console.error)(message);
  process.exit(ok ? 0 : 1);
}
