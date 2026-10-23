// What the user writes, checked: a mission of their own, the goal, and the weekly focus
// "Something else". Plain word and phrase rules, the same on every phone: no network, no AI,
// nothing logged or counted. The text never leaves the phone.
//
// Levels:
//  - ok:      nothing to say.
//  - note:    kept, with one quiet line (weight and body goals: missions stay on training).
//  - block:   not kept as written; one line says why. Skip and Back still work.
//  - support: not kept; a calm line with where to get help (self-harm, eating-disorder signals).
//
// The checks read the saved text too (core/personalize, core/titles, the focus label), so a
// goal, focus or own mission saved before this existed stops steering and stops filling titles
// without anything being rewritten. Missions already proven keep their titles: that's history.

export type SafetyLevel = 'ok' | 'note' | 'block' | 'support';
export type SafetyCategory =
  | 'self-harm'
  | 'eating-risk' // starving, purging, pro-ana: support
  | 'diet' // fasting, calorie counting, crash targets: block
  | 'body' // weight and body goals: note (an own mission about the scale: block)
  | 'extreme' // punishment or extreme exercise, no sleep: block
  | 'substances' // nicotine, vaping, alcohol, drugs: block (quitting passes)
  | 'gambling' // betting, casinos: block (quitting passes)
  | 'trading' // day, options, leveraged, crypto trading: block
  | 'dares' // dares, viral challenges, strangers, theft: block
  | 'adult' // sexual content: block
  | 'private'; // passwords, card numbers, SSNs, addresses: block

/** Where the text was written: a mission of their own, the goal, or the weekly focus "Something else". */
export type TextField = 'mission' | 'goal' | 'focus';

export interface SafetyResult {
  level: SafetyLevel;
  category: SafetyCategory | null;
}

const OK: SafetyResult = { level: 'ok', category: null };

/**
 * Lowercase, plain quotes, no invisible characters (zero-width, soft hyphen, direction marks),
 * hyphens, underscores and dots between letters as spaces, single spaces.
 */
export function normalize(text: string): string {
  let t = text;
  try {
    t = t.normalize('NFKC');
  } catch {
    // An engine without normalize: the text as typed.
  }
  return t
    .toLowerCase()
    .replace(/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff]/g, '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/(?<=[a-z])[-_.](?=[a-z])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const re = (parts: readonly string[]) => new RegExp(`\\b(?:${parts.join('|')})\\b`, 'i');

/**
 * Words that turn a risky word into something to stop: "quit vaping", "drink less", "no betting
 * this week", "stay off weed". Within the three words before it. Never for self-harm, eating
 * risk, adult content or private details.
 */
const RECOVERY =
  /\b(?:quit(?:ting)?|stop(?:ped|ping)?|cut(?:ting)? (?:down|back|out)(?: on)?|less|fewer|no more|no|not|never|don'?t|do not|avoid(?:ing)?|resist(?:ing)?|reduc(?:e|ing)|without|stay(?:ing)? off|get(?:ting)? off|off of|sober|clean from|kick(?:ing)?(?! off)|break(?:ing)? (?:the |my )?habit|give up|giving up|done with|recover(?:y|ing)? from|free (?:from|of)|lower)\b(?:\s+\S+){0,3}\s*$/;

const SELF_HARM = re([
  'kill(?:ing)? ?my ?self',
  'end(?:ing)? my (?:own )?life',
  'take my (?:own )?life(?! back| to| into| seriously| more| in)',
  'suicid(?:e|al)(?! (?:sprints?|drills?|runs?|squats?|prevention|awareness))',
  'want(?:ed)? to die',
  'wanna die',
  'wish i (?:was|were) dead',
  'better off dead',
  '(?:want(?:ed|s)?|wanna|wish(?:ed)?|rather|ready) (?:to )?be dead',
  'no reason (?:to|for me to) (?:live|be alive|keep living|go on|be here|exist)',
  '(?:better|happier) off without me',
  'self harm(?:ing)?',
  'harm(?:ing)? my ?self',
  'hurt(?:ing)? my ?self',
  'cut(?:ting)? my ?self',
  'cut(?:ting)? my (?:wrists?|arms?|legs?|thighs?)',
  'slit(?:ting)? (?:my )?(?:wrists?|throat)',
  '(?:start(?:ed|ing)?|be|been|keep|kept) cutting again',
  'cutting (?:habit|addiction|urges?)',
  '(?:stop(?:ped|ping)?|quit|without|no more|not|never) cutting(?: again| anymore)?$',
  'hang(?:ing)? my ?self',
  '(?:shoot|drown|stab|poison|strangle|suffocate|burn|set fire to)(?:ing|s)? my ?self(?! (?:in the foot|out|a (?:reminder|text|note|message|email)|an email|in (?:work|books?|homework|music|coffee|studying|school ?work)))',
  'jump(?:ing)? in front of (?:a |the )?(?:train|car|bus|truck|traffic|subway)',
  '(?<!(?:\\d|\\d |one |two |three |five |ten ))kms',
  'un ?alive(?: my ?self)?',
  'sewer ?slide',
  'end it all',
  'overdos(?:e|ing)',
  "o ?d(?:ing|'?d)? on (?:pills|meds|medication|drugs|tylenol|advil|painkillers|sleeping pills)",
  '(?:want to|wanna|gonna|going to) od',
  '(?:take|taking|swallow|swallowing) (?:all|a bunch|a handful|a whole bottle|a bottle) (?:of )?(?:my |the )?(?:pills|tablets|sleeping pills)(?! (?:on time|every|each|today|daily|in the morning|at night|at|before|after|with))',
  'sleep and (?:never|not) wake up',
  'disappear forever',
  'jump(?:ing)? off (?:a |the )?(?:bridge|building|roof)',
]);

const EATING_RISK = re([
  'starv(?:e|ing) my ?self',
  'stop eating(?: (?:altogether|completely|entirely|for (?:a|\\d+) (?:days?|weeks?)))?$',
  'not eat(?:ing)? (?:at all|anything|for (?:a|\\d+|one|two|three|several) (?:days?|weeks?))',
  "don'?t eat (?:at all|anything|for)",
  'eat(?:ing)? nothing',
  'purg(?:e|ing)(?= after| what| food| meals?| dinner| lunch|$)',
  'binge and purge',
  'throw(?:ing)? up after (?:eating|meals?|food|dinner|lunch)',
  'make my ?self (?:throw up|sick|puke|vomit)',
  'pro ana',
  'pro mia',
  'thinspo\\w*',
  'meanspo\\w*',
  'bonespo\\w*',
  'ana coach',
  'laxatives?',
  'thigh gap',
  'eat(?:ing)? (?:only |under |less than |below )?(?:[1-9]\\d{0,2}|1000|one thousand) (?:cal|calories|kcal)',
]);

const DIET = re([
  'fast(?:ing)? for (?:a|\\d+|one|two|three) (?:days?|weeks?)',
  '(?:water|dry|juice|bone broth) fast(?:ing)?',
  'fasting',
  'omad',
  'one meal a day',
  'skip(?:ping)? (?:meals?|breakfast|lunch|dinner)',
  'calorie (?:deficit|counting|count|limit|target)',
  '(?:count|track|cut|log)(?:ing)? (?:my )?calories',
  'crash diet\\w*',
  'starvation diet',
  'diet pills?',
  'fat burners?',
  'appetite suppressants?',
  'weigh(?:ing)? my ?self',
  'weigh ins',
  'weigh in(?! on)',
  'daily weigh',
  '(?:burn|burning) (?:\\d+ )?(?:cal|calories|kcal)',
  'lose (?:\\d+|ten|five|twenty) ?(?:lbs?|pounds?|kgs?|kilos?) (?:in|by) (?:a|one|\\d+|two|three) (?:days?|weeks?)',
  'lose (?:weight|fat) (?:in|by) (?:a|one|\\d+|two|three) (?:days?|weeks?)',
]);

/** Weight and the scale: a goal may name it (with a note); a mission of their own can't (it would be proven by a scale). */
const WEIGHT = re([
  'lose (?:some )?weight',
  'losing weight',
  'weight loss',
  'lose (?:\\d+|ten|five|twenty) ?(?:lbs?|pounds?|kgs?|kilos?)',
  'lose fat',
  'burn fat',
  'get (?:skinny|thin|thinner)',
  'slim (?:down|up)',
  'body fat',
  'gain weight',
  'put on weight',
  'my weight',
  'goal weight',
  'bmi',
]);
/** How a body looks: a note wherever it's written. */
const SHAPE = re(['get (?:abs|shredded|lean|ripped)', 'six pack', 'abs', 'bulk(?:ing)?(?: up)?', 'cut(?:ting)? season', 'tone up', 'diet(?:ing)?']);

const EXTREME = re([
  "until i (?:puke|throw up|pass out|faint|collapse|cry|bleed|can'?t walk)",
  'till i (?:puke|throw up|pass out|faint|collapse|drop)',
  'punish(?:ing|ment)?(?: my ?self)?(?: with)? (?:workouts?|exercise|burpees|push ?ups|laps|running)',
  'punish(?:ing)? my ?self',
  'burn off (?:what i ate|food|dinner|lunch|breakfast|calories|everything)',
  'train(?:ing)? through (?:the )?(?:pain|injury|injuries)',
  'work(?:ing)? out (?:while|when) (?:injured|sick)',
  'no rest days?',
  '(?:[5-9]\\d\\d|\\d{4,}) (?:push ?ups|sit ?ups|burpees|squats|crunches|pull ?ups)',
  '(?:[5-9]|1\\d) hours? (?:of )?(?:working out|work ?outs?|exercise|exercising|gym|training|running|cardio)',
  '(?:work(?:ing)? out|exercis(?:e|ing)|train(?:ing)?|run(?:ning)?|lift(?:ing)?) (?:for )?(?:[5-9]|1\\d) hours?',
  'all nighters?',
  'no sleep',
  'stay up all night',
  'without sleep(?:ing)?',
  'skip(?:ping)? sleep',
]);

const SUBSTANCES = re([
  'vap(?:e|es|ing|ed)',
  'vape pens?',
  'juul(?:ing)?',
  'nicotine',
  'zyns?',
  'nic pouch(?:es)?',
  'cigarettes?',
  'cigs?',
  'cigars?',
  'chewing tobacco',
  'snus',
  'tobacco',
  'hookah',
  'smoke shop',
  'head shop',
  'smok(?:e|ing) (?:weed|pot|a joint|a blunt|cigs?|cigarettes?|a cig)',
  '(?:roll|rolling|smoke|smoking) (?:a )?(?:joint|blunt)s?',
  'weed',
  'marijuana',
  'cannabis',
  'thc',
  'delta ?8',
  'edibles',
  'dab pens?',
  'alcohol',
  'beers?',
  'vodka',
  'tequila',
  'whiske?y',
  'liquor',
  'booze',
  'wine',
  'drunk',
  'get(?:ting)? (?:drunk|wasted|faded|hammered|lit|stoned)',
  'get(?:ting)? high(?! (?:grades?|scores?|marks?|school|honou?rs|gpa|test))',
  'shrooms',
  'lsd',
  'mdma',
  'ecstasy',
  'cocaine',
  'ketamine',
  'fentanyl',
  'heroin',
  'meth',
  'xanax',
  'xans',
  'percs?',
  'oxy(?:codone|contin)?',
  'lean (?:and|with) sprite',
  'kratom',
  'pop(?:ping)? pills',
  'nitrous',
  'whippets',
  '(?:take|use|buy|get|try|pop)(?:ing)? (?:adderall|addy|ritalin|vyvanse)(?! as prescribed)',
]);

const GAMBLING = re([
  'bets',
  'betting',
  'bet on',
  'place a bet',
  'bet \\$?\\d+',
  'sports ?bet\\w*',
  'sports ?books?',
  'parlays?',
  'casinos?',
  '(?:play(?:ing)?|online) slots',
  'slot machines?',
  'lotter(?:y|ies)',
  'scratch ?offs?',
  'scratchers',
  'roulette',
  'blackjack',
  'gambl(?:e|es|ed|ing)',
  'draftkings',
  'fanduel',
  'prizepicks',
  'stake\\.com',
  'online poker',
  'poker for (?:money|cash)',
  'real money (?:poker|games?|slots)',
  'skin gambling',
  'case opening',
]);

const TRADING = re([
  'day ?trad(?:e|es|er|ers|ing)',
  'swing trad(?:e|ing)',
  'scalp(?:ing)? (?:stocks|crypto|options|futures)',
  'options? (?:trad\\w*|contracts?|calls?|puts?|plays?)',
  '0[ -]?dte',
  '(?:trade|trading|trades|flip|flipping) (?:crypto|stocks?|options|forex|futures|coins?|meme ?coins?|nfts?)',
  '(?:crypto|stock|forex|futures|fx|options) trad(?:e|es|er|ers|ing)',
  'forex',
  'margin (?:trading|account)',
  'leveraged? (?:trading|positions?|etfs?)',
  '\\d+x leverage',
  'leverage (?:trading|crypto)',
  'trade (?:with|on) leverage',
  'meme ?coins?',
  'shitcoins?',
  'pump and dump',
  'get rich quick',
  'turn \\$?\\d[\\d,]* into \\$?\\d[\\d,]*',
  'flip \\$\\d+',
]);

const DARES = re([
  'dares?',
  'truth or dare',
  'blackout challenge',
  'choking game',
  'pass out challenge',
  'tide ?pods?',
  'one chip challenge',
  'cinnamon challenge',
  'benadryl challenge',
  'skull ?breaker',
  'fire challenge',
  'car surfing',
  'train surfing',
  'subway surfing',
  'hold my breath (?:for|until|till)',
  'shoplift(?:ing)?',
  'steal(?:ing)?',
  'trespass(?:ing)?',
  "break(?:ing)? into (?:a |the |someone'?s )?(?:house|houses|home|car|cars|building|school)",
  'jump(?:ing)? off (?:a |the )?(?:roof|cliff)',
  'meet (?:up with )?(?:a )?(?:stranger|someone (?:i|from) (?:met )?online)',
  'dm strangers',
  'talk to strangers online',
  'get in(?:to)? a fight',
  'fight someone',
  'drive (?:without a license|drunk|blindfolded)',
  'drag rac(?:e|ing)',
]);

const ADULT = re([
  'only ?fans',
  'nudes',
  'send nudes?',
  'porn\\w*',
  'sext(?:ing)?',
  'hook ?ups',
  'hook(?:ing)? up with (?:a |someone|girls|guys|people|strangers)',
  'fansly',
  'nsfw',
  'strippers?',
  'strip clubs?',
  'escort(?:ing|s)?',
  'sugar (?:daddy|baby|mommy)',
]);

/** Private details, as words or as the data itself. Phone numbers and emails pass: they're the user's own. */
const PRIVATE_DISCLOSE = /\b(?:password|passcode|pin|login|pw)\s*(?:is\b|[:=])/;
const PRIVATE_WORDS = re([
  'card number',
  'cvv',
  'cvc',
  'routing number',
  'account number',
  'ssn',
  'social security number',
  'bank (?:login|password|pin)',
  'security code',
  'home address is',
  'my address is',
]);
const SSN = /\b\d{3}[- ]\d{2}[- ]\d{4}\b/;
const ADDRESS = /\b\d{1,5} (?:[a-z0-9']+ ){1,3}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|circle|cir)\b/;

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** A run of 13 to 19 digits (spaces or hyphens between groups) that passes the card checksum. */
function hasCardNumber(t: string): boolean {
  for (const m of t.matchAll(/\b\d(?:[ -]?\d){12,18}\b/g)) {
    const d = m[0].replace(/\D/g, '');
    if (d.length >= 13 && d.length <= 19 && luhn(d)) return true;
  }
  return false;
}

/** True when the match at `index` is something to stop or avoid ("quit vaping", "no betting"). */
function recovering(t: string, index: number): boolean {
  return RECOVERY.test(t.slice(0, index));
}

/** True when `pattern` matches somewhere that isn't something to stop (with `allowRecovery`). */
function riskyMatch(t: string, pattern: RegExp, allowRecovery: boolean): boolean {
  const g = new RegExp(pattern.source, 'gi');
  for (const m of t.matchAll(g)) if (!allowRecovery || !recovering(t, m.index ?? 0)) return true;
  return false;
}

/**
 * Not hurting yourself while training: taken out before every check. Only with a training word
 * before or after it, so "Go a week without hurting myself" still gets the support line.
 */
const TRAINING =
  '(?:gym|practice|training|workouts?|games?|field|court|track|pool|tryouts|matches|meets?|races?|lifting|running|playing|working out|exercising|skating|skateboarding|biking|climbing|squatting|deadlifting|benching|sports?|lifts?|reps?|sets?|form)';
const TRAINING_VERB =
  '(?:lift(?:ing)?|train(?:ing)?|run(?:ning)?|play(?:ing)?|work(?:ing)? out|exercis(?:e|ing)|squat(?:ting)?|deadlift(?:ing)?|bench(?:ing)?|skat(?:e|ing)|climb(?:ing)?|sprint(?:ing)?|warm(?:ing)? up|stretch(?:ing)?|cool(?:ing)? down|good form|proper form|a spotter)';
const NOT_HURT = "(?:without|not|never|don'?t|won'?t|wont|can'?t|cannot|do not|will not|avoid(?:ing)?) (?:getting |get )?hurt(?:ing)? my ?self";
const HURT_TRAINING = new RegExp(
  `\\b(?:${NOT_HURT} (?:(?:at|in|on|during|while|when|doing) )?(?:the |my )?${TRAINING}\\b|${TRAINING_VERB}\\b(?: \\S+){0,5}? ${NOT_HURT}\\b)`,
  'gi',
);
/** Idioms that read as self-harm and aren't: taken out before every check. */
const SUPPORT_HARMLESS = re(['cut(?:ting)? my ?self (?:some slack|off)']);

/** Phrases that look risky but aren't: taken out before the checks after support. */
const HARMLESS = re([
  'bar exam',
  'fast food',
  'fast fashion',
  'lean (?:protein|meat|muscle)',
  'kill(?:ing)? it',
  'bet on (?:my ?self|yourself)',
  'subway surfers',
  'wine red',
  'steal (?:a base|bases|the show)',
  'dare to',
  'abs plastic',
  'weigh in on',
  '(?:break|kick)(?:ing)? (?:my |the |this )?(?:\\w+ ){1,2}habits?',
]);
const HARMLESS_ALL = new RegExp(HARMLESS.source, 'gi');
const SUPPORT_HARMLESS_ALL = new RegExp(SUPPORT_HARMLESS.source, 'gi');

/** What the user wrote, checked. Empty text is ok. The first category that matches decides. */
export function checkText(text: string | null | undefined, field: TextField = 'goal'): SafetyResult {
  if (!text?.trim()) return OK;
  const raw = normalize(text);
  // Private data first, on the text as typed (digits intact).
  if (SSN.test(raw) || hasCardNumber(raw) || ADDRESS.test(raw) || PRIVATE_DISCLOSE.test(raw) || PRIVATE_WORDS.test(raw)) {
    return { level: 'block', category: 'private' };
  }
  // Support first, on the text with only the training and idiom phrases out: a habit or
  // recovery phrase never hides self-harm or eating risk ("Break my cutting habit").
  const s = raw.replace(HURT_TRAINING, ' ').replace(SUPPORT_HARMLESS_ALL, ' ');
  if (SELF_HARM.test(s)) return { level: 'support', category: 'self-harm' };
  if (EATING_RISK.test(s)) return { level: 'support', category: 'eating-risk' };
  const t = s.replace(HARMLESS_ALL, ' ');
  if (riskyMatch(t, DIET, true)) return { level: 'block', category: 'diet' };
  if (riskyMatch(t, EXTREME, true)) return { level: 'block', category: 'extreme' };
  if (riskyMatch(t, SUBSTANCES, true)) return { level: 'block', category: 'substances' };
  if (riskyMatch(t, GAMBLING, true)) return { level: 'block', category: 'gambling' };
  if (riskyMatch(t, TRADING, true)) return { level: 'block', category: 'trading' };
  if (riskyMatch(t, DARES, true)) return { level: 'block', category: 'dares' };
  if (ADULT.test(t)) return { level: 'block', category: 'adult' };
  if (WEIGHT.test(t)) return { level: field === 'mission' ? 'block' : 'note', category: 'body' };
  if (SHAPE.test(t)) return { level: 'note', category: 'body' };
  return OK;
}

/** Can the app keep and use this text: steer missions with it, show it, fill a title from it. Ok or a note. */
export function usableText(text: string | null | undefined, field: TextField = 'goal'): boolean {
  const l = checkText(text, field).level;
  return l === 'ok' || l === 'note';
}

/**
 * What a field shows under it while the user types: the check of what's there now, once the
 * text at the last pause in typing (ui/useSettled) is flagged too; null otherwise. A half-typed
 * word can't flash a note, and fixing the text hides it at once.
 */
export function settledCheck(text: string, settled: string, field: TextField): SafetyResult | null {
  const now = checkText(text, field);
  if (now.level === 'ok' || checkText(settled, field).level === 'ok') return null;
  return now;
}

/**
 * Swearing, for words lifted out of a goal into an approved title (core/titles): the content
 * checker's list (scripts/validate-content.mjs SWEAR) and a few more. Never used to judge what
 * the user writes for themselves: only to keep it out of a title that reads as the app's.
 */
export const SWEAR = /\b(?:damn\w*|hell|shit\w*|piss\w*|fuck\w*|bitch\w*|ass|asses|asshole\w*|bastards?|crap\w*|dicks?|cocks?|cunts?|sluts?|whores?|wtf|stfu)\b/i;

/** Words fit to go into an approved title: they check as ok and hold no swearing. */
export function fitForTitle(words: string | null | undefined): boolean {
  if (!words?.trim()) return false;
  return checkText(words, 'goal').level === 'ok' && !SWEAR.test(normalize(words));
}
