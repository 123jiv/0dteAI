import type { Plan } from './purchases';

// Sample products used ONLY in preview mode (browser preview, or no RevenueCat
// key yet). They mirror what should be configured in App Store Connect and
// RevenueCat. Real builds read prices from StoreKit and never use these.
export const PREVIEW_PLANS: Plan[] = [
  {
    id: 'unsetld.premium.annual',
    kind: 'annual',
    title: 'UNSETLD Premium (Yearly)',
    price: 24.99,
    priceString: '$24.99',
    currencyCode: 'USD',
    trialDays: 3,
    eligibleForTrial: true,
  },
  {
    id: 'unsetld.premium.monthly',
    kind: 'monthly',
    title: 'UNSETLD Premium (Monthly)',
    price: 4.99,
    priceString: '$4.99',
    currencyCode: 'USD',
    trialDays: null,
    eligibleForTrial: false,
  },
  {
    id: 'unsetld.premium.lifetime',
    kind: 'lifetime',
    title: 'UNSETLD Premium (Lifetime)',
    price: 39.99,
    priceString: '$39.99',
    currencyCode: 'USD',
    trialDays: null,
    eligibleForTrial: false,
  },
];
