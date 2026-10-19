// The membership kept on this phone (state/premium): a preview-mode unlock is taken back at launch
// in a store build without waiting for RevenueCat (P0-1), a RevenueCat one stays; the store's
// answer is saved whole (plan, renewal, trial end, end date) and the trial reminder follows it
// (P1-10). Hydrates the real store from a seeded storage entry, as a saved v7 and v8 state.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { map: new Map<string, string>(), synced: [] as unknown[], plans: null as unknown };
});

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({
  appStorage: {
    getItem: (k: string) => mem.map.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.map.set(k, v),
    removeItem: (k: string) => void mem.map.delete(k),
  },
}));
vi.mock('../../services/proof', () => ({ deletePhoto: () => undefined }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));
vi.mock('../../services/notifications', () => ({
  syncTrialReminder: async (input: unknown) => {
    mem.synced.push(input);
    return null;
  },
}));
vi.mock('../../services/purchases', async orig => ({
  ...(await orig<typeof import('../../services/purchases')>()),
  getPlans: async () => {
    if (!mem.plans) throw new Error('offline');
    return mem.plans;
  },
}));

const premium = (p: object) => ({ active: true, plan: 'annual', renews: '2027-01-01T00:00:00Z', mode: 'preview', ...p });

async function load(saved: object, version = 8) {
  mem.map.clear();
  mem.synced = [];
  mem.map.set('unsetld-v2', JSON.stringify({ state: { installSalt: 'salt-p', settings: { onboarded: true }, premium: saved }, version }));
  vi.resetModules();
  const store = await import('../store');
  const p = await import('../premium');
  const purchases = await import('../../services/purchases');
  await new Promise(r => setTimeout(r, 0));
  return { ...store, ...p, purchases };
}

describe('the saved membership at launch', () => {
  beforeEach(() => {
    mem.plans = null;
  });

  it('a preview-mode unlock is cleared in a store build, offline, before RevenueCat answers', async () => {
    const { useApp, guardPremium, EMPTY_PREMIUM } = await load(premium({ mode: 'preview' }));
    expect(useApp.getState().premium.active).toBe(true);
    guardPremium('revenuecat');
    expect(useApp.getState().premium).toEqual({ ...EMPTY_PREMIUM, mode: 'revenuecat' });
  });

  it('and in a build that sells nothing, which keeps no mode', async () => {
    const { useApp, guardPremium } = await load(premium({ mode: 'preview' }));
    guardPremium('unavailable');
    expect(useApp.getState().premium.active).toBe(false);
    expect(useApp.getState().premium.mode).toBeNull();
  });

  it('a RevenueCat membership is kept (RevenueCat itself answers next)', async () => {
    const saved = premium({ mode: 'revenuecat', productId: 'unsetld_full_annual', trialEnds: null, ends: null });
    const { useApp, guardPremium } = await load(saved);
    guardPremium('revenuecat');
    expect(useApp.getState().premium).toMatchObject({ active: true, plan: 'annual', mode: 'revenuecat', productId: 'unsetld_full_annual' });
  });

  it('a preview build keeps its own preview unlock', async () => {
    const { useApp, guardPremium } = await load(premium({ mode: 'preview' }));
    guardPremium('preview');
    expect(useApp.getState().premium).toMatchObject({ active: true, mode: 'preview' });
  });

  it('a v7 membership (no trial or end fields) loads with them empty, and is guarded the same way', async () => {
    const { useApp, guardPremium } = await load({ active: true, plan: 'monthly', renews: null, mode: 'preview' }, 7);
    expect(useApp.getState().premium).toMatchObject({ active: true, plan: 'monthly', trialEnds: null, ends: null, productId: null });
    guardPremium('revenuecat');
    expect(useApp.getState().premium.active).toBe(false);
  });
});

describe("the store's answer, saved whole", () => {
  beforeEach(() => {
    mem.plans = null;
  });
  const end = '2026-10-26T10:00:00.000Z';

  it('a trial: saved with its end, and the reminder set from it at the offering’s price', async () => {
    const { useApp, setPremiumFrom, purchases } = await load(premium({ active: false, plan: null, mode: 'revenuecat' }));
    mem.plans = [{ id: 'unsetld_full_annual', kind: 'annual', priceString: '$24.99' }];
    const info = purchases.entitlementInfo({ productIdentifier: 'unsetld_full_annual', expirationDate: end, willRenew: true, periodType: 'TRIAL' });
    await setPremiumFrom(true, info);
    expect(useApp.getState().premium).toMatchObject({ active: true, plan: 'annual', renews: end, trialEnds: end, ends: null, productId: 'unsetld_full_annual', mode: 'revenuecat' });
    expect(mem.synced).toEqual([{ trialEnds: end, price: '$24.99', kind: 'annual' }]);
  });

  it('a trial whose price can’t be read still gets its reminder, without a price', async () => {
    const { setPremiumFrom, purchases } = await load(premium({ active: false, mode: 'revenuecat' }));
    const info = purchases.entitlementInfo({ productIdentifier: 'unsetld_full_annual', expirationDate: end, willRenew: true, periodType: 'TRIAL' });
    await setPremiumFrom(true, info);
    expect(mem.synced).toEqual([{ trialEnds: end, price: null, kind: 'annual' }]);
  });

  it('cancelled: an end date, no renewal, and the reminder goes', async () => {
    const { useApp, setPremiumFrom, purchases } = await load(premium({ mode: 'revenuecat', trialEnds: end }));
    await setPremiumFrom(true, purchases.entitlementInfo({ productIdentifier: 'unsetld_full_annual', expirationDate: end, willRenew: false, periodType: 'TRIAL' }));
    expect(useApp.getState().premium).toMatchObject({ active: true, renews: null, trialEnds: null, ends: end });
    expect(mem.synced).toEqual([{ trialEnds: null }]);
  });

  it('inactive: everything about the old membership is cleared, the reminder too', async () => {
    const { useApp, setPremiumFrom, purchases } = await load(premium({ mode: 'revenuecat', trialEnds: end, productId: 'unsetld_full_annual' }));
    await setPremiumFrom(false, purchases.NO_ENTITLEMENT);
    expect(useApp.getState().premium).toMatchObject({ active: false, plan: null, renews: null, trialEnds: null, ends: null, productId: null, mode: 'revenuecat' });
    expect(mem.synced).toEqual([{ trialEnds: null }]);
  });

  it('a restore saves the plan, not just "Member"', async () => {
    const { useApp, setPremiumFrom, purchases } = await load({ active: false, plan: null, renews: null, mode: 'revenuecat' });
    await setPremiumFrom(true, purchases.entitlementInfo({ productIdentifier: 'unsetld_full_lifetime', expirationDate: null, willRenew: false }));
    expect(useApp.getState().premium).toMatchObject({ active: true, plan: 'lifetime', renews: null, ends: null });
  });
});
