// Gaps the launch review found in the user-text check (core/safety), each held here so it stays
// closed: self-harm phrasings that got no support line, body photos and body-shape missions,
// dieting and extreme exercise written with numbers, and ordinary text that was flagged.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeCustomMission } from '../custom';
import { checkText, normalize, usableText, type SafetyCategory, type SafetyLevel, type TextField } from '../safety';

type Row = [text: string, level: SafetyLevel, category?: SafetyCategory | null];

function expectRows(rows: Row[], field: TextField = 'goal') {
  const bad = rows
    .map(([text, level, category]) => ({ text, level, category, got: checkText(text, field) }))
    .filter(r => r.got.level !== r.level || (r.category !== undefined && r.got.category !== r.category))
    .map(r => `${field}: ${r.text} → ${r.got.level} ${r.got.category} (want ${r.level} ${r.category ?? ''})`);
  expect(bad).toEqual([]);
}

describe('self-harm: methods, ideation and recovery statements get the support line', () => {
  const SUPPORT = [
    'Slit my wrists',
    'Shoot myself',
    'Jump in front of a train',
    'Drown myself',
    'I want to be dead',
    'No reason to live',
    'Everyone would be better off without me',
    'Take all my pills',
    'OD on pills',
    'Start cutting again',
    'Go a week without hurting myself',
    'Never hurt myself again',
    'Not hurt myself anymore',
    'Go 30 days without cutting',
    'Stop cutting',
    'Burn myself',
    'Break my cutting habit',
    'Kick my self harm habit',
    'un-alive myself',
    'Unalive',
    'sui\u00ADcide',
    'kill.myself',
    'kill\u200Dmyself',
  ];
  for (const f of ['goal', 'mission', 'focus'] as const) {
    it(`as ${f}`, () => expectRows(SUPPORT.map(t => [t, 'support', 'self-harm']), f));
  }

  it('none of them can be kept, steer missions or be shown', () => {
    for (const t of SUPPORT) expect(usableText(t), t).toBe(false);
  });

  it('not hurting yourself while training is still fine', () => {
    expectRows(
      [
        ['Train without hurting myself at the gym', 'ok'],
        ['Lift without hurting myself', 'ok'],
        ['Warm up so I wont hurt myself', 'ok'],
        ["Stretch first so I won't hurt myself", 'ok'],
        ['Squat with good form so I do not hurt myself', 'ok'],
        ['Run without getting hurt myself at practice', 'ok'],
        ["Don't burn myself out before finals", 'ok'],
        ['Stop shooting myself in the foot', 'ok'],
        ['Take my meds every morning', 'ok'],
        ['Take all my pills on time', 'ok'],
        ['Stop cutting class', 'ok'],
        ['Cut my screen time', 'ok'],
      ],
      'goal',
    );
  });

  it('reads past soft hyphens, joiners and dots between letters', () => {
    expect(normalize('sui\u00ADcide')).toBe('suicide');
    expect(normalize('kill.myself')).toBe('kill myself');
    expect(normalize('un-alive')).toBe('un alive');
    expect(normalize('Save $1.50 a day')).toBe('save $1.50 a day');
  });
});

/**
 * Every string one of the validator's NEVER patterns stands for: optional parts both ways, each
 * alternative of a group, `\\w*` as nothing. The patterns use only these, so this is exact.
 */
function expand(pattern: string): string[] {
  let i = 0;
  const seq = (): string[] => {
    let out = [''];
    while (i < pattern.length && pattern[i] !== '|' && pattern[i] !== ')') {
      let atom: string[];
      if (pattern.startsWith('(?:', i)) {
        i += 3;
        atom = [];
        for (;;) {
          atom.push(...seq());
          if (pattern[i] === '|') i++;
          else break;
        }
        i++; // ')'
      } else if (pattern.startsWith('\\w', i)) {
        i += 2;
        atom = ['s'];
      } else {
        atom = [pattern[i++]];
      }
      if (pattern[i] === '?' || pattern[i] === '*') atom = ['', ...(pattern[i++] === '?' ? atom : [])];
      out = out.flatMap(a => atom.map(b => a + b));
    }
    return out;
  };
  return [...new Set(seq())];
}

const VALIDATOR = readFileSync(join(__dirname, '../../../scripts/validate-content.mjs'), 'utf8');
const NEVER_SOURCE = VALIDATOR.slice(VALIDATOR.indexOf('const NEVER = new RegExp('), VALIDATOR.indexOf("].join('|')", VALIDATOR.indexOf('const NEVER')));
const NEVER_PATTERNS = [...NEVER_SOURCE.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\\\/g, '\\')).filter(p => p !== '\\b(');

describe("the official missions' never list: every term fails as a mission of the user's own", () => {
  it('reads the list from the validator', () => {
    expect(NEVER_PATTERNS.length).toBeGreaterThan(40);
    expect(NEVER_PATTERNS).toContain('shirtless');
    expect(expand('skip(?:ping)? (?:a )?meals?')).toEqual(expect.arrayContaining(['skip meal', 'skip a meals', 'skipping a meal']));
  });

  it('every form of every term is blocked or answered with support', () => {
    const terms = NEVER_PATTERNS.flatMap(expand);
    expect(terms.length).toBeGreaterThan(100);
    const kept = terms.filter(t => usableText(t, 'mission')).map(t => `${t} → ${JSON.stringify(checkText(t, 'mission'))}`);
    expect(kept).toEqual([]);
  });
});

describe('body photos and body shapes', () => {
  const BODY = [
    'Shirtless mirror pic',
    'Take a progress pic',
    'Progress pics every week',
    'Progress photos on Sunday',
    'Body check',
    'Body checks in the mirror',
    'Before-and-after body photo',
    'Physique photo',
    'Mirror selfie of my abs',
    'Flex pic',
    'Ab check',
    'Get shredded',
    'Get a six pack',
    'Get a six-pack by June',
    'Tone up',
    'Bulk up',
    'Get abs',
    'Get ripped for summer',
    'Get my summer body',
  ];

  it('blocked as a mission of their own', () => expectRows(BODY.map(t => [t, 'block', 'body']), 'mission'));

  it('kept with the note as a goal or focus', () => {
    expectRows(BODY.map(t => [t, 'note', 'body']), 'goal');
    expectRows(BODY.map(t => [t, 'note', 'body']), 'focus');
  });

  it("can't become a mission that earns points, whatever the proof", () => {
    for (const title of ['Shirtless mirror pic', 'Progress pics every week', 'Body check', 'Get shredded']) {
      for (const proofType of ['PHOTO', 'BEFORE_AFTER'] as const) {
        expect(makeCustomMission({ title, track: 'fitness', proofType }, 'custom-x1'), `${title} ${proofType}`).toBeNull();
      }
    }
  });

  it('training stays fine: a body word alone is a note, never a block', () => {
    expectRows(
      [
        ['Do my abs workout', 'note', 'body'],
        ['Work on my abs', 'note', 'body'],
        ['Build muscle', 'ok'],
        ['Get stronger', 'ok'],
        ['Run a 5k', 'ok'],
        ['Take a photo of my finished essay', 'ok'],
        ['Take a selfie with my grandma', 'ok'],
        ['Make progress on my project', 'ok'],
        ['Check my progress in math', 'ok'],
        ['Clean the bathroom mirror', 'ok'],
      ],
      'mission',
    );
  });

  it('the "yourself" forms of starving, skipping a meal and weighing', () => {
    expectRows(
      [
        ['Starve yourself', 'support', 'eating-risk'],
        ['Skip a meal', 'block', 'diet'],
        ['Skip my lunch', 'block', 'diet'],
        ['Weighing yourself', 'block', 'diet'],
        ['Calorie deficits', 'block', 'diet'],
        ['Stop skipping breakfast', 'ok'],
      ],
      'mission',
    );
  });

  it('leverage is trading on its own or with a trade; leveraging your network is fine', () => {
    expectRows(
      [
        ['Leverage', 'block', 'trading'],
        ['Leveraged', 'block', 'trading'],
        ['Buy crypto with leverage', 'block', 'trading'],
        ['Leverage my network', 'ok'],
        ['Leverage my skills for an internship', 'ok'],
      ],
      'goal',
    );
  });
});

describe('purging, not tidying', () => {
  it('purging after food, or on its own, gets the support line', () => {
    expectRows(
      [
        ['Purge', 'support', 'eating-risk'],
        ['Purges', 'support', 'eating-risk'],
        ['Stop purging', 'support', 'eating-risk'],
        ['Purge after dinner', 'support', 'eating-risk'],
        ['Purge after meals', 'support', 'eating-risk'],
        ['Binge and purge', 'support', 'eating-risk'],
      ],
      'goal',
    );
  });

  it('a closet, clothes, digital or photo purge is tidying', () => {
    expectRows(
      [
        ['Do a closet purge', 'ok'],
        ['Clothes purge', 'ok'],
        ['Do a digital purge', 'ok'],
        ['Phone photo purge', 'ok'],
        ['Spring cleaning purge', 'ok'],
        ['Purge my closet', 'ok'],
      ],
      'mission',
    );
  });
});
