/**
 * EIS term-calendar QA — asserts #termCalendar renders from window.EIS_DATA,
 * is COLLAPSED by default (compact summary + hidden month grids), its
 * [data-reveal] reveal actually lands, and the "Show month-by-month" toggle
 * expands/collapses. Console must stay clean.
 *
 * Regression notes (2026-08-09):
 * - The reveal observer used threshold 0.12; the 7.7k-tall calendar could never
 *   reach 12% visibility, so it sat at opacity:0 forever (big white space). The
 *   observer now uses threshold 0 — this check asserts opacity lands at 1.
 * - The full calendar was huge: aspect-ratio-1 cells across the full column +
 *   8 open months ≈ 7,747px. Now collapsed by default with width-constrained
 *   grids — the check asserts collapsed height stays well under 1.5k px.
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

  // --- initial collapsed state ---
  const pre = await page.evaluate(() => {
    const cal = document.querySelector('#termCalendar');
    const grids = cal?.querySelector('.cal-grids');
    const btn = cal?.querySelector('.cal-toggle');
    return {
      hasData: typeof window.EIS_DATA !== 'undefined',
      eventsLen: window.EIS_DATA?.events?.length ?? null,
      summaryItems: cal ? cal.querySelectorAll('.cal-summary li').length : -1,
      collapsedHeight: cal ? cal.offsetHeight : -1,
      gridsClosed: grids ? !grids.classList.contains('is-open') && grids.offsetHeight === 0 : false,
      btnLabel: btn ? btn.textContent.trim() : '',
      btnExpanded: btn ? btn.getAttribute('aria-expanded') : '',
    };
  });
  pre.hasData && pre.eventsLen === 12 ? ok('window.EIS_DATA.events = 12') : bad(`EIS_DATA broken: ${JSON.stringify(pre)}`);
  pre.summaryItems === 12 ? ok(`summary list renders all ${pre.summaryItems} events`) : bad(`summary items = ${pre.summaryItems}`);
  pre.gridsClosed ? ok('month-by-month grids collapsed by default') : bad('grids should be collapsed on load');
  pre.collapsedHeight < 1500 ? ok(`collapsed height ${pre.collapsedHeight}px (was ~7,747 — now under 1,500)`) : bad(`collapsed height too tall: ${pre.collapsedHeight}px`);
  pre.btnLabel.startsWith('Show') && pre.btnExpanded === 'false' ? ok('toggle is labelled "Show…", aria-expanded=false') : bad(`toggle state wrong: ${JSON.stringify({ label: pre.btnLabel, expanded: pre.btnExpanded })}`);

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
  await page.screenshot({ path: '/tmp/eis-cal-collapsed.png', clip: { x: 0, y: 40, width: 1280, height: 860 } }).catch(() => {});

  // Smooth `html` scrolling + the reveal transition can keep the button "moving",
  // so Playwright's actionability wait times out; settle and force the real click.
  const clickToggle = async () => {
    await page.evaluate(() => document.querySelector('.cal-toggle')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(700);
    await page.locator('.cal-toggle').click({ force: true });
  };

  // --- toggle expands ---
  await clickToggle();
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => {
    const t = document.querySelector('.cal-toggle');
    const g = document.querySelector('.cal-grids');
    return {
      expanded: t.getAttribute('aria-expanded'),
      label: t.textContent.trim(),
      open: g.classList.contains('is-open'),
      height: g.offsetHeight,
      months: g.querySelectorAll('.cal-mth').length,
    };
  });
  opened.expanded === 'true' && opened.open && opened.height > 0
    ? ok(`toggle expands (${opened.months} month grids, ${opened.height}px)`)
    : bad(`toggle failed to expand: ${JSON.stringify(opened)}`);
  opened.label.startsWith('Hide') ? ok('toggle re-labelled "Hide…"') : bad(`label after expand: "${opened.label}"`);
  await page.screenshot({ path: '/tmp/eis-cal-expanded.png', clip: { x: 0, y: 40, width: 1280, height: 860 } }).catch(() => {});

  // --- toggle collapses again ---
  await clickToggle();
  await page.waitForTimeout(300);
  const closed = await page.evaluate(() => {
    const t = document.querySelector('.cal-toggle');
    const g = document.querySelector('.cal-grids');
    return { expanded: t.getAttribute('aria-expanded'), open: g.classList.contains('is-open'), height: g.offsetHeight };
  });
  closed.expanded === 'false' && !closed.open && closed.height === 0 ? ok('toggle collapses again') : bad(`toggle failed to collapse: ${JSON.stringify(closed)}`);

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