import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './freeze.mjs';
const preview = process.argv.includes('--v2-preview');
const dir = preview ? path.join(root, '.artifacts/bend2/v2-preview/dist') : path.join(root, 'bend2/dist');
const port = Number(process.argv[2] || 4184);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = path.resolve(dir, '.' + (requested.endsWith('/') ? requested + 'index.html' : requested));
  if (!file.startsWith(dir + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Bend2 preview: http://127.0.0.1:${port}/`));
