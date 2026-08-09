/**
 * EIS network diagnostic — load "/" in Chromium and print every request's
 * result (200 / FAILED / still-pending) plus final readyState, so a hanging
 * navigation can be pinpointed. Just run: node scripts/net-diag.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const HOST = '127.0.0.1';
const PORT = 4196;
const child = spawn('node', ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

async function boot() {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    try {
      const r = await fetch(`http://${HOST}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) { const t = await r.text(); if (t.includes('Excellence')) return; }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  console.error('server not ready'); child.kill(); process.exit(1);
}
await boot();

const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultNavigationTimeout(15000);

const reqs = new Map(); // url -> {t0, label}
const settle = (url, status) => {
  const r = reqs.get(url);
  if (r) { r.status = status; r.dt = Date.now() - r.t0; }
};
page.on('request', (r) => {
  if (!reqs.has(r.url())) reqs.set(r.url(), { t0: Date.now(), url: r.url() });
});
page.on('response', (r) => settle(r.url(), r.status()));
page.on('requestfailed', (r) => settle(r.url(), 'FAILED'));

console.log('navigating to / …');
const t0 = Date.now();
try {
  await page.goto(`http://${HOST}:${PORT}/`, { waitUntil: 'load' });
  console.log(`goto resolved in ${Date.now() - t0}ms (load event fired)`);
} catch (e) {
  console.log(`goto timed out after ${Date.now() - t0}ms — load event never fired`);
}
await page.waitForTimeout(500);
console.log('readyState:', await page.evaluate(() => document.readyState));

let pending = 0;
for (const [u, r] of reqs) {
  if (r.status === undefined) { pending++; console.log('  PENDING  ', r.url()); }
  else console.log(`  ${String(r.status).padEnd(7)} ${String(r.dt).padStart(6)}ms  ${r.url().slice(0, 90)}`);
}
console.log(pending ? `\n${pending} request(s) never received a response` : '\nall requests settled');

await browser.close(); child.kill();
process.exit(0);