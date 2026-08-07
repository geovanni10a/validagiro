import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { DraftStatus, IntakeDraft } from '../types';
import { UUID_V4_PATTERN } from '../lib/device';

export interface DraftRepository {
  initialize(): Promise<void>;
  getOrCreateDeviceId(): Promise<string>;
  save(draft: IntakeDraft): Promise<void>;
  get(id: string): Promise<IntakeDraft | null>;
  list(): Promise<IntakeDraft[]>;
  remove(id: string): Promise<void>;
}

type DraftRow = { payload: string };
type MetadataRow = { value: string };

export class SQLiteDraftRepository implements DraftRepository {
  private database?: SQLite.SQLiteDatabase;

  async initialize() {
    this.database = await SQLite.openDatabaseAsync('validagiro.db');
    await this.database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS intake_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        client_request_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS intake_drafts_status_updated
        ON intake_drafts(status, updated_at DESC);
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }

  private db() {
    if (!this.database) throw new Error('Repositório local não inicializado.');
    return this.database;
  }

  async getOrCreateDeviceId() {
    const existing = await this.db().getFirstAsync<MetadataRow>(
      `SELECT value FROM app_metadata WHERE key = 'device_id'`,
    );
    if (existing && UUID_V4_PATTERN.test(existing.value)) return existing.value;
    const generated = Crypto.randomUUID();
    await this.db().runAsync(
      `INSERT INTO app_metadata(key, value) VALUES ('device_id', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      generated,
    );
    return generated;
  }

  async save(draft: IntakeDraft) {
    await this.db().runAsync(
      `INSERT INTO intake_drafts(id, client_request_id, status, updated_at, payload)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET client_request_id = excluded.client_request_id,
       status = excluded.status,
       updated_at = excluded.updated_at, payload = excluded.payload`,
      draft.id, draft.clientRequestId, draft.status, draft.updatedAt, JSON.stringify(draft),
    );
  }

  async get(id: string) {
    const row = await this.db().getFirstAsync<DraftRow>(
      'SELECT payload FROM intake_drafts WHERE id = ?', id,
    );
    return row ? JSON.parse(row.payload) as IntakeDraft : null;
  }

  async list() {
    const rows = await this.db().getAllAsync<DraftRow>(`
      SELECT payload FROM intake_drafts
      ORDER BY CASE status
        WHEN 'NEEDS_REVIEW' THEN 0 WHEN 'ERROR' THEN 1 WHEN 'PENDING' THEN 2
        WHEN 'SYNCING' THEN 3 WHEN 'DRAFT' THEN 4 ELSE 5 END, updated_at DESC
    `);
    return rows.map((row) => JSON.parse(row.payload) as IntakeDraft);
  }

  async remove(id: string) {
    await this.db().runAsync('DELETE FROM intake_drafts WHERE id = ?', id);
  }
}

export class MemoryDraftRepository implements DraftRepository {
  private drafts = new Map<string, IntakeDraft>();
  private deviceId?: string;
  constructor(deviceId?: string) { this.deviceId = deviceId; }
  async initialize() {}
  async getOrCreateDeviceId() {
    if (!this.deviceId) this.deviceId = Crypto.randomUUID();
    return this.deviceId;
  }
  async save(draft: IntakeDraft) { this.drafts.set(draft.id, structuredClone(draft)); }
  async get(id: string) { return this.drafts.has(id) ? structuredClone(this.drafts.get(id)!) : null; }
  async list() { return sortDrafts([...this.drafts.values()].map((draft) => structuredClone(draft))); }
  async remove(id: string) { this.drafts.delete(id); }
}

const priority: Record<DraftStatus, number> = {
  NEEDS_REVIEW: 0, ERROR: 1, PENDING: 2, SYNCING: 3, DRAFT: 4, SENT: 5,
};

export function sortDrafts(drafts: IntakeDraft[]) {
  return drafts.sort((a, b) => priority[a.status] - priority[b.status]
    || b.updatedAt.localeCompare(a.updatedAt));
}
