// The Mission screen and its proof flow (MISSIONS_SPEC 6 and 7, UX_REDESIGN 5), the on-device
// check notes, and the timer-done notification. Every user-facing string for the group.
// Sentence case except kickers and the primary button (the Button uppercases its own label).
// Never say a photo was checked by AI: the checks run on this phone and look at
// when and how a photo was taken, not at what it shows.
import type { ProofType, VerificationCheck } from '../../core/types';

/** "1,340" */
const num = (n: number) => n.toLocaleString('en-US');

export const MISSION = {
  day: (n: number) => `DAY ${n}`,
  ok: 'OK',

  /** Under the title: "30 min · +15 pts". How it's proven sits in the Proof card below. */
  meta: (minutes: number, points: number) => `${minutes}\u00a0min · +${points}\u00a0pts`,

  /** The Proof card's kicker. */
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
    /** A photo mission's one button (it opens the camera), and a TIMER mission's once its timer ends (no photo). */
    prove: 'Prove it',
    timer: (minutes: number) => `Start ${minutes} min timer`,
    before: 'Take the before photo',
    after: 'Take the after photo',
    /** A timer with a photo, once the time is up: the camera. */
    takeProof: 'Take proof',
    /** The done stage's one button. */
    continue: 'Continue',
  },

  /** A mission with no timer: a small kicker over the one instruction, then Prove it (or, before and after, once the before is in). */
  detail: {
    doIt: 'Do it',
  },

  /** The button only: the dialogs are Today's (screens/home/swap). */
  swap: {
    button: 'Swap this mission',
  },

  busy: {
    /**
     * Another mission's timer: running, paused, or finished and waiting for its photo
     * (or, with `photo` false, for Prove it). No title if that mission is gone.
     */
    timerTitle: (title: string | undefined, state: 'running' | 'paused' | 'done', photo = true) => {
      const of = title ? `The timer for ${title}` : 'Another timer';
      if (state === 'done') return photo ? `${of} is done, and its proof photo isn’t in yet.` : `${of} has finished, but that mission isn’t proven yet.`;
      if (state === 'paused') return `${of} is paused.`;
      return title ? `A timer is running for ${title}.` : 'Another timer is running.';
    },
    timerBody: 'Start this one instead? That timer is cleared and earns nothing.',
    beforeTitle: (title: string | undefined) => (title ? `${title} has a before photo waiting.` : 'Another mission has a before photo waiting.'),
    beforeBody: 'Start this one instead? That before photo is deleted.',
    yes: 'Start this one',
    no: 'Cancel',
  },

  /** The lock-in screen: LOCK IN FOR 30 MINUTES, the clock, the title, one line. */
  timer: {
    lockIn: (minutes: number) => (minutes === 1 ? 'Lock in for 1 minute' : `Lock in for ${minutes} minutes`),
    /** While it runs. */
    stay: 'Stay here. Get it done.',
    /** A Fitness mission: done away from the phone. */
    go: 'Phone down. Go.',
    /** A quiet second note, only while the timer-done notification can ring (allowed, and not the browser preview). */
    ring: 'We’ll ring when time’s up.',
    paused: 'Paused.',
    /** The time is up: the line over Take proof (or Prove it). */
    time: 'Time.',
    /** Said with VoiceOver as the time is up, with what's next. */
    timeSaid: (photo: boolean) => (photo ? 'Time. Take proof.' : 'Time. Prove it.'),
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
    newPhoto: 'New photo.',
    duplicate: 'That photo was already used. Take a new one.',
  },
  checkFailed: 'That didn’t go through. Nothing was counted. Try again.',

  /**
   * The done stage: PROVEN., the points (secondary), then the record moment: this week's days,
   * "Day 12 added to your record.", "1 / 3 today" and the streak. The reward and the area after.
   */
  done: {
    title: 'PROVEN.',
    /**
     * Under the title, small: "+15 pts" (a kicker, so it reads +15 PTS). While it counts up, `n`
     * is the running number and `total` what it lands on: the unit is the total's, so it never
     * flips from "pt" to "pts" on the way.
     */
    pts: (n: number, total = n) => `+${num(n)}\u00a0${total === 1 ? 'pt' : 'pts'}`,
    /** The first proof of the day: the day goes on the record. "Day N" is the nav row's DAY N. */
    dayAdded: (n: number) => `Day ${num(n)} added to your record.`,
    /** "1 / 3" in serif, then "today" (or "Perfect day" once every mission is proven). */
    count: (done: number, all: number) => `${done} / ${all}`,
    today: 'today',
    perfect: 'Perfect day',
    /** The perfect-day bonus, a beat after. */
    bonus: (n: number) => `+${num(n)} bonus`,
    /** Said when the proof extended the streak: "Streak started" on its first day, else "12 day streak". */
    streak: (n: number) => (n <= 1 ? 'Streak started' : `${num(n)} day streak`),
    toNext: (need: number) => `${num(need)}\u00a0${need === 1 ? 'pt' : 'pts'} to next reward`,
    ready: (title: string) => `${title} is ready`,
    share: 'Share today',
    /** The quiet last line when the proof has photos. */
    saved: 'Proof saved privately on this phone.',
    /** All but one proven: what the last one does. */
    oneMore: 'One more for a perfect day.',
    /** The proof took its area to a new level: a kicker ("SCHOOL · LEVEL 3") over the area's meter. */
    level: (area: string, level: number) => `${area} · Level ${level}`,
    /** Otherwise, quietly: what the proof added to its area ("+15 to School · Level 2"). No second currency: it's the mission's points. */
    area: (points: number, area: string, level: number) => `+${num(points)} to ${area} · Level ${level}`,
    /** The week row's letters, Monday first. */
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as readonly string[],
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
    /** Under a proven mission, as on its card: "Proven 9:47 AM · +15". */
    line: (time: string, points: number) => `Proven ${time} · +${points}`,
    focused: (minutes: number) => `${minutes}\u00a0min focused`,
    /** A TIMER mission: the timer was the proof. */
    timed: (minutes: number) => `${minutes}-minute timer finished`,
    cleared: 'Photo cleared. The mission stays on your record.',
  },

  camera: {
    off: 'Camera access is off. Proof photos are taken in the app.',
    settings: 'Open Settings',
    failed: 'The camera didn’t open. Try again.',
    saveFailed: 'The photo didn’t save. Try again.',
    preview: 'Preview build: pick any photo. The app only takes them live.',
  },

  /** Starting a timer that would run past 4:00 AM, when the day's missions close. */
  lateTimer: {
    title: 'Not enough time left today.',
    body: (minutes: number) => `A ${minutes}-minute timer would end after 4:00 AM, when today’s missions close, so it wouldn’t count. Tomorrow has its own missions.`,
    ok: 'OK',
  },

  dayEnded: {
    title: 'The day ended at 4:00 AM.',
    body: 'That proof was for yesterday’s plan. Today has its own missions.',
    /** A timer or a before photo was still going at 4:00 AM (on the mission page or on Today). */
    unfinished: 'It was still going, so it didn’t count. Today has its own missions.',
    ok: 'OK',
  },

  a11y: {
    photo: 'Proof photo',
    before: 'Before photo',
    after: 'After photo',
    rewards: 'Opens Rewards',
    meta: (minutes: number, points: number) => `${minutes} minutes, ${points} points`,
    /** The Proof card, read as one: "Proven with the timer and a photo. Run the 30-minute focus timer …". */
    proof: (kind: string, lines: readonly string[]) => [`${kind.charAt(0).toUpperCase()}${kind.slice(1)}.`, ...lines].join(' '),
    points: (n: number) => (n === 1 ? 'Plus 1 point' : `Plus ${n} points`),
    /** "1 of 3 today." or, every mission proven, "3 of 3 today. Perfect day." */
    today: (done: number, all: number, perfect: boolean) => `${done} of ${all} today.${perfect ? ' Perfect day.' : ''}`,
    bonus: (n: number) => (n === 1 ? 'Plus 1 bonus point.' : `Plus ${n} bonus points.`),
    /** The visible line says "to next reward"; VoiceOver hears which one. */
    toNext: (need: number, title: string) => `${need} ${need === 1 ? 'point' : 'points'} to next reward, ${title}.`,
    ready: (title: string) => `${title} is ready.`,
    /** The level the proof took its area to, with where the meter stands in it. */
    level: (area: string, level: number, into: number, span: number) => `${area} is now level ${level}. ${into} of ${span} to level ${level + 1}.`,
    levelSaid: (area: string, level: number) => `${area} is now level ${level}.`,
    area: (points: number, area: string, level: number) => `Plus ${points} to ${area}. Level ${level}.`,
    /** The week row, read as one sentence a day. */
    weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as readonly string[],
    /**
     * One day of the week row: "Wednesday, today, 1 mission proven", "Monday, perfect day",
     * "Tuesday, Off Day, streak kept", "Thursday, nothing proven", "Friday, to come".
     */
    day: (
      name: string,
      d: { when: 'past' | 'today' | 'future'; proven: number; perfect: boolean; covered: boolean; legacy: boolean; before: boolean },
    ): string => {
      if (d.when === 'future') return `${name}, to come`;
      const head = d.when === 'today' ? `${name}, today` : name;
      if (d.perfect) return `${head}, perfect day`;
      if (d.proven > 0) return `${head}, ${d.proven === 1 ? '1 mission' : `${d.proven} missions`} proven`;
      if (d.legacy) return `${head}, on your record`;
      if (d.covered) return `${head}, Off Day, streak kept`;
      if (d.before) return `${head}, before your record`;
      return `${head}, nothing proven`;
    },
    /**
     * Said once as the done stage opens (VoiceOver on iOS reads no live region), with the final
     * numbers rather than the count-up, in the order the screen puts them: "Proven. Plus 15 points.
     * Day 12 added to your record. 1 of 3 today. 12 day streak. 205 points to next reward."
     */
    done: (o: {
      points: number;
      day?: string | null;
      today: string;
      streak?: string | null;
      bonus?: string | null;
      reward?: string | null;
      level?: string | null;
    }): string => {
      const sentence = (x: string | null | undefined) => (x ? (/[.]$/.test(x) ? x : `${x}.`) : null);
      return ['Proven.', `${MISSION.a11y.points(o.points)}.`, o.day, o.today, sentence(o.streak), o.bonus, o.reward, o.level].filter(Boolean).join(' ');
    },
    /** Not counted, with what failed, as the screen lists it. */
    rejected: (notes: readonly string[]) => ['Not counted.', ...notes].join(' '),
    proven: (time: string, points: number) => `Proven at ${time}, ${points} points`,
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
      type === 'TIMER_AND_PHOTO' ? `${clock} done. Take proof.` : type === 'TIMER' ? `${clock} done. Open the mission and prove it.` : `${clock} done. Open the mission to finish it.`,
  },
} as const;
