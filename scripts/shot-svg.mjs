import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 675 } });
const files = ['hero-campus', 'sc-nursery', 'sc-primary', 'sc-jss', 'sc-sss', 'fac_campus', 'fac_lab', 'fac_dining', 'fac_exam', 'fac_library', 'fac_sports', 'fac_boarding', 'day-1', 'pano-1'];
for (const f of files) {
  await page.goto('file://' + process.cwd() + `/src/assets/img/${f}.svg`);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `/tmp/svg-${f}.png` });
}
await browser.close();
console.log('done');
