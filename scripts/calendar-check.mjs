/**
 * EIS term-calendar QA — asserts #termCalendar renders from window.EIS_DATA,
 * expanded by default: one month block per month = heading (H3) + `.cal` grid
 * + `.cal-list` holding THAT month's events directly beneath the grid. The
 * [data-reveal] reveal must land, and the console must stay clean.
 *
 * Regression notes (2026-08-09/10):
 * - The reveal observer used threshold 0.12; the tall calendar could never
 *   reach 12% visibility, so it sat at opacity:0 forever (big white space).
 *   The observer now uses threshold 0 — this check asserts opacity lands at 1.
 * - Cards flow expanded by default (no collapse/toggle): each month's events
 *   render under that month's calendar grid, `.cal` width-constrained to 21rem
 *   so day cells stay small.
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
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);
  // cold-start hang workaround: one throwaway nav warms Chromium up
  await page.goto(`http://${HOST}:${PORT}/`, { waitUntil: 'load' });
  await page.goto(`http://${HOST}:${PORT}/parents`, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // --- expanded month-block structure ---
  const pre = await page.evaluate(() => {
    const cal = document.querySelector('#termCalendar');
    if (!cal) return { hasData: false };
    const kids = [...cal.children];
    // every month block is H3 -> .cal -> .cal-list, in that order
    const patternOk = kids.length % 3 === 0 && kids.every((el, i) =>
      i % 3 === 0 ? el.tagName === 'H3' && el.classList.contains('cal-mth')
        : i % 3 === 1 ? el.classList.contains('cal') && !el.classList.contains('cal-list')
          : el.tagName === 'UL' && el.classList.contains('cal-list'));
    // expected per-month event counts from EIS_DATA (monthly keys already sorted by render order)
    const expected = new Map();
    window.EIS_DATA?.events?.forEach((ev) => {
      const k = ev.date.slice(0, 7);
      expected.set(k, (expected.get(k) || 0) + 1);
    });
    const shortIdx = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m) + 1;
    const rendered = [];
    let okCounts = true;
    let total = 0;
    for (let i = 0; i < kids.length; i += 3) {
      const h = kids[i].textContent.trim();
      const [mName, year] = h.split(' ');
      const monthKey = `${year}-${String(shortIdx(mName)).padStart(2, '0')}`; // "Sep 2026" -> "2026-09"
      const cells = kids[i + 1].querySelectorAll('.cal-e').length;
      const n = kids[i + 2].children.length;
      total += n;
      const exp = expected.get(monthKey);
      if (exp !== n) okCounts = false;
      rendered.push({ h, cells, events: n });
    }
    return {
      hasData: typeof window.EIS_DATA !== 'undefined',
      eventsLen: window.EIS_DATA?.events?.length ?? null,
      months: kids.length / 3,
      patternOk,
      okCounts,
      totalEvents: total,
      rendered,
      height: cal.offsetHeight,
    };
  });
  pre.hasData && pre.eventsLen === 12 ? ok('window.EIS_DATA.events = 12') : bad(`EIS_DATA broken: ${JSON.stringify(pre)}`);
  pre.patternOk ? ok('each month block is heading → calendar grid → events list') : bad(`month-block pattern broken: ${JSON.stringify(pre.rendered)}`);
  pre.months === 8 ? ok(`${pre.months} months rendered`) : bad(`expected 8 months, got ${pre.months}`);
  pre.okCounts ? ok('each month’s events appear under its own calendar') : bad(`per-month counts mismatch: ${JSON.stringify(pre.rendered)}`);
  pre.totalEvents === 12 ? ok(`all ${pre.totalEvents} events accounted for across month lists`) : bad(`total events = ${pre.totalEvents}`);
  ok(`calendar block height ${pre.height}px`);
  await page.screenshot({ path: '/tmp/eis-cal-top.png', clip: { x: 0, y: 40, width: 1280, height: 860 } }).catch(() => {});

  // --- reveal after scroll ---
  await page.evaluate(() => {
    const c = document.querySelector('#termCalendar');
    window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 80);
  });
  await page.waitForTimeout(2200);
  await page.waitForTimeout(2000);
  const post = await page.evaluate(() => {
    const cal = document.querySelector('#termCalendar');
    const cs = getComputedStyle(cal);
    return { inClass: cal.classList.contains('is-in'), opacity: cs.opacity };
  });
  post.inClass && post.opacity === '1' ? ok('reveal landed (opacity 1)') : bad(`reveal did not land: ${JSON.stringify(post)}`);
  await page.screenshot({ path: '/tmp/eis-cal-expanded.png', clip: { x: 0, y: 40, width: 1280, height: 860 } }).catch(() => {});

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