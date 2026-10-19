// User-written text (own missions, the goal, the weekly focus "Something else") is checked on
// the phone by plain rules (core/safety). The table holds what must pass, get a note, get support
// copy or be blocked; the corpus holds ordinary goals and missions from 13-25 year olds, none of
// which may be flagged; and the app's own words must all pass as a user's would.
import { describe, expect, it } from 'vitest';
import { MISSIONS, PROGRAMS } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import { ONBOARDING } from '../../content/copy/onboarding';
import { HELP_LINKS, inUS, SAFETY, safetyLine } from '../../content/copy/safety';
import { SWAP } from '../../content/copy/swap';
import { checkText, fitForTitle, normalize, usableText, type SafetyCategory, type SafetyLevel, type TextField } from '../safety';

type Row = [text: string, level: SafetyLevel, category?: SafetyCategory, field?: TextField];
// prettier-ignore
const TABLE: Row[] = [
  // ── must pass (ok) ─────────────────────────────────────────
  ['Save $500', 'ok'], ['Save $1,000 by June', 'ok'], ['Run a 5k', 'ok'], ['Run 10 kms this week', 'ok'], ['Study for the bar exam', 'ok'],
  ['Get my GPA up', 'ok'], ['Launch my clothing brand', 'ok'], ['Build muscle', 'ok'], ['Learn coding', 'ok'], ['Get an internship', 'ok'],
  ['Pay off my credit card', 'ok'], ['Learn about investing', 'ok'], ['Open a Roth IRA', 'ok'], ['Learn how crypto works', 'ok'],
  ['Change my passwords', 'ok'], ['Set up a password manager', 'ok'], ['Do 100 pushups', 'ok'], ['Run 10 suicides after practice', 'ok'],
  ['Suicide sprints at practice', 'ok'], ['Kill it at tryouts', 'ok'], ['Get high grades this semester', 'ok'], ['Be blunt in my feedback', 'ok'],
  ['Cut myself some slack', 'ok'], ['Train without hurting myself at the gym', 'ok'], ['Purge my closet', 'ok'], ['Stop eating junk food', 'ok'],
  ['Stop eating after 9', 'ok'], ['Eat less fast food', 'ok'], ['Hook up my new monitor', 'ok'], ['Break into the tech industry', 'ok'],
  ['Make calls on Monday', 'ok'], ['Leverage my network', 'ok'], ['Fill the slots in my schedule', 'ok'], ['Take my life back from my phone', 'ok'],
  ['Do not wake up late', 'ok'], ['Bet on myself', 'ok'], ['Nude colorway mockup', 'ok'], ['Dare to start', 'ok'], ['Print parts in ABS plastic', 'ok'],
  ['Make my basketball game better', 'ok'], ['Start a YouTube channel', 'ok'], ['Finish one book a month', 'ok'], ['Wake up at 6', 'ok'],
  ['Stop skipping breakfast', 'ok'], ['Stop staying up all night', 'ok'], ['Get 8 hours of sleep', 'ok'], ['Drink more water', 'ok'],
  ['Study 4 hours for finals', 'ok'], ['Nos vemos en clase', 'ok'],
  // recovery phrasing passes (founder decision: default allow)
  ['Quit vaping', 'ok'], ['Stop vaping', 'ok'], ['Drink less alcohol', 'ok'], ['No vape for 30 days', 'ok'], ["Don't vape today", 'ok'],
  ['Stay off weed this month', 'ok'], ['Break my vaping habit', 'ok'], ['Stop betting on sports', 'ok'], ['Quit gambling', 'ok'], ['Cut down on energy drinks', 'ok'],
  // ── note (saved, one quiet line) ───────────────────────────
  ['Lose weight', 'note', 'body'], ['Lose 20 pounds by summer', 'note', 'body'], ['Get abs', 'note', 'body'], ['Bulk up', 'note', 'body'],
  ['Get shredded for summer', 'note', 'body'], ['Weight loss', 'note', 'body'], ['Eat a balanced diet', 'note', 'body'], ['Gain weight for football', 'note', 'body'],
  // ── support (not saved; where to get help) ─────────────────
  ['Kill myself', 'support', 'self-harm'], ['I want to die', 'support', 'self-harm'], ['Stop self-harming', 'support', 'self-harm'], ['Stop cutting myself', 'support', 'self-harm'],
  ['kms', 'support', 'self-harm'], ['End my life', 'support', 'self-harm'], ['Stop hurting myself', 'support', 'self-harm'],
  ['Starve myself', 'support', 'eating-risk'], ['Stop eating', 'support', 'eating-risk'], ['Purge after meals', 'support', 'eating-risk'], ['Stop purging', 'support', 'eating-risk'],
  ['Pro-ana', 'support', 'eating-risk'], ['Thinspo every day', 'support', 'eating-risk'], ['Eat under 800 calories', 'support', 'eating-risk'], ['Make myself throw up', 'support', 'eating-risk'],
  // ── block ──────────────────────────────────────────────────
  ['Water fast for 3 days', 'block', 'diet'], ['Intermittent fasting', 'block', 'diet'], ['Skip lunch', 'block', 'diet'], ['Track my calories', 'block', 'diet'],
  ['Calorie deficit', 'block', 'diet'], ['Lose 10 lbs in a week', 'block', 'diet'], ['Weigh myself every morning', 'block', 'diet'], ['Burn 500 calories', 'block', 'diet'],
  ['Run until I puke', 'block', 'extreme'], ['Punish myself with burpees', 'block', 'extreme'], ['Do 1000 pushups', 'block', 'extreme'], ['Pull an all-nighter', 'block', 'extreme'],
  ['Burn off what I ate', 'block', 'extreme'], ['Work out 6 hours a day', 'block', 'extreme'], ['No rest days', 'block', 'extreme'],
  ['Buy a vape', 'block', 'substances'], ['Launch my vape shop', 'block', 'substances'], ['Grow my weed business', 'block', 'substances'], ['Get drunk', 'block', 'substances'],
  ['Smoke weed', 'block', 'substances'], ['Try a Zyn', 'block', 'substances'], ['Take adderall to study', 'block', 'substances'], ['Get high', 'block', 'substances'],
  ['Make money sports betting', 'block', 'gambling'], ['Win at the casino', 'block', 'gambling'], ['Hit a parlay', 'block', 'gambling'], ['Start a gambling blog', 'block', 'gambling'],
  ['Day trade options', 'block', 'trading'], ['Trade crypto with leverage', 'block', 'trading'], ['Start my crypto trading page', 'block', 'trading'], ['Learn forex', 'block', 'trading'],
  ['Buy 0DTE calls', 'block', 'trading'], ['Buy a meme coin', 'block', 'trading'], ['Turn $100 into $10,000', 'block', 'trading'],
  ['Do a dare', 'block', 'dares'], ['Eat a tide pod', 'block', 'dares'], ['Try the blackout challenge', 'block', 'dares'], ['Meet someone I met online', 'block', 'dares'],
  ['Shoplift something', 'block', 'dares'], ['Hold my breath for 3 minutes', 'block', 'dares'],
  // own missions: weight and the scale are blocked (proof would be a scale); shape words get the note
  ['Lose 2 pounds', 'block', 'body', 'mission'], ['Lose weight', 'block', 'body', 'mission'], ['Do my abs workout', 'note', 'body', 'mission'],
  ['Lose weight', 'note', 'body', 'focus'], ['Quit vaping', 'ok', undefined, 'mission'], ['Buy a vape', 'block', 'substances', 'mission'],
  ['Launch my OnlyFans page', 'block', 'adult'], ['Send nudes', 'block', 'adult'],
  ['My SSN is 123-45-6789', 'block', 'private'], ['Card 4242 4242 4242 4242', 'block', 'private'], ['My password is hunter2', 'block', 'private'],
  ['Password: hunter2', 'block', 'private'], ['Mail it to 42 Oak Street', 'block', 'private'], ['Find my routing number', 'block', 'private'],
];

// Plausible goals, weekly focuses and own missions: none may be flagged, as a goal or as a mission.
// prettier-ignore
const BENIGN = [
  'Get my GPA up', 'Launch my clothing brand', 'Get an internship', 'Build muscle', 'Learn coding', 'Save $1,000',
  'Improve grades and train consistently.', 'Build a clothing brand and save money.', 'Get a software job and improve coding.', 'Build and ship an app.', 'Improve fitness, save money, and find a better job.', 'Get a finance internship',
  'Land a summer internship', 'Pass calculus', 'Get hired before graduation', 'Start a YouTube channel', 'Learn Spanish', 'Get organized and stop procrastinating',
  'Pay off my debt', 'Apply to colleges', 'Grow my Etsy shop', 'Read 20 books this year', 'Make varsity', 'Get a promotion at work',
  'Become a better person', 'Ace the SAT and get into a good college', 'Get back into running', 'Finish my portfolio', 'Study for finals', 'Sell my first shirts',
  'Rest', 'work out more', 'Get a better job', 'save money', 'get in shape', 'get good grades',
  'study more', 'make more money', 'read more', 'wake up earlier', 'stop procrastinating', 'get organized',
  'learn guitar', 'Clean my room', 'Do laundry', 'Meal prep for the week', 'Cook dinner for my family', 'Eat more protein',
  'Eat healthier', 'Drink 2 liters of water', 'Go to bed by 11', 'Wake up at 5am', 'Practice free throws', 'Shoot 100 free throws',
  'Run a mile under 7 minutes', 'Bench 225', 'Deadlift 315', 'Squat my body weight', 'Train for the marathon', 'Swim 20 laps',
  'Make the soccer team', 'Stretch for 10 minutes', 'Do yoga', 'Learn to skateboard', 'Film a TikTok for my brand', 'Edit a video',
  'Post on Instagram for my shop', 'Design a hoodie', 'Sketch 3 t-shirt ideas', 'Photograph my products', 'Write a blog post', 'Start a newsletter',
  'Launch my website', 'Fix bugs in my app', 'Ship version 2', 'Practice piano 30 minutes', 'Learn 10 Spanish words', 'Apply to 5 jobs',
  'Update my resume', 'Practice interview questions', 'Network on LinkedIn', 'Email a recruiter', 'Call my grandma', 'Text my coach about practice',
  'Budget my paycheck', 'Track my spending', 'Cancel a subscription', 'Open a savings account', 'Invest in index funds', 'Learn about stocks',
  'Research credit scores', 'Pay my phone bill', 'Sell old clothes on Depop', 'Flip sneakers', 'Resell vintage clothes', 'Do my homework',
  'Finish my essay', 'Study for the SAT', 'Make flashcards for bio', 'Review chemistry notes', 'Get an A in physics', 'Ask my teacher for help',
  'Finish my college applications', 'Write my personal statement', 'Apply for scholarships', 'Clean out my car', 'Organize my closet', 'Declutter my desk',
  'Clear my inbox', 'Plan my week', 'No phone after 10', 'Limit TikTok to 30 minutes', 'Screen time under 2 hours', 'Read before bed',
  'Journal every night', 'Meditate 10 minutes', 'Go for a walk', 'Get sunlight in the morning', 'Take my vitamins', 'Take my meds',
  'See the dentist', 'Book a doctor appointment', 'Volunteer at the food bank', 'Help at the shelter', 'Mow the lawn', 'Walk the dog',
  'Babysit my sister', 'Learn to drive', 'Pass my driving test', "Get my learner's permit", 'Practice parallel parking', 'Build a PC',
  '3D print a phone stand', 'Make a beat', 'Record a song', 'Learn chess openings', 'Get better at poker face', 'Kill it in my presentation',
  'Crush my workout', 'Smash my PR', 'Push myself harder at practice', 'Run hills', 'Do a cold shower', 'Make my bed',
  'Fold laundry', 'Iron my shirt', 'Plan tomorrow', "Finish one thing I've been avoiding", 'Write my top 3', 'Go to the gym',
  'Hit legs', 'Get stronger', 'Get faster', 'Improve my vertical', 'Gain muscle', 'Cut my screen time',
  'Cut back on spending', 'Save for a car', 'Save for college', 'Make $500 this month', 'Earn money mowing lawns', 'Start a lawn business',
  'Start a cleaning business', 'Start a car wash', 'Sell my art', 'Open an Etsy store', 'Grow my YouTube to 1000 subs', 'Get 100 followers on my brand page',
  'Write a business plan', 'Pitch my idea', 'Get my first customer', 'Ship my first order', 'Make 10 sales', 'Shoot product photos',
  'Take photos of my drop', 'Prep for the drop', 'Plan the next collection', 'Make a lookbook', 'Write my song lyrics', 'Practice drums',
  'Stop biting my nails', 'Stop cursing', 'Stop being lazy', 'Stop overthinking', 'Be nicer to my brother', 'Call my mom',
  'Fix my sleep schedule', 'Stop staying up late', 'Get 8 hours of sleep', 'Drink less soda', 'Eat less sugar', 'Stop eating junk food',
  'Make breakfast every day', 'Pack my lunch', 'Go to church', 'Pray every morning', 'Read my bible', 'Finish my bar prep',
  'Pass the CPA exam', 'Study for the MCAT', 'Prep for the LSAT', 'Learn Python', 'Learn JavaScript', 'Build a Discord bot',
  'Make a Roblox game', 'Learn Blender', 'Draw every day', 'Paint a canvas', 'Learn calligraphy', 'Sew a tote bag',
  'Crochet a beanie', 'Knit a scarf', 'Thrift for fabric', 'Tie dye shirts', 'Screen print tees', 'Cut fabric for the hoodie',
  'Cut patterns for my collection', 'Die-cut stickers for the drop', 'Shoot a lookbook video', 'Kill the presentation', 'Beat my best mile', 'Beat my brother at chess',
  'Win the science fair', 'Win my debate tournament', 'Get first place at the meet', 'Make state for track', 'Get recruited for basketball', 'Get a scholarship for soccer',
  'Train for tryouts', 'Practice penalty kicks', 'Lift 4 days a week', 'Do 50 pushups a day', 'Run 3 miles a day', 'Walk 10k steps',
  'Hike a mountain', 'Ride my bike to school', 'Learn to swim', 'Get my lifeguard certification', 'Get CPR certified', 'Learn first aid',
  "Study the driver's manual", 'Prep my bag for tomorrow', 'Pick out my outfit', 'Lay out my clothes', 'Clean my shoes', 'Wash my car',
  'Fix my bike', 'Change my oil', 'Get a job at Target', 'Get a job at Chick-fil-A', 'Apply to Starbucks', 'Get a part-time job',
  'Ask for a raise', 'Get promoted', 'Finish my shift', 'Work on my side hustle', 'Make money online', 'Learn graphic design',
  'Learn video editing', 'Learn Figma', 'Build my portfolio site', 'Write 500 words', 'Finish my novel draft', 'Edit chapter 3',
  'Submit my poem', 'Practice my speech', 'Rehearse my lines', 'Audition for the play', 'Make the honor roll', 'Get off academic probation',
  'Raise my grade in math', 'Fix my B in English', 'Stop failing chemistry', 'Catch up on missing assignments', 'Turn in late work', 'Email my professor',
  'Go to office hours', 'Join a club', 'Start a club', 'Run for student council', 'Apply to be a TA', 'Tutor a classmate',
  'Teach my sister to read', 'Learn sign language', 'Practice Korean', 'Watch a Spanish show without subtitles', 'Pass my AP exams', 'Get a 5 on AP Calc',
  'Get 1500 on the SAT', 'Get 36 on the ACT',
];

describe('user text safety table', () => {
  it('covers every level', () => {
    expect(TABLE.length).toBe(136);
    for (const l of ['ok', 'note', 'support', 'block'] as const) expect(TABLE.some(r => r[1] === l), l).toBe(true);
  });
  for (const [text, level, category, field] of TABLE) {
    it(`${level.padEnd(7)} ${field ?? 'goal'}: ${text}`, () => {
      const r = checkText(text, field);
      expect(r.level).toBe(level);
      if (category) expect(r.category).toBe(category);
    });
  }
});

describe('ordinary text is never flagged', () => {
  it(`none of the ${BENIGN.length} everyday goals and missions, as any field`, () => {
    expect(BENIGN.length).toBe(290);
    const hits = BENIGN.flatMap(t => (['goal', 'mission', 'focus'] as const).map(f => ({ t, f, r: checkText(t, f) }))).filter(h => h.r.level !== 'ok');
    expect(hits.map(h => `${h.f}: ${h.t} → ${h.r.level} ${h.r.category}`)).toEqual([]);
  });

  it('empty text is ok and usable', () => {
    expect(checkText('')).toEqual({ level: 'ok', category: null });
    expect(checkText('   ')).toEqual({ level: 'ok', category: null });
    expect(checkText(null)).toEqual({ level: 'ok', category: null });
    expect(usableText(undefined)).toBe(true);
  });
});

describe("the app's own words all pass as a user's would", () => {
  it('every approved mission title, instruction, proof line and template', () => {
    const bad = MISSIONS.flatMap(m =>
      [m.title, m.short, m.proof, m.template ?? ''].filter(t => checkText(t, 'mission').level !== 'ok').map(t => `${m.id}: ${t} → ${JSON.stringify(checkText(t, 'mission'))}`),
    );
    expect(bad).toEqual([]);
  });

  it('plans, goal examples, focus options and swap copy', () => {
    const texts = [
      ...PROGRAMS.flatMap(p => [p.title, p.short]),
      ...ONBOARDING.goal.examples,
      ONBOARDING.goal.placeholder,
      ...Object.values(FOCUS.options),
      FOCUS.otherPlaceholder,
      SWAP.create.placeholder,
    ];
    for (const f of ['goal', 'focus', 'mission'] as const) expect(texts.filter(t => checkText(t, f).level !== 'ok'), f).toEqual([]);
  });
});

describe('matching', () => {
  it('reads past case, curly quotes, zero-width characters and hyphens', () => {
    expect(normalize('Don’t   VAPE')).toBe("don't vape");
    expect(normalize('va​pe')).toBe('vape');
    expect(normalize('self-harm')).toBe('self harm');
    expect(checkText('Don’t vape today').level).toBe('ok');
    expect(checkText('Buy a va​pe').level).toBe('block');
    expect(checkText('SELF-HARM').level).toBe('support');
  });

  it('quitting passes for habits, never for self-harm, eating risk, adult or private text', () => {
    expect(checkText('Quit vaping').level).toBe('ok');
    expect(checkText('Quit betting').level).toBe('ok');
    expect(checkText('Stop day trading').level).toBe('ok');
    expect(checkText('Stop cutting myself').level).toBe('support');
    expect(checkText('Stop purging').level).toBe('support');
    expect(checkText('Stop watching porn').level).toBe('block');
    expect(checkText('No more password: hunter2').level).toBe('block');
  });

  it("phone numbers and emails in an own mission are the user's to write", () => {
    expect(checkText('Call 555-123-4567 about the job', 'mission').level).toBe('ok');
    expect(checkText('Email coach@school.edu', 'mission').level).toBe('ok');
  });

  it('a card number only counts when it passes the checksum', () => {
    expect(checkText('Card 4242 4242 4242 4242').category).toBe('private');
    expect(checkText('Order 4242 4242 4242 4241').level).toBe('ok');
  });

  it('usableText: ok and note can be kept; block and support cannot', () => {
    expect(usableText('Get my GPA up')).toBe(true);
    expect(usableText('Lose weight')).toBe(true);
    expect(usableText('Lose weight', 'mission')).toBe(false);
    expect(usableText('Launch my vape shop')).toBe(false);
    expect(usableText('I want to die')).toBe(false);
  });
});

describe('words lifted into a title', () => {
  it('must check as ok and hold no swearing', () => {
    expect(fitForTitle('Clothing Brand')).toBe(true);
    expect(fitForTitle('Northline')).toBe(true);
    for (const w of ['Fucking Brand', 'Bitch Brand', 'Shit Business', 'Hell App', 'Damn Channel', 'Vape Shop', 'Abs Channel', 'OnlyFans Page', '']) {
      expect(fitForTitle(w), w).toBe(false);
    }
  });
});

describe('safety copy', () => {
  const blocks = ['diet', 'extreme', 'substances', 'gambling', 'trading', 'dares', 'adult', 'private'] as const;

  it('has a line for every result that needs one, and none for ok', () => {
    expect(safetyLine({ level: 'ok', category: null }, true)).toBeNull();
    for (const c of blocks) expect(safetyLine({ level: 'block', category: c }, true), c).toBe(SAFETY.block[c]);
    expect(safetyLine({ level: 'note', category: 'body' }, true)).toBe(SAFETY.bodyNote);
    expect(safetyLine({ level: 'block', category: 'body' }, true)).toBe(SAFETY.weightMission);
  });

  it('support names 988 on a US phone and findahelpline.com elsewhere', () => {
    for (const c of ['self-harm', 'eating-risk'] as const) {
      const us = safetyLine({ level: 'support', category: c }, true)!;
      const other = safetyLine({ level: 'support', category: c }, false)!;
      expect(us).toContain(SAFETY.support[c]);
      expect(us).toContain('988');
      expect(other).toContain('findahelpline.com');
      expect(other).not.toContain('988');
    }
    expect(HELP_LINKS).toEqual({ call: 'tel:988', text: 'sms:988', site: 'https://findahelpline.com' });
  });

  it('reads the region from the locale', () => {
    for (const l of ['en-US', 'es-US', 'en_US', 'zh-Hant-US']) expect(inUS(l), l).toBe(true);
    for (const l of ['en-GB', 'en', 'fr-CA', 'en-USA', '', null]) expect(inUS(l), String(l)).toBe(false);
  });

  it('keeps the voice: no "!", no emoji, no slop words', () => {
    const all = [...Object.values(SAFETY.block), SAFETY.weightMission, SAFETY.bodyNote, ...Object.values(SAFETY.support)];
    for (const t of all) {
      expect(t, t).not.toMatch(/!|\p{Extended_Pictographic}/u);
      expect(t, t).not.toMatch(/\b(journey|level up|grind|mindset|you got this|crush it)\b/i);
    }
  });
});
