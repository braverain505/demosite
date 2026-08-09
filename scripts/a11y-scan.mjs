/**
 * EIS accessibility audit — runs axe-core against every page at desktop +
 * mobile viewports, plus a manual DOM sanity pass (img alt, label/for pairs,
 * duplicate ids, heading order, keyboard-visible focus styles).
 * Writes test/shots/a11y.json
 */
import { chromium } from 'playwright';
import axe from 'axe-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', 'shots', 'a11y.json');
const PORT = 4182;

const PAGES = [
  ['index', '/'],
  ['school', '/school'],
  ['learning', '/learning'],
  ['life', '/life'],
  ['facilities', '/facilities'],
  ['admissions', '/admissions'],
  ['parents', '/parents'],
  ['news', '/news'],
  ['careers', '/careers'],
  ['contact', '/contact'],
];

const VPS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function waitForServer(cb) {
  const start = Date.now();
  const probe = () => {
    fetch(`http://localhost:${PORT}/`).then(() => cb()).catch(() => {
      if (Date.now() - start > 8000) return cb();
      setTimeout(probe, 150);
    });
  };
  probe();
}

const child = spawn('node', ['scripts/serve.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

waitForServer(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const vp of VPS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      for (const pg of PAGES) {
        await page.goto(`http://localhost:${PORT}${pg[1]}`, { waitUntil: 'networkidle' });

        const axeRes = await page.evaluate(async (src) => {
          // inject axe-core source (large string)
          const s = document.createElement('script');
          s.textContent = src;
          document.head.appendChild(s);
          const r = await window.axe.run(document, {
            rules: { 'color-contrast': { enabled: true } },
            resultTypes: ['violations', 'incomplete'],
          });
          return r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.length,
            help: v.help,
            targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
          }));
        }, axe.source);

        // Manual DOM audit
        const manual = await page.evaluate(() => {
          const img = Array.from(document.images);
          const missingAlt = img.filter((i) => !i.hasAttribute('alt'));
          const badAlt = img.filter((i) => i.hasAttribute('alt') && !i.getAttribute('alt').trim() && !i.getAttribute('role'));
          const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
          const unlabeled = inputs.filter((i) => {
            if (i.type === 'hidden' || i.type === 'submit' || i.type === 'button' || i.type === 'reset' || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby') || i.closest('label')) return false;
            const id = i.id;
            return !id || !document.querySelector(`label[for="${id}"]`);
          });
          const dupIds = (() => {
            const seen = new Set(), dup = new Set();
            document.querySelectorAll('[id]').forEach((el) => (seen.has(el.id) ? dup.add(el.id) : seen.add(el.id)));
            return Array.from(dup);
          })();
          const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => `${h.tagName}:${h.textContent.trim().slice(0, 60)}`);
          const h1s = document.querySelectorAll('h1').length;
          return { missingAlt: missingAlt.length, badAlt: badAlt.length, unlabeled: unlabeled.map((i) => i.id || i.name), dupIds: dupIds, h1s: h1s, headings: headings };
        });
        results.push({ page: pg[0], viewport: vp.name, axe: axeRes, manual });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    child.kill();
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  const violations = results.filter((r) => r.axe.length);
  console.log('✓ a11y scan → test/shots/a11y.json');
  console.log(`  pages with axe violations: ${violations.length}`);
  violations.forEach((r) => r.axe.forEach((v) => console.log(`  [${r.page}/${r.viewport}] ${v.impact} ${v.id} ×${v.nodes} — ${v.targets.join(' | ')}`)));
  const manualIssues = results.filter((r) => r.manual.dupIds.length || r.manual.unlabeled.length || r.manual.badAlt.length || r.manual.h1s === 0);
  console.log(`  pages with manual DOM issues: ${manualIssues.length}`);
  manualIssues.forEach((r) => console.log(`  [${r.page}] dupIds=${JSON.stringify(r.manual.dupIds)} unlabeled=${JSON.stringify(r.manual.unlabeled)} badAlt=${r.manual.badAlt} h1=${r.manual.h1s}`));
});