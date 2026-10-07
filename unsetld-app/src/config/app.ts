// The one config constant. Change the name, IDs and links here.
// The display name shown under the app icon is set in app.json ("name").

export const AppConfig = {
  name: 'UNSETLD',
  tagline: 'Never settle for less.',
  appStoreName: 'UNSETLD: Daily Discipline',
  bundleId: 'com.unsetld.app',
  appGroup: 'group.com.unsetld.app',
  scheme: 'unsetld',

  /** RevenueCat public iOS SDK key. Leave empty to run the paywall in preview mode. */
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  entitlementId: 'premium',

  storeUrl: 'https://www.unsetld.com',
  shopUrl: 'https://www.unsetld.com/collections/hoodies',
  /** Server clock used to keep streaks honest (HTTPS Date header). */
  timeCheckUrl: 'https://www.unsetld.com',
  /** Optional JSON feed for drops and perks; see Web/app-feed.example.json. */
  perksFeedUrl: 'https://www.unsetld.com/app-feed.json',
  privacyUrl: 'https://www.unsetld.com/pages/app-privacy',
  termsUrl: 'https://www.unsetld.com/pages/app-terms',
  eulaUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  manageSubscriptionsUrl: 'https://apps.apple.com/account/subscriptions',

  /** Salt for the v1 monthly discount codes. Must match `npm run codes`. */
  codeSalt: 'unsetld-v1-2026',
  /** v2 server-verified ranks. When false, 15% and 20% tiers stay locked. */
  rankSyncEnabled: false,

  tiktokAccounts: ['@unsetldclo', '@unsetld'],
  instagram: '@unsetld',

  freeLaneLimit: 2,
  freeReminderLimit: 3,
  premiumReminderLimit: 12,
  freeThemeId: 'unsetld',
} as const;
