#!/usr/bin/env node
// Prints the v1 monthly discount codes the app will show, so you can create
// them in Shopify ahead of time. Run: `npm run codes` (next 12 months).
//
// Create each code in Shopify Admin → Discounts → Amount off order:
//   - Percentage: the % shown below
//   - Minimum purchase: $60
//   - Limit to one use per customer: ON
//   - Limit total uses: e.g. 100 per month (your monthly kill switch)
//   - Combinations: all OFF
//   - Active dates: the month shown (ends 11:59 PM on the last day)
//   - Exclude new drops / collabs / numbered pieces by limiting to the
//     collections the code may apply to.
//
// The salt must match AppConfig.codeSalt in src/config/app.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = fs.readFileSync(path.join(here, '..', 'src', 'config', 'app.ts'), 'utf8');
const salt = /codeSalt:\s*'([^']+)'/.exec(cfg)?.[1];
if (!salt) throw new Error('codeSalt not found in src/config/app.ts');

// Same algorithm as src/core/random.ts (hash32 + shortCode) and src/core/codes.ts.
function hash32(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function shortCode(input, length = 6) {
  let h = hash32(input);
  let h2 = hash32(`${input}#2`);
  let out = '';
  for (let i = 0; i < length; i++) {
    const src = i % 2 === 0 ? h : h2;
    out += B32[src % B32.length];
    if (i % 2 === 0) h = Math.floor(h / B32.length) ^ hash32(out);
    else h2 = Math.floor(h2 / B32.length) ^ hash32(out + i);
    h >>>= 0;
    h2 >>>= 0;
  }
  return out;
}

const percents = [10]; // v1 ships only the 10% tier; 15/20 need Rank Sync (v2)
const start = new Date();
console.log('Month     Code                 Ends');
for (let m = 0; m < 12; m++) {
  const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  for (const p of percents) {
    const code = `UNSETLD${p}-${shortCode(`${salt}|${month}|${p}`, 6)}`;
    console.log(`${month}   ${code.padEnd(20)} ${month}-${end}`);
  }
}
