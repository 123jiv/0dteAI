// Proof and points: a photo of the work earns points (once a day); points
// trade for a discount code at unsetld.com, one code each collection.
import { addDays, type DayKey } from './time';
import type { CodeClaim, PointsConfig, Proof, RecordState } from './types';

export function hasProof(r: RecordState, day: DayKey): boolean {
  return Boolean(r.proofs[day]);
}

/** Adds today's proof. One a day; a second one replaces the photo but earns nothing more. */
export function addProof(r: RecordState, day: DayKey, proof: Proof): RecordState {
  return { ...r, proofs: { ...r.proofs, [day]: proof } };
}

export function pointsEarned(r: RecordState, cfg: PointsConfig): number {
  return Object.keys(r.proofs).length * cfg.perProof;
}

export function pointsSpent(r: RecordState): number {
  return r.codes.reduce((sum, c) => sum + c.points, 0);
}

export function pointsBalance(r: RecordState, cfg: PointsConfig): number {
  return Math.max(0, pointsEarned(r, cfg) - pointsSpent(r));
}

export function codeForCollection(r: RecordState, collection: string): CodeClaim | null {
  return r.codes.find(c => c.collection === collection) ?? null;
}

export type TierStatus = { kind: 'ready' } | { kind: 'short'; need: number } | { kind: 'used' };

/** A tier is used once any code was taken this collection (one code each collection). */
export function tierStatus(r: RecordState, cfg: PointsConfig, tier: PointsConfig['tiers'][number], collection: string): TierStatus {
  if (codeForCollection(r, collection)) return { kind: 'used' };
  const balance = pointsBalance(r, cfg);
  return balance >= tier.points ? { kind: 'ready' } : { kind: 'short', need: tier.points - balance };
}

/** The best tier the user can take right now, if any. */
export function readyTier(r: RecordState, cfg: PointsConfig, collection: string): PointsConfig['tiers'][number] | null {
  const ready = cfg.tiers.filter(t => tierStatus(r, cfg, t, collection).kind === 'ready');
  return ready.length ? ready[ready.length - 1] : null;
}

/** Records a code the server minted; spends the tier's points. */
export function claimCode(
  r: RecordState,
  cfg: PointsConfig,
  tier: PointsConfig['tiers'][number],
  collection: string,
  day: DayKey,
  minted: { code: string; url: string },
): RecordState {
  if (tierStatus(r, cfg, tier, collection).kind !== 'ready') return r;
  const claim: CodeClaim = {
    day,
    collection,
    points: tier.points,
    percent: tier.percent,
    code: minted.code,
    url: minted.url,
    expires: addDays(day, cfg.codeValidDays),
  };
  return { ...r, codes: [...r.codes, claim] };
}

/** Proof days, newest first. */
export function proofDays(r: RecordState): DayKey[] {
  return Object.keys(r.proofs).sort().reverse();
}
