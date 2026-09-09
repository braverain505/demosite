import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 4185;
const child = spawn('node', ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const wait = () => new Promise((res) => { const t = setInterval(() => { fetch(`http://localhost:${PORT}/`).then(() => { clearInterval(t); res(); }).catch(() => {}); }, 100); });
await wait();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
async function check(name, fn) {
  try { await fn(); console.log(`[${name}] ✓`); }
  catch (e) { console.log(`[${name}] ✗ ${e.message.split('\n')[0]}`); }
}
await check('nav tabs visible (vertical, no hamburger)', async () => {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  const links = page.locator('.nav-links');
  const state = await links.evaluate((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { display: s.display, height: r.height, toggleVisible: !!document.querySelector('#jsMenuOpen') && getComputedStyle(document.querySelector('#jsMenuOpen')).display !== 'none' };
  });
  if (state.display === 'none' || state.height === 0) throw new Error('nav links hidden on mobile');
  if (state.toggleVisible) throw new Error('hamburger toggle still shown');
  // Portals dropdown still opens inline
  const dd = page.locator('.nav-dd');
  await page.click('.nav-dd-btn');
  await page.waitForTimeout(300);
  if (!(await dd.evaluate((el) => el.classList.contains('open')))) throw new Error('portals dropdown did not open');
  if (await page.locator('.nav-dd-menu').evaluate((el) => getComputedStyle(el).visibility) !== 'visible') throw new Error('portals menu not visible');
});
await check('accordion toggle', async () => {
  await page.goto(`http://localhost:${PORT}/admissions`, { waitUntil: 'networkidle' });
  const btn = page.locator('.acc-btn').first();
  await btn.click();
  await page.waitForTimeout(400);
  if (await btn.getAttribute('aria-expanded') !== 'true') throw new Error('aria-expanded != true');
  const h = await page.locator('.acc-panel').first().evaluate((el) => el.style.maxHeight);
  if (!h || h === '0px') throw new Error('panel not opened');
});
await check('wizard advance', async () => {
  await page.goto(`http://localhost:${PORT}/admissions`, { waitUntil: 'networkidle' });
  await page.fill('#wGiven', 'Aisha');
  await page.fill('#wSurname', 'Musa');
  await page.fill('#wDob', '2015-03-12');
  await page.selectOption('#wStage', { index: 1 });
  await page.click('.js-next');
  await page.waitForTimeout(400);
  if (!(await page.locator('.wiz-screen').nth(1).evaluate((el) => el.classList.contains('active')))) throw new Error('screen 2 not active');
  if (await page.locator('.wiz-step').nth(1).getAttribute('aria-current') !== 'step') throw new Error('aria-current not set');
});
await check('theme toggle', async () => {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.click('#themeToggle');
  const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (!th) throw new Error('no theme set');
  if (th !== 'dark') throw new Error('expected dark theme');
});
await browser.close(); child.kill();
console.log('interaction checks done');
