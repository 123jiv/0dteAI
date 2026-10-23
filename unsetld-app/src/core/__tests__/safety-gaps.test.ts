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

describe('dieting and extreme exercise written with numbers', () => {
  it('low calorie targets, not eating for days, and purging after meals get the support line', () => {
    expectRows(
      [
        ['Eat under 1200 calories a day', 'support', 'eating-risk'],
        ['Eat 1200 calories', 'support', 'eating-risk'],
        ['Only eat 800 cals', 'support', 'eating-risk'],
        ['Eat 500 cals a day', 'support', 'eating-risk'],
        ['Eat 0 calories', 'support', 'eating-risk'],
        ['Stay under 1000 calories', 'support', 'eating-risk'],
        ['Eat less than 1,400 kcal', 'support', 'eating-risk'],
        ['No food for 3 days', 'support', 'eating-risk'],
        ['No eating for 24 hours', 'support', 'eating-risk'],
        ['Stop eating for 3 days straight', 'support', 'eating-risk'],
        ['Puke after dinner', 'support', 'eating-risk'],
        ['Vomit after meals', 'support', 'eating-risk'],
        ['Throw up after I eat', 'support', 'eating-risk'],
        ['Starve until summer', 'support', 'eating-risk'],
        ['Chew and spit', 'support', 'eating-risk'],
        ['Find an ana buddy', 'support', 'eating-risk'],
        ['Get my BMI under 17', 'support', 'eating-risk'],
      ],
      'goal',
    );
  });

  it('fasting by the hour, cleanses, weight cutting and fast loss are blocked', () => {
    expectRows(
      [
        ['Fast 72 hours', 'block', 'diet'],
        ['Fast for 5 days', 'block', 'diet'],
        ['Do a 3 day fast', 'block', 'diet'],
        ['Do a 24h fast', 'block', 'diet'],
        ['Do a 3 day juice cleanse', 'block', 'diet'],
        ['Detox tea for a week', 'block', 'diet'],
        ['Eat once a day', 'block', 'diet'],
        ['Cut weight for wrestling', 'block', 'diet'],
        ['Make weight for wrestling', 'block', 'diet'],
        ['Sweat off 5 pounds in the sauna', 'block', 'diet'],
        ['Drop 10 pounds this week', 'block', 'diet'],
        ['Lose 15 lbs in two weeks', 'block', 'diet'],
        ['Shed 5 kg before the weigh-in', 'block', 'diet'],
      ],
      'goal',
    );
  });

  it('long sessions, days without sleep and four hours of sleep or less are blocked', () => {
    expectRows(
      [
        ['Exercise for 24 hours', 'block', 'extreme'],
        ['Run for 20 hours', 'block', 'extreme'],
        ['Do 30 hours of cardio', 'block', 'extreme'],
        ['Stay awake for 48 hours', 'block', 'extreme'],
        ['Stay awake 2 days straight', 'block', 'extreme'],
        ['Stay up 3 nights in a row', 'block', 'extreme'],
        ['Sleep 3 hours a night', 'block', 'extreme'],
        ['Sleep only 4 hours to study more', 'block', 'extreme'],
        ['Get 4 hours of sleep', 'block', 'extreme'],
      ],
      'goal',
    );
  });

  it('none of them can become a mission that earns points', () => {
    for (const title of ['Stay awake for 48 hours', 'Eat under 1200 calories', 'Cut weight for wrestling', 'Fast 72 hours']) {
      expect(makeCustomMission({ title, track: 'fitness', proofType: 'TIMER_AND_PHOTO', timerMinutes: 60 }, 'custom-x1'), title).toBeNull();
    }
  });

  it('ordinary food, sleep, weight and training goals are not caught', () => {
    expectRows(
      [
        ['Eat 2500 calories a day', 'ok'],
        ['Eat 150 grams of protein', 'ok'],
        ['Eat breakfast every day', 'ok'],
        ['Stop eating junk food', 'ok'],
        ['No food after 9pm', 'ok'],
        ['Run fast 3 days a week', 'ok'],
        ['Get faster at the mile', 'ok'],
        ['Eat less fast food', 'ok'],
        ['Sleep 8 hours', 'ok'],
        ['Get 9 hours of sleep', 'ok'],
        ['Go to sleep 1 hour earlier', 'ok'],
        ['Stay up 1 hour later to finish my essay', 'ok'],
        ['Train for 2 hours', 'ok'],
        ['Study 4 hours for finals', 'ok'],
        ['Lose 10 pounds by summer', 'note', 'body'],
        ['Drop 10 pounds', 'note', 'body'],
        ['Make the weight room my second home', 'ok'],
      ],
      'goal',
    );
  });
});

describe('ordinary goals that read like self-harm', () => {
  it('kilometres, warm-ups and idioms are fine', () => {
    expectRows(
      [
        ['Run four kms', 'ok'],
        ['Run six kms', 'ok'],
        ['Run six kms on Saturday', 'ok'],
        ['Walk eight kms a day', 'ok'],
        ['Walk a few kms after school', 'ok'],
        ['Run a few kms every morning', 'ok'],
        ['Log my kms every week', 'ok'],
        ['Run 10 kms this week', 'ok'],
        ['Warm up so I wont hurt myself', 'ok'],
        ["Stretch first so I won't hurt myself", 'ok'],
        ['Take my life one day at a time', 'ok'],
        ['Take my life by the horns', 'ok'],
        ['Cut myself a break', 'ok'],
        ['Cut myself some slack', 'ok'],
      ],
      'goal',
    );
  });

  it('"kms" on its own still gets the support line', () => {
    expectRows(
      [
        ['kms', 'support', 'self-harm'],
        ['I want to kms', 'support', 'self-harm'],
        ['Literally gonna kms', 'support', 'self-harm'],
        ['Take my life', 'support', 'self-harm'],
      ],
      'goal',
    );
  });
});

describe('common phrasings that were blocked', () => {
  const FINE = [
    // get high
    'Get high SAT scores',
    'Get high ACT scores',
    'Get high AP scores',
    'Get high enough grades for UCLA',
    'Get high quality sleep',
    'Get high-quality photos for my brand',
    // amounts and places, not addresses
    'Run 2 miles down the road',
    'Run 3 miles on the road',
    'Walk 30 minutes down the street',
    'Run 3 laps around the court',
    'Make 100 shots at the court',
    'Shoot 100 shots on the court',
    'Practice 3 pointers on the court',
    'Study 2 hours at my place',
    'Walk 1 lap around the way',
    'Help 2 neighbors on my street',
    'Find 1 better way to save money',
    'Learn 1 new way to cook eggs',
    'Watch 1 video by Dr K',
    'Read 1 chapter of Dr Seuss to my brother',
    // totals over a week or month
    'Train 6 hours a week for soccer',
    'Train 6 hours a week',
    'Work out 5 hours a week',
    'Get 5 hours of training a week',
    'Do 5 hours of training a week',
    'Log 10 hours of cardio this month',
    'Run for 5 hours total this week',
    'Do 1000 push ups this month',
    'Do 500 squats this week',
    // fasting for Ramadan
    'Keep my Ramadan fasting and study schedule',
    'Plan my week around Ramadan fasting',
    'Fast during Ramadan and keep training',
    // words that share a drug or drink word
    'Weed the garden for my mom',
    'Pull weed out of the backyard',
    'Make root beer floats for the bake sale',
    'Try ginger beer instead of soda',
    'Clean my desk with rubbing alcohol wipes',
    'Walk my whippets every morning',
    'Learn oxy acetylene welding',
    'Write my essay on Prohibition and alcohol laws',
    'Write a report on tobacco farming in Virginia',
    // steal, dare, break into, escort, bets
    'Read Steal Like an Artist',
    'Steal the spotlight at my recital',
    'Learn to steal bases',
    'Dare myself to speak up in class',
    'Break into the school play',
    'Escort my little sister to school',
    'Hedge my bets on colleges by applying to 10',
    'Bet on my skills',
    // money that isn't trading
    'Turn $50 into $100 flipping thrifted shoes',
    'Flip $40 of thrift finds',
    'Turn 500 followers into 5000',
    'Trade coins with my grandpa for his collection',
    'Explore my options call the counselor',
    // sleep and shopping
    'Shop till I drop at the thrift store',
    'No sleep ins on weekends',
    'Wake up without sleeping through my alarm',
    // training
    'Hold my breath for 30 seconds at swim practice',
    'Bench my weight',
  ];
  for (const f of ['goal', 'mission', 'focus'] as const) {
    it(`pass as ${f}`, () => expectRows(FINE.map(t => [t, 'ok']), f));
  }

  it('an own mission like "Run 2 miles down the road" can be made', () => {
    expect(makeCustomMission({ title: 'Run 2 miles down the road', track: 'fitness', proofType: 'PHOTO' }, 'custom-x1')).not.toBeNull();
  });

  it('what those rules are for is still blocked', () => {
    expectRows(
      [
        ['Get high', 'block', 'substances'],
        ['Get high after school', 'block', 'substances'],
        ['Mail it to 42 Oak Street', 'block', 'private'],
        ['My address 22 Elm Street', 'block', 'private'],
        ['Meet me at 1600 Pennsylvania Avenue', 'block', 'private'],
        ['Work out 6 hours a day', 'block', 'extreme'],
        ['Train for 8 hours straight', 'block', 'extreme'],
        ['Do 1000 pushups', 'block', 'extreme'],
        ['Intermittent fasting', 'block', 'diet'],
        ['Smoke weed', 'block', 'substances'],
        ['Buy beer', 'block', 'substances'],
        ['Drink alcohol at the party', 'block', 'substances'],
        ['Buy whippets', 'block', 'substances'],
        ['Steal from the store', 'block', 'dares'],
        ['Break into a house', 'block', 'dares'],
        ['Hold my breath for 3 minutes', 'block', 'dares'],
        ['Become an escort', 'block', 'adult'],
        ['Place bets on the game', 'block', 'gambling'],
        ['Turn $100 into $10,000', 'block', 'trading'],
        ['Flip $100', 'block', 'trading'],
        ['Buy options calls', 'block', 'trading'],
        ['Run until I puke', 'block', 'extreme'],
        ['Pull an all-nighter', 'block', 'extreme'],
        ['No sleep this week', 'block', 'extreme'],
      ],
      'goal',
    );
  });
});
