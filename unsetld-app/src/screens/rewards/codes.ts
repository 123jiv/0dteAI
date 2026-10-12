// Codes the user has taken: points rewards and status codes since 3.0, and the 2.x codes. Pure,
// so the navigator, the Rewards tab and Reward history agree on them (and tests can run them).
import type { DayKey } from '../../core/time';
import type { RecordState, Redemption } from '../../core/types';

/**
 * The redemptions with a code to show: not the code-less mark of a status code taken before
 * whose code never reached this phone (core/rewards redeem with `code: ''`).
 */
export function redemptionsWithCode(r: RecordState): Redemption[] {
  return (r.redemptions ?? []).filter(x => typeof x?.code === 'string' && x.code !== '');
}

/** Every code taken, whether it still works or not. */
export function codeCount(r: RecordState): number {
  return redemptionsWithCode(r).length + (Array.isArray(r.codes) ? r.codes.length : 0);
}

/**
 * Whether a code taken still works on `today` (its last day not passed). With rewards
 * switched off the Rewards tab stays while one does, so a code taken can still be found
 * and copied.
 */
export function holdsLiveCode(r: RecordState, today: DayKey): boolean {
  const all = [...redemptionsWithCode(r), ...(Array.isArray(r.codes) ? r.codes : [])];
  return all.some(c => typeof c?.expires === 'string' && today <= c.expires);
}
