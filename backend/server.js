const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const dataDir = path.join(rootDir, 'backend', 'data');
const dbPath = path.join(dataDir, 'app-db.json');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8000);

const defaultDb = {
  users: [],
  products: [],
  sales: [],
  purchases: [],
  expenses: [],
  moves: [],
  logs: [],
  settings: []
};

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultDb, ...parsed };
  } catch (error) {
    return { ...defaultDb };
  }
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };
  return mime[ext] || 'application/octet-stream';
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload terlalu besar'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function resolveSafePath(requestPath) {
  const cleaned = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(cleaned).replace(/^([.][.\\/])+/, '');
  const candidate = path.join(frontendDir, safePath);
  if (!candidate.startsWith(frontendDir)) {
    return null;
  }
  return candidate;
}

function serveStatic(req, res, requestPath) {
  const filePath = resolveSafePath(requestPath);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(frontendDir, 'index.html');
      fs.readFile(fallback, 'utf8', (readErr, html) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': getMime(filePath) });
      res.end(data);
    });
  });
}

function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'api') {
    return false;
  }

  const collectionName = segments[1];
  const keyValue = segments[2] ? decodeURIComponent(segments[2]) : null;

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'GET' && segments.length === 2) {
    const db = readDb();
    const list = Array.isArray(db[collectionName]) ? db[collectionName] : [];
    sendJson(res, 200, list);
    return true;
  }

  if (req.method === 'GET' && segments.length >= 3) {
    const db = readDb();
    const list = Array.isArray(db[collectionName]) ? db[collectionName] : [];
    const match = list.find((entry) => {
      if (entry.username && entry.username === keyValue) return true;
      if (entry.k && entry.k === keyValue) return true;
      if (entry.id !== undefined && String(entry.id) === String(keyValue)) return true;
      if (entry.sku && entry.sku === keyValue) return true;
      return false;
    });
    sendJson(res, match ? 200 : 404, match || null);
    return true;
  }

  if ((req.method === 'POST' || req.method === 'PUT') && collectionName) {
    parseBody(req).then((payload) => {
      const db = readDb();
      const table = Array.isArray(db[collectionName]) ? db[collectionName] : [];
      const idField = payload.username ? 'username' : payload.k ? 'k' : payload.id !== undefined ? 'id' : payload.sku ? 'sku' : null;
      const searchKey = idField ? payload[idField] : null;
      const idx = searchKey !== null
        ? table.findIndex((entry) => {
            if (entry.username && entry.username === searchKey) return true;
            if (entry.k && entry.k === searchKey) return true;
            if (entry.id !== undefined && String(entry.id) === String(searchKey)) return true;
            if (entry.sku && entry.sku === searchKey) return true;
            return false;
          })
        : -1;

      let saved;
      if (idx >= 0) {
        saved = { ...table[idx], ...payload };
        table[idx] = saved;
      } else {
        saved = { ...payload };
        if (saved.id === undefined && saved.username === undefined && saved.k === undefined && saved.sku === undefined) {
          saved.id = Date.now();
        }
        table.push(saved);
      }

      db[collectionName] = table;
      writeDb(db);
      sendJson(res, 200, { ok: true, item: saved });
    }).catch((error) => {
      sendJson(res, 400, { ok: false, error: error.message || 'Invalid payload' });
    });
    return true;
  }

  if (req.method === 'DELETE' && collectionName && keyValue) {
    const db = readDb();
    const table = Array.isArray(db[collectionName]) ? db[collectionName] : [];
    const next = table.filter((entry) => {
      if (entry.username && entry.username === keyValue) return false;
      if (entry.k && entry.k === keyValue) return false;
      if (entry.id !== undefined && String(entry.id) === String(keyValue)) return false;
      if (entry.sku && entry.sku === keyValue) return false;
      return true;
    });
    db[collectionName] = next;
    writeDb(db);
    sendJson(res, 200, { ok: true, deleted: keyValue });
    return true;
  }

  sendJson(res, 404, { ok: false, error: 'API tidak ditemukan' });
  return true;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (handleApi(req, res)) {
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, mode: 'json-db', message: 'connected' });
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(port, host, () => {
  console.log(`Toko Sembako Yoga server running at http://${host}:${port}`);
});
