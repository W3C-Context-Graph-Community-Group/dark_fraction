import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createServer } from 'http';
import { readFile, readdir, stat } from 'fs/promises';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

/* ── MIME types for static serving ── */
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

/* ── Recursively list .md files under a directory ── */
async function listMdFiles(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = base ? base + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      files = files.concat(await listMdFiles(fullPath, relPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(relPath);
    }
  }
  return files;
}

/* ── HTTP server: static files + /api/r-files ── */
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  /* API endpoint: list all .md files in calculator/r/ */
  if (pathname === '/api/r-files') {
    try {
      const files = await listMdFiles(join(ROOT, 'calculator/r'), '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  /* Static file serving */
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = join(ROOT, pathname);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      res.writeHead(302, { Location: pathname + '/' });
      res.end();
      return;
    }
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Static server running at http://localhost:${PORT}`);
});

/* ── Start event bus (WebSocket on port 8080) ── */
const bus = spawn('node', ['lib/event-bus/server.js'], { cwd: ROOT, stdio: 'inherit' });

bus.on('close', (code) => { server.close(); process.exit(code); });

process.on('SIGINT', () => { bus.kill(); server.close(); });
process.on('SIGTERM', () => { bus.kill(); server.close(); });
