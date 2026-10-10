import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../copy/platform';
import { PROOF_KIND } from '../copy/proof';
import { REWARDS_COPY as R } from '../copy/rewards';

describe('what VoiceOver hears on Rewards', () => {
  it('Day 1: the next reward is said as the card shows it, with no zero', () => {
    expect(R.nextA11y('5% off', 0, 300, true)).toBe('Next reward: 5% off. 300 points to your first reward');
    expect(R.nextA11y('5% off', 0, 300, true)).not.toMatch(/\b0\b/);
  });

  it('later: progress and what is left; ready says ready', () => {
    expect(R.nextA11y('10% off', 380, 600)).toBe('Next reward: 10% off. 380 of 600 points, 220 points left');
    expect(R.nextA11y('10% off', 600, 600)).toBe('Next reward: 10% off, ready');
    expect(R.nextA11y('10% off', 650, 600, true)).toBe('Next reward: 10% off, ready');
  });

  it('the status card names the unit, and says nothing about days before the first', () => {
    expect(R.statusCard.a11y('Early access', 0, 7)).toBe('UNSETLD status. Next: Early access at 7 active days.');
    expect(R.statusCard.a11y('Early access', 1, 7)).toBe('UNSETLD status. Next: Early access at 7 active days. You have 1 active day.');
    expect(R.statusCard.a11y('The patch', 12, 90)).toBe('UNSETLD status. Next: The patch at 90 active days. You have 12 active days.');
  });
});

describe('copy that promises nothing it can not keep', () => {
  it('rewards off and nothing open: no hint that rewards come later', () => {
    for (const line of [R.off, R.noneOpen]) {
      expect(line).not.toMatch(/right now|keep counting|soon|later/i);
    }
  });

  it('the evening reminder never says one mission is left (all of them are)', () => {
    expect(PLATFORM.notifications.lastCall(4)).toBe('Last call: prove one mission today to keep your streak.');
    expect(PLATFORM.notifications.lastCall(0)).toBe('Last call: prove one mission today to start a streak.');
  });
});

describe('proof said the same way for every type', () => {
  it('every proof type reads "proven with …"', () => {
    for (const kind of Object.values(PROOF_KIND)) expect(kind.a11y).toMatch(/^proven with /);
    expect(PROOF_KIND.PHOTO.a11y).toBe(PROOF_KIND.PHOTO_AFTER.a11y);
  });
});
