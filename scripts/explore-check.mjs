/**
 * EIS Explore EIS QA — persona select/switch/reset, persistence, keyboard,
 * reduced motion, mobile widths, sitewide personalization, console errors,
 * and the rotational loader. Runs against the built site.
 *
 * Robustness notes:
 * - 127.0.0.1 (not "localhost") — avoids IPv6/IPv4 resolution drift.
 * - waitUntil "load" (not "networkidle") — static site; networkidle can hang
 *   on keep-alive sockets.
 * - Chromium launched with --no-proxy-server so an inherited http_proxy that
 *   doesn't exempt 127.0.0.1 can't stall navigations.
 * - One throwaway navigation warms Chromium up before the real checks.
 * - Default navigation timeout raised to 60s (healthy loads are ~1s; this
 *   only guards cold-start environments).
 * - boot() verifies the child server really serves EIS, with a 20s cap.
 * - Every page navigation is try/caught so one failure doesn't kill the run.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const HOST = '127.0.0.1';
const PORT = 4194;
const child = spawn('node', ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

/* wait until the server responds with our homepage, capped at 20s */
async function boot() {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    try {
      const r = await fetch(`http://${HOST}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) {
        const text = await r.text();
        if (text.includes('Excellence')) return; // it's really our server
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.error(`Server never became ready on http://${HOST}:${PORT}/ — is another process squatting? Try a different PORT.`);
  child.kill();
  process.exit(1);
}
await boot();

const browser = await chromium.launch({ args: ['--no-proxy-server'] });
let fail = 0;
const ok = (m) => console.log('  ✓', m);
const bad = (m) => { fail++; console.log('  ✗ FAIL:', m); };
const url = (p) => `http://${HOST}:${PORT}${p}`;

/* create a page with a generous navigation cap */
async function mkPage(viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultNavigationTimeout(60000);
  return page;
}

/* round up any console errors on a page load */
async function collectErrors(page, path) {
  const errs = [];
  const onC = (m) => { if (m.type() === 'error') errs.push(m.text()); };
  const onE = (e) => errs.push('pageerror: ' + e.message);
  page.on('console', onC); page.on('pageerror', onE);
  await page.goto(url(path), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  page.removeListener('console', onC); page.removeListener('pageerror', onE);
  return errs;
}

/* attach a lifetime error collector to a page (covers click-time errors too).
   Returns { done(): string[] } — call done() at the end of the interaction block. */
function listenErrs(page) {
  const errs = [];
  const onC = (m) => { if (m.type() === 'error') errs.push(m.text()); };
  const onE = (e) => errs.push('pageerror: ' + e.message);
  page.on('console', onC); page.on('pageerror', onE);
  return {
    done() {
      page.removeListener('console', onC); page.removeListener('pageerror', onE);
      return errs;
    },
  };
}

/* poll a selector's innerText until it contains a substring.
   Switch clicks run a 280ms crossfade before the DOM swaps, so assertions
   that read content immediately after a switch can see stale text. */
async function waitText(page, selector, text, timeout = 5000) {
  const loc = page.locator(selector);
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const t = await loc.innerText({ timeout: 500 });
      if (t.includes(text)) return true;
    } catch { /* not present yet */ }
    await page.waitForTimeout(100);
  }
  return false;
}

console.log('\n== warm-up (cold-start Chromium) ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  try { await page.goto(url('/'), { waitUntil: 'load' }); ok('warm-up navigated'); }
  catch (e) { bad('warm-up failed: ' + String(e).slice(0, 120)); }
  await page.close();
}

console.log('\n== A. all pages console-clean (desktop) ==');
for (const p of ['/', '/school', '/learning', '/facilities', '/admissions', '/news', '/careers', '/contact']) {
  const page = await mkPage({ width: 1440, height: 900 });
  try {
    const errs = await collectErrors(page, p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    errs.length ? bad(`[${p}] ${errs.length} console error(s): ${errs[0]?.slice(0,120)}`) : ok(`[${p}] clean`);
    if (overflow) bad(`[${p}] horizontal overflow`);
  } catch (e) {
    bad(`[${p}] navigation failed: ${String(e).slice(0, 120)}`);
  } finally {
    await page.close();
  }
}

console.log('\n== A2. persona select + content (desktop) ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  const errs = listenErrs(page);
  try {
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });

    const cards = page.locator('.pz-card');
    (await cards.count()) === 4 ? ok('4 persona cards rendered') : bad(`expected 4 persona cards, got ${await cards.count()}`);

    await cards.nth(0).click();
    const state = await page.evaluate(() => document.querySelector('[data-explore]').getAttribute('data-state'));
    state === 'active' ? ok('state → active after select') : bad('state not active: ' + state);
    const chip = await page.locator('#evChip').innerText();
    chip.includes('Parent') ? ok('chip shows "Parent"') : bad('chip wrong: ' + chip);
    const h2 = await page.locator('#evRows h2').innerText();
    h2.includes('journey starts here') ? ok('parent headline rendered') : bad('headline: ' + h2);
    const pressed = await page.locator('.pz-card[data-persona="parent"]').getAttribute('aria-pressed');
    pressed === 'true' ? ok('aria-pressed true on parent card') : bad('aria-pressed wrong: ' + pressed);
    const doc = await page.evaluate(() => document.documentElement.getAttribute('data-persona'));
    doc === 'parent' ? ok('html[data-persona=parent] set') : bad('doc persona: ' + doc);

    // switch to student via the inline switcher (waits out the 280ms crossfade)
    await page.locator('.ev-switch [data-persona="student"]').click();
    (await waitText(page, '#evRows h2', 'Discover your potential')) ? ok('switch → student headline') : bad('switch headline did not land (crossfade?)');
    (await waitText(page, '#evChip', 'Student')) ? ok('switch updates chip') : bad('switch chip wrong after settle');

    // switch to prospective — journey 01-04 appears
    await page.locator('.ev-switch [data-persona="prospective"]').click();
    (await waitText(page, '#evRows h2', 'Imagine your child here')) ? ok('switch → prospective headline') : bad('prospective headline did not land');
    (await page.locator('.ev-rows .journey .j-step').count()) === 4 ? ok('prospective journey 01-04 renders') : bad('journey step count wrong');

    // switch to teacher — the crossfade (is-leave) should still land on content
    await page.locator('.ev-switch [data-persona="teacher"]').click();
    (await waitText(page, '#evRows h2', 'Make a difference')) ? ok('teacher headline renders') : bad('teacher headline did not land');

    // reset returns to selector
    await page.locator('.ev-reset').click();
    const state2 = await page.evaluate(() => document.querySelector('[data-explore]').getAttribute('data-state'));
    state2 === 'select' ? ok('reset → state select') : bad('reset state: ' + state2);
    (await page.locator('.pz-card').first().isVisible()) ? ok('cards visible again after reset') : bad('cards not visible after reset');
    const doc2 = await page.evaluate(() => document.documentElement.getAttribute('data-persona'));
    doc2 === null ? ok('html[data-persona] removed on reset') : bad('doc persona after reset: ' + doc2);
    const el = errs.done();
    el.length ? bad(`A2 interaction errors: ${el[0]?.slice(0, 120)}`) : ok('no console errors during select/switch/reset');
  } catch (e) {
    bad('A2 crashed: ' + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

console.log('\n== A3. session persistence + sitewide personalization ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  const errs = listenErrs(page);
  try {
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.locator('.pz-card[data-persona="student"]').click();
    await page.reload({ waitUntil: 'load' });
    const state = await page.evaluate(() => document.querySelector('[data-explore]').getAttribute('data-state'));
    state === 'active' ? ok('persona restored after reload') : bad('reload lost persona: ' + state);
    const h2 = await page.locator('#evRows h2').innerText();
    h2.includes('Discover your potential') ? ok('student experience restored on home') : bad('reload headline: ' + h2);

    const tagVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-for~="student"] > .pz-tag');
      return el ? getComputedStyle(el).display !== 'none' : false;
    });
    tagVisible ? ok('"For you" tag visible on student cards') : bad('no "For you" tag for student');

    await page.goto(url('/facilities'), { waitUntil: 'load' });
    const doc = await page.evaluate(() => document.documentElement.getAttribute('data-persona'));
    doc === 'student' ? ok('persona persists on /facilities') : bad('facilities persona: ' + doc);
    const el = errs.done();
    el.length ? bad(`A3 interaction errors: ${el[0]?.slice(0, 120)}`) : ok('no console errors across reload + nav');
  } catch (e) {
    bad('A3 crashed: ' + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

console.log('\n== A4. keyboard ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  const errs = listenErrs(page);
  try {
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });
    let focused = null;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement && document.activeElement.className);
      if (focused && String(focused).includes('pz-card')) break;
    }
    focused && String(focused).includes('pz-card') ? ok('keyboard focus reaches a persona card') : bad('no card focus after tabbing: ' + focused);
    await page.keyboard.press('Enter');
    const state = await page.evaluate(() => document.querySelector('[data-explore]').getAttribute('data-state'));
    state === 'active' ? ok('Enter activates persona') : bad('Enter did not activate');
    const el = errs.done();
    el.length ? bad(`A4 interaction errors: ${el[0]?.slice(0, 120)}`) : ok('no console errors during keyboard');
  } catch (e) {
    bad('A4 crashed: ' + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

console.log('\n== A5. reduced motion ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  const errs = listenErrs(page);
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(150);
    const spin = await page.evaluate(() => {
      const ring = document.querySelector('.ring');
      return ring ? getComputedStyle(ring).animationName : 'no-ring';
    });
    spin === 'none' ? ok('no spinner animation under reduced motion') : bad('spinner animating: ' + spin);
    await page.locator('.pz-card[data-persona="parent"]').click();
    await page.waitForTimeout(50);
    const leave = await page.evaluate(() => !!document.querySelector('.ev.is-leave'));
    leave ? bad('is-leave applied under reduced motion') : ok('no transition under reduced motion');
    const h2 = await page.locator('#evRows h2').innerText();
    h2.includes('journey starts here') ? ok('content rendered') : bad('content missing');
    const el = errs.done();
    el.length ? bad(`A5 interaction errors: ${el[0]?.slice(0, 120)}`) : ok('no console errors under reduced motion');
  } catch (e) {
    bad('A5 crashed: ' + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

console.log('\n== A6. mobile/tablet widths ==');
for (const vp of [{ width: 768, height: 1024 }, { width: 360, height: 740 }]) {
  const page = await mkPage(vp);
  const errs = listenErrs(page);
  try {
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });
    const cards = await page.locator('.pz-card').count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    cards === 4 && !overflow ? ok(`${vp.width}px: 4 cards, no overflow`) : bad(`${vp.width}px: cards=${cards} overflow=${overflow}`);
    await page.locator('.pz-card[data-persona="student"]').click();
    // first prove the click actually activated — overflow checks on a dead
    // click are meaningless (the personalised view never renders)
    const state = await page.evaluate(() => document.querySelector('[data-explore]').getAttribute('data-state'));
    state === 'active' ? ok(`${vp.width}px: click activates`) : bad(`${vp.width}px: state not active after click`);
    const h2 = await page.locator('#evRows h2').innerText();
    h2.includes('Discover your potential') ? ok(`${vp.width}px: student view rendered`) : bad(`${vp.width}px: no headline`);
    const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow2 ? bad(`${vp.width}px: overflow after select`) : ok(`${vp.width}px: active view fits`);
    const el = errs.done();
    el.length ? bad(`${vp.width}px interaction errors: ${el[0]?.slice(0, 120)}`) : ok(`${vp.width}px: console clean`);
  } catch (e) {
    bad(`${vp.width}px crashed: ` + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

console.log('\n== A7. rotational loader ==');
{
  const page = await mkPage({ width: 1440, height: 900 });
  try {
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const removed = await page.evaluate(() => document.getElementById('jsLoader') === null);
    removed ? ok('loader removed after splash') : bad('loader still in DOM');
  } catch (e) {
    bad('A7 crashed: ' + String(e).slice(0, 160));
  } finally {
    await page.close();
  }
}

await browser.close(); child.kill();
console.log(fail ? `\nEXPLORE CHECK FAIL: ${fail} issue(s)` : '\nEXPLORE CHECK: all green');
process.exit(fail ? 1 : 0);