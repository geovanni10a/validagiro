import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { Batch, BatchInput, Category, IntakeDraft, InventoryItem, Location, Product, ProductInput, SyncResult, SyncSnapshot } from '../types';

const DB_NAME = 'validagiro-offline.db';

const INITIAL_CATEGORIES: Category[] = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Alimentos' },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Bebidas' },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Higiene e limpeza' },
  { id: '10000000-0000-4000-8000-000000000004', name: 'Outros' },
];

const INITIAL_LOCATIONS: Location[] = [
  { id: '20000000-0000-4000-8000-000000000001', code: 'EST-01', name: 'Estoque', path: 'Depósito / Estoque' },
  { id: '20000000-0000-4000-8000-000000000002', code: 'LOJA-01', name: 'Área de venda', path: 'Loja / Área de venda' },
  { id: '20000000-0000-4000-8000-000000000003', code: 'GEL-01', name: 'Geladeira', path: 'Refrigerados / Geladeira' },
  { id: '20000000-0000-4000-8000-000000000004', code: 'CONG-01', name: 'Congelador', path: 'Congelados / Congelador' },
];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function db() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync(DB_NAME);
  return databasePromise;
}

export async function initializeDatabase() {
  const database = await db();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      path TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      barcode TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS batches_product_created ON batches(product_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS intake_drafts (
      id TEXT PRIMARY KEY NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  for (const category of INITIAL_CATEGORIES) {
    await database.runAsync('INSERT OR IGNORE INTO categories(id, name) VALUES (?, ?)', category.id, category.name);
  }
  for (const location of INITIAL_LOCATIONS) {
    await database.runAsync(
      'INSERT OR IGNORE INTO locations(id, code, name, path) VALUES (?, ?, ?, ?)',
      location.id,
      location.code,
      location.name,
      location.path ?? null,
    );
  }
}

export async function listCategories(): Promise<Category[]> {
  return (await db()).getAllAsync<Category>('SELECT id, name FROM categories ORDER BY name');
}

export async function listLocations(): Promise<Location[]> {
  return (await db()).getAllAsync<Location>('SELECT id, code, name, path FROM locations ORDER BY name');
}

export async function findProduct(barcode: string): Promise<Product | null> {
  const row = await (await db()).getFirstAsync<{ payload: string }>('SELECT payload FROM products WHERE barcode = ?', barcode);
  if (!row) return null;
  const product = JSON.parse(row.payload) as Product;
  return product.deletedAt ? null : product;
}

export async function listInventory(): Promise<InventoryItem[]> {
  const rows = await (await db()).getAllAsync<{ product_payload: string; batch_payload: string }>(`
    SELECT p.payload AS product_payload, b.payload AS batch_payload
    FROM batches b
    INNER JOIN products p ON p.id = b.product_id
    ORDER BY json_extract(b.payload, '$.expiryDate') ASC, p.barcode ASC
  `);
  return rows.map((row) => ({
    product: JSON.parse(row.product_payload) as Product,
    batch: JSON.parse(row.batch_payload) as Batch,
  })).filter(({ product, batch }) => !product.deletedAt && !batch.deletedAt);
}

export async function saveIntake(productInput: ProductInput | Product, batchInput: BatchInput) {
  const database = await db();
  let product = 'id' in productInput ? productInput : await findProduct(productInput.barcode);
  let reactivated = false;
  if (!product) {
    const archivedRow = await database.getFirstAsync<{ payload: string }>('SELECT payload FROM products WHERE barcode = ?', productInput.barcode);
    if (archivedRow) {
      const archived = JSON.parse(archivedRow.payload) as Product;
      const now = new Date().toISOString();
      product = { ...archived, ...productInput, id: archived.id, createdAt: archived.createdAt, updatedAt: now, deletedAt: null } as Product;
      reactivated = true;
    }
  }
  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (reactivated && product) {
      await transaction.runAsync('UPDATE products SET payload = ? WHERE id = ?', JSON.stringify(product), product.id);
    } else if (!product) {
      const now = new Date().toISOString();
      product = { ...productInput, id: Crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null } as Product;
      await transaction.runAsync(
        'INSERT INTO products(id, barcode, payload, created_at) VALUES (?, ?, ?, ?)',
        product.id,
        product.barcode,
        JSON.stringify(product),
        now,
      );
    }
    const now = new Date().toISOString();
    const batch: Batch = {
      ...batchInput,
      id: Crypto.randomUUID(),
      productId: product.id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await transaction.runAsync(
      'INSERT INTO batches(id, product_id, payload, created_at) VALUES (?, ?, ?, ?)',
      batch.id,
      batch.productId,
      JSON.stringify(batch),
      batch.createdAt,
    );
  });
  return product!;
}

export async function updateBatch(batch: Batch) {
  const updated = { ...batch, updatedAt: new Date().toISOString() };
  await (await db()).runAsync('UPDATE batches SET payload = ? WHERE id = ?', JSON.stringify(updated), batch.id);
}

export async function deleteBatch(batchId: string) {
  const database = await db();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync<{ product_id: string; payload: string }>('SELECT product_id, payload FROM batches WHERE id = ?', batchId);
    if (!row) return;
    const now = new Date().toISOString();
    const batch = { ...(JSON.parse(row.payload) as Batch), deletedAt: now, updatedAt: now };
    await transaction.runAsync('UPDATE batches SET payload = ? WHERE id = ?', JSON.stringify(batch), batchId);
    if (row) {
      const allRows = await transaction.getAllAsync<{ payload: string }>('SELECT payload FROM batches WHERE product_id = ?', row.product_id);
      const hasActive = allRows.some((item) => !(JSON.parse(item.payload) as Batch).deletedAt);
      if (!hasActive) {
        const productRow = await transaction.getFirstAsync<{ payload: string }>('SELECT payload FROM products WHERE id = ?', row.product_id);
        if (productRow) {
          const product = { ...(JSON.parse(productRow.payload) as Product), deletedAt: now, updatedAt: now };
          await transaction.runAsync('UPDATE products SET payload = ? WHERE id = ?', JSON.stringify(product), row.product_id);
        }
      }
    }
  });
}

export async function saveDraft(draft: IntakeDraft) {
  await (await db()).runAsync(
    `INSERT INTO intake_drafts(id, updated_at, payload) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload`,
    draft.id,
    draft.updatedAt,
    JSON.stringify(draft),
  );
}

export async function listDrafts(): Promise<IntakeDraft[]> {
  const rows = await (await db()).getAllAsync<{ payload: string }>('SELECT payload FROM intake_drafts ORDER BY updated_at DESC');
  return rows.map((row) => JSON.parse(row.payload) as IntakeDraft);
}

export async function deleteDraft(id: string) {
  await (await db()).runAsync('DELETE FROM intake_drafts WHERE id = ?', id);
}

export async function clearDatabase() {
  await (await db()).execAsync('DELETE FROM intake_drafts; DELETE FROM batches; DELETE FROM products;');
}

export async function getServerUrl() {
  const row = await (await db()).getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'server_url'");
  return row?.value ?? '';
}

export async function setServerUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, '');
  await (await db()).runAsync(
    "INSERT INTO app_metadata(key, value) VALUES ('server_url', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    normalized,
  );
  return normalized;
}

async function localSnapshot(): Promise<SyncSnapshot> {
  const database = await db();
  const [productRows, batchRows] = await Promise.all([
    database.getAllAsync<{ payload: string }>('SELECT payload FROM products'),
    database.getAllAsync<{ payload: string }>('SELECT payload FROM batches'),
  ]);
  return {
    products: productRows.map((row) => JSON.parse(row.payload) as Product),
    batches: batchRows.map((row) => JSON.parse(row.payload) as Batch),
  };
}

function normalizeServerUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) throw new Error('Use um endereço completo, por exemplo http://192.168.1.10:3333');
  return normalized;
}

export async function syncWithServer(serverUrl: string): Promise<SyncResult> {
  const url = normalizeServerUrl(serverUrl);
  const outgoing = await localSnapshot();
  const response = await fetch(`${url}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(outgoing),
  });
  if (!response.ok) throw new Error(`Servidor respondeu com erro ${response.status}.`);
  const incoming = await response.json() as SyncSnapshot;
  if (!Array.isArray(incoming.products) || !Array.isArray(incoming.batches)) throw new Error('Resposta inválida do servidor.');

  const database = await db();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync('DELETE FROM batches; DELETE FROM products;');
    for (const product of incoming.products) {
      await transaction.runAsync(
        'INSERT INTO products(id, barcode, payload, created_at) VALUES (?, ?, ?, ?)',
        product.id,
        product.barcode,
        JSON.stringify(product),
        product.createdAt,
      );
    }
    for (const batch of incoming.batches) {
      await transaction.runAsync(
        'INSERT INTO batches(id, product_id, payload, created_at) VALUES (?, ?, ?, ?)',
        batch.id,
        batch.productId,
        JSON.stringify(batch),
        batch.createdAt,
      );
    }
  });
  const syncedAt = new Date().toISOString();
  await database.runAsync(
    "INSERT INTO app_metadata(key, value) VALUES ('last_sync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    syncedAt,
  );
  return {
    uploadedProducts: outgoing.products.length,
    uploadedBatches: outgoing.batches.length,
    downloadedProducts: incoming.products.filter((item) => !item.deletedAt).length,
    downloadedBatches: incoming.batches.filter((item) => !item.deletedAt).length,
    syncedAt,
  };
}
