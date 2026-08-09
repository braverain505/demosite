/**
 * EIS visual QA — Playwright screenshots at three viewports + console audit.
 * Usage: npm run shots   (writes test/shots/*.png and test/shots/report.json)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'test', 'shots');
const PORT = 4181;

const PAGES = [
  ['index', '/'],
  ['school', '/school'],
  ['learning', '/learning'],
  ['life', '/life'],
  ['facilities', '/facilities'],
  ['admissions', '/admissions'],
  ['parents', '/parents'],
  ['news', '/news'],
  ['contact', '/contact'],
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

function waitForServer(cb) {
  const start = Date.now();
  const probe = () => {
    fetch(`http://localhost:${PORT}/`).then(() => cb()).catch(() => {
      if (Date.now() - start > 8000) { cb(); return; }
      setTimeout(probe, 150);
    });
  };
  probe();
}

fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

waitForServer(async () => {
  const report = [];
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      for (const pg of PAGES) {
        errors.length = 0;
        await page.goto(`http://localhost:${PORT}${pg[1]}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        const file = path.join(SHOTS, `${pg[0]}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        report.push({ page: pg[0], viewport: vp.name, width: vp.width, title: await page.title(), errors: [...errors] });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    child.kill();
  }
  fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 2));
  const issues = report.filter((r) => r.errors.length);
  console.log(`✓ screenshots written to test/shots (${report.length})`);
  console.log(issues.length ? `⚠ console issues on ${issues.length} captures:` : '✓ no console errors captured');
  for (const i of issues) {
    console.log('  ', i.page, i.viewport, '→', i.errors.join(' | ').slice(0, 200));
  }
});