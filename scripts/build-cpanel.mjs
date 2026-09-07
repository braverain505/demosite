/**
 * EIS — cPanel build packager.
 * Assembles cpanel-build/ from the built dist/, the PHP endpoints and the
 * .htaccess clean-URL config, then zips it as eis-cpanel-build.zip so the
 * school can upload one archive to cPanel (public_html) and be done.
 *
 * Run: node scripts/build-cpanel.mjs   (after `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'cpanel-build');
const ZIP = path.join(ROOT, 'eis-cpanel-build.zip');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// ---------- assemble ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(DIST, OUT);

// PHP endpoints (ask.js calls /chat.php; careers form posts to /careers-apply.php)
for (const f of ['chat.php', 'careers-apply.php']) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  else console.warn(`  ⚠ ${f} not found at repo root — skipping`);
}
// clean-URL + redirect rules for Apache/LiteSpeed
if (fs.existsSync(path.join(ROOT, '.htaccess'))) fs.copyFileSync(path.join(ROOT, '.htaccess'), path.join(OUT, '.htaccess'));

// ---------- zip ----------
fs.rmSync(ZIP, { force: true });
const py = [
  'import zipfile, os',
  `src = ${JSON.stringify(OUT)}`,
  `out = ${JSON.stringify(ZIP)}`,
  "with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:",
  '    for root, dirs, files in os.walk(src):',
  '        for f in files:',
  '            full = os.path.join(root, f)',
  '            z.write(full, os.path.relpath(full, src))',
].join('\n');
try {
  // python3 is commonly available where `zip` is not
  execFileSync('python3', ['-c', py], { stdio: 'inherit' });
} catch {
  execSync(`tar -czf ${JSON.stringify(ZIP)} -C ${JSON.stringify(OUT)} .`, { stdio: 'inherit' });
}

console.log(`✓ cpanel build → cpanel-build/  (${ZIP})`);
console.log('  Upload eis-cpanel-build.zip to cPanel → public_html and extract, or upload the folder contents directly.');