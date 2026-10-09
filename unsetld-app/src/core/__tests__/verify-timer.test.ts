// TIMER proofs: the in-app timer running to the end is the whole proof (no photo).
// The other proof types must keep their checks exactly as before.
import { describe, expect, it } from 'vitest';
import { MISSION } from '../../content/copy/mission';
import MISSIONS from '../../content/missions.json';
import RULES from '../../content/rules.json';
import { contentVerificationAvailable, verifyProof } from '../../services/verify';
import { elapsedSeconds, endsAt, pauseTimer, startTimer } from '../timer';
import type { Mission, ProofPhoto } from '../types';
import { localChecks, requiredPhotos, type ProofSubmission } from '../verify';

const now = 50_000_000;
const base = { now, usedHashes: new Set<string>(), fromCamera: true, photos: [] as ProofPhoto[] };
const timer10 = { proofType: 'TIMER' as const, timerMinutes: 10 };
const photo = (hash: string, kind: ProofPhoto['kind'], takenAt: number): ProofPhoto => ({ uri: `file://${hash}`, hash, takenAt, kind });

/** A TIMER submission whose timer ran `seconds` and ended `agoMs` before now. */
const ran = (seconds: number, agoMs: number, extra: Partial<ProofSubmission> = {}): ProofSubmission => ({
  ...base,
  mission: timer10,
  timerSeconds: seconds,
  timerEndedAt: now - agoMs,
  ...extra,
});

describe('TIMER proof type', () => {
  it('needs no photos', () => {
    expect(requiredPhotos('TIMER')).toEqual([]);
  });

  it('keeps the photos every other proof type needs', () => {
    expect(requiredPhotos('PHOTO')).toEqual(['single']);
    expect(requiredPhotos('PHOTO_AFTER')).toEqual(['after']);
    expect(requiredPhotos('BEFORE_AFTER')).toEqual(['before', 'after']);
    expect(requiredPhotos('TIMER_AND_PHOTO')).toEqual(['single']);
  });

  it('accepts a timer that ran its full length and just ended, checking only the timer', () => {
    const v = localChecks(ran(600, 30_000));
    expect(v).toMatchObject({ status: 'accepted', method: 'on-device', at: now });
    expect(v.checks).toEqual([{ id: 'timer', ok: true, note: MISSION.check.timerDone }]);
  });

  it('says only that the timer finished on the done screen', () => {
    const v = localChecks(ran(600, 1000));
    expect(MISSION.checked(v.checks, true)).toBe('Checked on this phone: timer finished.');
    // The preview build says the same: there's no photo to have picked from files.
    expect(MISSION.checked(v.checks, false)).toBe('Checked on this phone: timer finished.');
  });

  it('accepts a timer that ended exactly now', () => {
    expect(localChecks(ran(600, 0)).status).toBe('accepted');
  });

  it('rejects a timer that stopped short, even by a second', () => {
    const v = localChecks(ran(599, 1000));
    expect(v.status).toBe('rejected');
    expect(v.checks).toEqual([{ id: 'timer', ok: false, note: MISSION.check.timerShort }]);
    expect(localChecks(ran(0, 1000)).status).toBe('rejected');
    expect(localChecks({ ...ran(600, 1000), timerSeconds: undefined }).status).toBe('rejected');
  });

  it('rejects a timer with no end time (never started, or paused)', () => {
    expect(localChecks({ ...ran(600, 0), timerEndedAt: undefined }).status).toBe('rejected');
  });

  it('rejects a timer that ends after now', () => {
    const v = localChecks(ran(600, -5000));
    expect(v.status).toBe('rejected');
    expect(v.checks[0].note).toBe(MISSION.check.timerShort);
  });

  it(`rejects a timer that ended more than ${RULES.proofFreshMinutes} minutes ago, and says so`, () => {
    const fresh = RULES.proofFreshMinutes * 60_000;
    expect(localChecks(ran(600, fresh)).status).toBe('accepted');
    const v = localChecks(ran(600, fresh + 1000));
    expect(v.status).toBe('rejected');
    expect(v.checks).toEqual([{ id: 'timer', ok: false, note: MISSION.check.timerOld(RULES.proofFreshMinutes) }]);
    expect(v.checks[0].note).toContain(`${RULES.proofFreshMinutes} minutes`);
  });

  it('uses the freshness window it is given', () => {
    expect(localChecks(ran(600, 6 * 60_000), 5).status).toBe('rejected');
    expect(localChecks(ran(600, 4 * 60_000), 5).status).toBe('accepted');
  });

  it('rejects a TIMER mission with no timer length', () => {
    expect(localChecks({ ...ran(600, 1000), mission: { proofType: 'TIMER' } }).status).toBe('rejected');
    expect(localChecks({ ...ran(600, 1000), mission: { proofType: 'TIMER', timerMinutes: 0 } }).status).toBe('rejected');
  });

  it('checks the length of the mission it is for', () => {
    const thirty = { proofType: 'TIMER' as const, timerMinutes: 30 };
    expect(localChecks({ ...ran(600, 1000), mission: thirty }).status).toBe('rejected');
    expect(localChecks({ ...ran(1800, 1000), mission: thirty }).status).toBe('accepted');
  });

  it('still checks a photo if one is sent along', () => {
    const used = localChecks(ran(600, 1000, { photos: [photo('a', 'single', now)], usedHashes: new Set(['a']) }));
    expect(used.status).toBe('rejected');
    expect(used.checks.map(c => c.id)).toEqual(['fresh', 'timer', 'duplicate']);
    const old = localChecks(ran(600, 1000, { photos: [photo('b', 'single', now - 60 * 60_000)] }));
    expect(old.status).toBe('rejected');
  });
});

describe('TIMER with the real focus timer', () => {
  const start = now - 15 * 60_000;

  it('passes once the timer has run out, as the Mission screen submits it', () => {
    const t = startTimer('fitness-stretch-10', '2026-10-09', 10, start);
    const seconds = Math.min(elapsedSeconds(t, now), t.requiredSeconds);
    const v = localChecks({ ...base, mission: timer10, timerSeconds: seconds, timerEndedAt: endsAt(t) ?? undefined });
    expect(seconds).toBe(600);
    expect(endsAt(t)).toBe(start + 600_000);
    expect(v.status).toBe('accepted');
  });

  it('fails while the timer is still running', () => {
    const t = startTimer('fitness-stretch-10', '2026-10-09', 10, now - 5 * 60_000);
    const seconds = Math.min(elapsedSeconds(t, now), t.requiredSeconds);
    expect(localChecks({ ...base, mission: timer10, timerSeconds: seconds, timerEndedAt: endsAt(t) ?? undefined }).status).toBe('rejected');
  });

  it('fails while the timer is paused', () => {
    const t = pauseTimer(startTimer('fitness-stretch-10', '2026-10-09', 10, now - 5 * 60_000), now - 60_000);
    expect(endsAt(t)).toBeNull();
    const seconds = Math.min(elapsedSeconds(t, now), t.requiredSeconds);
    expect(localChecks({ ...base, mission: timer10, timerSeconds: seconds, timerEndedAt: endsAt(t) ?? undefined }).status).toBe('rejected');
  });

  it('works with the tester speed-up', () => {
    const t = startTimer('fitness-stretch-10', '2026-10-09', 10, now - 60_000, 10);
    const seconds = Math.min(elapsedSeconds(t, now), t.requiredSeconds);
    expect(localChecks({ ...base, mission: timer10, timerSeconds: seconds, timerEndedAt: endsAt(t) ?? undefined }).status).toBe('accepted');
  });
});

describe('verifyProof for TIMER', () => {
  const library = MISSIONS as Mission[];
  const timerMissions = library.filter(m => m.proofType === 'TIMER' && m.active);

  it('has TIMER missions in the library, each with a timer length', () => {
    expect(timerMissions.length).toBeGreaterThan(0);
    for (const m of timerMissions) expect(m.timerMinutes).toBeGreaterThan(0);
  });

  it('accepts on the phone, with no content check (there is no photo to look at)', async () => {
    const m = timerMissions[0];
    expect(contentVerificationAvailable(m)).toBe(false);
    const v = await verifyProof(m, { ...base, timerSeconds: m.timerMinutes! * 60, timerEndedAt: now - 1000 });
    expect(v).toMatchObject({ status: 'accepted', method: 'on-device' });
  });
});

describe('the other proof types keep their checks', () => {
  it('PHOTO: photos, fresh, duplicate', () => {
    const v = localChecks({ ...base, mission: { proofType: 'PHOTO' }, photos: [photo('a', 'single', now - 1000)] });
    expect(v.status).toBe('accepted');
    expect(v.checks.map(c => c.id)).toEqual(['photos', 'fresh', 'duplicate']);
    expect(MISSION.checked(v.checks, true)).toBe('Checked on this phone: taken just now, new photo.');
  });

  it('PHOTO: no photo is a missing photo', () => {
    const v = localChecks({ ...base, mission: { proofType: 'PHOTO' } });
    expect(v.status).toBe('rejected');
    expect(v.checks[0]).toEqual({ id: 'photos', ok: false, note: MISSION.check.photoMissing });
  });

  it('PHOTO_AFTER: needs the after photo', () => {
    expect(localChecks({ ...base, mission: { proofType: 'PHOTO_AFTER' }, photos: [photo('a', 'after', now)] }).status).toBe('accepted');
    expect(localChecks({ ...base, mission: { proofType: 'PHOTO_AFTER' }, photos: [photo('a', 'single', now)] }).status).toBe('rejected');
  });

  it('TIMER_AND_PHOTO: photos, fresh, timer, duplicate; the photo comes after the timer', () => {
    const mission = { proofType: 'TIMER_AND_PHOTO' as const, timerMinutes: 25 };
    const ok = localChecks({ ...base, mission, timerSeconds: 1500, timerEndedAt: now - 60_000, photos: [photo('a', 'single', now)] });
    expect(ok.status).toBe('accepted');
    expect(ok.checks.map(c => c.id)).toEqual(['photos', 'fresh', 'timer', 'duplicate']);
    // A timer that ended long ago is fine here: the photo is what has to be fresh.
    expect(localChecks({ ...base, mission, timerSeconds: 1500, timerEndedAt: now - 3 * 3600_000, photos: [photo('a', 'single', now)] }).status).toBe('accepted');
    const early = localChecks({ ...base, mission, timerSeconds: 1500, timerEndedAt: now, photos: [photo('a', 'single', now - 60_000)] });
    expect(early.status).toBe('rejected');
    expect(early.checks.find(c => c.id === 'timer')?.note).toBe(MISSION.check.photoBeforeTimer);
    expect(localChecks({ ...base, mission, timerSeconds: 600, photos: [photo('a', 'single', now)] }).status).toBe('rejected');
    // No photo is still a rejection.
    expect(localChecks({ ...base, mission, timerSeconds: 1500, timerEndedAt: now - 1000 }).status).toBe('rejected');
  });

  it('BEFORE_AFTER: photos, fresh, order, duplicate', () => {
    const mission = { proofType: 'BEFORE_AFTER' as const };
    const v = localChecks({ ...base, mission, photos: [photo('a', 'before', now - 600_000), photo('b', 'after', now)] });
    expect(v.status).toBe('accepted');
    expect(v.checks.map(c => c.id)).toEqual(['photos', 'fresh', 'order', 'duplicate']);
    expect(MISSION.checked(v.checks, true)).toBe('Checked on this phone: taken just now, before, then after, new photo.');
  });
});

describe('PROOF copy', () => {
  it('says how each type is proven, plainly', () => {
    expect(MISSION.method('TIMER_AND_PHOTO', 30)).toBe('Run the 30-minute focus timer. When it ends, take a photo.');
    expect(MISSION.method('TIMER', 10)).toBe('Run the 10-minute timer to the end.');
    expect(MISSION.method('PHOTO')).toBe('Take one photo.');
    expect(MISSION.method('PHOTO_AFTER')).toBe('Take one photo.');
    expect(MISSION.method('BEFORE_AFTER')).toBe('Take a photo before you start and one when you’re done.');
    expect(MISSION.button.timer(30)).toBe('Start 30 min timer');
  });

  it('never claims anything looked at a photo', () => {
    const all = JSON.stringify(MISSION.check) + MISSION.method('PHOTO') + MISSION.method('TIMER', 10);
    expect(all).not.toMatch(/\bAI\b|vision|recogni[sz]ed|detected/i);
  });
});
