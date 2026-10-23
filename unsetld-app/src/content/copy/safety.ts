// What the app says when something the user writes (a mission of their own, the goal, the
// weekly focus "Something else") isn't something it can use (core/safety). One quiet line under
// the field, said by VoiceOver as it appears. Plain and calm: no lecture, no "!", nothing about
// what was typed. Sentence case. Straight quotes become typographic at display time.
import type { SafetyCategory, SafetyResult } from '../../core/safety';

type BlockCategory = Exclude<SafetyCategory, 'self-harm' | 'eating-risk' | 'body'>;

const BLOCK = {
  diet: "UNSETLD doesn't do fasting, calorie targets or weigh-ins. Try training or moving instead.",
  extreme: "UNSETLD doesn't do punishment workouts or skipped sleep. Pick something you can recover from.",
  substances: 'UNSETLD doesn\'t do nicotine, alcohol or drugs. Cutting back is different: "Quit vaping" works.',
  gambling: "UNSETLD doesn't do betting or gambling. Saving or budgeting works.",
  trading: "UNSETLD doesn't do day trading, options or leverage. Saving and budgeting work.",
  dares: "UNSETLD doesn't do dares, viral challenges or meeting people from online.",
  adult: "That doesn't fit UNSETLD. Write something else.",
  private: 'Leave out passwords, card numbers, ID numbers and addresses.',
} satisfies Record<BlockCategory, string>;

export const SAFETY = {
  block: BLOCK,
  /** A mission of their own about the scale or a body: it would be proven by a photo of one. */
  weightMission: 'Missions are about what you do, not what you weigh or how you look. Try a workout or a walk.',
  /** A goal or focus about weight or how a body looks: kept, with this line. */
  bodyNote: 'Missions stay on training and moving. Nothing here tracks weight or food.',
  /** Not kept. No keyword hint, no area question: where to get help, and nothing else. */
  support: {
    'self-harm': "If you're thinking about hurting yourself, you don't have to deal with it alone.",
    'eating-risk': "If food or your body feels hard right now, you don't have to deal with it alone.",
    /** On a phone set to the US. */
    us: "Call or text 988, any time. It's free and confidential.",
    /** Anywhere else. */
    elsewhere: 'Find a free helpline near you at findahelpline.com.',
    call: 'Call 988',
    callA11y: 'Call 988, the Suicide and Crisis Lifeline',
    text: 'Text 988',
    textA11y: 'Text 988, the Suicide and Crisis Lifeline',
    site: 'findahelpline.com',
    siteA11y: 'Open findahelpline.com',
  },
};

/** Where the help line buttons go. */
export const HELP_LINKS = { call: 'tel:988', text: 'sms:988', site: 'https://findahelpline.com' } as const;

/** True for a locale whose region is the United States ("en-US", "es_US"): 988 answers there. */
export function inUS(locale: string | null | undefined): boolean {
  return /^[a-z]{2,3}(?:[-_][A-Za-z]{4})?[-_]US\b/i.test(locale ?? '');
}

/**
 * The line under the field for a check's result, or null when there's nothing to say. For
 * support, the whole message (the buttons come with it, on a US phone).
 */
export function safetyLine(r: SafetyResult, us: boolean): string | null {
  if (r.level === 'ok' || !r.category) return null;
  if (r.level === 'support') {
    const first = r.category === 'eating-risk' ? SAFETY.support['eating-risk'] : SAFETY.support['self-harm'];
    return `${first} ${us ? SAFETY.support.us : SAFETY.support.elsewhere}`;
  }
  if (r.category === 'body') return r.level === 'block' ? SAFETY.weightMission : SAFETY.bodyNote;
  if (r.category === 'self-harm' || r.category === 'eating-risk') return null;
  return BLOCK[r.category];
}
