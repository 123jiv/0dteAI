// The membership as this phone keeps it (store `premium`), kept honest: what the store reports is
// saved as it is (plan, renewal, trial end, end date), the trial reminder follows it, and a
// membership this build can't stand behind is taken back at launch (services/purchases).
import { syncTrialReminder } from '../services/notifications';
import { getPlans, purchaseMode, revokesSaved, type EntitlementInfo, type PurchaseMode } from '../services/purchases';
import { EMPTY_PREMIUM, useApp } from './store';

/**
 * At launch, before RevenueCat answers (or when it can't: offline, or an 'unavailable' build):
 * a membership unlocked in preview mode is cleared in any build that isn't a preview. Then the
 * build's purchase mode is saved with it (null when nothing can be bought here).
 */
export function guardPremium(mode: PurchaseMode = purchaseMode): void {
  const s = useApp.getState();
  if (revokesSaved(s.premium, mode)) s.setPremium(EMPTY_PREMIUM);
  useApp.getState().setPremium({ mode: mode === 'unavailable' ? null : mode });
}

/** The price a trial turns into, from the offering (by product id); null when it can't be read. */
async function priceOf(productId: string | null): Promise<{ price: string; kind: EntitlementInfo['plan'] } | null> {
  if (!productId) return null;
  try {
    const plan = (await getPlans()).find(p => p.id === productId);
    return plan ? { price: plan.priceString, kind: plan.kind } : null;
  } catch {
    return null;
  }
}

/** How many answers setPremiumFrom has had: only the latest sets the trial reminder. */
let answers = 0;

/**
 * The store's answer about the membership (launch, foreground, RevenueCat's listener, a purchase,
 * a restore): saved whole, so the You row can say a trial or a cancelled subscription ends, and
 * the trial reminder rescheduled from it (a renewing trial gets one, 24 hours before it ends;
 * anything else cancels it).
 */
export function setPremiumFrom(active: boolean, info: EntitlementInfo): Promise<Date | null> {
  const e = active ? info : { plan: null, renews: null, productId: null, trialEnds: null, ends: null };
  useApp.getState().setPremium({ active, plan: e.plan, renews: e.renews, productId: e.productId, trialEnds: e.trialEnds, ends: e.ends });
  const answer = ++answers;
  const trialEnds = e.trialEnds;
  if (!trialEnds) return syncTrialReminder({ trialEnds: null });
  // The price lookup is async: a newer answer (a cancel heard meanwhile) wins over this one.
  return priceOf(e.productId).then(p => (answer === answers ? syncTrialReminder({ trialEnds, price: p?.price ?? null, kind: p?.kind ?? e.plan }) : null));
}
