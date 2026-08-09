/**
 * EIS console audit — loads every page and reports any console/page errors.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4183;
const PAGES = ['/', '/school', '/learning', '/life', '/facilities', '/admissions', '/parents', '/news', '/careers', '/contact'];
const child = spawn('node', ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const wait = () => new Promise((res) => { const t = setInterval(() => { fetch(`http://localhost:${PORT}/`).then(() => { clearInterval(t); res(); }).catch(() => {}); }, 150); });
await wait();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
let issues = 0;
for (const p of PAGES) {
  const errs = [];
  const onConsole = (m) => { if (m.type() === 'error') errs.push(m.text()); };
  const onPageError = (e) => errs.push('pageerror: ' + e.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto(`http://localhost:${PORT}${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  page.removeListener('console', onConsole);
  page.removeListener('pageerror', onPageError);
  if (errs.length) { issues++; console.log(`[${p}] ${errs.length} console errors:`); errs.forEach((e) => console.log('   ', e.slice(0, 140))); }
  else console.log(`[${p}] ✓ clean`);
}
await browser.close(); child.kill();
console.log(issues ? `FAIL: ${issues} pages with errors` : 'ALL PAGES: zero console errors');
process.exit(issues ? 1 : 0);
