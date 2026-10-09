// On-device proof checks. These are honest, mechanical checks (right photos, taken
// just now, in order, the timer ran, never used before). They do not look at what
// the photo shows: that needs a vision verifier (see services/verify.ts).
// A TIMER mission has no photo: the in-app timer running to the end is the proof.
import type { Mission, ProofPhoto, Verification, VerificationCheck } from './types';
import RULES from '../content/rules.json';
import { MISSION } from '../content/copy/mission';

const N = MISSION.check;

export interface ProofSubmission {
  mission: Pick<Mission, 'proofType' | 'timerMinutes'>;
  /** Empty for a TIMER mission. */
  photos: ProofPhoto[];
  /** Seconds the focus timer ran (TIMER_AND_PHOTO and TIMER). */
  timerSeconds?: number;
  /**
   * When the timer reached zero (TIMER_AND_PHOTO and TIMER). TIMER_AND_PHOTO: the photo
   * must come after it. TIMER: it must be in the past, and recent.
   */
  timerEndedAt?: number;
  now: number;
  /** Fingerprints of photos already used for other missions. */
  usedHashes: ReadonlySet<string>;
  /** false for the browser preview, which picks a file instead of opening the camera. */
  fromCamera: boolean;
}

/** The photos a proof needs, in the order they're taken. None for TIMER. */
export function requiredPhotos(type: Mission['proofType']): ProofPhoto['kind'][] {
  if (type === 'TIMER') return [];
  if (type === 'BEFORE_AFTER') return ['before', 'after'];
  if (type === 'PHOTO_AFTER') return ['after'];
  return ['single'];
}

/**
 * TIMER: the timer ran its full length, reached zero before now, and did so in the
 * last `fresh` minutes (a timer left finished all day isn't proof of today's effort).
 */
function timerRan(s: ProofSubmission, fresh: number): VerificationCheck {
  const need = (s.mission.timerMinutes ?? 0) * 60;
  const ran = s.timerSeconds ?? 0;
  const end = s.timerEndedAt;
  if (need <= 0 || ran < need || end == null || end > s.now) return { id: 'timer', ok: false, note: N.timerShort };
  if (s.now - end > fresh * 60_000) return { id: 'timer', ok: false, note: N.timerOld(fresh) };
  return { id: 'timer', ok: true, note: N.timerDone };
}

export function localChecks(s: ProofSubmission, fresh = RULES.proofFreshMinutes, minGap = RULES.beforeAfterMinGapSeconds): Verification {
  const checks: VerificationCheck[] = [];
  const type = s.mission.proofType;
  const need = requiredPhotos(type);
  // A TIMER proof carries no photos, so there's nothing to check about them.
  const photoChecks = need.length > 0 || s.photos.length > 0;
  const have = need.map(k => s.photos.find(p => p.kind === k));
  if (need.length > 0) checks.push({ id: 'photos', ok: have.every(Boolean), note: have.every(Boolean) ? N.photosIn : N.photoMissing });

  if (photoChecks) {
    const stale = s.photos.filter(p => s.now - p.takenAt > fresh * 60_000 && p.kind !== 'before');
    checks.push({
      id: 'fresh',
      ok: stale.length === 0,
      note: stale.length ? N.stale(fresh) : s.fromCamera ? N.camera : N.picked,
    });
  }

  if (type === 'BEFORE_AFTER') {
    const [before, after] = have;
    const gap = before && after ? (after.takenAt - before.takenAt) / 1000 : 0;
    checks.push({ id: 'order', ok: gap >= minGap, note: gap >= minGap ? N.order : N.tooSoon });
  }

  if (type === 'TIMER_AND_PHOTO') {
    const needS = (s.mission.timerMinutes ?? 0) * 60;
    const ran = s.timerSeconds ?? 0;
    const afterTimer = s.timerEndedAt == null || s.photos.every(p => p.takenAt >= s.timerEndedAt! - 1000);
    const ok = ran >= needS - 1 && afterTimer;
    checks.push({ id: 'timer', ok, note: ok ? N.timerDone : ran < needS - 1 ? N.timerShort : N.photoBeforeTimer });
  }

  if (type === 'TIMER') checks.push(timerRan(s, fresh));

  if (photoChecks) {
    const hashes = s.photos.map(p => p.hash).filter(Boolean);
    const dup = hashes.some((h, i) => hashes.indexOf(h) !== i) || hashes.some(h => s.usedHashes.has(h));
    checks.push({ id: 'duplicate', ok: !dup, note: dup ? N.duplicate : N.newPhoto });
  }

  return { status: checks.length > 0 && checks.every(c => c.ok) ? 'accepted' : 'rejected', method: 'on-device', checks, at: s.now };
}
