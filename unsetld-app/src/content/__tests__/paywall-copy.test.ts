// UNSETLD+ copy: the trial reads from the store (no fixed 3 days, Day 2 / Day 3 or 48 hours), the
// timeline's VoiceOver text says what the screen shows, the paywall promises nothing the app
// doesn't have ("new ones each season"), and the You row says when a trial or a cancelled
// membership ends. Voice: sentence case, no "!".
import { describe, expect, it, vi } from 'vitest';
import { trialTimeline } from '../../core/trial';
import { PROGRAMS } from '..';
import { PLATFORM } from '../copy/platform';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'ios' } }));
vi.mock('../../state/storage', () => ({ appStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));
vi.mock('../../services/proof', () => ({ deletePhoto: () => {} }));
vi.mock('../../services/timerNotify', () => ({ cancelTimerDone: () => Promise.resolve() }));

const P = PLATFORM.paywall;
const Y = PLATFORM.you;

/** Every string the paywall, the membership row and the trial reminder can show, filled in. */
function allText(): string[] {
  const start = new Date(2026, 9, 19, 10);
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(P);
  out.push(
    P.adds.allPlans(PROGRAMS.length, PROGRAMS.filter(p => p.free).length),
    // Filled with lengths no copy hard-codes, so a fixed "3 days" anywhere still shows up.
    P.sub.trial('1 week', 'annual'),
    P.sub.trial('1 month', 'monthly'),
    P.fine.trial('1 week', '$24.99', 'annual'),
    P.fine.trial('1 month', '$4.99', 'monthly'),
    PLATFORM.notifications.trial('$24.99', 'year'),
    PLATFORM.notifications.trialNoPrice,
    Y.plusPitch,
    Y.trialEnds('22 Oct'),
    Y.ends('Annual', '22 Oct 2026'),
  );
  for (const t of [
    { unit: 'day', count: 3 },
    { unit: 'week', count: 1 },
  ] as const) {
    for (const on of [true, false]) {
      const tl = P.timeline(trialTimeline(t, start, on), '$24.99');
      out.push(...tl.points.flat(), tl.a11y);
    }
  }
  return out;
}

describe('UNSETLD+ copy', () => {
  it('has no fixed trial length or day numbers', () => {
    for (const s of allText()) {
      expect(s).not.toMatch(/\bDAY [0-9]\b|\bDay [0-9]\b/);
      expect(s).not.toMatch(/48[ -]?h|48 hours|3 days free|three days/i);
    }
  });

  it('promises nothing the app does not have', () => {
    const plans = P.adds.allPlans(PROGRAMS.length, PROGRAMS.filter(p => p.free).length);
    expect(plans).toBe(`All ${['no', 'one', 'two', 'three', 'four', 'five', 'six'][PROGRAMS.length] ?? PROGRAMS.length} plans instead of two`);
    for (const s of allText()) expect(s).not.toMatch(/season|coming soon|new ones/i);
  });

  it('keeps the voice: no "!", no emoji', () => {
    for (const s of allText()) {
      expect(s).not.toContain('!');
      expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('the timeline: dated from the trial, the reminder only when one will come, VoiceOver saying the same', () => {
    const start = new Date(2026, 9, 19, 10);
    const on = P.timeline(trialTimeline({ unit: 'day', count: 3 }, start, true), '$24.99');
    expect(on.points).toEqual([
      ['TODAY', 'Everything opens'],
      ['21 OCT', 'We remind you'],
      ['22 OCT', '$24.99 billed'],
    ]);
    expect(on.a11y).toBe('Today, everything opens. 21 October, we remind you. 22 October, $24.99 billed.');

    const off = P.timeline(trialTimeline({ unit: 'week', count: 1 }, start, false), '$24.99');
    expect(off.points).toEqual([
      ['TODAY', 'Everything opens'],
      ['26 OCT', '$24.99 billed'],
    ]);
    expect(off.a11y).toBe('Today, everything opens. 26 October, $24.99 billed.');

    // Every point on screen is in the spoken text, in the same order.
    for (const tl of [on, off]) {
      let at = -1;
      for (const [, what] of tl.points) {
        const i = tl.a11y.toLowerCase().indexOf(what.toLowerCase());
        expect(i).toBeGreaterThan(at);
        at = i;
      }
    }
  });

  it('the trial row and fine print use the length the store sells', () => {
    expect(P.sub.trial('1 week', 'annual')).toBe('1 week free, then billed yearly');
    expect(P.sub.trial('3 days', 'monthly')).toBe('3 days free, then billed monthly');
    expect(P.fine.trial('1 week', '$24.99', 'annual')).toBe(
      '1 week free, then $24.99 per year. Renews automatically. Cancel any time in Settings at least 24 hours before the trial ends.',
    );
    expect(P.fine.trial('1 month', '$4.99', 'monthly')).toContain('$4.99 per month. Renews automatically.');
  });

  it('purchase edge cases and an unavailable build', () => {
    expect([P.pendingTitle, P.pendingBody]).toEqual(['Waiting for approval.', 'UNSETLD+ opens here once the purchase is approved.']);
    expect([P.receivedTitle, P.receivedBody]).toEqual(['Purchase received.', "If UNSETLD+ doesn't open in a minute, tap Restore."]);
    expect(`${P.unavailableTitle} ${P.unavailableBody}`).toBe("UNSETLD+ isn't available right now. Everything free still works.");
    expect(P.cta.subscribe).toBe('Subscribe');
  });
});

describe('the membership row', () => {
  it('names a trial, a cancelled membership, a renewal and Lifetime', async () => {
    const { renewText } = await import('../../screens/you/membership');
    const d = new Date(2026, 9, 22, 10).toISOString();
    expect(renewText({ plan: 'annual', renews: d, trialEnds: d, ends: null })).toBe('Free trial, ends 22 Oct');
    expect(renewText({ plan: 'annual', renews: null, trialEnds: null, ends: d })).toBe('Annual, ends 22 Oct 2026');
    expect(renewText({ plan: 'monthly', renews: d, trialEnds: null, ends: null })).toBe('Monthly, renews 22 Oct 2026');
    expect(renewText({ plan: 'lifetime', renews: null, trialEnds: null, ends: null })).toBe('Lifetime');
    expect(renewText({ plan: null, renews: null })).toBe('Member');
    // Saved before 3.3: the new fields are missing.
    expect(renewText({ plan: 'annual', renews: d })).toBe('Annual, renews 22 Oct 2026');
    expect(renewText({ plan: 'annual', renews: 'garbage', trialEnds: 'garbage' })).toBe('Annual');
  });
  it('the pitch leads with the plans', () => {
    expect(Y.plusPitch).toBe('Every plan, all colorways, more swaps.');
  });
});
