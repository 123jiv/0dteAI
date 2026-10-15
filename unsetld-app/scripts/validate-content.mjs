#!/usr/bin/env node
// Checks the mission library and the other content files before they ship: `npm run validate`.
// Errors fail the run; warnings are worth a look. The rules match docs/MISSIONS_SPEC.md section 4.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const tracks = read('tracks.json');
const missions = read('missions.json');
const legacy = read('legacy-missions.json');
const programs = read('programs.json');
const rewards = read('rewards.json');
const rules = read('rules.json');
const colorways = read('colorways.json');
const reminders = read('reminders.json');
const milestones = read('milestones.json');

const errors = [];
const warnings = [];

// 3.3: eight areas (Business folded into Projects), in this order.
const TRACK_IDS = ['discipline', 'school', 'fitness', 'money', 'career', 'skills', 'projects', 'organization'];
// The founder's approved library, exactly and in this order. The gaps are deliberate (missions
// rejected in curation): never renumber, add or rename one here or in scripts/missions/library.py.
const APPROVED = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S9', 'S10', 'S11', 'S12', 'S13', 'S15',
  'F1', 'F2', 'F3', 'F5', 'F6', 'F7', 'F8',
  'M1', 'M2', 'M3', 'M5', 'M6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C9', 'C10', 'C11', 'C12',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9', 'P10', 'P11', 'P12',
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K9', 'K10',
  'O1', 'O2', 'O5', 'O8', 'O9',
];
// The approved titles, word for word (the founder's text: never reworded; a template only fills its slot for the user).
const APPROVED_TITLES = {
  D1: 'Lock In for 30 Minutes',
  D2: 'Do Your Most Important Task for 30 Minutes',
  D3: "Finish One Thing You've Been Avoiding",
  D4: "Plan Tomorrow's Top 3",
  D5: 'Work With Your Phone Away for 30 Minutes',
  D6: 'Finish One Unfinished Task',
  S1: 'Study One Subject for 30 Minutes',
  S2: 'Test Yourself Without Looking at Your Notes',
  S3: 'Complete 10 Practice Problems',
  S4: 'Write Everything You Remember About One Topic',
  S5: 'Finish One Assignment',
  S6: "Start an Assignment Before It's Urgent",
  S7: "Turn Today's Notes Into 10 Questions",
  S9: 'Test Yourself on Flashcards for 20 Minutes',
  S10: 'Explain One Difficult Concept From Memory',
  S11: 'Spend 30 Minutes on Your Hardest Class',
  S12: 'Create Your Study Plan for the Week',
  S13: 'Work on an Upcoming Project for 30 Minutes',
  S15: 'Review a Topic You Learned Earlier This Week',
  F1: 'Complete Your Workout',
  F2: 'Walk for 30 Minutes',
  F3: 'Do 20 Minutes of Cardio',
  F5: 'Complete a 30-Minute At-Home Workout',
  F6: 'Get Outside and Move for 20 Minutes',
  F7: 'Complete Your Planned Strength Workout',
  F8: 'Do Your Planned Cardio Today',
  M1: 'Track Everything You Spend Today',
  M2: 'Review Your Spending From the Last 7 Days',
  M3: 'Make a Spending Plan for This Week',
  M5: 'Check One Subscription or Recurring Charge',
  M6: 'Set One Savings Goal and Deadline',
  C1: 'Improve One Resume Bullet',
  C2: 'Apply to One Job or Internship',
  C3: 'Find 3 Opportunities Worth Applying To',
  C4: 'Improve One Part of Your Portfolio',
  C5: 'Practice 5 Interview Questions',
  C7: 'Spend 30 Minutes Building a Career Skill',
  C9: 'Add One Project or Accomplishment to Your Resume or Portfolio',
  C10: 'Research 3 Skills Required for a Job You Want',
  C11: "Practice Explaining One Project You've Built",
  C12: 'Complete One Part of an Application',
  P1: 'Work on Your Project for 30 Minutes',
  P2: 'Finish One Small Part of Your Project',
  P3: 'Create One Piece of Content',
  P4: 'Improve One Page, Screen, Product, or Listing',
  P5: 'Fix One Problem With Your Project',
  P6: 'Write Your Next 3 Project Actions',
  P7: 'Create One New Design, Prototype, or Draft',
  P9: 'Review One Important Metric and Make One Decision From It',
  P10: 'Publish Something You Made',
  P11: 'Improve Something You Made Yesterday',
  P12: 'Turn One Idea Into a First Draft',
  K1: 'Practice Your Skill for 30 Minutes',
  K2: 'Complete One Lesson, Then Use What You Learned',
  K3: 'Practice One Weak Part of Your Skill for 20 Minutes',
  K4: 'Build a Small Project Using Your Skill',
  K5: 'Explain One Thing You Learned From Memory',
  K6: 'Create Something You Can Put in a Portfolio',
  K7: 'Improve Something You Created Before',
  K9: 'Watch One Tutorial and Apply One Thing From It',
  K10: 'Recreate Something Without Following the Tutorial',
  O1: 'Clear Your Desk',
  O2: 'Do a 15-Minute Room Reset',
  O5: 'Pack Everything You Need for Tomorrow',
  O8: 'Reset Your Workspace for Tomorrow',
  O9: 'Review Your Calendar for the Next 7 Days',
};
// Weekly or rarer (frequency 'low'): exactly these. M1 can be daily; C3 is 1–2 a week (medium).
const LOW = new Set(['S12', 'M2', 'M3', 'M5', 'M6', 'C1', 'C5', 'C9', 'C10', 'P9', 'O9']);
// An id's letter names its area.
const LETTER = { D: 'discipline', S: 'school', F: 'fitness', M: 'money', C: 'career', P: 'projects', K: 'skills', O: 'organization' };
// The founder's COMPLETION_SCREEN and RESULT PHOTO proofs are PHOTO, with a proof line that says personal details can be hidden.
const PROOF = ['PHOTO', 'PHOTO_AFTER', 'BEFORE_AFTER', 'TIMER_AND_PHOTO', 'TIMER'];
const SKILLS = ['coding', 'design', 'video', 'writing', 'language', 'music'];
const REQ = ['school', 'highschool', 'work', 'gym', 'project', 'building', 'starting', 'age16', 'age18', 'jobsearch', ...SKILLS];
// How often each frequency comes round: the cooldown (days) it allows.
const COOLDOWN = { high: [1, 2], medium: [3, 4], low: [7, 365] };
// The slot a template names, by its `personalize` field ({opportunities} is the plural of {opportunity}).
const SLOTS = { project: ['project'], subject: ['subject'], skill: ['skill'], opportunity: ['opportunity', 'opportunities'] };
// The plain words each slot reads as when the user's goal names nothing (the approved title).
const SLOT_DEFAULT = { project: 'Your Project', subject: 'One Subject', skill: 'Your Skill', opportunity: 'Job or Internship', opportunities: 'Opportunities' };
// Points by time (the founder's scale): 5–10 min = 5, 15–20 = 10, 25–45 = 15 or 20, over 45 = 20 or 25.
const pointsFor = min => (min <= 10 ? [5] : min <= 20 ? [10] : min <= 45 ? [15, 20] : [20, 25]);
// A title that names a length of time ("for 30 Minutes", "a 15-Minute Room Reset").
const TIMED_TITLE = /\b\d+[- ]minutes?\b/i;
// Before and after is enough for a room: O2 names its 15 minutes but is proven by the room.
const TIMED_TITLE_OK = new Set(['O2']);
// Motivational talk, therapy-speak and slang: missions say what to do, plainly.
const BANNED = [
  'sigma', 'grindset', 'rise and grind', 'best version of yourself', 'level up', 'unlock', 'journey', 'manifest',
  'crush it', 'beast mode', 'hustle', 'grind', 'grinding', 'king', 'bro', 'no cap', 'main character', 'glow up',
  'mindset', 'game-changer', 'game changer', 'your potential', 'you got this', "you've got this", 'believe in yourself',
  'self-care', 'vibes', 'vibe', 'aura', 'rizz', 'cooked', 'npc', 'era', 'slay', 'alpha', 'no days off', 'choose yourself',
  'be uncomfortable', 'discomfort', 'embrace', 'warrior', 'champion', 'legend', 'destiny', 'universe',
];
// Words that need a second look for safety or privacy.
const SENSITIVE = [
  'calorie', 'calories', 'diet', 'dieting', 'fast', 'fasting', 'weigh', 'weight loss', 'lose weight', 'body fat',
  'six-pack', 'abs', 'skip a meal', 'cold plunge', 'ice bath', 'energy drink', 'caffeine', 'pre-workout', 'supplement',
  'crypto', 'stock', 'stocks', 'trading', 'bet', 'betting', 'gamble', 'all-nighter', 'stay up', 'stranger', 'strangers',
  'selfie', 'mirror', 'face', 'bank balance', 'account number', 'card number', 'grade', 'grades', 'bedroom', 'address',
  'location',
];
// Never in a mission, whatever the context.
const NEVER = /\b(shirtless|weigh-in|progress pic\w*|body check|before-and-after body|calorie deficit|water fast|dry fast|no sleep|all-nighter|vape|vaping|alcohol|beer|smoke weed|nicotine|options trading|day trading|leverage|casino|sports bet\w*|lottery|dare)\b/i;
const SWEAR = /\b(damn\w*|hell|shit\w*|piss\w*|fuck\w*)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const escape = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const listRe = list => new RegExp(`\\b(${list.map(escape).join('|')})\\b`, 'i');
const bannedRe = listRe(BANNED);
const sensitiveRe = listRe(SENSITIVE);

// Tracks
if (tracks.map(t => t.id).join() !== TRACK_IDS.join()) errors.push(`tracks.json: tracks must be ${TRACK_IDS.join(', ')} in that order`);
for (const t of tracks) if (!t.name || !t.short || !t.scope) errors.push(`tracks.json ${t.id}: name, short and scope are required`);

// Missions
const ids = new Set();
const titles = new Map();
const perTrack = Object.fromEntries(TRACK_IDS.map(t => [t, { short: 0, main: 0, core: 0, timer: 0, before: 0, low: 0 }]));
// Exactly the approved ids, in order: nothing missing, nothing extra.
const got = missions.map(m => m.id);
for (const id of APPROVED) if (!got.includes(id)) errors.push(`missions.json: approved mission ${id} is missing`);
for (const id of got) if (!APPROVED.includes(id)) errors.push(`missions.json: "${id}" is not an approved mission (the library is exactly the founder's 66)`);
if (got.length === APPROVED.length && got.every(id => APPROVED.includes(id)) && got.join() !== APPROVED.join()) errors.push('missions.json: missions must be in the approved order (D1 … O9)');
for (const m of missions) {
  const where = `mission ${m.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  if (!TRACK_IDS.includes(m.track)) e(`unknown track "${m.track}"`);
  else if (LETTER[(m.id ?? '')[0]] !== m.track) e(`an id starting "${(m.id ?? '?')[0]}" is a ${LETTER[(m.id ?? '')[0]] ?? 'unknown'} mission, not ${m.track}`);
  if (m.source !== 'UNSETLD') e('source must be "UNSETLD" (approved library missions)');
  if (!COOLDOWN[m.frequency]) e('frequency must be high, medium or low');
  else if ((m.frequency === 'low') !== LOW.has(m.id)) e(LOW.has(m.id) ? 'a weekly or rarer mission: frequency must be low' : 'frequency low is only for the weekly or rarer missions');
  if (m.also != null && (!Array.isArray(m.also) || m.also.some(t => !TRACK_IDS.includes(t) || t === m.track))) e('also must list other known tracks');
  if (ids.has(m.id)) e('duplicate id');
  ids.add(m.id);
  const title = (m.title ?? '').trim();
  if (APPROVED_TITLES[m.id] != null && m.title !== APPROVED_TITLES[m.id]) e(`the title is the approved one, word for word: "${APPROVED_TITLES[m.id]}" (got "${m.title}")`);
  // The founder's approved titles run to 61 characters ("Add One Project or Accomplishment to Your Resume or Portfolio").
  if (!title || title.length > 64 || /[.!?]$/.test(title)) e(`title must be 1–64 characters with no end punctuation: "${title}"`);
  if (TIMED_TITLE.test(title) && !['TIMER', 'TIMER_AND_PHOTO'].includes(m.proofType) && !TIMED_TITLE_OK.has(m.id)) {
    e(`a title with a length of time needs the timer (TIMER or TIMER_AND_PHOTO): a photo can't prove "${title}"`);
  }
  // Personalization: one slot, the one `personalize` names, and the title is the template with a plain default in it.
  if ((m.template == null) !== (m.personalize == null)) e('template and personalize go together');
  else if (m.template != null) {
    const slots = [...String(m.template).matchAll(/\{([a-z]+)\}/g)].map(x => x[1]);
    if (!SLOTS[m.personalize]) e(`personalize must be one of ${Object.keys(SLOTS).join(', ')}`);
    else if (slots.length !== 1 || !SLOTS[m.personalize].includes(slots[0])) e(`template must have exactly one {${SLOTS[m.personalize][0]}} slot: "${m.template}"`);
    else {
      const [before, after] = String(m.template).split(`{${slots[0]}}`);
      const re = new RegExp(`^${escape(before)}(${escape(SLOT_DEFAULT[slots[0]])})${escape(after)}$`);
      if (!re.test(title)) e(`the title must be the template with "${SLOT_DEFAULT[slots[0]]}" in its slot: "${m.template}" vs "${title}"`);
    }
  }
  const key = title.toLowerCase();
  if (titles.has(key)) e(`duplicate title "${title}" (also ${titles.get(key)})`);
  titles.set(key, m.id);
  if (!m.short || m.short.length > 120 || !/\.$/.test(m.short)) e(`short must be one sentence of ≤120 characters ending with a full stop: "${m.short}"`);
  else if ((m.short.match(/[.?!](\s|$)/g) ?? []).length > 1) e(`short must be one sentence (fold a safety note into it): "${m.short}"`);
  if (!m.proof || m.proof.length > 90) e(`proof must be 1–90 characters: "${m.proof}"`);
  if (!PROOF.includes(m.proofType)) e(`bad proofType "${m.proofType}"`);
  if (!(Number.isInteger(m.minutes) && m.minutes >= 1 && m.minutes <= 120)) e('minutes must be 1–120');
  else if (!(m.minutes % 5 === 0)) e('minutes must be a multiple of 5');
  else if (!pointsFor(m.minutes).includes(m.points)) e(`${m.minutes} minutes earns ${pointsFor(m.minutes).join(' or ')} points (got ${m.points})`);
  if (m.proofType === 'TIMER_AND_PHOTO' || m.proofType === 'TIMER') {
    if (!(m.timerMinutes >= 5 && m.timerMinutes <= 60)) e(`${m.proofType} needs timerMinutes 5–60`);
    else if (m.minutes < m.timerMinutes) e('minutes must be at least timerMinutes');
  } else if (m.timerMinutes != null) e('timerMinutes is only for timed missions');
  if (m.requires != null && (!Array.isArray(m.requires) || m.requires.some(r => !REQ.includes(r)))) e(`bad requires ${JSON.stringify(m.requires)}`);
  // "C2 only when job/internship search is relevant": the job-search requirement is C2's, and only C2's.
  else if ((m.requires ?? []).includes('jobsearch') !== (m.id === 'C2')) e(m.id === 'C2' ? 'C2 requires jobsearch' : 'only C2 requires jobsearch');
  if (m.fits != null && (!Array.isArray(m.fits) || !m.fits.length || new Set(m.fits).size !== m.fits.length || m.fits.some(f => !SKILLS.includes(f)))) {
    e(`fits must list distinct skills (${SKILLS.join(', ')}): ${JSON.stringify(m.fits)}`);
  }
  if (!(Number.isInteger(m.cooldownDays) && m.cooldownDays >= 1 && m.cooldownDays <= 365)) e('cooldownDays must be 1–365');
  else if (COOLDOWN[m.frequency]) {
    const [lo, hi] = COOLDOWN[m.frequency];
    if (m.cooldownDays < lo || m.cooldownDays > hi) e(`a ${m.frequency}-frequency mission needs cooldownDays ${lo}${hi < 365 ? `–${hi}` : ' or more'} (got ${m.cooldownDays})`);
  }
  if (m.repeatable !== true) e('approved missions are repeatable (cooldownDays spaces them out)');
  if (m.anchor && (m.cooldownDays > 3 || !m.repeatable)) e('core habits must be repeatable with cooldownDays ≤ 3');
  if (m.group != null && !/^[a-z]+(-[a-z]+)*$/.test(m.group)) e('group must be a lowercase slug');
  if (m.weight != null && !(m.weight >= 0.1 && m.weight <= 3)) e('weight must be 0.1–3');
  if (m.when != null && !['morning', 'evening'].includes(m.when)) e('when must be morning or evening');
  if (m.days != null && (!Array.isArray(m.days) || m.days.length < 1 || m.days.length > 6 || new Set(m.days).size !== m.days.length || m.days.some(d => !Number.isInteger(d) || d < 0 || d > 6))) {
    e('days must list 1–6 distinct weekdays, 0 (Sunday) to 6');
  }
  // Tags: the area first, then lowercase keywords the goal text and the weekly focus match on (core/personalize.ts).
  if (!Array.isArray(m.tags) || m.tags.length < 1 || m.tags.length > 8) e('1–8 tags');
  else {
    if (m.tags[0] !== m.track) e(`the first tag must be the area ("${m.track}")`);
    if (m.tags.some(t => typeof t !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t))) e(`tags must be lowercase words: ${JSON.stringify(m.tags)}`);
    if (new Set(m.tags).size !== m.tags.length) e('repeated tag');
    // Niche: hyper-specific missions that only come up when nothing better fits.
    if (m.tags.includes('niche')) {
      if (!(m.weight != null && m.weight <= 0.3)) e('a niche mission needs weight 0.3 or less');
      if (m.anchor) e('a niche mission cannot be a core habit');
    }
  }
  if (m.active !== true) e('approved missions are active (retiring one is the founder\'s decision)');
  for (const k of ['slot', 'difficulty', 'why', 'how']) if (k in m) e(`"${k}" is no longer a mission field`);
  const text = [m.title, m.short, m.proof].join(' ');
  const banned = text.match(bannedRe);
  if (banned) e(`off-voice ("${banned[0]}")`);
  if (/[!…]/.test(text) || EMOJI.test(text)) e('no "!", "…" or emoji');
  if (SWEAR.test(text)) e('no swearing');
  const never = text.match(NEVER);
  if (never) e(`unsafe for a teen app ("${never[0]}")`);
  if (/\bunsetld\b|\b(earn|get|worth|\d+) points\b|\bdiscount code\b|\bmerch\b/i.test(text)) e('missions never sell or mention points');
  // A privacy note ("Hide your name and any grades.", "Not your face.") protects; it isn't a risk.
  const sensitive = text.replace(/\b(hide|not|never|without)\b[^.]*\./gi, '').match(sensitiveRe);
  if (sensitive) warnings.push(`${where}: check safety/privacy ("${sensitive[0]}")`);
  const p = perTrack[m.track];
  if (p && m.active) {
    // Short: 20 minutes or less (core/missions EASY_MAX_MINUTES).
    p[m.minutes <= 20 ? 'short' : 'main']++;
    if (m.anchor) p.core++;
    if (m.frequency === 'low') p.low++;
    if (m.proofType === 'TIMER_AND_PHOTO' || m.proofType === 'TIMER') p.timer++;
    if (m.proofType === 'BEFORE_AFTER') p.before++;
  }
}
const byId = new Map(missions.map(m => [m.id, m]));

// Retired missions (content/legacy-missions.json): display only, for proofs made before 3.3. Never an approved id.
if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) errors.push('legacy-missions.json: must be an object of id → { title, track, minutes, proofType, proof }');
else {
  for (const [id, m] of Object.entries(legacy)) {
    if (APPROVED.includes(id) || byId.has(id)) errors.push(`legacy-missions.json: "${id}" is an approved mission; retired missions only`);
    if (!m || typeof m.title !== 'string' || !TRACK_IDS.includes(m.track) || !Number.isFinite(m.minutes) || !PROOF.includes(m.proofType) || typeof m.proof !== 'string') {
      errors.push(`legacy-missions.json: "${id}" needs a title, one of the eight areas, minutes, a proofType and a proof line`);
    }
  }
}

// Programs
const programIds = new Set();
for (const p of programs) {
  const where = `program ${p.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? '')) e('bad id');
  if (programIds.has(p.id)) e('duplicate id');
  programIds.add(p.id);
  if (!p.title || p.title.length > 24) e('title must be 1–24 characters');
  if (!p.short || p.short.length > 90) e('short must be 1–90 characters');
  if (!Array.isArray(p.tracks) || !p.tracks.length || p.tracks.some(t => !TRACK_IDS.includes(t))) e('tracks must list known tracks');
  if (typeof p.free !== 'boolean') e('free must be true or false');
  if (!Array.isArray(p.plan) || p.plan.length !== p.days) e(`plan must have one entry per day (${p.days})`);
  for (const [i, day] of (p.plan ?? []).entries()) {
    if (!Array.isArray(day) || day.length < 1 || day.length > 2) e(`day ${i + 1} must list 1–2 missions`);
    for (const id of day ?? []) {
      const m = byId.get(id);
      if (!APPROVED.includes(id)) e(`day ${i + 1}: "${id}" is not an approved mission`);
      else if (!m) e(`day ${i + 1}: unknown mission "${id}"`);
      else if (!m.active) e(`day ${i + 1}: "${id}" is not active`);
      else if (m.requires?.some(r => r !== 'school')) e(`day ${i + 1}: "${id}" needs ${m.requires.join(', ')}, which not every user has`);
      else if (m.tags?.includes('niche')) warnings.push(`${where}: day ${i + 1} uses a niche mission ("${m.title}"); a staple usually fits a plan better`);
    }
    if (new Set(day).size !== (day ?? []).length) e(`day ${i + 1} repeats a mission`);
    const groups = (day ?? []).map(id => byId.get(id)?.group).filter(Boolean);
    if (new Set(groups).size !== groups.length) e(`day ${i + 1} has two missions from one group`);
    // The day only moves on once one of its missions is proven: one of them has to fit any time and any day.
    // (School Reset's first day is the founder's Create Your Study Plan for the Week alone, Sunday to Tuesday: flagged, not failed.)
    const ms = (day ?? []).map(id => byId.get(id)).filter(Boolean);
    if (ms.length && ms.every(m => m.when === 'morning')) e(`day ${i + 1} needs a mission that isn't morning-only`);
    else if (ms.length && ms.every(m => m.when === 'morning' || m.days)) warnings.push(`${where}: day ${i + 1} only has missions tied to weekdays, so the program waits for one of those days`);
  }
}
if (programs.filter(p => p.free).length < 2) errors.push('programs.json: at least two programs must be free');

// Rewards
const rewardIds = new Set();
// Every reward is a discount code (3.2): no free shipping, limited pieces or drops.
const TYPES = ['discount'];
// The founder's names for reward fields. core/rewards parseRewardTier accepts them in unsetld.com's
// config only: the app reads content/rewards.json as is (content/index.ts), so this file uses the
// canonical names or the tier silently loses its points, dates or cooldown.
const REWARD_ALIASES = {
  points: ['pointsRequired'],
  type: ['rewardType'],
  percent: ['discountPercent'],
  maxOff: ['maxDiscount'],
  availableFrom: ['startDate'],
  availableUntil: ['endDate'],
  redemptionCooldownDays: ['redemptionCooldown'],
};
// Dates the app can compare with a day (core/rewards compares the first 10 characters): YYYY-MM-DD first.
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v.slice(0, 10)));
for (const r of rewards) {
  const where = `reward ${r.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  for (const [name, others] of Object.entries(REWARD_ALIASES)) {
    for (const a of others) if (a in r) e(`use "${name}", not "${a}" (the alias names are for unsetld.com's config only)`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id ?? '')) e('bad id');
  if (rewardIds.has(r.id)) e('duplicate id');
  rewardIds.add(r.id);
  if (!TYPES.includes(r.type)) e(`type must be one of ${TYPES.join(', ')}`);
  if (!(Number.isInteger(r.points) && r.points > 0)) e('points must be a positive whole number');
  if (!r.title || !r.detail) e('title and detail are required');
  if (typeof r.active !== 'boolean') e('active must be true or false');
  if (!(r.percent > 0 && r.percent <= 50)) e('a discount needs percent 1–50');
  if (!(Number.isInteger(r.codeValidDays) && r.codeValidDays >= 1)) e('codeValidDays must be 1 or more');
  if (r.inventory != null && !(Number.isInteger(r.inventory) && r.inventory >= 0)) e('inventory must be null or a whole number');
  if (!(Number.isInteger(r.perCollection) && r.perCollection >= 1)) e('perCollection must be 1 or more');
  for (const k of ['availableFrom', 'availableUntil']) if (r[k] != null && !isDay(r[k])) e(`${k} must be null or a date starting YYYY-MM-DD`);
  if (r.maxOff != null && !(typeof r.maxOff === 'number' && r.maxOff > 0)) e('maxOff must be null or a positive number of dollars');
  // Optional rules, enforced by unsetld.com and shown on the reward.
  if (r.minimumPurchase != null && !(typeof r.minimumPurchase === 'number' && Number.isFinite(r.minimumPurchase) && r.minimumPurchase >= 0)) {
    e('minimumPurchase must be null or a number of dollars, 0 or more');
  }
  if (r.redemptionCooldownDays != null && !(Number.isInteger(r.redemptionCooldownDays) && r.redemptionCooldownDays >= 1)) {
    e('redemptionCooldownDays must be null or a whole number of days, 1 or more');
  }
  if (r.oneTimeOnly != null && typeof r.oneTimeOnly !== 'boolean') e('oneTimeOnly must be true or false');
  if (isDay(r.availableFrom) && isDay(r.availableUntil) && r.availableUntil.slice(0, 10) < r.availableFrom.slice(0, 10)) e('availableUntil is before availableFrom');
}
const active = rewards.filter(r => r.active).map(r => r.points);
if (active.some((p, i) => i && p <= active[i - 1])) warnings.push('rewards.json: active tiers usually go up in points');

// UNSETLD status (milestones.json): a discount code for each tier of active days, as a plain list with
// `day`. The app reads this file as is (content/index.ts → statusFromMilestones); `{ "status": [...] }`
// and the alias names (activeDays, discountPercent, maxDiscount) are the shape of unsetld.com's config
// override (core/rewards parseStatus), not of this file. Every tier is a discount: no other reward.
const STATUS_ALIASES = { day: ['activeDays'], percent: ['discountPercent'], maxOff: ['maxDiscount'] };
// Fields of the early-access, patch and 365-piece tiers, retired in 3.2.
const RETIRED_STATUS = ['pausable', 'action', 'letter'];
const statusList = Array.isArray(milestones) ? milestones : null;
if (!statusList) errors.push('milestones.json: must be a list of status tiers (the { "status": [...] } wrapper is for unsetld.com\'s config only)');
const statusIds = new Set();
for (const t of statusList ?? []) {
  if (!t || typeof t !== 'object') {
    errors.push('milestones.json: every status tier must be an object');
    continue;
  }
  const where = `status ${t.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  for (const [name, others] of Object.entries(STATUS_ALIASES)) {
    for (const a of others) if (a in t) e(`use "${name}", not "${a}" (the alias names are for unsetld.com's config only)`);
  }
  for (const k of RETIRED_STATUS) if (k in t) e(`"${k}" is retired: every status tier is a discount code`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id ?? '')) e('bad id');
  if (statusIds.has(t.id)) e('duplicate id');
  statusIds.add(t.id);
  if (!(Number.isInteger(t.day) && t.day >= 1)) e('day (active days needed) must be a whole number, 1 or more');
  if (typeof t.title !== 'string' || !t.title.trim() || t.title.length > 40) e('title must be 1–40 characters');
  for (const k of ['short', 'detail']) if (typeof t[k] !== 'string' || !t[k].trim()) e(`${k} is required`);
  if (typeof t.active !== 'boolean') e('active must be true or false');
  if (!(Number.isInteger(t.percent) && t.percent >= 1 && t.percent <= 90)) e('percent must be a whole number, 1–90');
  if (t.maxOff != null && !(typeof t.maxOff === 'number' && t.maxOff > 0)) e('maxOff must be null or a positive number of dollars');
  if (!(Number.isInteger(t.codeValidDays) && t.codeValidDays >= 1)) e('codeValidDays must be 1 or more');
  const text = [t.title, t.short, t.detail].filter(x => typeof x === 'string').join(' ');
  if (/[!…]/.test(text) || EMOJI.test(text)) e('no "!", "…" or emoji');
  if (/early access|early drop|patch|\bpiece\b|merch/i.test(text)) e('status tiers are discount codes only: no early access, patch or piece');
}
const activeStatus = (statusList ?? []).filter(t => t && t.active !== false).map(t => t.day);
if (activeStatus.some((d, i) => i && d <= activeStatus[i - 1])) warnings.push('milestones.json: active status tiers usually go up in days');

// Rules
const pos = (v, min = 1) => Number.isFinite(v) && v >= min;
if (!pos(rules.perfectDayBonus)) errors.push('rules.json: perfectDayBonus must be positive');
if (!pos(rules.rerolls?.free) || !pos(rules.rerolls?.full) || rules.rerolls.full < rules.rerolls.free) errors.push('rules.json: rerolls.free ≥ 1 and rerolls.full ≥ rerolls.free');
if (!pos(rules.offDayEvery) || !pos(rules.offDayMax, 0)) errors.push('rules.json: offDayEvery ≥ 1, offDayMax ≥ 0');
if (!pos(rules.proofFreshMinutes) || !pos(rules.beforeAfterMinGapSeconds, 0) || !pos(rules.proofRetentionDays, 0)) errors.push('rules.json: proof settings must be numbers');

// Colorways and reminders
if (colorways.length !== 10) errors.push(`colorways.json: ${colorways.length} colorways (spec has 10)`);
if (colorways.filter(c => c.free).map(c => c.id).join() !== 'black') errors.push('colorways.json: only Black is free');
for (const p of reminders) {
  const text = p.text ?? '';
  if (SWEAR.test(text) || /[!…]/.test(text) || EMOJI.test(text)) errors.push(`reminders.json: notifications are clean, no "!" or emoji: ${text}`);
  const banned = text.match(bannedRe);
  if (banned) errors.push(`reminders.json: off-voice ("${banned[0]}"): ${text}`);
}

// short: 20 minutes or less. Every area needs two for a 15-minute day (two short missions); some have no focused ones (Money, Organization), which is fine.
console.log('Track          short  focused  core  weekly+  timed  before/after');
for (const t of TRACK_IDS) {
  const p = perTrack[t];
  console.log(
    `  ${t.padEnd(12)} ${String(p.short).padStart(5)}  ${String(p.main).padStart(7)}  ${String(p.core).padStart(4)}  ${String(p.low).padStart(7)}  ${String(p.timer).padStart(5)}  ${String(p.before).padStart(12)}`,
  );
  if (p.short + p.main === 0) errors.push(`${t}: no missions`);
  else if (p.short < 2) warnings.push(`${t}: ${p.short} short missions; a 15-minute day needs two`);
  if (p.core < 1) warnings.push(`${t}: no core habit (anchor)`);
}
console.log(`Total: ${missions.length} missions, ${programs.length} programs, ${rewards.length} reward tiers, ${statusList?.length ?? 0} status tiers`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 80)) console.log('  ! ' + w);
  if (warnings.length > 80) console.log(`  … ${warnings.length - 80} more`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log('  ✗ ' + e);
  process.exit(1);
}
console.log('\nContent OK.');
