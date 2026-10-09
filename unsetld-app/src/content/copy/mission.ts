// The Mission screen and its proof flow (spec sections 6 and 7), and the timer-done
// notification. Every user-facing string for the group.
// Never say a photo was checked by AI: the checks run on this phone and look at
// when and how a photo was taken, not at what it shows.
import type { MissionSlot, ProofType, VerificationCheck } from '../../core/types';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

/** "three" for 3, the digits past six. */
function word(n: number): string {
  return WORDS[n] ?? String(n);
}

export const MISSION = {
  day: (n: number) => `DAY ${String(n).padStart(3, '0')}`,

  slot: { quick: 'QUICK WIN', progress: 'PROGRESS', challenge: 'CHALLENGE' } satisfies Record<MissionSlot, string>,
  label: (slot: string, track: string) => `${slot} · ${track}`,
  meta: (minutes: number, points: number) => `${minutes} MIN · +${points} POINTS`,

  section: {
    why: 'WHY THIS MATTERS',
    how: 'HOW TO DO IT',
    proof: 'PROOF REQUIRED',
    points: 'POINTS',
  },
  step: (i: number) => String(i + 1).padStart(2, '0'),

  proofType: (type: ProofType, timerMinutes?: number): string => {
    if (type === 'PHOTO_AFTER') return 'A photo of the result';
    if (type === 'BEFORE_AFTER') return 'Before and after photos';
    if (type === 'TIMER_AND_PHOTO') return `${timerMinutes ?? 25}-minute timer, then a photo`;
    return 'One photo';
  },

  points: {
    value: (n: number) => `+${n}`,
    when: 'When the proof is in.',
    bonus: (count: number, bonus: number) => `Prove all ${word(count)} today for +${bonus} more.`,
  },

  notInPlan: "Not in today's plan. You can prove it on a day it comes up.",
  missing: 'This mission is no longer in the library.',

  button: {
    prove: 'Prove it',
    timer: (clock: string) => `Start the ${clock} timer`,
    before: 'Take the before photo',
    after: 'Take the after photo',
    proofPhoto: 'Take the proof photo',
    done: 'Done',
    close: 'Close',
  },

  swap: {
    button: 'Swap this mission',
    title: 'Swap this mission?',
    body: (left: number) => (left === 1 ? 'You have 1 swap left today.' : `You have ${left} swaps left today.`),
    yes: 'Swap',
    no: 'Cancel',
    noneTitle: 'Nothing else fits today.',
    noneBody: 'Every other mission for this slot is resting or doesn’t fit your plan. Your swap wasn’t used.',
    limitTitle: 'No swaps left today.',
    limitBody: 'More tomorrow.',
    ok: 'OK',
  },

  busy: {
    timerTitle: (title: string) => `A timer is running for ${title}.`,
    timerBody: 'Start this one instead? That timer ends and earns nothing.',
    beforeTitle: (title: string) => `${title} has a before photo waiting.`,
    beforeBody: 'Start this one instead? That before photo is deleted.',
    yes: 'Start this one',
    no: 'Cancel',
  },

  timer: {
    line: 'Phone down. Come back when it rings.',
    paused: 'Paused. The clock stops until you resume.',
    done: 'Time. Take the proof photo.',
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

  done: {
    title: 'PROVEN.',
    points: (n: number) => `+${n} POINTS`,
    balance: (from: number, to: number) => `${from} → ${to} POINTS`,
    toReward: (need: number, title: string) => `${need} POINTS TO ${title.toUpperCase()}`,
    ready: (title: string) => `${title.toUpperCase()} IS READY`,
    readyHint: 'Opens Rewards',
    streakFirst: (n: number) => `Day ${n}. Streak's alive.`,
    streak: (n: number) => (n === 1 ? 'Streak: 1 day' : `Streak: ${n} days`),
    perfect: 'PERFECT DAY',
    bonus: (n: number) => `+${n} BONUS`,
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
  },

  notify: {
    title: 'unsetld',
    body: (clock: string) => `${clock} done. Take the proof photo.`,
  },
} as const;
