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
const programs = read('programs.json');
const rewards = read('rewards.json');
const rules = read('rules.json');
const colorways = read('colorways.json');
const reminders = read('reminders.json');

const errors = [];
const warnings = [];

const TRACK_IDS = ['discipline', 'school', 'fitness', 'money', 'career', 'business', 'skills', 'projects', 'organization'];
const PROOF = ['PHOTO', 'PHOTO_AFTER', 'BEFORE_AFTER', 'TIMER_AND_PHOTO', 'TIMER'];
const SKILLS = ['coding', 'design', 'video', 'writing', 'language', 'music'];
const REQ = ['school', 'highschool', 'work', 'gym', 'project', 'building', 'starting', 'age16', 'age18', ...SKILLS];
// What an 18+ user who skipped every About-you question can get: no yes answer or named skill needed.
const OPEN_TO_ADULT = new Set(['school', 'highschool', 'building', 'starting', 'age16', 'age18']);
const openToAdult = m => (m.requires ?? []).every(r => OPEN_TO_ADULT.has(r));
// Points by time: up to 5 min = 5, 6–20 = 10, 21–35 = 15 or 20, 36–59 = 20, 60+ = 25.
const pointsFor = min => (min <= 5 ? [5] : min <= 20 ? [10] : min <= 35 ? [15, 20] : min < 60 ? [20] : [25]);
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
const perTrack = Object.fromEntries(TRACK_IDS.map(t => [t, { easy: 0, main: 0, core: 0, timer: 0, before: 0, openEasy: 0, openFocused: 0 }]));
for (const m of missions) {
  const where = `mission ${m.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  if (!/^[a-z]+(-[a-z0-9]+)+$/.test(m.id ?? '')) e('id must be "<track>-<slug>"');
  if (!TRACK_IDS.includes(m.track)) e(`unknown track "${m.track}"`);
  else if (!m.id.startsWith(`${m.track}-`)) e('id must start with its track');
  if (m.also != null && (!Array.isArray(m.also) || m.also.some(t => !TRACK_IDS.includes(t) || t === m.track))) e('also must list other known tracks');
  if (ids.has(m.id)) e('duplicate id');
  ids.add(m.id);
  const title = (m.title ?? '').trim();
  if (!title || title.length > 48 || /[.!?]$/.test(title)) e(`title must be 1–48 characters with no end punctuation: "${title}"`);
  const key = title.toLowerCase();
  if (titles.has(key)) e(`duplicate title "${title}" (also ${titles.get(key)})`);
  titles.set(key, m.id);
  if (!m.short || m.short.length > 120 || !/\.$/.test(m.short)) e(`short must be one sentence of ≤120 characters ending with a full stop: "${m.short}"`);
  else if ((m.short.match(/[.?!](\s|$)/g) ?? []).length > 1) e(`short must be one sentence (fold a safety note into it): "${m.short}"`);
  if (!m.proof || m.proof.length > 90) e(`proof must be 1–90 characters: "${m.proof}"`);
  if (!PROOF.includes(m.proofType)) e(`bad proofType "${m.proofType}"`);
  if (!(Number.isInteger(m.minutes) && m.minutes >= 1 && m.minutes <= 120)) e('minutes must be 1–120');
  else if (!pointsFor(m.minutes).includes(m.points)) e(`${m.minutes} minutes earns ${pointsFor(m.minutes).join(' or ')} points (got ${m.points})`);
  if (m.proofType === 'TIMER_AND_PHOTO' || m.proofType === 'TIMER') {
    if (!(m.timerMinutes >= 5 && m.timerMinutes <= 60)) e(`${m.proofType} needs timerMinutes 5–60`);
    else if (m.minutes < m.timerMinutes) e('minutes must be at least timerMinutes');
  } else if (m.timerMinutes != null) e('timerMinutes is only for timed missions');
  if (m.requires != null && (!Array.isArray(m.requires) || m.requires.some(r => !REQ.includes(r)))) e(`bad requires ${JSON.stringify(m.requires)}`);
  if (m.fits != null && (!Array.isArray(m.fits) || !m.fits.length || new Set(m.fits).size !== m.fits.length || m.fits.some(f => !SKILLS.includes(f)))) {
    e(`fits must list distinct skills (${SKILLS.join(', ')}): ${JSON.stringify(m.fits)}`);
  }
  if (!(Number.isInteger(m.cooldownDays) && m.cooldownDays >= 1 && m.cooldownDays <= 365)) e('cooldownDays must be 1–365');
  if (typeof m.repeatable !== 'boolean') e('repeatable must be true or false');
  if (m.anchor && (m.cooldownDays > 3 || !m.repeatable)) e('core habits must be repeatable with cooldownDays ≤ 3');
  if (m.group != null && !/^[a-z]+(-[a-z]+)*$/.test(m.group)) e('group must be a lowercase slug');
  if (m.weight != null && !(m.weight >= 0.1 && m.weight <= 3)) e('weight must be 0.1–3');
  if (m.when != null && !['morning', 'evening'].includes(m.when)) e('when must be morning or evening');
  if (m.days != null && (!Array.isArray(m.days) || m.days.length < 1 || m.days.length > 6 || new Set(m.days).size !== m.days.length || m.days.some(d => !Number.isInteger(d) || d < 0 || d > 6))) {
    e('days must list 1–6 distinct weekdays, 0 (Sunday) to 6');
  }
  if (!Array.isArray(m.tags) || m.tags.length < 1 || m.tags.length > 4) e('1–4 tags');
  if (typeof m.active !== 'boolean') e('active must be true or false');
  for (const k of ['slot', 'difficulty', 'why', 'how']) if (k in m) e(`"${k}" is no longer a mission field`);
  const text = [m.title, m.short, m.proof].join(' ');
  const banned = text.match(bannedRe);
  if (banned) e(`off-voice ("${banned[0]}")`);
  if (/[!…]/.test(text) || EMOJI.test(text)) e('no "!", "…" or emoji');
  if (SWEAR.test(text)) e('no swearing');
  const never = text.match(NEVER);
  if (never) e(`unsafe for a teen app ("${never[0]}")`);
  if (/\bunsetld\b|\b(earn|get|worth|\d+) points\b|\bdiscount code\b|\bmerch\b/i.test(text)) e('missions never sell or mention points');
  const sensitive = text.match(sensitiveRe);
  if (sensitive) warnings.push(`${where}: check safety/privacy ("${sensitive[0]}")`);
  const p = perTrack[m.track];
  if (p && m.active) {
    p[m.minutes <= 15 ? 'easy' : 'main']++;
    if (m.anchor) p.core++;
    if (m.proofType === 'TIMER_AND_PHOTO' || m.proofType === 'TIMER') p.timer++;
    if (m.proofType === 'BEFORE_AFTER') p.before++;
    if (openToAdult(m) && m.minutes > 15 && m.cooldownDays <= 3) p.openFocused++;
  }
  // Short days are mostly easy missions (all three at 5–15 minutes, two at 15–30), from the user's areas or ones that also serve them.
  if (m.active && openToAdult(m) && m.minutes <= 15) for (const t of [m.track, ...(m.also ?? [])]) if (perTrack[t]) perTrack[t].openEasy++;
}
const byId = new Map(missions.map(m => [m.id, m]));

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
      if (!m) e(`day ${i + 1}: unknown mission "${id}"`);
      else if (!m.active) e(`day ${i + 1}: "${id}" is not active`);
      else if (m.requires?.some(r => r !== 'school')) e(`day ${i + 1}: "${id}" needs ${m.requires.join(', ')}, which not every user has`);
    }
    if (new Set(day).size !== (day ?? []).length) e(`day ${i + 1} repeats a mission`);
    const groups = (day ?? []).map(id => byId.get(id)?.group).filter(Boolean);
    if (new Set(groups).size !== groups.length) e(`day ${i + 1} has two missions from one group`);
    // The day only moves on once one of its missions is proven: one of them has to fit any time and any day.
    const ms = (day ?? []).map(id => byId.get(id)).filter(Boolean);
    if (ms.length && ms.every(m => m.when === 'morning' || m.days)) e(`day ${i + 1} needs a mission that isn't morning-only or tied to weekdays`);
  }
}
if (programs.filter(p => p.free).length < 2) errors.push('programs.json: at least two programs must be free');

// Rewards
const rewardIds = new Set();
const TYPES = ['discount', 'free-shipping', 'early-access', 'limited', 'drop'];
for (const r of rewards) {
  const where = `reward ${r.id ?? '?'}`;
  const e = msg => errors.push(`${where}: ${msg}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id ?? '')) e('bad id');
  if (rewardIds.has(r.id)) e('duplicate id');
  rewardIds.add(r.id);
  if (!TYPES.includes(r.type)) e(`type must be one of ${TYPES.join(', ')}`);
  if (!(Number.isInteger(r.points) && r.points > 0)) e('points must be a positive whole number');
  if (!r.title || !r.detail) e('title and detail are required');
  if (typeof r.active !== 'boolean') e('active must be true or false');
  if (r.type === 'discount' && !(r.percent > 0 && r.percent <= 50)) e('a discount needs percent 1–50');
  if (!(Number.isInteger(r.codeValidDays) && r.codeValidDays >= 1)) e('codeValidDays must be 1 or more');
  if (r.inventory != null && !(Number.isInteger(r.inventory) && r.inventory >= 0)) e('inventory must be null or a whole number');
  if (!(Number.isInteger(r.perCollection) && r.perCollection >= 1)) e('perCollection must be 1 or more');
  for (const k of ['availableFrom', 'availableUntil']) if (r[k] != null && Number.isNaN(Date.parse(r[k]))) e(`${k} must be null or a date`);
}
const active = rewards.filter(r => r.active).map(r => r.points);
if (active.some((p, i) => i && p <= active[i - 1])) warnings.push('rewards.json: active tiers usually go up in points');

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

// open easy / open focused: what an 18+ user who skipped every About-you question can get (focused: cooldown ≤ 3 days).
console.log('Track          easy  focused  core  timed  before/after  open easy  open focused');
for (const t of TRACK_IDS) {
  const p = perTrack[t];
  console.log(
    `  ${t.padEnd(12)} ${String(p.easy).padStart(4)}  ${String(p.main).padStart(7)}  ${String(p.core).padStart(4)}  ${String(p.timer).padStart(5)}  ${String(p.before).padStart(12)}  ${String(p.openEasy).padStart(9)}  ${String(p.openFocused).padStart(12)}`,
  );
  if (p.easy < 4 || p.main < 5) warnings.push(`${t}: aim for at least 4 easy and 5 focused missions`);
  if (p.core < 1) warnings.push(`${t}: no core habit (anchor)`);
  if (p.openEasy < 8) warnings.push(`${t}: ${p.openEasy} easy missions for an 18+ user who skipped About you; short days need at least 8`);
  if (p.openFocused < 3) warnings.push(`${t}: ${p.openFocused} focused missions with a cooldown of 3 days or less for an 18+ user who skipped About you; focused slots need at least 3`);
}
console.log(`Total: ${missions.length} missions, ${programs.length} programs, ${rewards.length} reward tiers`);
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
