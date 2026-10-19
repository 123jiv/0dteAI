// Delete data on this phone, as the page says it: WHAT GOES names everything the brief lists
// (record, points, plans, settings, missions you wrote, proof photos, sign-in, the Keychain copy),
// the account is kept apart from it, and the voice rules hold (no "!", no emoji, no slop words).
import { describe, expect, it } from 'vitest';
import { DATA } from '../copy/data';

/** Every string in the copy object, functions called with sample values. */
function strings(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (typeof x === 'function') return [...strings((x as (a: unknown) => unknown)(1)), ...strings((x as (a: unknown) => unknown)(2)), ...strings((x as (a: unknown) => unknown)(true))];
  if (Array.isArray(x)) return x.flatMap(strings);
  if (x && typeof x === 'object') return Object.values(x).flatMap(strings);
  return [];
}

const BANNED = /\b(grind|grinding|level up|journey|mindset|unlock|crush it|hustle|you got this|amazing|awesome|oops|sorry)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

describe('Delete data on this phone copy', () => {
  it("WHAT GOES covers the brief's eight things", () => {
    const goes = DATA.goes.join(' | ').toLowerCase();
    for (const thing of ['record', 'points', 'plans', 'settings', 'missions you wrote', 'proof photos', 'sign-in', 'keychain']) {
      expect(goes, thing).toContain(thing);
    }
    // Streaks, reward codes, the focus and today's missions go with the record.
    for (const thing of ['streak', 'reward codes', 'focus', "today's missions"]) expect(goes, thing).toContain(thing);
  });

  it('WHAT STAYS keeps the membership and says how to get it back', () => {
    const stays = DATA.stays.join(' ');
    expect(stays).toContain('UNSETLD+');
    expect(stays).toContain('Restore purchases');
  });

  it('keeps it apart from the account: signed in, the page and the confirm say the account stays', () => {
    expect(DATA.signedIn).toContain('account on unsetld.com stays');
    expect(DATA.confirm.body(true)).toContain("Your unsetld.com account isn't deleted.");
    expect(DATA.confirm.body(false)).not.toContain('account');
    expect(DATA.account.clearToo).toContain('Delete data on this phone');
  });

  it('counts codes that still work in words that agree', () => {
    expect(DATA.liveCodes(1)).toBe('You have 1 code that still works. Copy it from Reward history first.');
    expect(DATA.liveCodes(3)).toBe('You have 3 codes that still work. Copy them from Reward history first.');
  });

  it('keeps the voice: no exclamation marks, emoji or slop words', () => {
    for (const s of strings(DATA)) {
      expect(s, s).not.toContain('!');
      expect(EMOJI.test(s), s).toBe(false);
      expect(BANNED.test(s), s).toBe(false);
    }
  });
});
