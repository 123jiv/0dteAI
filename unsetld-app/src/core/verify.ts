// On-device proof checks. These are honest, mechanical checks (right photos, taken
// just now, in order, the timer ran, never used before). They do not look at what
// the photo shows: that needs a vision verifier (see services/verify.ts).
import type { Mission, ProofPhoto, Verification, VerificationCheck } from './types';
import RULES from '../content/rules.json';

export interface ProofSubmission {
  mission: Pick<Mission, 'proofType' | 'timerMinutes'>;
  photos: ProofPhoto[];
  /** Seconds the focus timer ran (TIMER_AND_PHOTO). */
  timerSeconds?: number;
  /** When the timer finished, for TIMER_AND_PHOTO: the photo must come after it. */
  timerEndedAt?: number;
  now: number;
  /** Fingerprints of photos already used for other missions. */
  usedHashes: ReadonlySet<string>;
  /** false for the browser preview, which picks a file instead of opening the camera. */
  fromCamera: boolean;
}

export function requiredPhotos(type: Mission['proofType']): ProofPhoto['kind'][] {
  if (type === 'BEFORE_AFTER') return ['before', 'after'];
  if (type === 'PHOTO_AFTER') return ['after'];
  return ['single'];
}

export function localChecks(s: ProofSubmission, fresh = RULES.proofFreshMinutes, minGap = RULES.beforeAfterMinGapSeconds): Verification {
  const checks: VerificationCheck[] = [];
  const need = requiredPhotos(s.mission.proofType);
  const have = need.map(k => s.photos.find(p => p.kind === k));
  checks.push({ id: 'photos', ok: have.every(Boolean), note: have.every(Boolean) ? 'All photos in.' : 'A photo is missing.' });

  const stale = s.photos.filter(p => s.now - p.takenAt > fresh * 60_000 && p.kind !== 'before');
  checks.push({
    id: 'fresh',
    ok: stale.length === 0,
    note: stale.length ? `Take the photo again. Proof has to be from the last ${fresh} minutes.` : s.fromCamera ? 'Taken just now with the camera.' : 'Preview build: picked from files.',
  });

  if (s.mission.proofType === 'BEFORE_AFTER') {
    const [before, after] = have;
    const gap = before && after ? (after.takenAt - before.takenAt) / 1000 : 0;
    checks.push({ id: 'order', ok: gap >= minGap, note: gap >= minGap ? 'Before, then after.' : 'The after photo has to come a few minutes after the before.' });
  }

  if (s.mission.proofType === 'TIMER_AND_PHOTO') {
    const need = (s.mission.timerMinutes ?? 0) * 60;
    const ran = s.timerSeconds ?? 0;
    const afterTimer = s.timerEndedAt == null || s.photos.every(p => p.takenAt >= s.timerEndedAt! - 1000);
    const ok = ran >= need - 1 && afterTimer;
    checks.push({ id: 'timer', ok, note: ok ? 'Timer finished.' : ran < need - 1 ? 'Finish the timer first.' : 'Take the photo after the timer.' });
  }

  const hashes = s.photos.map(p => p.hash).filter(Boolean);
  const dup = hashes.some((h, i) => hashes.indexOf(h) !== i) || hashes.some(h => s.usedHashes.has(h));
  checks.push({ id: 'duplicate', ok: !dup, note: dup ? 'That photo was already used. Take a new one.' : 'New photo.' });

  return { status: checks.every(c => c.ok) ? 'accepted' : 'rejected', method: 'on-device', checks, at: s.now };
}
