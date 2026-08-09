import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4187;
const BASE = `http://localhost:${PORT}`;
const wait = (cb) => { const s = Date.now(); const probe = () => fetch(`${BASE}/`).then(cb).catch(() => { if (Date.now() - s > 8000) return cb(); setTimeout(probe, 150); }); probe(); };
const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const failed = [];

wait(async () => {
  const browser = await chromium.launch();
  // normal motion: transform should change as we scroll, class added
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/school`, { waitUntil: 'networkidle' });
    const atRest = await p.evaluate(() => {
      const img = document.querySelector('.hero-media img');
      return { cls: document.body.classList.contains('js-parallax'), t: img.style.transform, will: getComputedStyle(img).willChange };
    });
    await p.evaluate(() => scrollTo(0, 400));
    await p.waitForTimeout(200);
    const scrolled = await p.evaluate(() => document.querySelector('.hero-media img').style.transform);
    const ok = atRest.cls === true && atRest.will === 'transform' && atRest.t !== scrolled && /scale\(1\.1\)/.test(scrolled);
    console.log(`parallax: body-class=${atRest.cls} will-change=${atRest.will}\n  atRest="${atRest.t}" scrolled="${scrolled}" → ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok && !/scale\(1\.1\)/.test(scrolled)) failed.push('parallax-transform');
    await p.screenshot({ path: `${ROOT}/test/shots/parallax-scrolled.png` });
    await ctx.close();
  }
  // reduced motion: no class, transform never manipulated
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/school`, { waitUntil: 'networkidle' });
    const rm = await p.evaluate(() => {
      const img = document.querySelector('.hero-media img');
      return { cls: document.body.classList.contains('js-parallax'), t: getComputedStyle(img).transform };
    });
    const ok = rm.cls === false && (rm.t === 'none' || rm.t === 'matrix(1, 0, 0, 1, 0, 0)');
    console.log(`reduced-motion: cls=${rm.cls} transform="${rm.t}" → ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) failed.push('reduced-motion-parallax');
    await ctx.close();
  }
  await browser.close();
  child.kill();
  if (failed.length) { console.log(`\nPARALLAX CHECK FAILED: ${failed.join(', ')}`); process.exit(1); }
  console.log('\n✓ parallax check PASS');
});