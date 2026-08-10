/**
 * EIS term-calendar QA — asserts the #termCalendar on the parents page renders
 * (window.EIS_DATA → grid) and that its [data-reveal] reveal actually lands.
 *
 * Regression note (2026-08-09): the calendar is ~7.7k tall, which can never
 * reach 12% visibility in a ~900px viewport. The reveal observer used
 * threshold 0.12, so the block sat at opacity:0 forever (big white space).
 * The observer now uses threshold 0 — if someone bumps the threshold back up,
 * this check must fail.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const HOST = '127.0.0.1';
const PORT = 4197;
const child = spawn('node', ['/home/tuwa1simon/site/scripts/serve.mjs'], { cwd: '/home/tuwa1simon/site', env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

async function boot() {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    try {
      const r = await fetch(`http://${HOST}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) { const t = await r.text(); if (t.includes('Excellence')) return; }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  console.error('server never ready'); child.kill(); process.exit(1);
}
await boot();

const browser = await chromium.launch({ args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleLog = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => consoleLog.push(`[pageerror] ${e.message}`));

let fail = 0;
const ok = (m) => console.log('  ✓', m);
const bad = (m) => { console.log('  ✗', m); fail++; };

try {
  await page.goto(`http://${HOST}:${PORT}/parents`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(600);

  const pre = await page.evaluate(() => {
    const cal = document.querySelector('#termCalendar');
    return {
      hasData: typeof window.EIS_DATA !== 'undefined',
      eventsLen: window.EIS_DATA?.events?.length ?? null,
      rendered: cal ? cal.children.length : -1,
      revealed: cal ? cal.classList.contains('is-in') : false,
    };
  });
  pre.hasData && pre.eventsLen === 12 ? ok('window.EIS_DATA.events = 12') : bad(`EIS_DATA broken: ${JSON.stringify(pre)}`);
  pre.rendered > 0 ? ok(`#termCalendar rendered ${pre.rendered} nodes`) : bad(`#termCalendar empty (${pre.rendered})`);

  await page.evaluate(() => {
    const c = document.querySelector('#termCalendar');
    window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 80);
  });
  await page.waitForTimeout(2200);

  // settle: re-check after give the 640ms transition ample time
  await page.waitForTimeout(2000);

  const post = await page.evaluate(() => {
    const cal = document.querySelector('#termCalendar');
    const r = cal.getBoundingClientRect();
    const cs = getComputedStyle(cal);
    return {
      inClass: cal.classList.contains('is-in'),
      opacity: cs.opacity,
      months: cal.querySelectorAll('h3').length,
      events: cal.querySelectorAll('.cal-list li').length,
      top: Math.round(r.top),
      visibleHeight: Math.round(Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)),
    };
  });
  await page.screenshot({ path: '/tmp/eis-calendar-check.png', clip: { x: 0, y: Math.max(0, post.top - 40), width: 1280, height: 900 } }).catch(() => {});
  post.inClass && post.opacity === '1' ? ok(`reveal landed (${post.months} months, ${post.events} events, opacity ${post.opacity})`) : bad(`reveal did not land: ${JSON.stringify(post)}`);

  if (consoleLog.length) {
    console.log('  ✗ console errors/warnings:');
    consoleLog.forEach((l) => console.log('    ' + l));
    fail++;
  } else {
    ok('zero console errors');
  }
} catch (e) {
  console.error('RUN FAILED:', e.message);
  fail++;
} finally {
  child.kill();
  await browser.close();
  console.log(fail === 0 ? '\nCALENDAR CHECK: PASS' : `\nCALENDAR CHECK: ${fail} FAILURE(S)`);
  process.exit(fail === 0 ? 0 : 1);
}