// Free vs UNSETLD+: entitlementsOf is the one gate, and it reads core/features. Moving a feature
// to 'free' there opens it for everyone; the core loop never depends on the membership.
import { describe, expect, it, vi } from 'vitest';
import { FEATURES, type Feature, type FeatureMap } from '../../core/features';
import { FULL_MAX_REMINDERS, FREE_MAX_REMINDERS } from '../../core/reminders';
import { COLORWAYS, PROGRAMS, RULES } from '../../content';
import { DEFAULT_SETTINGS, entitlementsOf } from '../store';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Platform: { OS: 'ios' },
}));
vi.mock('../storage', () => ({ appStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const lockedColorway = COLORWAYS.find(c => !c.free)!;
const plusPlan = PROGRAMS.find(p => !p.free)!;
const freePlan = PROGRAMS.find(p => p.free)!;

const user = (member: boolean, colorway = 'black') => ({
  settings: { ...DEFAULT_SETTINGS, colorway },
  premium: { active: member, plan: null, renews: null, mode: null },
});
const moved = (patch: Partial<Record<Feature, 'free' | 'plus'>>): FeatureMap => ({ ...FEATURES, ...patch });

describe('UNSETLD+ gates', () => {
  it('as shipped: a non-member gets the free side, a member everything', () => {
    const free = entitlementsOf(user(false, lockedColorway.id));
    expect(free.maxSwaps).toBe(RULES.rerolls.free);
    expect(free.maxReminders).toBe(FREE_MAX_REMINDERS);
    expect(free.canUseColorway(lockedColorway)).toBe(false);
    expect(free.colorway.id).toBe(COLORWAYS[0].id);
    expect(free.canStartPlan(plusPlan)).toBe(false);
    expect(free.canStartPlan(freePlan)).toBe(true);

    const plus = entitlementsOf(user(true, lockedColorway.id));
    expect(plus.maxSwaps).toBe(RULES.rerolls.full);
    expect(plus.maxReminders).toBe(FULL_MAX_REMINDERS);
    expect(plus.colorway.id).toBe(lockedColorway.id);
    expect(plus.canStartPlan(plusPlan)).toBe(true);
  });

  it.each([
    ['extraSwaps', (e: ReturnType<typeof entitlementsOf>) => e.maxSwaps === RULES.rerolls.full],
    ['extraReminders', (e: ReturnType<typeof entitlementsOf>) => e.maxReminders === FULL_MAX_REMINDERS],
    ['colorways', (e: ReturnType<typeof entitlementsOf>) => e.canUseColorway(lockedColorway) && e.colorway.id === lockedColorway.id],
    ['allPlans', (e: ReturnType<typeof entitlementsOf>) => e.canStartPlan(plusPlan)],
  ] as const)('moving %s to free opens it for a non-member', (feature, open) => {
    expect(FEATURES[feature]).toBe('plus');
    expect(open(entitlementsOf(user(false, lockedColorway.id)))).toBe(false);
    expect(open(entitlementsOf(user(false, lockedColorway.id), moved({ [feature]: 'free' })))).toBe(true);
  });

  it('moving a free feature to UNSETLD+ closes it for a non-member', () => {
    expect(entitlementsOf(user(false), moved({ swaps: 'plus' })).maxSwaps).toBe(0);
    expect(entitlementsOf(user(false), moved({ basicPlans: 'plus' })).canStartPlan(freePlan)).toBe(false);
    expect(entitlementsOf(user(true), moved({ basicPlans: 'plus' })).canStartPlan(freePlan)).toBe(true);
  });
});
