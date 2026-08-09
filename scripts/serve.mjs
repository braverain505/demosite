/**
 * EIS static server (dev + demo).
 * Serves /dist with clean extension-less URLs ( /school → school.html ).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const MISSING = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404 — EIS Jalingo</title><style>body{font-family:Georgia,serif;background:#0F3321;color:#FBF8F0;display:grid;place-items:center;min-height:100vh;margin:0}.c{text-align:center;padding:2rem}p{color:#C6D2C0}a{color:#FBF8F0;text-underline-offset:3px}</style></head><body><div class="c"><h1>Page not found</h1><p>The page you requested does not exist on this preview.</p><p><a href="/">← Back to Excellence International Schools</a></p></div></body></html>`;

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let file = path.join(DIST, urlPath);
  // extension-less → .html
  if (!path.extname(file)) file += '.html';
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' }).end(MISSING);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`EIS site serving → http://localhost:${PORT}/`);
});