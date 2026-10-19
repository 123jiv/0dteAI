// Purchases fail closed (P0-1): only an iPhone build with an App Store key reaches RevenueCat; a
// dev build or the browser preview without one runs preview mode (sample products, labelled); any
// other build sells nothing and unlocks nothing. Plus what the app keeps of the store's answers.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  entitlementInfo,
  failedOutcome,
  previewEntitlement,
  purchasedOutcome,
  purchaseModeFor,
  revokesSaved,
  type Plan,
  type PurchaseMode,
} from '../purchases';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

type Build = 'dev' | 'eas-preview' | 'release';
const BUILD: Record<Build, { isDev: boolean; isPreview: (os: string) => boolean }> = {
  // IS_PREVIEW = __DEV__ || web (config/app).
  dev: { isDev: true, isPreview: () => true },
  'eas-preview': { isDev: false, isPreview: os => os === 'web' },
  release: { isDev: false, isPreview: os => os === 'web' },
};

const EXPECTED: Record<string, Record<Build, Record<'none' | 'appl' | 'test', PurchaseMode>>> = {
  ios: {
    dev: { none: 'preview', appl: 'revenuecat', test: 'revenuecat' },
    'eas-preview': { none: 'unavailable', appl: 'revenuecat', test: 'unavailable' },
    release: { none: 'unavailable', appl: 'revenuecat', test: 'unavailable' },
  },
  web: {
    dev: { none: 'preview', appl: 'preview', test: 'preview' },
    'eas-preview': { none: 'preview', appl: 'preview', test: 'preview' },
    release: { none: 'preview', appl: 'preview', test: 'preview' },
  },
  android: {
    dev: { none: 'preview', appl: 'preview', test: 'preview' },
    'eas-preview': { none: 'unavailable', appl: 'unavailable', test: 'unavailable' },
    release: { none: 'unavailable', appl: 'unavailable', test: 'unavailable' },
  },
};
const KEYS = { none: '', appl: 'appl_AbC123', test: 'test_AbC123' } as const;

describe('purchaseModeFor: the full matrix', () => {
  for (const os of ['ios', 'web', 'android'] as const) {
    for (const build of ['dev', 'eas-preview', 'release'] as const) {
      for (const key of ['none', 'appl', 'test'] as const) {
        const want = EXPECTED[os][build][key];
        it(`${os} · ${build} · ${key} key → ${want}`, () => {
          const b = BUILD[build];
          expect(purchaseModeFor({ os, isDev: b.isDev, isPreview: b.isPreview(os), key: KEYS[key] })).toBe(want);
        });
      }
    }
  }

  it('a key of only spaces is no key', () => {
    expect(purchaseModeFor({ os: 'ios', isDev: false, isPreview: false, key: '   ' })).toBe('unavailable');
    expect(purchaseModeFor({ os: 'ios', isDev: false, isPreview: false, key: undefined })).toBe('unavailable');
  });

  it('a release build never runs in preview mode, so it never unlocks for free', () => {
    for (const os of ['ios', 'android']) {
      for (const key of Object.values(KEYS)) {
        expect(purchaseModeFor({ os, isDev: false, isPreview: false, key })).not.toBe('preview');
      }
    }
  });
});

describe('the saved membership at launch', () => {
  const saved = (active: boolean, mode: 'preview' | 'revenuecat' | null) => ({ active, mode });
  it('one unlocked in preview mode is taken back in a store build and in an unavailable build', () => {
    expect(revokesSaved(saved(true, 'preview'), 'revenuecat')).toBe(true);
    expect(revokesSaved(saved(true, 'preview'), 'unavailable')).toBe(true);
    // Saved before the mode was ever recorded.
    expect(revokesSaved(saved(true, null), 'revenuecat')).toBe(true);
  });
  it("one from RevenueCat stays until RevenueCat answers; preview builds keep their own; nothing to take from a non-member", () => {
    expect(revokesSaved(saved(true, 'revenuecat'), 'revenuecat')).toBe(false);
    expect(revokesSaved(saved(true, 'preview'), 'preview')).toBe(false);
    expect(revokesSaved(saved(false, 'preview'), 'revenuecat')).toBe(false);
  });
});

describe('the service in each mode', () => {
  const load = async (os: string, dev: boolean, key: string) => {
    vi.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = key;
    vi.doMock('react-native', () => ({ Platform: { OS: os } }));
    return import('../purchases');
  };
  afterEach(() => {
    vi.doUnmock('react-native');
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });

  it('a release iPhone build with no key sells nothing and answers inactive', async () => {
    const p = await load('ios', false, '');
    expect(p.purchaseMode).toBe('unavailable');
    await expect(p.getPlans()).rejects.toBeInstanceOf(p.PurchasesUnavailable);
    await expect(p.purchase({ id: 'x', kind: 'annual' } as Plan)).rejects.toBeInstanceOf(p.PurchasesUnavailable);
    await expect(p.restore()).rejects.toBeInstanceOf(p.PurchasesUnavailable);
    const r = await p.refreshPremium();
    expect(r?.active).toBe(false);
    expect(r?.info).toEqual(p.NO_ENTITLEMENT);
    await expect(p.initPurchases(() => {})).resolves.toBeUndefined();
  });

  it('a release build with a Test Store key is unavailable too', async () => {
    const p = await load('ios', false, 'test_abc');
    expect(p.purchaseMode).toBe('unavailable');
    await expect(p.getPlans()).rejects.toThrow();
  });

  it('a dev build without a key previews with the sample products and a stand-in entitlement', async () => {
    const p = await load('ios', true, '');
    expect(p.purchaseMode).toBe('preview');
    const plans = await p.getPlans();
    expect(plans.map(x => x.kind)).toEqual(['annual', 'monthly', 'lifetime']);
    const r = await p.purchase(plans[0]);
    expect(r.premium).toBe(true);
    expect(r.info?.productId).toBe(plans[0].id);
    expect(await p.refreshPremium()).toBeNull();
  });

  it('the browser preview previews', async () => {
    const p = await load('web', false, 'appl_x');
    expect(p.purchaseMode).toBe('preview');
  });
});

describe('what the app keeps of the store’s answer', () => {
  const end = '2026-10-26T10:00:00Z';
  it('a trial that will renew: its end is the trial end and the renewal', () => {
    const info = entitlementInfo({ productIdentifier: 'unsetld_full_annual', expirationDate: end, willRenew: true, periodType: 'TRIAL' });
    expect(info).toEqual({ plan: 'annual', productId: 'unsetld_full_annual', renews: end, trialEnds: end, ends: null });
  });
  it('a cancelled trial or subscription: no renewal, no trial reminder, an end date', () => {
    const trial = entitlementInfo({ productIdentifier: 'unsetld_full_annual', expirationDate: end, willRenew: false, periodType: 'TRIAL' });
    expect(trial).toMatchObject({ renews: null, trialEnds: null, ends: end });
    const monthly = entitlementInfo({ productIdentifier: 'unsetld_full_monthly', expirationDate: end, willRenew: false, periodType: 'NORMAL' });
    expect(monthly).toMatchObject({ plan: 'monthly', renews: null, ends: end });
  });
  it('a renewing subscription and Lifetime', () => {
    expect(entitlementInfo({ productIdentifier: 'unsetld_full_monthly', expirationDate: end, willRenew: true, periodType: 'NORMAL' })).toMatchObject({
      plan: 'monthly',
      renews: end,
      trialEnds: null,
      ends: null,
    });
    expect(entitlementInfo({ productIdentifier: 'unsetld_full_lifetime', expirationDate: null, willRenew: false })).toEqual({
      plan: 'lifetime',
      productId: 'unsetld_full_lifetime',
      renews: null,
      trialEnds: null,
      ends: null,
    });
  });
  it('no entitlement', () => {
    expect(entitlementInfo(undefined)).toEqual({ plan: null, productId: null, renews: null, trialEnds: null, ends: null });
  });
});

describe('purchase edge cases (P1-11)', () => {
  it('Ask to Buy waits for approval; a cancel is a cancel; anything else is a failure', () => {
    expect(failedOutcome({ code: '20', userCancelled: false })).toEqual({ premium: false, plan: null, pending: true });
    expect(failedOutcome({ code: '1', userCancelled: null })).toEqual({ premium: false, plan: null, cancelled: true });
    expect(failedOutcome({ userCancelled: true })).toMatchObject({ cancelled: true });
    expect(failedOutcome({ code: '2' })).toBeNull();
    expect(failedOutcome(new Error('network'))).toBeNull();
    expect(failedOutcome(undefined)).toBeNull();
  });
  it('a purchase with no entitlement is received, not a membership', () => {
    const r = purchasedOutcome(undefined, 'annual');
    expect(r.premium).toBe(false);
    expect(r.cancelled).toBeUndefined();
    expect(r.pending).toBeUndefined();
    const ok = purchasedOutcome({ productIdentifier: 'unsetld_full_annual', expirationDate: '2027-10-19T10:00:00Z', willRenew: true, periodType: 'NORMAL' }, 'annual');
    expect(ok).toMatchObject({ premium: true, plan: 'annual', info: { renews: '2027-10-19T10:00:00Z' } });
  });
  it("preview mode's stand-in follows the sample product's trial", () => {
    const now = new Date(2026, 9, 19, 10, 0);
    const annual: Plan = { id: 'a', kind: 'annual', title: '', price: 24.99, priceString: '$24.99', currencyCode: 'USD', trial: { unit: 'day', count: 3 }, eligibleForTrial: true };
    const e = previewEntitlement(annual, now);
    expect(new Date(e.trialEnds!).getDate()).toBe(22);
    expect(e.renews).toBe(e.trialEnds);
    expect(previewEntitlement({ ...annual, eligibleForTrial: false }, now).trialEnds).toBeNull();
    expect(previewEntitlement({ ...annual, kind: 'lifetime' }, now)).toMatchObject({ plan: 'lifetime', renews: null, trialEnds: null, ends: null });
  });
});
