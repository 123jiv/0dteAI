// The focus timer for timed missions (TIMER and TIMER_AND_PHOTO). It runs on wall-clock time, so it
// keeps counting while the phone is locked or the app is closed.
import type { DayKey } from './time';

export interface FocusTimer {
  missionId: string;
  day: DayKey;
  requiredSeconds: number;
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Total time spent paused before the current pause. */
  pausedMs: number;
  /** Tester tools can run timers faster in the preview. 1 normally. */
  speed: number;
}

export function startTimer(missionId: string, day: DayKey, minutes: number, now: number, speed = 1): FocusTimer {
  return { missionId, day, requiredSeconds: minutes * 60, startedAt: now, pausedAt: null, pausedMs: 0, speed };
}

/** Once the time is up there's nothing to pause: the timer stays done (a Pause tap can land just after zero). */
export function pauseTimer(t: FocusTimer, now: number): FocusTimer {
  return t.pausedAt || timerDone(t, now) ? t : { ...t, pausedAt: now };
}

export function resumeTimer(t: FocusTimer, now: number): FocusTimer {
  return t.pausedAt ? { ...t, pausedAt: null, pausedMs: t.pausedMs + (now - t.pausedAt) } : t;
}

export function elapsedSeconds(t: FocusTimer, now: number): number {
  const end = t.pausedAt ?? now;
  return Math.max(0, Math.floor(((end - t.startedAt - t.pausedMs) * t.speed) / 1000));
}

export function remainingSeconds(t: FocusTimer, now: number): number {
  return Math.max(0, t.requiredSeconds - elapsedSeconds(t, now));
}

export function timerDone(t: FocusTimer, now: number): boolean {
  return elapsedSeconds(t, now) >= t.requiredSeconds;
}

/**
 * The real time the timer reaches zero (for the "time's up" notification and the proof), or null
 * while paused short of it. A timer paused after zero (saved by an earlier build) still ended then.
 */
export function endsAt(t: FocusTimer): number | null {
  const end = t.startedAt + t.pausedMs + (t.requiredSeconds * 1000) / t.speed;
  if (t.pausedAt) return end <= t.pausedAt ? end : null;
  return end;
}

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
