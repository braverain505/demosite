/**
 * EIS visual QA — viewport-level (non full-page) screenshots of the top of
 * every page at desktop + mobile, so hero/nav rendering can be judged in
 * detail. Writes test/shots/viewport/*.png
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', 'shots', 'viewport');
const PORT = 4181;

const PAGES = [
  ['index', '/'],
  ['school', '/school'],
  ['learning', '/learning'],
  ['facilities', '/facilities'],
  ['admissions', '/admissions'],
  ['news', '/news'],
  ['careers', '/careers'],
  ['contact', '/contact'],
];

const VPS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function waitForServer(cb) {
  const start = Date.now();
  const probe = () => {
    fetch(`http://localhost:${PORT}/`).then(() => cb()).catch(() => {
      if (Date.now() - start > 8000) return cb();
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
  try {
    for (const vp of VPS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      for (const pg of PAGES) {
        await page.goto(`http://localhost:${PORT}${pg[1]}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(OUT, `${pg[0]}-${vp.name}.png`) });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    child.kill();
  }
  console.log('✓ viewport shots → test/shots/viewport');
});