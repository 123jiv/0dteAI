// Codes the user has taken with points: rewards since 3.0 and the 2.x codes. Pure, so the
// navigator, the Rewards tab and Reward history agree on them (and tests can run them).
import type { DayKey } from '../../core/time';
import type { RecordState } from '../../core/types';

/** Every code taken, whether it still works or not. */
export function codeCount(r: RecordState): number {
  return (r.redemptions?.length ?? 0) + (Array.isArray(r.codes) ? r.codes.length : 0);
}

/**
 * Whether a code taken still works on `today` (its last day not passed). With rewards
 * switched off the Rewards tab stays while one does, so a code paid for with points can
 * still be found and copied.
 */
export function holdsLiveCode(r: RecordState, today: DayKey): boolean {
  const all = [...(r.redemptions ?? []), ...(Array.isArray(r.codes) ? r.codes : [])];
  return all.some(c => typeof c?.expires === 'string' && today <= c.expires);
}
