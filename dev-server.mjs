import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4174);
const routes = {
  '/api/config': require('./api/config.js'),
  '/api/catalog': require('./api/catalog.js'),
  '/api/vehicle': require('./api/vehicle.js'),
  '/api/issues': require('./api/issues.js'),
  '/api/diagnose': require('./api/diagnose.js'),
  '/api/providers': require('./api/providers.js')
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

async function body(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return null;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.status = code => { res.statusCode = code; return res; };
  if (routes[url.pathname]) {
    req.query = Object.fromEntries(url.searchParams);
    req.body = await body(req);
    return routes[url.pathname](req, res);
  }
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const target = path.resolve(root, 'dist', relative);
  if (!target.startsWith(path.resolve(root, 'dist'))) { res.statusCode = 403; return res.end('Forbidden'); }
  try {
    const file = await fs.readFile(target);
    res.statusCode = 200;
    res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Auto Lookup: http://127.0.0.1:${port}`));
