/**
 * One-off: capture first-viewport desktop screenshots of each page at native
 * resolution so a creative-director pass can judge hero/nav at full quality.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(ROOT, 'test', 'hero-shots');

const PAGES = [
  ['index', '/'],
  ['school', '/school'],
  ['facilities', '/facilities'],
  ['admissions', '/admissions'],
  ['news', '/news'],
  ['contact', '/contact'],
];

function waitForServer(cb) {
  const start = Date.now();
  const probe = () => {
    fetch(`${BASE}/`).then(() => cb()).catch(() => {
      if (Date.now() - start > 8000) { cb(); return; }
      setTimeout(probe, 150);
    });
  };
  probe();
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

waitForServer(async () => {
  const browser = await chromium.launch();
  for (const [name, route] of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400); // let reveals/nav-load settle
    await page.screenshot({ path: `${OUT}/${name}-top.png` });
    await ctx.close();
  }
  await browser.close();
  child.kill();
  console.log(`✓ wrote ${PAGES.length} top-viewport shots to ${OUT}`);
});