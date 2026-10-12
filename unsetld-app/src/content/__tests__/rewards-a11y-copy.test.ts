import { describe, expect, it } from 'vitest';
import { DOCS } from '..';
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
    expect(R.statusCard.a11y('10% off', 0, 7)).toBe('UNSETLD status. Next: 10% off at 7 days proven.');
    expect(R.statusCard.a11y('10% off', 1, 7)).toBe('UNSETLD status. Next: 10% off at 7 days proven. You have 1 day proven.');
    expect(R.statusCard.a11y('20% off', 12, 90)).toBe('UNSETLD status. Next: 20% off at 90 days proven. You have 12 days proven.');
    expect(R.statusCard.a11yReady('10% off', 7)).toBe('UNSETLD status. 10% off is ready, earned with 7 days proven.');
    expect(R.statusCard.a11yAll(400)).toBe('UNSETLD status. Every status reward earned. 400 days proven.');
  });
});

describe('UNSETLD status: every tier is a discount code', () => {
  const tier = { id: 'status-30', day: 30, title: '15% off', short: '', detail: '', active: true, percent: 15, maxOff: 25, codeValidDays: 30 };

  it('the Rewards card: ready, next with its meter line, every one earned', () => {
    expect(R.statusCard.ready('10% off')).toBe('10% off is ready');
    expect(R.statusCard.next('15% off', 30)).toBe('Next: 15% off at 30 days');
    expect(R.statusCard.progress(29, 30)).toBe('29 / 30 days proven');
    expect(R.statusCard.progress(0, 7)).not.toMatch(/\b0\b/);
    expect(R.statusCard.allTaken).toBe('Every status reward earned');
  });

  it('a row and the tier page: the cap, days to go, the code and when it runs out', () => {
    expect(R.status.cap(tier)).toBe('Up to $25 off');
    expect(R.status.cap({ maxOff: null })).toBe('One order at unsetld.com');
    expect(R.status.state.left(1)).toBe('1 day to go');
    expect(R.status.state.left(12)).toBe('12 days to go');
    expect(R.status.codeLine('11 NOV', false)).toBe('Works until 11 Nov');
    expect(R.status.codeLine('11 NOV', true)).toBe('Ran out 11 Nov');
    expect(R.status.tierA11y(tier, '1 day to go')).toBe('15% off, at 30 days proven. Up to $25 off. 1 day to go');
  });

  it('taking the code costs no points and says so', () => {
    const reward = { id: 'status-7', title: '10% off', detail: '', type: 'discount' as const, points: 0, percent: 10, maxOff: 25, active: true, codeValidDays: 30, perCollection: 1, oneTimeOnly: true };
    expect(R.status.confirmTitle('10% off')).toBe('Get your 10% off code?');
    expect(R.status.confirmBody(reward)).toBe("One order at unsetld.com, up to $25 off. The code works for 30 days from today, and there's one per person.");
    expect(R.status.confirmBody(reward)).not.toMatch(/points?/i);
    for (const line of Object.values(R.status.errors)) expect(line).not.toMatch(/points?|collection/i);
  });

  it('the letter: days proven, the discount is yours, one line, Get the code or Not now', () => {
    expect(R.letter.kicker(7)).toBe('7 DAYS PROVEN.');
    expect(R.letter.title('10% off')).toBe('10% off is yours.');
    expect(R.letter.line(tier)).toBe('One order at unsetld.com, up to $25 off. The code works 30 days from when you take it.');
    expect([R.letter.primary, R.letter.secondary]).toEqual(['Get the code', 'Not now']);
  });

  it('a status code in Reward history says where it came from', () => {
    expect(R.history.statusTitle('10% off', 7)).toBe('10% off · 7 days proven');
  });

  it('drop alerts are a plain heads-up', () => {
    expect(PLATFORM.you.dropNote).toBe('A heads-up 24 hours before a new UNSETLD drop.');
  });
});

describe('no early access, patch or piece anywhere a user reads', () => {
  const strings = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : typeof v === 'function' ? [] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
  it('rewards and platform copy, and the help pages', () => {
    const all = [...strings(R), ...strings(PLATFORM), ...strings(DOCS)];
    expect(all.length).toBeGreaterThan(50);
    for (const line of all) expect(line).not.toMatch(/early access|early drop|open(s)? early|the patch|\bpiece\b|merch|pause/i);
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
