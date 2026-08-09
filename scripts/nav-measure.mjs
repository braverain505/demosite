/**
 * One-off: measure horizontal overflow in the desktop nav after adding the
 * 8th link ("Careers"). Prints, per viewport width: page scrollWidth vs
 * innerWidth, and nav-wrap scrollWidth vs clientWidth.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4195;
const BASE = `http://localhost:${PORT}`;
const wait = (cb) => { const s = Date.now(); const probe = () => fetch(`${BASE}/`).then(cb).catch(() => { if (Date.now() - s > 8000) return cb(); setTimeout(probe, 150); }); probe(); };

const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

wait(async () => {
  const browser = await chromium.launch();
  for (const w of [1081, 1180, 1220, 1280, 1366, 1440, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/school`, { waitUntil: 'networkidle' });
    const m = await p.evaluate(() => {
      const doc = document.scrollingElement;
      const navWrap = document.querySelector('.nav .wrap');
      const links = document.querySelector('.nav-links');
      const brand = document.querySelector('.brand');
      const acts = document.querySelector('.nav-actions');
      return {
        docW: doc.scrollWidth, innerW: window.innerWidth,
        wrapC: navWrap.clientWidth, wrapS: navWrap.scrollWidth,
        linksW: links.getBoundingClientRect().width,
        brandW: brand.getBoundingClientRect().width,
        actsW: acts.getBoundingClientRect().width,
        linksRight: links.getBoundingClientRect().right,
        wrapRight: navWrap.getBoundingClientRect().right,
      };
    });
    const overflow = m.wrapS > m.wrapC + 1 ? 'OVERFLOW' : 'ok';
    console.log(
      `${String(w).padStart(5)}px  doc ${String(m.innerW).padStart(4)}/${String(m.docW).padStart(4)}  wrap ${String(m.wrapC).padStart(4)}/${String(m.wrapS).padStart(4)}  ` +
      `brand=${Math.round(m.brandW)} links=${Math.round(m.linksW)} acts=${Math.round(m.actsW)}  right-edge: links ${Math.round(m.linksRight)} vs wrap ${Math.round(m.wrapRight)} → ${overflow}`
    );
    await ctx.close();
  }
  await browser.close();
  child.kill();
  console.log('done');
});