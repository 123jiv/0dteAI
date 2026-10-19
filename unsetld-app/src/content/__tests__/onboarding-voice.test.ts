// The launch pass's new words for onboarding, the age gate and the reminders card (P0-4, P1-2,
// P1-3) keep the UNSETLD voice: sentence case, no "!" or "…", no emoji, none of the words the
// content validator bans (scripts/validate-content.mjs BANNED), never a claim about AI. The age
// question is neutral: nothing on it says which answer gets in.
import { describe, expect, it } from 'vitest';
import { AGE } from '../copy/age';
import { HOME } from '../copy/home';
import { ONBOARDING, ONBOARDING_STEPS } from '../copy/onboarding';

// scripts/validate-content.mjs BANNED (motivational talk, therapy-speak and slang).
const BANNED = [
  'sigma', 'grindset', 'rise and grind', 'best version of yourself', 'level up', 'unlock', 'journey', 'manifest',
  'crush it', 'beast mode', 'hustle', 'grind', 'grinding', 'king', 'bro', 'no cap', 'main character', 'glow up',
  'mindset', 'game-changer', 'game changer', 'your potential', 'you got this', "you've got this", 'believe in yourself',
  'self-care', 'vibes', 'vibe', 'aura', 'rizz', 'cooked', 'npc', 'era', 'slay', 'alpha', 'no days off', 'choose yourself',
  'be uncomfortable', 'discomfort', 'embrace', 'warrior', 'champion', 'legend', 'destiny', 'universe',
];
const bannedRe = new RegExp(`\\b(${BANNED.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i');
const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Every string in a copy object. Functions are called with each set of sample arguments that
 * suits them (a set that throws, or reads as "undefined", doesn't).
 */
function strings(v: unknown, samples: unknown[][]): string[] {
  if (typeof v === 'string') return [v];
  if (typeof v === 'function') {
    return samples.flatMap(args => {
      try {
        return strings((v as (...a: unknown[]) => unknown)(...args), samples);
      } catch {
        return [];
      }
    });
  }
  if (Array.isArray(v)) return v.flatMap(x => strings(x, samples));
  if (v && typeof v === 'object') return Object.values(v).flatMap(x => strings(x, samples));
  return [];
}
const sound = (s: string) => !/undefined|\[object|NaN|^\s|\D OF \d/.test(s);

const ageWords = strings(AGE, [[1], [6], [12]]).filter(sound);
const cardWords = strings(HOME.remindersCard, [
  [3, '7:00 AM', '10:00 PM'],
  [1, '7:00 AM', '10:00 PM'],
]).filter(sound);
const onboardingWords = strings({ tracks: ONBOARDING.tracks, about: ONBOARDING.about, day: ONBOARDING.day }, [
  [2],
  ['School', 'Classes and grades'],
  [['Coding', 'Music']],
  [[]],
  ['7:00 AM', 'Today: Plan Tomorrow’s Top 3.'],
]).filter(sound);
const ALL = [...ageWords, ...cardWords, ...onboardingWords];

describe('the voice', () => {
  it('has words to check', () => {
    expect(ageWords.length).toBeGreaterThan(10);
    expect(cardWords.length).toBeGreaterThan(4);
    expect(onboardingWords.length).toBeGreaterThan(20);
  });

  it('no "!", "…" or emoji', () => {
    for (const s of ALL) {
      expect(s, s).not.toMatch(/[!…]/);
      expect(EMOJI.test(s), s).toBe(false);
    }
  });

  it('none of the banned words, and no AI', () => {
    for (const s of ALL) {
      expect(s.match(bannedRe)?.[0] ?? null, s).toBeNull();
      expect(s, s).not.toMatch(/\bAI\b|artificial intelligence/i);
    }
  });

  it('sentence case: a capital first, and no shouting (UNSETLD+ and the step count aside)', () => {
    for (const s of ALL) {
      // The wordmark is lower case by design (the notification preview's app name).
      if (s !== 'unsetld') expect(s.charAt(0), s).toMatch(/[A-Z0-9]/);
      const shouty = s.replace(/UNSETLD\+?|AM|PM|OF/g, '').match(/\b[A-Z]{3,}\b/);
      expect(shouty?.[0] ?? null, s).toBeNull();
    }
  });
});

describe('the age question is neutral', () => {
  it('nothing before the answer says which ages get in', () => {
    const asked = [AGE.title, AGE.body, AGE.yearLabel, AGE.month, AGE.continue].join(' ');
    expect(asked).not.toMatch(/\d|old enough|must be|at least|over|under|adult|parent/i);
  });

  it('the block screen says what happened, and nothing to try again with', () => {
    expect(AGE.blocked.title).toBe('UNSETLD is for 13 and over.');
    expect(AGE.blocked.body).toBe('Nothing you entered was kept.');
    expect(JSON.stringify(AGE.blocked)).not.toMatch(/try again|change|back|retry/i);
  });

  it('twelve months, in order', () => {
    expect(Array.from({ length: 12 }, (_, i) => AGE.monthShort(i + 1))).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(AGE.a11yMonth(10)).toBe('October');
  });
});

describe('three numbered steps', () => {
  it('Areas, Time, Goal', () => {
    expect(ONBOARDING_STEPS).toBe(3);
    expect([1, 2, 3].map(ONBOARDING.step)).toEqual(['01 / 03', '02 / 03', '03 / 03']);
  });

  it('About you asks nothing but what someone is learning', () => {
    const about = ONBOARDING.about as Record<string, unknown>;
    for (const gone of ['school', 'work', 'project', 'gym', 'age', 'schoolLevel', 'schoolConflict', 'title', 'body']) expect(about[gone], gone).toBeUndefined();
    expect(ONBOARDING.about.row).toBe("What you're learning");
  });

  it('the Areas step has no About you dead end, and Reminders is You only', () => {
    const tracks = ONBOARDING.tracks as Record<string, unknown>;
    for (const gone of ['schoolOff', 'schoolOffEdit', 'aboutYou']) expect(tracks[gone], gone).toBeUndefined();
    const day = ONBOARDING.day as Record<string, unknown>;
    for (const gone of ['title', 'body', 'allow', 'notNow']) expect(day[gone], gone).toBeUndefined();
  });
});
