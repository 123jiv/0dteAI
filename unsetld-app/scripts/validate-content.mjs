#!/usr/bin/env node
// Checks the line library and content files before they ship: `npm run validate`.
// Errors fail the run (spec section 8); warnings are worth a look.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const chapters = read('chapters.json');
const CHAPTER_IDS = chapters.map(c => c.id);
const lines = read('lines.json');
const prompts = read('reminders.json');
const schedule = read('schedule.json');
const standard = read('standard.json');
const colorways = read('colorways.json');

const SWEAR = /\b(damn\w*|hell|shit\w*|bullshit|piss\w*|fuck\w*)\b/i;
const NEVER = /\b(bitch\w*|pussy|motherfuck\w*|fag\w*|retard\w*|nigg\w*|slut|whore|cunt|dick\w*|cock\w*)\b|\bass(es)?\b/i;
// Slang, therapy-speak and borrowed hustle lines from the voice guide.
const BANNED = [
  'lock in', 'locked in', 'the bag', 'aura', 'npc', 'bro', 'rizz', 'cooked', 'built different', 'grind', 'grinding',
  'hustle', 'alpha', 'sigma', 'king', 'era', 'no cap', 'cringe', 'send it', 'with your chest', 'the boys', 'lowkey',
  'main character', "you've got this", 'be kind to yourself', 'proud of you', 'you deserve it', 'trust the process',
  'good things are coming', 'no days off', 'rise and grind', 'nobody is coming to save you', 'nobody cares',
  'stay hungry', 'do it scared', 'move in silence', 'the obstacle is the way', 'highlight reel',
  'yesterday you said tomorrow', 'with extra steps', 'lol', 'unsetld', 'real men', 'be a man', 'females',
  'never miss twice', 'no is a complete sentence', 'rage-quit', 'six figures', 'shredded',
];
const bannedRe = new RegExp(`\\b(${BANNED.map(b => b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`, 'i');
const EMOJI = /\p{Extended_Pictographic}/u;

const errors = [];
const warnings = [];
const words = t => t.trim().split(/\s+/).filter(Boolean).length;
const norm = t => t.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();

const nos = new Set();
const texts = new Map();
const perChapter = {};
let explicitTotal = 0;
let originals = 0;
const openers = {};

for (const l of lines) {
  const where = `No. ${String(l.no).padStart(4, '0')}`;
  if (!Number.isInteger(l.no) || l.no < 1 || l.no > 8999) errors.push(`${where}: no must be 1–8999`);
  if (nos.has(l.no)) errors.push(`${where}: duplicate number`);
  nos.add(l.no);
  if (!CHAPTER_IDS.includes(l.chapter)) errors.push(`${where}: unknown chapter "${l.chapter}"`);
  if (typeof l.explicit !== 'boolean') errors.push(`${where}: explicit must be true or false`);
  if (!Number.isInteger(l.volume) || l.volume < 1) errors.push(`${where}: volume must be 1 or more`);
  const text = (l.text ?? '').trim();
  if (!text) errors.push(`${where}: empty text`);
  const key = norm(text);
  if (texts.has(key)) errors.push(`${where}: duplicate text of No. ${texts.get(key)}: ${text}`);
  texts.set(key, l.no);
  if (/[!…]|\.\.\./.test(text)) errors.push(`${where}: no "!" or "…": ${text}`);
  if (EMOJI.test(text)) errors.push(`${where}: emoji: ${text}`);
  if (NEVER.test(text)) errors.push(`${where}: word that never ships: ${text}`);
  if (bannedRe.test(text)) errors.push(`${where}: banned by the voice guide ("${text.match(bannedRe)[0]}"): ${text}`);
  const swears = text.match(new RegExp(SWEAR.source, 'gi')) ?? [];
  if (Boolean(l.explicit) !== swears.length > 0) {
    errors.push(`${where}: explicit=${l.explicit} but ${swears.length ? `swears ("${swears.join(', ')}")` : 'no swear'}: ${text}`);
  }
  if (swears.length > 1) errors.push(`${where}: one swear per line: ${text}`);

  if (l.attribution) {
    for (const k of ['author', 'source']) if (!l.attribution[k]) errors.push(`${where}: attribution.${k} missing`);
    if (l.verified !== true) errors.push(`${where}: attributed quote not verified against the source (move it to quotes-pending.json until it is)`);
    if (l.explicit) errors.push(`${where}: attributed quotes can't be explicit`);
  } else {
    originals++;
    if (text.length > 80) errors.push(`${where}: ${text.length} characters (max 80): ${text}`);
    const w = words(text);
    if (w < 7 || w > 14) errors.push(`${where}: ${w} words (must be 7–14): ${text}`);
    if (/\?/.test(text)) warnings.push(`${where}: question (the voice almost never asks): ${text}`);
    const first = norm(text).split(' ')[0];
    openers[first] = (openers[first] ?? 0) + 1;
  }
  if (l.explicit) explicitTotal++;
  perChapter[l.chapter] = perChapter[l.chapter] ?? { total: 0, explicit: 0, lock: 0, list: [] };
  const c = perChapter[l.chapter];
  c.total++;
  c.list.push(l);
  if (l.explicit) c.explicit++;
  if (!l.explicit && !l.attribution && text.length <= 60) c.lock++;
}

const share = explicitTotal / Math.max(1, lines.length);
if (share > 0.12) errors.push(`explicit share ${(share * 100).toFixed(1)}% (max 12%)`);
for (const [id, c] of Object.entries(perChapter)) {
  const first80 = c.list.slice().sort((a, b) => a.no - b.no).slice(0, 80);
  const ex = first80.filter(l => l.explicit).length;
  if (ex > 2) errors.push(`${id}: ${ex} explicit lines in its first 80 (max 2)`);
}

// Near-duplicates: same words in a different order, tiny edits.
const list = lines.filter(l => !l.attribution);
const toks = list.map(l => new Set(norm(l.text).split(' ').filter(t => t.length > 2)));
for (let i = 0; i < list.length; i++) {
  for (let j = i + 1; j < list.length; j++) {
    const a = toks[i];
    const b = toks[j];
    if (a.size < 4 || b.size < 4) continue;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const jac = inter / (a.size + b.size - inter);
    if (jac >= 0.6) warnings.push(`near-duplicate (${jac.toFixed(2)}): No. ${list[i].no} "${list[i].text}" ~ No. ${list[j].no} "${list[j].text}"`);
  }
}

// Template caps from the voice guide (per 80 lines).
const per80 = n => Math.ceil((n * Math.max(80, originals)) / 80);
const count = re => list.filter(l => re.test(l.text)).length;
const caps = [
  [/\bnot\b[^.]*,? not\b|, not [a-z]+\.?$|isn't [^.]+\. It's/i, 8, '"X, not Y" / "isn\'t X. It\'s Y" contrasts'],
  [/^Nobody\b/, 2, 'lines opening with "Nobody"'],
  [/\bmost people\b/i, 1, '"Most people"'],
  [/\bsettl/i, 1, '"settle"'],
  [/\brestless/i, 1, '"restless"'],
  [/\bmidnight\b/i, 1, '"midnight"'],
];
for (const [re, cap, label] of caps) {
  const n = count(re);
  if (n > per80(cap)) warnings.push(`${label}: ${n} (guide caps it near ${per80(cap)} for this library size)`);
}
for (const [w, n] of Object.entries(openers)) {
  if (n > per80(5)) warnings.push(`${n} lines open with "${w}" (guide: at most ${per80(5)})`);
}
if (/you're not [^.]+, you're/i.test(list.map(l => l.text).join('\n'))) errors.push('"You\'re not X, you\'re Y" never ships');

// Other content files.
for (const p of prompts) {
  if (!['morning', 'midday', 'evening', 'night'].includes(p.slot)) errors.push(`reminders.json: bad slot "${p.slot}"`);
  if (SWEAR.test(p.text) || NEVER.test(p.text)) errors.push(`reminders.json: notifications must be clean: ${p.text}`);
  if (/[!…]/.test(p.text)) errors.push(`reminders.json: no "!" or "…": ${p.text}`);
}
for (const [day, no] of Object.entries(schedule)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) errors.push(`schedule.json: bad day "${day}"`);
  const l = lines.find(x => x.no === no);
  if (!l) errors.push(`schedule.json ${day}: no line No. ${no}`);
  else if (l.explicit || l.attribution || l.text.length > 80) errors.push(`schedule.json ${day}: today's line must be a clean original ≤80 characters`);
}
if (standard.length !== 8) warnings.push(`standard.json: ${standard.length} rules (spec has 8)`);
if (colorways.length !== 10) errors.push(`colorways.json: ${colorways.length} colorways (spec has 10)`);
if (colorways.filter(c => c.free).map(c => c.id).join() !== 'black') errors.push('colorways.json: only Black is free');

console.log('Chapter        lines  explicit  lock');
for (const id of CHAPTER_IDS) {
  const c = perChapter[id] ?? { total: 0, explicit: 0, lock: 0 };
  console.log(`  ${id.padEnd(12)} ${String(c.total).padStart(5)}  ${String(c.explicit).padStart(8)}  ${String(c.lock).padStart(4)}`);
  if (c.total < 40) warnings.push(`${id}: ${c.total} lines (Volume 001 needs at least 40 per chapter before launch)`);
}
console.log(`Total: ${lines.length} lines (${originals} original), ${explicitTotal} explicit (${(share * 100).toFixed(1)}%)`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 60)) console.log('  ! ' + w);
  if (warnings.length > 60) console.log(`  … ${warnings.length - 60} more`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log('  ✗ ' + e);
  process.exit(1);
}
console.log('\nContent OK.');
