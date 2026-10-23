// Gaps the launch review found in the user-text check (core/safety), each held here so it stays
// closed: self-harm phrasings that got no support line, body photos and body-shape missions,
// dieting and extreme exercise written with numbers, and ordinary text that was flagged.
import { describe, expect, it } from 'vitest';
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
    'sui­cide',
    'kill.myself',
    'kill‍myself',
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
    expect(normalize('sui­cide')).toBe('suicide');
    expect(normalize('kill.myself')).toBe('kill myself');
    expect(normalize('un-alive')).toBe('un alive');
    expect(normalize('Save $1.50 a day')).toBe('save $1.50 a day');
  });
});
