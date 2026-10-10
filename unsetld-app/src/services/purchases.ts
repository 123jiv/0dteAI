// UNSETLD+ purchases. Products, prices and the trial live in App Store Connect
// and RevenueCat; the app only reads the current Offering. Without a RevenueCat
// key (or in the browser preview) it runs in preview mode with sample products
// so the paywall can be tested end to end without charging anyone.
import { Platform } from 'react-native';
import { AppConfig } from '../config/app';
import { PREVIEW_PLANS } from './previewProducts';

export type PlanKind = 'annual' | 'monthly' | 'lifetime';

export interface Plan {
  id: string;
  kind: PlanKind;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  /** Free-trial length in days, if the product has a free intro offer. */
  trialDays: number | null;
  /** StoreKit says this user can still get the intro offer. */
  eligibleForTrial: boolean;
  native?: unknown;
}

export interface PurchaseOutcome {
  premium: boolean;
  plan: PlanKind | null;
  cancelled?: boolean;
}

export const purchaseMode: 'preview' | 'revenuecat' =
  Platform.OS === 'ios' && AppConfig.revenueCatIosKey ? 'revenuecat' : 'preview';

// Loaded lazily so the browser preview never touches the native module.
type RCModule = typeof import('react-native-purchases');
let rc: RCModule | null = null;
let configured = false;

function lib(): RCModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!rc) rc = require('react-native-purchases') as RCModule;
  return rc;
}

export async function initPurchases(onChange: (premium: boolean, info: EntitlementInfo) => void): Promise<void> {
  if (purchaseMode !== 'revenuecat' || configured) return;
  const Purchases = lib().default;
  Purchases.configure({ apiKey: AppConfig.revenueCatIosKey });
  configured = true;
  Purchases.addCustomerInfoUpdateListener(info => {
    const e = info.entitlements.active[AppConfig.entitlementId];
    onChange(Boolean(e), entitlementInfo(e));
  });
}

function kindOf(packageType: string): PlanKind | null {
  if (packageType === 'ANNUAL') return 'annual';
  if (packageType === 'MONTHLY') return 'monthly';
  if (packageType === 'LIFETIME') return 'lifetime';
  return null;
}

function trialDaysOf(intro: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null) {
  if (!intro || intro.price !== 0) return null;
  const per = intro.periodUnit === 'WEEK' ? 7 : intro.periodUnit === 'MONTH' ? 30 : intro.periodUnit === 'YEAR' ? 365 : 1;
  return intro.periodNumberOfUnits * per * Math.max(1, intro.cycles);
}

export async function getPlans(): Promise<Plan[]> {
  if (purchaseMode === 'preview') return PREVIEW_PLANS;
  const { default: Purchases, INTRO_ELIGIBILITY_STATUS } = lib();
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[AppConfig.offeringId] ?? offerings.current;
  const pkgs = offering?.availablePackages ?? [];
  const plans: Plan[] = [];
  for (const pkg of pkgs) {
    const kind = kindOf(pkg.packageType);
    if (!kind) continue;
    const p = pkg.product;
    plans.push({
      id: p.identifier,
      kind,
      title: p.title,
      price: p.price,
      priceString: p.priceString,
      currencyCode: p.currencyCode,
      trialDays: trialDaysOf(p.introPrice as never),
      eligibleForTrial: false,
      native: pkg,
    });
  }
  const withTrial = plans.filter(pl => pl.trialDays).map(pl => pl.id);
  if (withTrial.length) {
    try {
      const elig = await Purchases.checkTrialOrIntroductoryPriceEligibility(withTrial);
      for (const pl of plans) {
        pl.eligibleForTrial =
          elig[pl.id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
      }
    } catch {
      // Unknown eligibility: show neutral copy rather than promising a trial.
    }
  }
  const order: PlanKind[] = ['annual', 'monthly', 'lifetime'];
  return plans.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export async function purchase(plan: Plan): Promise<PurchaseOutcome> {
  if (purchaseMode === 'preview') return { premium: true, plan: plan.kind };
  const Purchases = lib().default;
  try {
    const res = await Purchases.purchasePackage(plan.native as never);
    const premium = Boolean(res.customerInfo.entitlements.active[AppConfig.entitlementId]);
    return { premium, plan: premium ? plan.kind : null };
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return { premium: false, plan: null, cancelled: true };
    throw e;
  }
}

export async function restore(): Promise<PurchaseOutcome> {
  if (purchaseMode === 'preview') return { premium: false, plan: null };
  const Purchases = lib().default;
  const info = await Purchases.restorePurchases();
  return { premium: Boolean(info.entitlements.active[AppConfig.entitlementId]), plan: null };
}

export interface EntitlementInfo {
  plan: PlanKind | null;
  /** ISO date the subscription renews, if it does. */
  renews: string | null;
}

function entitlementInfo(e: { productIdentifier: string; expirationDate: string | null; willRenew: boolean } | undefined): EntitlementInfo {
  if (!e) return { plan: null, renews: null };
  const id = e.productIdentifier;
  const plan: PlanKind = id.includes('lifetime') ? 'lifetime' : id.includes('monthly') ? 'monthly' : 'annual';
  return { plan, renews: e.willRenew ? e.expirationDate : null };
}

export async function refreshPremium(): Promise<{ active: boolean; info: EntitlementInfo } | null> {
  if (purchaseMode === 'preview') return null;
  const Purchases = lib().default;
  const info = await Purchases.getCustomerInfo();
  const e = info.entitlements.active[AppConfig.entitlementId];
  return { active: Boolean(e), info: entitlementInfo(e) };
}
