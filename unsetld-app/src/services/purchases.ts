// UNSETLD+ purchases. Products, prices and the trial live in App Store Connect
// and RevenueCat; the app only reads the current Offering.
//
// It fails closed. Only an iPhone build with a real App Store key (appl_, or any key in a dev
// build) talks to RevenueCat. Dev builds and the browser preview without one run in preview
// mode, with sample products, so the paywall can be tested end to end without charging anyone.
// Every other build (a release build with no key or a test_ key, the EAS preview profile, any
// non-iPhone release) is 'unavailable': nothing can be bought, and nothing is ever unlocked.
import { Platform } from 'react-native';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { trialEnd, trialOf, type Trial } from '../core/trial';
import { PREVIEW_PLANS } from './previewProducts';

export type PlanKind = 'annual' | 'monthly' | 'lifetime';

export interface Plan {
  id: string;
  kind: PlanKind;
  title: string;
  price: number;
  priceString: string;
  currencyCode: string;
  /** The free trial the product's intro offer gives, if it has one (core/trial trialOf). */
  trial: Trial | null;
  /** StoreKit says this user can still get the intro offer. */
  eligibleForTrial: boolean;
  native?: unknown;
}

export interface PurchaseOutcome {
  premium: boolean;
  plan: PlanKind | null;
  cancelled?: boolean;
  /** Ask to Buy: waiting for a parent's approval. Nothing was charged yet. */
  pending?: boolean;
  /** The membership as the store reports it after the purchase or restore (null in preview mode). */
  info?: EntitlementInfo | null;
}

/**
 * - 'revenuecat': the App Store, through RevenueCat (sandbox in dev and TestFlight builds).
 * - 'preview': sample products, no charge, "Preview build. No charge." (dev builds and the browser).
 * - 'unavailable': nothing to buy and nothing unlocked (any other build).
 */
export type PurchaseMode = 'revenuecat' | 'preview' | 'unavailable';

/**
 * Which purchase path a build takes. A release build only reaches RevenueCat with an App Store
 * key (appl_): a missing key or a Test Store key (test_) must never unlock UNSETLD+ for free.
 */
export function purchaseModeFor({ os, isDev, isPreview, key }: { os: string; isDev: boolean; isPreview: boolean; key: string | null | undefined }): PurchaseMode {
  const k = (key ?? '').trim();
  if (os === 'ios' && k && (isDev || k.startsWith('appl_'))) return 'revenuecat';
  if (isPreview) return 'preview';
  return 'unavailable';
}

export const purchaseMode: PurchaseMode = purchaseModeFor({
  os: Platform.OS,
  isDev: typeof __DEV__ !== 'undefined' && __DEV__,
  isPreview: IS_PREVIEW,
  key: AppConfig.revenueCatIosKey,
});

/**
 * A membership saved on this phone that this build can't stand behind: one unlocked in preview
 * mode (or by tester tools in a keyless build) is taken back at launch in any build that isn't
 * itself a preview, without waiting for RevenueCat to answer.
 */
export function revokesSaved(saved: { active: boolean; mode: string | null }, mode: PurchaseMode): boolean {
  return mode !== 'preview' && saved.active && saved.mode !== 'revenuecat';
}

/** Thrown in an 'unavailable' build: UNSETLD+ can't be bought or restored here. */
export class PurchasesUnavailable extends Error {
  constructor() {
    super('UNSETLD+ is not available in this build');
    this.name = 'PurchasesUnavailable';
  }
}

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

/** The plan types of the products last offered, by product id (entitlementInfo reads it). */
const kindById = new Map<string, PlanKind>(PREVIEW_PLANS.map(p => [p.id, p.kind]));

export async function getPlans(): Promise<Plan[]> {
  if (purchaseMode === 'unavailable') throw new PurchasesUnavailable();
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
    kindById.set(p.identifier, kind);
    plans.push({
      id: p.identifier,
      kind,
      title: p.title,
      price: p.price,
      priceString: p.priceString,
      currencyCode: p.currencyCode,
      // Lifetime is a one-off purchase: never a trial.
      trial: kind === 'lifetime' ? null : trialOf(p.introPrice),
      eligibleForTrial: false,
      native: pkg,
    });
  }
  const withTrial = plans.filter(pl => pl.trial).map(pl => pl.id);
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

/** RevenueCat's PURCHASES_ERROR_CODE values the paywall tells apart. */
const CANCELLED = '1';
/** Ask to Buy: the purchase waits for a parent's approval. */
const PAYMENT_PENDING = '20';

/**
 * A purchase that went through, from the entitlement the store returned with it: UNSETLD+ when
 * the entitlement is active, else "received" (premium false, not cancelled, not pending), which
 * the paywall answers with "If UNSETLD+ doesn't open in a minute, tap Restore."
 */
export function purchasedOutcome(active: StoreEntitlement | undefined | null, bought: PlanKind): PurchaseOutcome {
  const info = entitlementInfo(active);
  return { premium: Boolean(active), plan: active ? (info.plan ?? bought) : null, info };
}

/** A purchase that threw: cancelled, waiting for Ask to Buy, or null for a real failure (rethrown). */
export function failedOutcome(err: unknown): PurchaseOutcome | null {
  const e = (err ?? {}) as { userCancelled?: boolean | null; code?: unknown };
  const code = String(e.code ?? '');
  if (e.userCancelled || code === CANCELLED) return { premium: false, plan: null, cancelled: true };
  if (code === PAYMENT_PENDING) return { premium: false, plan: null, pending: true };
  return null;
}

/**
 * Preview mode's stand-in for the store's answer after a purchase, so the You row and the trial
 * reminder can be tried in a dev build: a trial if the sample product offers one, else a
 * subscription renewing after one period. Never used by a build that sells for real.
 */
export function previewEntitlement(plan: Plan, now: Date): EntitlementInfo {
  if (plan.kind === 'lifetime') return { ...NO_ENTITLEMENT, plan: 'lifetime', productId: plan.id };
  const trial = plan.trial && plan.eligibleForTrial ? plan.trial : null;
  const end = trialEnd(now, trial ?? { unit: plan.kind === 'monthly' ? 'month' : 'year', count: 1 }).toISOString();
  return { plan: plan.kind, productId: plan.id, renews: end, trialEnds: trial ? end : null, ends: null };
}

export async function purchase(plan: Plan): Promise<PurchaseOutcome> {
  if (purchaseMode === 'unavailable') throw new PurchasesUnavailable();
  if (purchaseMode === 'preview') return { premium: true, plan: plan.kind, info: previewEntitlement(plan, new Date()) };
  const Purchases = lib().default;
  let res: Awaited<ReturnType<typeof Purchases.purchasePackage>>;
  try {
    res = await Purchases.purchasePackage(plan.native as never);
  } catch (err) {
    const out = failedOutcome(err);
    if (out) return out;
    throw err;
  }
  return purchasedOutcome(res.customerInfo.entitlements.active[AppConfig.entitlementId], plan.kind);
}

export async function restore(): Promise<PurchaseOutcome> {
  if (purchaseMode === 'unavailable') throw new PurchasesUnavailable();
  if (purchaseMode === 'preview') return { premium: false, plan: null, info: null };
  const Purchases = lib().default;
  const res = await Purchases.restorePurchases();
  const e = res.entitlements.active[AppConfig.entitlementId];
  const info = entitlementInfo(e);
  return { premium: Boolean(e), plan: info.plan, info };
}

export interface EntitlementInfo {
  plan: PlanKind | null;
  /** ISO date the subscription renews, if it does. */
  renews: string | null;
  /** The store product that unlocked it. */
  productId: string | null;
  /** ISO date a free trial ends, while in one that will renew (a charge follows). */
  trialEnds: string | null;
  /** ISO date the membership ends, when it won't renew (cancelled; Lifetime never ends). */
  ends: string | null;
}

export const NO_ENTITLEMENT: EntitlementInfo = { plan: null, renews: null, productId: null, trialEnds: null, ends: null };

/** The parts of RevenueCat's PurchasesEntitlementInfo the app reads. */
export interface StoreEntitlement {
  productIdentifier: string;
  expirationDate: string | null;
  willRenew: boolean;
  periodType?: string | null;
}

/**
 * What the app keeps of an active entitlement. The plan type comes from the product's package in
 * the offering when it has been seen, else from its id ("lifetime", "monthly", else annual).
 */
export function entitlementInfo(e: StoreEntitlement | undefined | null): EntitlementInfo {
  if (!e) return NO_ENTITLEMENT;
  const id = e.productIdentifier;
  const plan: PlanKind = kindById.get(id) ?? (/lifetime/i.test(id) ? 'lifetime' : /month/i.test(id) ? 'monthly' : 'annual');
  const expires = e.expirationDate ?? null;
  const trial = String(e.periodType ?? '').toUpperCase() === 'TRIAL';
  return {
    plan,
    productId: id,
    renews: e.willRenew ? expires : null,
    trialEnds: trial && e.willRenew ? expires : null,
    ends: !e.willRenew && plan !== 'lifetime' ? expires : null,
  };
}

/**
 * The store's current answer. null in preview mode (the saved state stands); in an 'unavailable'
 * build always inactive, so a membership saved by an earlier build is cleared.
 */
export async function refreshPremium(): Promise<{ active: boolean; info: EntitlementInfo } | null> {
  if (purchaseMode === 'unavailable') return { active: false, info: NO_ENTITLEMENT };
  if (purchaseMode === 'preview') return null;
  const Purchases = lib().default;
  const info = await Purchases.getCustomerInfo();
  const e = info.entitlements.active[AppConfig.entitlementId];
  return { active: Boolean(e), info: entitlementInfo(e) };
}
