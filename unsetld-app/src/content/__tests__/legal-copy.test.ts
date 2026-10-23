// The Privacy Policy, Terms, rewards terms and How missions work (content/legal.json) say what the
// app does (launch pass P0-7): the voice rules hold; the policy names Delete data on this phone and
// keeps it apart from Delete account; "Your answers" names only answers that are still asked and
// still count; the age section matches the gate; the Keychain section says what the copy holds;
// nothing claims the app collects usage data (the pipeline ships dormant: docs/METRICS.md); and the
// numbers in How missions work (swaps, the perfect day, photo retention) are the rules' own.
import { describe, expect, it } from 'vitest';
import { MIN_AGE } from '../../core/age';
import { DATA } from '../copy/data';
import { ONBOARDING, ONBOARDING_STEPS } from '../copy/onboarding';
import legal from '../legal.json';
import rules from '../rules.json';

type Section = { h: string; p?: string; list?: string[]; accessOnly?: boolean };
type Doc = { title: string; updated?: string; sections: Section[] };
const DOCS = legal as unknown as Record<'record' | 'access' | 'terms' | 'privacy', Doc>;

const text = (s: Section) => [s.p ?? '', ...(s.list ?? [])].join(' ');
const docText = (d: Doc) => [d.title, ...d.sections.flatMap(s => [s.h, text(s)])].join(' ');
function section(doc: keyof typeof DOCS, h: string): string {
  const s = DOCS[doc].sections.find(x => x.h === h);
  expect(s, `${doc} › ${h}`).toBeDefined();
  return text(s!);
}

// scripts/validate-content.mjs BANNED (the words the app's voice never uses).
const BANNED = [
  'sigma', 'grindset', 'rise and grind', 'best version of yourself', 'level up', 'unlock', 'journey', 'manifest',
  'crush it', 'beast mode', 'hustle', 'grind', 'grinding', 'king', 'bro', 'no cap', 'main character', 'glow up',
  'mindset', 'game-changer', 'game changer', 'your potential', 'you got this', "you've got this", 'believe in yourself',
  'self-care', 'vibes', 'vibe', 'aura', 'rizz', 'cooked', 'npc', 'era', 'slay', 'alpha', 'no days off', 'choose yourself',
  'be uncomfortable', 'discomfort', 'embrace', 'warrior', 'champion', 'legend', 'destiny', 'universe',
];
const bannedRe = new RegExp(`\\b(${BANNED.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i');
const EMOJI = /\p{Extended_Pictographic}/u;

describe('legal and help docs: voice', () => {
  for (const [id, doc] of Object.entries(DOCS)) {
    it(`${id}: no "!", emoji or banned words`, () => {
      for (const s of doc.sections) {
        for (const line of [s.h, text(s)]) {
          expect(line, line).not.toContain('!');
          expect(EMOJI.test(line), line).toBe(false);
          expect(bannedRe.test(line), line).toBe(false);
        }
      }
    });
  }

  it('dates are real days', () => {
    for (const doc of Object.values(DOCS)) {
      if (!doc.updated) continue;
      expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(doc.updated))).toBe(false);
    }
  });
});

describe('Privacy Policy', () => {
  const privacy = docText(DOCS.privacy);

  it('names Delete data on this phone, where it is, and what it removes', () => {
    const del = section('privacy', 'Deleting your data');
    expect(del).toContain(`open You, then ${DATA.row}`);
    for (const thing of ['record', 'points', 'plans', 'answers', 'settings', 'missions you wrote', 'proof photos', 'sign-in', 'Keychain copy']) {
      expect(del, thing).toContain(thing);
    }
    // The trial reminder stays (services/wipe), and so does the membership.
    expect(del).toContain('free trial');
    expect(del).toContain('UNSETLD+ stays');
  });

  it('keeps the local delete and the account delete apart', () => {
    expect(section('privacy', 'Deleting your data')).toContain("doesn't delete an account");
    const account = section('privacy', 'Deleting an account');
    expect(account).toContain('Delete account');
    expect(account).toContain(DATA.row);
  });

  it('says how to ask about purchase records', () => {
    const p = section('privacy', 'Purchase records');
    expect(p).toContain('RevenueCat');
    expect(p).toContain('unsetldclothing@gmail.com');
  });

  it('says what the Keychain copy holds, and that the photos are not in it', () => {
    const k = section('privacy', 'The copy in your Keychain');
    for (const thing of ['title', 'goal', 'missions you wrote', 'points', 'fingerprints', 'never the photos', 'reward codes', 'Plans finished']) {
      expect(k, thing).toContain(thing);
    }
    expect(k).toContain('after the app is deleted');
    expect(k).toContain('sign-in token');
    // The record holds each photo's full path on the phone (ProofPhoto.uri), not just a file name.
    expect(k).toContain('where its photos are saved on this phone');
    // The old wording undersold it.
    expect(privacy).not.toContain('missions, points and streak, never photos');
  });

  it('"Your answers" names what onboarding and You still ask, and no retired question', () => {
    const a = section('privacy', 'Your answers');
    expect(ONBOARDING_STEPS).toBe(3);
    for (const thing of ['areas you chose', 'time you have each day', "what you're working toward", "this week's focus", ONBOARDING.about.row.toLowerCase(), 'age range']) {
      expect(a.toLowerCase(), thing).toContain(thing.toLowerCase());
    }
    // About you's old questions: gym, work, school level and a business or project change nothing
    // for a new install, and the policy no longer says they decide anything.
    for (const retired of [/\bgym\b/i, /\bwork\b/i, /\bhigh school\b/i, /\bcollege\b/i, /\bbusiness\b/i, /\bproject\b/i]) {
      expect(retired.test(a), String(retired)).toBe(false);
    }
    expect(DOCS.privacy.sections.some(s => s.h === 'About you')).toBe(false);
  });

  it('describes the age gate: 13 and over, a range only, and the under-13 delete', () => {
    const age = section('privacy', 'Age');
    expect(age).toContain(`${MIN_AGE} and over`);
    expect(age).toContain('year you were born');
    expect(age).toContain('Only an age range is kept');
    expect(age).toContain("aren't saved");
    expect(age).toMatch(/under 13, the app deletes everything it saved on this phone/);
    expect(age).toContain('Apple');
    expect(DOCS.terms.sections.find(s => s.h === 'Age')?.p).toContain(`${MIN_AGE} and over`);
  });

  it('claims no usage data: nothing is collected while the analytics pipeline is dormant', () => {
    expect(section('privacy', 'The short version')).toContain("doesn't collect data about how you use it");
    expect(privacy).not.toMatch(/\b(usage (data|counts) (we|is|are) (collect|sent)|we collect (usage|analytics))\b/i);
    expect(privacy).not.toMatch(/\bshare usage\b/i);
  });

  it('photos: one copy, deleted on the retention schedule, never uploaded', () => {
    const photos = section('privacy', 'Camera and proof photos');
    expect(photos).toContain('never uploads');
    expect(photos).toContain("full-size original");
    expect(photos).toContain(`after ${rules.proofRetentionDays} days`);
    expect(photos).toContain('1 year or Always');
  });

  it('notifications include the trial reminder, and reminders start off', () => {
    const n = section('privacy', 'Notifications');
    expect(n).toContain('off until you turn them on');
    expect(n).toContain('free trial');
  });
});

describe('How missions work', () => {
  it('swaps: the counts are the rules, and later swaps never earn more', () => {
    const swaps = section('record', 'Swaps');
    expect(rules.rerolls).toEqual({ free: 1, full: 3 });
    expect(swaps).toContain('One swap a day, three with UNSETLD+.');
    expect(swaps).toContain("A swap after the day's first earns at most what the mission it replaces was worth");
    expect(swaps).toContain("can't do it today can come back tomorrow");
  });

  it('the perfect day bonus and photo retention are the rules', () => {
    expect(section('record', 'Points')).toContain(`Perfect day, every mission proven: ${rules.perfectDayBonus} more.`);
    expect(section('record', 'Proof photos')).toContain(`after ${rules.proofRetentionDays} days`);
  });

  it('explains completion and Plans without new points', () => {
    expect(section('record', 'Completion')).toContain('on the days you proved at least one');
    const plans = section('record', 'Plans');
    expect(plans).toContain('moves on once you prove one of its missions');
    expect(plans).toContain('no extra points');
    expect(section('record', 'Levels')).toContain('first finished Plan');
  });
});
