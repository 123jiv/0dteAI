// The one config constant. Change IDs and links here.
// The display name shown under the app icon is set in app.json ("name").
import { Platform } from 'react-native';

export const AppConfig = {
  name: 'UNSETLD',
  appStoreName: 'UNSETLD: Daily Discipline',
  version: '3.1.0',
  bundleId: 'com.unsetld.app',
  appGroup: 'group.com.unsetld.app',
  scheme: 'unsetld',

  /** RevenueCat public iOS SDK key. Leave empty to run the paywall in preview mode. */
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  entitlementId: 'full_edition',
  offeringId: 'default',

  storeUrl: 'https://www.unsetld.com',
  /** Server clock used to keep the record honest (HTTPS Date header). */
  timeCheckUrl: 'https://www.unsetld.com',
  /** { accessEnabled, collection, collectionName } */
  configUrl: 'https://www.unsetld.com/api/app/config.json',
  /** { drops: [{ id, collection, publicAt, earlyAt }] } */
  dropsUrl: 'https://www.unsetld.com/api/app/drops.json',
  apiBase: 'https://www.unsetld.com/api/app',
  privacyUrl: 'https://www.unsetld.com/pages/app-privacy',
  termsUrl: 'https://www.unsetld.com/pages/app-terms',
  eulaUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  manageSubscriptionsUrl: 'https://apps.apple.com/account/subscriptions',
  contactEmail: 'unsetldclothing@gmail.com',

  /**
   * Access stays hidden until unsetld.com's config says it's on (the claim
   * backend has to exist first). The browser preview simulates it so the
   * whole product can be seen.
   */
  accessDefault: Platform.OS === 'web',
  /** Current collection (one code each collection) until the config says otherwise. */
  defaultCollection: '004',
} as const;

/** Tester tools and the "Preview build" line: dev builds and the browser preview only. */
export const IS_PREVIEW = __DEV__ || Platform.OS === 'web';
