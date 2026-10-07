#!/usr/bin/env node
// Checks every content file before it ships: run `npm run validate`.
// Errors fail the run; warnings are worth a look.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const LANES = read('lanes.json').map(l => l.id);
const SWEARS = /\b(fuck\w*|shit\w*|damn\w*|hell|ass|asses|half-ass\w*|bitch\w*|bullshit|crap|pissed|dick\w*)\b/gi;
const BANNED = /\b(pussy|faggot|fag|retard\w*|nigg\w*|slut|whore|females|real men|be a man|sigma|alpha male|rizz|gyatt|skibidi)\b/i;
const errors = [];
const warnings = [];
const words = t => t.trim().split(/\s+/).filter(Boolean).length;
const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

const lines = [];
for (const f of fs.readdirSync(path.join(root, 'lines'))) {
  for (const l of read(path.join('lines', f))) lines.push({ ...l, file: f });
}
const stoic = read('stoic.json');

const ids = new Set();
let bitchCount = 0;
const perLane = {};
for (const l of lines) {
  const where = `${l.file} ${l.id}`;
  if (ids.has(l.id)) errors.push(`${where}: duplicate id`);
  ids.add(l.id);
  if (!LANES.includes(l.lane)) errors.push(`${where}: unknown lane "${l.lane}"`);
  if (!l.text?.trim()) errors.push(`${where}: empty text`);
  if (words(l.text) >= 15) errors.push(`${where}: ${words(l.text)} words (must be under 15): ${l.text}`);
  if (!['clean', 'unfiltered'].includes(l.tone)) errors.push(`${where}: tone must be clean or unfiltered`);
  if (!['draft', 'approved'].includes(l.status)) errors.push(`${where}: status must be draft or approved`);
  const swears = l.text.match(SWEARS) ?? [];
  if (l.tone === 'clean' && swears.length) errors.push(`${where}: clean line contains "${swears.join(', ')}": ${l.text}`);
  if (l.tone === 'unfiltered' && swears.length > 1) warnings.push(`${where}: ${swears.length} swears (guide says one): ${l.text}`);
  if (l.tone === 'unfiltered' && swears.length === 0) warnings.push(`${where}: unfiltered line has no swear (fine, but check tone): ${l.text}`);
  if (BANNED.test(l.text)) errors.push(`${where}: banned term: ${l.text}`);
  if (/\bbitch/i.test(l.text)) bitchCount++;
  if (/unsetld|shop|merch|discount|drop\b/i.test(l.text)) warnings.push(`${where}: mentions the brand/shop (lines shouldn't sell): ${l.text}`);
  perLane[l.lane] = perLane[l.lane] ?? { clean: 0, unfiltered: 0 };
  perLane[l.lane][l.tone]++;
}
if (bitchCount > 2) errors.push(`"bitch" appears ${bitchCount} times (max 2 in the whole library)`);

// Exact and near duplicates (same words in a different order, tiny edits).
const seen = new Map();
const tokens = lines.map(l => new Set(norm(l.text).split(' ')));
lines.forEach((l, i) => {
  const key = norm(l.text);
  if (seen.has(key)) errors.push(`duplicate text: "${l.text}" (${seen.get(key)} and ${l.id})`);
  seen.set(key, l.id);
});
for (let i = 0; i < lines.length; i++) {
  for (let j = i + 1; j < lines.length; j++) {
    const a = tokens[i];
    const b = tokens[j];
    if (a.size < 4 || b.size < 4) continue;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const jac = inter / (a.size + b.size - inter);
    if (jac >= 0.75 && norm(lines[i].text) !== norm(lines[j].text)) {
      warnings.push(`near-duplicate (${jac.toFixed(2)}): "${lines[i].text}" ~ "${lines[j].text}"`);
    }
  }
}

for (const q of stoic) {
  for (const k of ['id', 'text', 'author', 'translator', 'work', 'ref', 'url']) {
    if (!q[k]) errors.push(`stoic ${q.id ?? '?'}: missing ${k}`);
  }
  if (ids.has(q.id)) errors.push(`stoic ${q.id}: duplicate id`);
  ids.add(q.id);
}

for (const [file, prefix] of [['missions.json', 'm-'], ['notifications.json', 'n-']]) {
  const rows = read(file);
  const local = new Set();
  for (const r of rows) {
    if (!r.id?.startsWith(prefix)) errors.push(`${file} ${r.id}: id should start with ${prefix}`);
    if (local.has(r.id)) errors.push(`${file} ${r.id}: duplicate id`);
    local.add(r.id);
    if (file === 'notifications.json') {
      if (words(r.text) >= 12) warnings.push(`${file} ${r.id}: ${words(r.text)} words (aim under 12)`);
      const sw = r.text.match(SWEARS) ?? [];
      if (r.tone === 'clean' && sw.length) errors.push(`${file} ${r.id}: clean notification contains "${sw.join(', ')}"`);
    }
  }
}

console.log('Lines per lane:');
for (const [lane, c] of Object.entries(perLane)) console.log(`  ${lane.padEnd(14)} ${String(c.clean + c.unfiltered).padStart(4)}  (${c.clean} clean, ${c.unfiltered} unfiltered)`);
console.log(`  ${'stoic'.padEnd(14)} ${String(stoic.length).padStart(4)}`);
console.log(`Total: ${lines.length + stoic.length} lines`);
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
