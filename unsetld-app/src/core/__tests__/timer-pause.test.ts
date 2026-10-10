// A Pause tap that lands just after zero (the timer screen ticks once a second) must not turn a
// finished timer into an unfinished one: TIMER and TIMER_AND_PHOTO agree that it ran.
import { describe, expect, it } from 'vitest';
import { MISSION_BY_ID } from '../../content';
import { elapsedSeconds, endsAt, pauseTimer, resumeTimer, startTimer, timerDone, type FocusTimer } from '../timer';
import type { ProofPhoto } from '../types';
import { localChecks } from '../verify';

const t0 = Date.UTC(2026, 9, 10, 15);
const DAY = '2026-10-10';

/** Submits the proof the way MissionScreen does. */
function submit(id: string, t: FocusTimer, now: number) {
  const m = MISSION_BY_ID[id];
  const photos: ProofPhoto[] = m.proofType === 'TIMER' ? [] : [{ uri: 'file:///x.jpg', takenAt: now - 1000, kind: 'single', hash: 'hx' }];
  return localChecks({
    mission: m,
    photos,
    timerSeconds: Math.min(elapsedSeconds(t, now), t.requiredSeconds),
    timerEndedAt: endsAt(t) ?? undefined,
    now,
    usedHashes: new Set(),
    fromCamera: true,
  });
}

describe('pausing a finished timer', () => {
  for (const id of ['fitness-stretch-10', 'school-study-30']) {
    it(`does nothing once the time is up, and ${id} (${MISSION_BY_ID[id].proofType}) is accepted`, () => {
      const m = MISSION_BY_ID[id];
      const t = startTimer(id, DAY, m.timerMinutes!, t0);
      const end = t0 + m.timerMinutes! * 60_000;
      const paused = pauseTimer(t, end + 400);
      expect(paused).toBe(t);
      expect(endsAt(paused)).toBe(end);
      const now = end + 3000;
      expect(timerDone(paused, now)).toBe(true);
      expect(submit(id, paused, now).status).toBe('accepted');
    });
  }

  it('still pauses a timer that has time left', () => {
    const t = startTimer('fitness-stretch-10', DAY, 10, t0);
    const paused = pauseTimer(t, t0 + 9 * 60_000 + 59_000);
    expect(paused.pausedAt).toBe(t0 + 9 * 60_000 + 59_000);
    expect(endsAt(paused)).toBeNull();
    expect(submit('fitness-stretch-10', paused, t0 + 11 * 60_000).status).toBe('rejected');
    // Resumed, it ends a minute later than it would have.
    const resumed = resumeTimer(paused, paused.pausedAt! + 60_000);
    expect(endsAt(resumed)).toBe(t0 + 11 * 60_000);
  });

  it('a timer an earlier build paused after zero still ended at zero', () => {
    const t = startTimer('fitness-stretch-10', DAY, 10, t0, 1);
    const late: FocusTimer = { ...t, pausedAt: t0 + 10 * 60_000 + 400 };
    expect(endsAt(late)).toBe(t0 + 10 * 60_000);
    expect(submit('fitness-stretch-10', late, t0 + 10 * 60_000 + 3000).status).toBe('accepted');
    // With the tester speed-up too.
    const fast = startTimer('fitness-stretch-10', DAY, 10, t0, 60);
    expect(pauseTimer(fast, t0 + 10_400)).toBe(fast);
    expect(endsAt({ ...fast, pausedAt: t0 + 10_400 })).toBe(t0 + 10_000);
  });
});
