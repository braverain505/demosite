/**
 * EIS page-transition check — verifies the nav-load loading bar:
 *   1. reduced-motion users: clicks are NOT intercepted, no bar, no flag
 *   2. normal motion: same-origin internal clicks ARE intercepted, bar sweeps,
 *      flag set; arriving page fades in and cleans up (bar removed, pg-nav cleared)
 *   3. external/hash/mailto/tel links are never intercepted
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4186;
const BASE = `http://localhost:${PORT}`;

function waitForServer(cb) {
  const start = Date.now();
  const probe = () => {
    fetch(`${BASE}/`).then(cb).catch(() => {
      if (Date.now() - start > 8000) return cb();
      setTimeout(probe, 150);
    });
  };
  probe();
}

const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const failed = [];

waitForServer(async () => {
  const browser = await chromium.launch();
  const results = [];

  // --- 1. reduced motion: feature fully disabled ---------------------------
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' }); // real page so sessionStorage is allowed
    const rm = await p.evaluate(() => {
      const a = document.createElement('a'); a.href = '/school'; a.textContent = 'x'; document.body.appendChild(a);
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      a.dispatchEvent(ev);
      return { prevented: ev.defaultPrevented, bar: !!document.querySelector('.nav-load'), flag: sessionStorage.getItem('eis-nav-load') };
    });
    const reducedOk = rm.prevented === false && rm.bar === false && rm.flag === null;
    console.log(`reduced-motion: intercepted=${rm.prevented} bar=${rm.bar} flag=${rm.flag} → ${reducedOk ? 'PASS' : 'FAIL'}`);
    if (!reducedOk) failed.push('reduced-motion');
    await ctx.close();
  }

  // --- 2. normal motion: internal click intercepted + arrives clean ---------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });

    const leave = await p.evaluate(() => {
      const a = document.createElement('a'); a.href = '/school'; a.textContent = 'x'; document.body.appendChild(a);
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      a.dispatchEvent(ev);
      return {
        prevented: ev.defaultPrevented,
        bar: !!document.querySelector('.nav-load'),
        barOn: !!(document.querySelector('.nav-load') && document.querySelector('.nav-load').classList.contains('is-on')),
        flag: sessionStorage.getItem('eis-nav-load'),
      };
    });
    const interOk = leave.prevented === true && leave.bar === true && leave.barOn === true && leave.flag === '1';
    console.log(`leave/: intercepted=${leave.prevented} bar=${leave.bar} is-on=${leave.barOn} flag=${leave.flag} → ${interOk ? 'PASS' : 'FAIL'}`);
    if (!interOk) failed.push('interception');

    // the handler schedules real navigation after 200ms — block while it happens
    await p.waitForURL(`${BASE}/school`, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(700); // let the arrival fade + cleanup run

    const arrive = await p.evaluate(() => ({
      url: location.pathname,
      bar: !!document.querySelector('.nav-load'),
      pgNav: document.body.classList.contains('pg-nav'),
      flag: sessionStorage.getItem('eis-nav-load'),
    }));
    const arriveOk = arrive.url === '/school' && arrive.bar === false && arrive.pgNav === false && arrive.flag === null;
    console.log(`arrive: url=${arrive.url} bar=${arrive.bar} pg-nav=${arrive.pgNav} flag=${arrive.flag} → ${arriveOk ? 'PASS' : 'FAIL'}`);
    if (!arriveOk) failed.push('arrival-cleanup');
    await ctx.close();
  }

  // --- 3. external links are never intercepted ------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
    const ext = await p.evaluate(() => {
      const tests = [
        'https://wa.me/2348000000000',
        'mailto:admissions@example.com',
        'tel:+2348000000000',
        '#enquiry',
        'https://www.google.com',
      ];
      return tests.map((href) => {
        const a = document.createElement('a'); a.href = href; a.textContent = href; document.body.appendChild(a);
        const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
        a.dispatchEvent(ev);
        return { href, prevented: ev.defaultPrevented };
      });
    });
    const extOk = ext.every((e) => e.prevented === false);
    console.log(`external/hash/mailto/tel: intercepted=${ext.map((e) => e.prevented).join(',')} → ${extOk ? 'PASS' : 'FAIL'}`);
    if (!extOk) failed.push('non-internal-not-intercepted');
    await ctx.close();
  }

  await browser.close();
  child.kill();
  if (failed.length) {
    console.log(`\nPAGE-TRANSITION CHECK FAILED: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('\n✓ page-transition check: all scenarios PASS');
});