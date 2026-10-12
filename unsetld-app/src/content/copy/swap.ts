// The swap sheet (screens/swap): why are you swapping, recommended for you, and a mission of
// your own. Every user-facing string for the group, VoiceOver labels included. Sentence case
// except kickers and the primary button, no exclamation marks. Never "AI": the choices are
// "Recommended for you" and nothing more.
import type { ProofType, SwapReason } from '../../core/types';
import { PROOF_KIND } from './proof';

/** A no-break space: keeps "20 min" and "10 pts" together when a line wraps. */
const NBSP = ' ';

const minutesSaid = (n: number) => (n === 1 ? '1 minute' : `${n} minutes`);
const pointsSaid = (n: number) => (n === 1 ? '1 point' : `${n} points`);
const proofLabel = (type: ProofType) => (PROOF_KIND[type] ?? PROOF_KIND.PHOTO).label;
const proofSaid = (type: ProofType) => (PROOF_KIND[type] ?? PROOF_KIND.PHOTO).a11y;

export const SWAP = {
  /** The sheet, read as one thing. */
  a11y: 'Swap a mission',
  kicker: 'Swap',

  /** Step 1: one tap, nothing to type. */
  why: {
    title: 'Why are you swapping?',
    /** In the order the sheet shows them. */
    reasons: [
      { id: 'not-relevant', label: 'Not relevant' },
      { id: 'cant-today', label: 'Can’t do this today' },
      { id: 'too-easy', label: 'Too easy' },
      { id: 'too-hard', label: 'Too hard' },
      { id: 'already-did', label: 'Already did this' },
      { id: 'another', label: 'Just give me another' },
    ] as const satisfies readonly { id: SwapReason; label: string }[],
    hint: 'Shows missions to swap in',
    left: (n: number) => (n <= 0 ? 'No swaps left today' : n === 1 ? '1 swap left today' : `${n} swaps left today`),
  },

  /** Step 2. */
  choices: {
    kicker: 'Recommended for you',
    back: 'Back',
    backHint: 'Back to why you’re swapping',
    /** Under a choice's title, like a card on Today: "20 min · Photo · +10 pts". */
    meta: (minutes: number, proof: ProofType, points: number) =>
      [`${minutes}${NBSP}min`, proofLabel(proof).replace(/ /g, NBSP), `+${points}${NBSP}pts`].join(`${NBSP}· `),
    /** "Review Notes for 20 Minutes. School, 20 minutes, 10 points, proven with a photo" */
    a11y: (title: string, area: string, minutes: number, proof: ProofType, points: number) =>
      `${title}. ${[area || null, minutesSaid(minutes), pointsSaid(points), proofSaid(proof)].filter(Boolean).join(', ')}`,
    hint: 'Puts it in today',
    own: '+ Create my own',
    ownA11y: 'Create my own mission',
    ownHint: 'Write one of your own for this spot',
    /** Today already holds a mission of the user's own. */
    onePerDay: 'One of your own a day.',
    nothing: 'Nothing else fits today.',
    /** It was proven meanwhile, or no longer fits the day. Nothing was used. */
    cantGoIn: 'That one can’t go in today.',
  },

  /** Step 3: a mission of the user's own. */
  create: {
    title: 'Your own mission',
    back: 'Back',
    backHint: 'Back to the recommended missions',
    /** Missions of their own from before, to fill the form with one tap. */
    recent: 'Use again',
    field: 'What you’ll do',
    placeholder: 'What will you do?',
    count: (n: number, max: number) => `${n} / ${max}`,
    countA11y: (n: number, max: number) => `${n} of ${max} characters`,
    area: 'Area',
    proof: 'Proof',
    proofA11y: 'How you’ll prove it',
    proofLabel,
    length: 'Length',
    lengthA11y: 'Timer length',
    minutes: (n: number) => `${n}${NBSP}min`,
    minutesA11y: (n: number) => minutesSaid(n),
    /** What it earns in this spot, said before it's added: never more than the mission it replaces. */
    earns: (n: number) => `Earns ${n}${NBSP}pts. Never more than the one it replaces.`,
    earnsA11y: (n: number) => `Earns ${pointsSaid(n)}. Never more than the one it replaces.`,
    add: 'Add to today',
  },
} as const;
