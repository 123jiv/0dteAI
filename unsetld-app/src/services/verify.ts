// Proof verification. Today every proof goes through the on-device checks in
// core/verify.ts: the right photos, taken just now with the camera, in order,
// the timer actually ran, and never used before. Those checks do NOT look at
// what is in the photo, and the app never says they do.
//
// To check content (a book in the photo, a clean desk, gym equipment), add a
// TaskProofVerifier that calls a vision model on your backend and register it
// in VERIFIERS. Keep it server-side: the phone sends the photo once, the server
// answers { status, note } and deletes the photo. Until one is registered the
// result's method stays 'on-device'.
import { localChecks, type ProofSubmission } from '../core/verify';
import type { Mission, Verification } from '../core/types';

export interface TaskProofVerifier {
  /** Shown in Settings/diagnostics, e.g. "vision:v1". */
  id: string;
  /** Which missions this verifier can judge (by tag, track or proof type). */
  handles(mission: Mission): boolean;
  /** Look at the photos and say whether they reasonably match the mission. Must never throw. */
  verify(mission: Mission, photoUris: string[]): Promise<{ status: 'accepted' | 'rejected' | 'unavailable'; note: string }>;
}

/** Content verifiers. Empty: no vision system is connected to UNSETLD yet. */
const VERIFIERS: TaskProofVerifier[] = [];

export function contentVerificationAvailable(mission: Mission): boolean {
  return VERIFIERS.some(v => v.handles(mission));
}

/**
 * Runs the on-device checks and, if one is registered for this mission, a
 * content verifier. A verifier that is down never blocks a proof: the
 * on-device result stands.
 */
export async function verifyProof(mission: Mission, submission: Omit<ProofSubmission, 'mission'>): Promise<Verification> {
  const local = localChecks({ ...submission, mission });
  if (local.status !== 'accepted') return local;
  const v = VERIFIERS.find(x => x.handles(mission));
  if (!v) return local;
  const r = await v.verify(mission, submission.photos.map(p => p.uri)).catch(() => ({ status: 'unavailable' as const, note: '' }));
  if (r.status === 'unavailable') return local;
  return {
    status: r.status,
    method: 'vision',
    checks: [...local.checks, { id: 'photos', ok: r.status === 'accepted', note: r.note }],
    at: submission.now,
  };
}
