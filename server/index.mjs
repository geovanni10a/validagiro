import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(currentDir, 'public');
const dataDir = path.join(currentDir, 'data');
const storePath = path.join(dataDir, 'store.json');
const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(storePath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return { products: [], batches: [], updatedAt: new Date().toISOString() };
  }
}

let writeQueue = Promise.resolve();
function writeStore(store) {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, storePath);
  });
  return writeQueue;
}

function modifiedAt(record) {
  return Date.parse(record.updatedAt || record.createdAt || 0) || 0;
}

function mergeSnapshot(store, incoming) {
  const productById = new Map(store.products.map((item) => [item.id, item]));
  const productByBarcode = new Map(store.products.map((item) => [item.barcode, item]));
  const idMap = new Map();

  for (const candidate of incoming.products || []) {
    if (!candidate?.id || !candidate?.barcode) continue;
    const existing = productById.get(candidate.id) || productByBarcode.get(candidate.barcode);
    if (!existing) {
      productById.set(candidate.id, candidate);
      productByBarcode.set(candidate.barcode, candidate);
      idMap.set(candidate.id, candidate.id);
      continue;
    }
    idMap.set(candidate.id, existing.id);
    if (modifiedAt(candidate) > modifiedAt(existing)) {
      const merged = { ...candidate, id: existing.id };
      productById.set(existing.id, merged);
      productByBarcode.set(merged.barcode, merged);
    }
  }

  const batchById = new Map(store.batches.map((item) => [item.id, item]));
  for (const candidate of incoming.batches || []) {
    if (!candidate?.id || !candidate?.productId) continue;
    const normalized = { ...candidate, productId: idMap.get(candidate.productId) || candidate.productId };
    if (!productById.has(normalized.productId)) continue;
    const existing = batchById.get(normalized.id);
    if (!existing || modifiedAt(normalized) > modifiedAt(existing)) batchById.set(normalized.id, normalized);
  }

  return {
    products: [...productById.values()],
    batches: [...batchById.values()],
    updatedAt: new Date().toISOString(),
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 10 * 1024 * 1024) throw new Error('LIMIT');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function serveStatic(urlPath, response) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const resolved = path.resolve(publicDir, `.${requested}`);
  if (!resolved.startsWith(`${path.resolve(publicDir)}${path.sep}`)) {
    sendJson(response, 403, { error: 'Acesso negado.' });
    return;
  }
  try {
    const body = await fs.readFile(resolved);
    response.writeHead(200, { 'Content-Type': mime[path.extname(resolved)] || 'application/octet-stream', 'Cache-Control': requested.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    response.end(body);
  } catch (error) {
    if (error?.code === 'ENOENT') sendJson(response, 404, { error: 'Não encontrado.' });
    else throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
      response.end();
      return;
    }
    if (url.pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { ok: true, name: 'ValidaGiro Server', time: new Date().toISOString() });
      return;
    }
    if (url.pathname === '/api/snapshot' && request.method === 'GET') {
      const store = await readStore();
      sendJson(response, 200, { products: store.products, batches: store.batches, serverTime: new Date().toISOString() });
      return;
    }
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      const incoming = await readJson(request);
      const merged = mergeSnapshot(await readStore(), incoming);
      await writeStore(merged);
      sendJson(response, 200, { products: merged.products, batches: merged.batches, serverTime: new Date().toISOString() });
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Rota não encontrada.' });
      return;
    }
    await serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, error?.message === 'LIMIT' ? 413 : 500, { error: error?.message === 'LIMIT' ? 'Conteúdo muito grande.' : 'Erro interno do servidor.' });
  }
});

server.listen(port, host, () => {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) if (entry.family === 'IPv4' && !entry.internal) addresses.push(`http://${entry.address}:${port}`);
  }
  console.log('\nValidaGiro Server iniciado.');
  console.log(`Neste computador: http://localhost:${port}`);
  for (const address of addresses) console.log(`Na rede local:    ${address}`);
  console.log('\nDeixe esta janela aberta enquanto os aparelhos estiverem usando o sistema.\n');
});
