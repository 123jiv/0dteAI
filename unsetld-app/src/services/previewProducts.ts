import type { Plan } from './purchases';

// Sample products used ONLY in preview mode (browser preview, or no RevenueCat
// key yet). They mirror what should be configured in App Store Connect and
// RevenueCat. Real builds read prices from StoreKit and never use these.
export const PREVIEW_PLANS: Plan[] = [
  {
    id: 'unsetld_full_annual',
    kind: 'annual',
    title: 'Full Edition (Annual)',
    price: 24.99,
    priceString: '$24.99',
    currencyCode: 'USD',
    trialDays: 3,
    eligibleForTrial: true,
  },
  {
    id: 'unsetld_full_monthly',
    kind: 'monthly',
    title: 'Full Edition (Monthly)',
    price: 4.99,
    priceString: '$4.99',
    currencyCode: 'USD',
    trialDays: null,
    eligibleForTrial: false,
  },
  {
    id: 'unsetld_full_lifetime',
    kind: 'lifetime',
    title: 'Full Edition (Lifetime)',
    price: 39.99,
    priceString: '$39.99',
    currencyCode: 'USD',
    trialDays: null,
    eligibleForTrial: false,
  },
];
