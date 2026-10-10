import { describe, expect, it } from 'vitest';
import rewardsJson from '../../content/rewards.json';
import { parseRewards, parseRewardTier } from '../rewards';
import type { RewardTier } from '../types';

const good = {
  id: 'ten-off',
  title: '10% off',
  detail: 'One order at unsetld.com.',
  type: 'discount',
  points: 600,
  percent: 10,
  maxOff: 25,
  active: true,
  availableFrom: '2026-10-01',
  availableUntil: '2026-12-31T23:59:59Z',
  codeValidDays: 30,
  inventory: 200,
  perCollection: 1,
};

describe("unsetld.com's reward config", () => {
  it('reads a good tier as sent', () => {
    expect(parseRewardTier(good)).toEqual(good);
  });

  it('fills what the server leaves out with the defaults from content/rewards.json', () => {
    expect(parseRewardTier({ id: ' ship ', title: ' Free shipping ', type: 'free-shipping', points: 300 })).toEqual({
      id: 'ship',
      title: 'Free shipping',
      detail: '',
      type: 'free-shipping',
      points: 300,
      active: true,
      availableFrom: null,
      availableUntil: null,
      codeValidDays: 30,
      inventory: null,
      perCollection: 1,
    });
  });

  it('drops a tier with any bad field', () => {
    const bad: Record<string, unknown>[] = [
      { id: '' },
      { id: 'x'.repeat(65) },
      { title: undefined },
      { title: 'x'.repeat(41) },
      { detail: 3 },
      { type: 'gift' },
      { points: 0 },
      { points: 12.5 },
      { points: '600' },
      { percent: undefined }, // a discount needs its percent
      { percent: 0 },
      { percent: 120 },
      { maxOff: -5 },
      { maxOff: Number.POSITIVE_INFINITY },
      { active: 'yes' },
      { availableFrom: 'soon' },
      { availableUntil: '2026-13-45' },
      { codeValidDays: 0 },
      { inventory: -1 },
      { perCollection: 0 },
    ];
    for (const change of bad) expect(parseRewardTier({ ...good, ...change })).toBeNull();
    for (const raw of [null, undefined, 'ten-off', 600, [good]]) expect(parseRewardTier(raw)).toBeNull();
    // Out of stock is a real answer, not a bad field.
    expect(parseRewardTier({ ...good, inventory: 0 })).toMatchObject({ inventory: 0 });
    // A non-discount may carry a sane percent, or none.
    expect(parseRewardTier({ ...good, type: 'limited', percent: null })).not.toHaveProperty('percent');
  });

  it('keeps the good tiers of a list, drops the bad ones and repeated ids (first one wins)', () => {
    const list = parseRewards([good, { ...good, title: 'Second' }, { ...good, id: 'broken', points: -1 }, { ...good, id: 'fifteen-off', percent: 15, points: 1000 }]);
    expect(list?.map(t => [t.id, t.title])).toEqual([
      ['ten-off', '10% off'],
      ['fifteen-off', '10% off'],
    ]);
  });

  it('is null when nothing usable came, so the defaults stay', () => {
    expect(parseRewards([])).toBeNull();
    expect(parseRewards([{ id: 'x' }, null, 'ten-off'])).toBeNull();
    expect(parseRewards(undefined)).toBeNull();
    expect(parseRewards({ rewards: [good] })).toBeNull();
  });

  it('accepts the shipped defaults as they are', () => {
    expect(parseRewards(rewardsJson)).toEqual(rewardsJson);
  });
});

describe('default tiers', () => {
  it('are discounts only (free shipping was taken out); anything else is switched off', () => {
    const on = (rewardsJson as RewardTier[]).filter(t => t.active);
    expect(on.length).toBeGreaterThan(0);
    for (const t of on) expect(t.type).toBe('discount');
  });
});
