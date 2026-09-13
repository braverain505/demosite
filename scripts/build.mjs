/**
 * EIS static build.
 * Composes pages from markup partials and copies the asset tree to /dist.
 * Zero dependencies — pure Node stdlib. Pages live in src/pages, shared shell
 * in src/partials. Change a partial, rebuild, every page picks it up.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const PAGES = path.join(SRC, 'pages');
const PARTIALS = path.join(SRC, 'partials');

const YEAR = new Date().getFullYear();

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}

function copyDir(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

// ---------- clean ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ---------- static assets ----------
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
if (fs.existsSync(path.join(SRC, 'robots.txt'))) {
  fs.copyFileSync(path.join(SRC, 'robots.txt'), path.join(DIST, 'robots.txt'));
}
if (fs.existsSync(path.join(SRC, 'favicon.svg'))) {
  fs.copyFileSync(path.join(SRC, 'favicon.svg'), path.join(DIST, 'favicon.svg'));
}

// ---------- partials ----------
const partial = (name) => read(path.join(PARTIALS, name + '.html'));
const HEADER = partial('_header');
const FOOTER = partial('_footer');
const ASK = partial('_ask');
// ---------- shared schema (school JSON-LD) ----------
const SCHEMA = fs.existsSync(path.join(SRC, 'assets', 'data', 'schema.json'))
  ? read(path.join(SRC, 'assets', 'data', 'schema.json'))
  : '';

const tokens = {
  '<!--__header__-->': HEADER,
  '<!--__footer__-->': FOOTER,
  '<!--__ask__-->': ASK,
  '<!--__year__-->': String(YEAR),
};

const out = [];
for (const file of fs.readdirSync(PAGES).filter((f) => f.endsWith('.html'))) {
  let html = read(path.join(PAGES, file));
  for (const [k, v] of Object.entries(tokens)) {
    html = html.split(k).join(v);
  }
  // stamp aria-current on the matching nav link for this page
  const current = file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, '');
  html = html.split(`data-nav="${current}"`).join(`data-nav="${current}" aria-current="page"`);
  if (html.includes('<!--__schema__-->') && SCHEMA) {
    html = html.split('<!--__schema__-->').join(SCHEMA);
  }
  // per-page social/SEO meta (parsed from the page's own title + description)
  if (html.includes('<!--__social__-->')) {
    const SITE = 'https://www.eisjalingo.com';
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Excellence International Schools, Jalingo';
    const desc = (html.match(/name="description"\s+content="([^"]*)"/) || [])[1] || 'A Key Stages 1 to 4 school in Jalingo, Taraba State, Nigeria, balancing the British and Nigerian curricula.';
    const canonical = current === '/' ? `${SITE}/` : `${SITE}${current}`;
    const noindex = /name="robots"\s+content="noindex"/.test(html);
    const image = `${SITE}/assets/img/photo/campus.png`;
    const og = [
      ...(noindex ? [] : [`  <link rel="canonical" href="${canonical}">`]),
      `  <meta property="og:type" content="website">`,
      `  <meta property="og:site_name" content="Excellence International Schools, Jalingo">`,
      `  <meta property="og:title" content="${title}">`,
      `  <meta property="og:description" content="${desc}">`,
      `  <meta property="og:url" content="${canonical}">`,
      `  <meta property="og:image" content="${image}">`,
      `  <meta name="twitter:card" content="summary_large_image">`,
      `  <meta name="twitter:title" content="${title}">`,
      `  <meta name="twitter:description" content="${desc}">`,
      `  <meta name="twitter:image" content="${image}">`,
    ].join('\n');
    html = html.split('<!--__social__-->').join(`\n${og}\n`);
  }
  write(path.join(DIST, file), html);
  out.push(file);
}

// ---------- cache busting ----------
// Content-hash every cacheable asset and stamp its URL with ?v=<hash> in each
// page and stylesheet. A deploy that changes a file changes its URL, so the
// browser fetches it immediately even though assets are cached for a year; an
// unchanged file keeps its URL and stays cached. .htaccess keeps the HTML
// itself revalidated, so visitors always pick up the new references.
const CACHEABLE = new Set(['.css', '.js', '.json', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico']);
const ASSET_URL = /\/assets\/[A-Za-z0-9._/-]+\.(?:css|js|json|woff2?|png|jpe?g|webp|avif|svg|ico)/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(p);
    return entry.isFile() ? [p] : [];
  });
}

const versions = new Map();
for (const file of walk(path.join(DIST, 'assets'))) {
  if (!CACHEABLE.has(path.extname(file).toLowerCase())) continue;
  const url = '/' + path.relative(DIST, file).split(path.sep).join('/');
  versions.set(url, createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10));
}

// Strip any hand-written ?v= first, so re-running the build is idempotent and
// there is exactly one source of truth for the version stamp.
const stamp = (text) => text
  .replace(/\?v=[A-Za-z0-9._-]+/g, '')
  .replace(ASSET_URL, (url) => (versions.has(url) ? `${url}?v=${versions.get(url)}` : url));

let stamped = 0;
for (const file of walk(DIST)) {
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.html' && ext !== '.css') continue;
  const before = read(file);
  const after = stamp(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    stamped++;
  }
}

// ---------- report ----------
console.log(`EIS build → dist/  (${out.length} pages)`);
out.forEach((f) => console.log('  ·', f));
console.log(`Assets: copied from src/assets → dist/assets`);
console.log(`Cache busting: ${versions.size} assets hashed, ${stamped} files stamped with ?v=<hash>`);