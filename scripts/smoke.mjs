/**
 * EIS smoke test: crawl /dist for broken local links and missing assets.
 * Zero dependency — walks HTML, resolves every local href/src, and checks
 * the file exists on disk (no server needed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

let failures = 0;
const seen = new Set();
const files = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile()) files.push(p);
  }
}
walk(DIST);

function exists(rel) {
  const clean = rel.split('#')[0].split('?')[0];
  if (!clean) return true;
  const p = path.join(DIST, clean);
  if (fs.existsSync(p)) return true;
  // extension-less html mapping
  if (fs.existsSync(p + '.html')) return true;
  return false;
}

for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/(?:href|src|srcset|poster)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/.test(ref)) continue;
    if (ref.startsWith('/')) {
      const key = (path.basename(file).replace(/\.html$/, '')) + ' → ' + ref;
      if (!seen.has(key)) {
        seen.add(key);
        if (!exists(ref.slice(1))) {
          failures++;
          console.log('MISSING  ', key);
        }
      }
    } else {
      const base = path.dirname(file);
      const p = path.resolve(base, ref);
      if (!fs.existsSync(p)) {
        failures++;
        console.log('MISSING  ', path.relative(DIST, file), '→', ref);
      }
    }
  }
  for (const needle of ['lorem', 'Lorem']) {
    if (html.includes(needle)) {
      console.log('LOREM!   ', path.basename(file));
    }
  }
}

console.log(failures === 0 ? '✓ smoke: all local refs resolve' : `✗ smoke: ${failures} broken local ref(s)`);
process.exit(failures ? 1 : 0);