// The Mission screen and its proof flow (spec sections 6 and 7), the on-device
// check notes, and the timer-done notification. Every user-facing string for the group.
// Never say a photo was checked by AI: the checks run on this phone and look at
// when and how a photo was taken, not at what it shows.
import type { ProofType, VerificationCheck } from '../../core/types';

export const MISSION = {
  day: (n: number) => `DAY ${String(n).padStart(3, '0')}`,
  ok: 'OK',

  meta: (minutes: number, points: number) => `${minutes} MIN · +${points} POINTS`,

  proof: 'PROOF',
  /** The first line under PROOF: how this mission is proven. The mission's own proof line follows it. */
  method: (type: ProofType, timerMinutes?: number): string => {
    const n = timerMinutes ?? 25;
    if (type === 'TIMER_AND_PHOTO') return `Run the ${n}-minute focus timer. When it ends, take a photo.`;
    if (type === 'TIMER') return `Run the ${n}-minute timer to the end.`;
    if (type === 'BEFORE_AFTER') return 'Take a photo before you start and one when you’re done.';
    return 'Take one photo.';
  },

  notInPlan: "Not in today's plan. You can prove it on a day it comes up.",
  missing: 'This mission is no longer in the library.',

  button: {
    prove: 'Prove it',
    timer: (minutes: number) => `Start ${minutes} min timer`,
    before: 'Take the before photo',
    after: 'Take the after photo',
    proofPhoto: 'Take the proof photo',
    /** A TIMER mission once its timer has run out: no photo. */
    markDone: 'Mark it done',
    done: 'Done',
  },

  swap: {
    button: 'Swap this mission',
    title: 'Swap this mission?',
    body: (left: number) => (left === 1 ? 'You have 1 swap left today.' : `You have ${left} swaps left today.`),
    yes: 'Swap',
    no: 'Cancel',
    noneTitle: 'Nothing else fits today.',
    noneBody: 'No other mission in this area fits your plan today. Your swap wasn’t used.',
    limitTitle: 'No swaps left today.',
    limitBody: 'More tomorrow.',
    ok: 'OK',
  },

  busy: {
    /**
     * Another mission's timer: running, paused, or finished and waiting for its photo
     * (or, with `photo` false, for Mark it done). No title if that mission is gone.
     */
    timerTitle: (title: string | undefined, state: 'running' | 'paused' | 'done', photo = true) => {
      const of = title ? `The timer for ${title}` : 'Another timer';
      if (state === 'done') return photo ? `${of} is done, and its proof photo isn’t in yet.` : `${of} has finished, but that mission isn’t marked done yet.`;
      if (state === 'paused') return `${of} is paused.`;
      return title ? `A timer is running for ${title}.` : 'Another timer is running.';
    },
    timerBody: 'Start this one instead? That timer is cleared and earns nothing.',
    beforeTitle: (title: string | undefined) => (title ? `${title} has a before photo waiting.` : 'Another mission has a before photo waiting.'),
    beforeBody: 'Start this one instead? That before photo is deleted.',
    yes: 'Start this one',
    no: 'Cancel',
  },

  timer: {
    line: 'Phone down. Come back when it rings.',
    paused: 'Paused. The clock stops until you resume.',
    done: 'Time. Take the proof photo.',
    /** A TIMER mission: the timer is the whole proof. */
    doneNoPhoto: 'Time. Mark it done.',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End timer',
    endTitle: 'End the timer?',
    endBody: 'Ending early earns nothing.',
    endYes: 'End timer',
    endNo: 'Keep going',
    a11y: (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m} ${m === 1 ? 'minute' : 'minutes'} ${s} ${s === 1 ? 'second' : 'seconds'} left`;
    },
    a11yPaused: 'Paused',
  },

  before: {
    saved: 'Before saved. Now do it.',
    retake: 'Retake the before photo',
    label: 'BEFORE',
    after: 'AFTER',
    used: 'That photo was already used. Take a new one.',
  },

  review: {
    submit: 'Submit proof',
    retake: 'Retake',
  },

  checking: 'Checking proof…',

  /** Notes from the on-device checks (core/verify). A failed one is shown on Not counted. */
  check: {
    photosIn: 'All photos in.',
    photoMissing: 'A photo is missing.',
    stale: (fresh: number) => `Take the photo again. Proof has to be from the last ${fresh} minutes.`,
    camera: 'Taken just now with the camera.',
    picked: 'Preview build: picked from files.',
    order: 'Before, then after.',
    tooSoon: 'The after photo has to come a few minutes after the before.',
    timerDone: 'Timer finished.',
    timerShort: 'Finish the timer first.',
    photoBeforeTimer: 'Take the photo after the timer.',
    timerOld: (fresh: number) => `The timer ended more than ${fresh} minutes ago. Run it again and mark it done when it ends.`,
    newPhoto: 'New photo.',
    duplicate: 'That photo was already used. Take a new one.',
  },
  checkFailed: 'That didn’t go through. Nothing was counted. Try again.',

  done: {
    title: 'PROVEN.',
    points: (n: number) => `+${n} POINTS`,
    balance: (from: number, to: number) => `${from} → ${to} POINTS`,
    toReward: (need: number, title: string) => `${need} POINTS TO ${title.toUpperCase()}`,
    ready: (title: string) => `${title.toUpperCase()} IS READY`,
    streakFirst: (n: number) => `Day ${n}. Streak's alive.`,
    streak: (n: number) => (n === 1 ? 'Streak: 1 day' : `Streak: ${n} days`),
    perfect: 'PERFECT DAY',
    bonus: (n: number) => `+${n} BONUS`,
    /** Before the checks line when the proof has photos. */
    saved: 'Proof saved.',
  },

  /** "Checked on this phone: taken just now, timer finished, new photo." from the checks that passed. */
  checked: (checks: readonly VerificationCheck[], fromCamera: boolean): string => {
    const said: Partial<Record<VerificationCheck['id'], string>> = {
      fresh: fromCamera ? 'taken just now' : 'picked from files in the preview',
      order: 'before, then after',
      timer: 'timer finished',
      duplicate: 'new photo',
    };
    const parts = checks.filter(c => c.ok && said[c.id]).map(c => said[c.id]!);
    return parts.length ? `Checked on this phone: ${parts.join(', ')}.` : 'Checked on this phone.';
  },

  rejected: {
    title: 'Not counted.',
    retry: 'Try again',
  },

  proven: {
    line: (time: string, points: number) => `PROVEN ${time} · +${points} POINTS`,
    focused: (minutes: number) => `${minutes} MIN FOCUSED`,
    /** A TIMER mission: the timer was the proof. */
    timed: (minutes: number) => `${minutes} MIN TIMER FINISHED`,
    cleared: 'Photo cleared. The mission stays on your record.',
    stamp: (points: number) => `+${points}`,
  },

  camera: {
    off: 'Camera access is off. Proof photos are taken in the app.',
    settings: 'Open Settings',
    failed: 'The camera didn’t open. Try again.',
    saveFailed: 'The photo didn’t save. Try again.',
    preview: 'Preview build: pick any photo. The app only takes them live.',
  },

  dayEnded: {
    title: 'The day ended at 4:00 AM.',
    body: 'That proof was for yesterday’s plan. Today has its own missions.',
    ok: 'OK',
  },

  a11y: {
    photo: 'Proof photo',
    before: 'Before photo',
    after: 'After photo',
    rewards: 'Opens Rewards',
    meta: (minutes: number, points: number) => `${minutes} minutes, ${points} points`,
    balance: (from: number, to: number) => `${from} to ${to} points`,
    /** The proof stamp, read aloud. */
    stamp: (date: string, time: string) => `Taken ${date} at ${time}`,
  },

  notify: {
    title: 'unsetld',
    /**
     * The timer-done alert. Without the mission's proof type it says nothing about a
     * photo, so it reads right for TIMER missions (no photo) and TIMER_AND_PHOTO alike.
     */
    body: (clock: string, type?: ProofType) =>
      type === 'TIMER_AND_PHOTO' ? `${clock} done. Take the proof photo.` : type === 'TIMER' ? `${clock} done. Open the mission and mark it done.` : `${clock} done. Open the mission to finish it.`,
  },
} as const;
