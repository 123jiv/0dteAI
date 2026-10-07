#!/usr/bin/env node
// Packs the web export (dist/) into ONE self-contained HTML file with the JS,
// fonts and images inlined, so the app can be opened from a single link or file
// on any phone or computer. Run: `npm run build:preview`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'dist-preview');
const MIME = { '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script src="([^"]+)" defer><\/script>/);
if (!scriptMatch) throw new Error('bundle <script> not found in dist/index.html');
let js = fs.readFileSync(path.join(dist, scriptMatch[1]), 'utf8');

const dataUri = rel => {
  const file = path.join(dist, rel);
  return `data:${MIME[path.extname(file)] ?? 'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
};

let inlined = 0;
js = js.replace(/"(\/assets\/[^"]+\.(?:png|ttf|jpg))"/g, (_, rel) => {
  inlined++;
  return JSON.stringify(dataUri(rel));
});

// A literal </script> inside the bundle would end the inline script early.
js = js.replace(/<\/script/gi, '<\\/script');

const page = html
  .replace('<title>UNSETLD</title>', '<title>UNSETLD App Preview</title>\n    <meta name="description" content="Interactive browser preview of the UNSETLD iOS app." />\n    <meta name="theme-color" content="#0a0a0a" />')
  .replace('<link rel="icon" href="/favicon.ico"/>', `<link rel="icon" href="${dataUri('favicon.ico')}"/>`)
  .replace('html,\n      body {\n        height: 100%;\n      }', 'html,\n      body {\n        height: 100%;\n        background: #0a0a0a;\n        margin: 0;\n      }')
  .replace(scriptMatch[0], () => `<script>${js}</script>`);

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'unsetld-preview.html');
fs.writeFileSync(out, page);
console.log(`Inlined ${inlined} assets → ${path.relative(root, out)} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);

// Body-only variant for hosts that wrap the page in their own document
// (e.g. a published Claude artifact): title, styles, root element, script.
const fragment = `<title>UNSETLD App Preview</title>
<style>
  /* Single dark look on purpose: the app itself is dark-only. */
  :root { color-scheme: dark; --bg: #0a0a0a; --fg: #ffffff; }
  html { height: 100%; box-sizing: border-box; overflow: hidden; background: var(--bg); }
  body { height: 100%; margin: 0; overflow: hidden; background: var(--bg); color: var(--fg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<noscript>UNSETLD needs JavaScript to run.</noscript>
<div id="root"></div>
<script>${js}</script>
`;
const fragOut = path.join(outDir, 'unsetld-app-preview.html');
fs.writeFileSync(fragOut, fragment);
console.log(`Artifact fragment → ${path.relative(root, fragOut)} (${(fs.statSync(fragOut).size / 1048576).toFixed(1)} MB)`);
