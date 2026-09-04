import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Batch, BatchInput, Category, IntakeDraft, InventoryItem, Location, Product, ProductInput, SyncResult } from '../types';
import * as repository from '../data/repository';

type InventoryContextValue = {
  ready: boolean;
  error: string | null;
  categories: Category[];
  locations: Location[];
  inventory: InventoryItem[];
  drafts: IntakeDraft[];
  serverUrl: string;
  syncing: boolean;
  lastSync: SyncResult | null;
  syncError: string | null;
  refresh: () => Promise<void>;
  lookupProduct: (barcode: string) => Promise<Product | null>;
  saveIntake: (product: ProductInput | Product, batch: BatchInput) => Promise<Product>;
  updateBatch: (batch: Batch) => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
  saveDraft: (draft: IntakeDraft) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setServerUrl: (value: string) => Promise<void>;
  syncNow: () => Promise<SyncResult>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [drafts, setDrafts] = useState<IntakeDraft[]>([]);
  const [serverUrl, setServerUrlState] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextCategories, nextLocations, nextInventory, nextDrafts] = await Promise.all([
      repository.listCategories(),
      repository.listLocations(),
      repository.listInventory(),
      repository.listDrafts(),
    ]);
    setCategories(nextCategories);
    setLocations(nextLocations);
    setInventory(nextInventory);
    setDrafts(nextDrafts);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await repository.initializeDatabase();
        const savedServerUrl = await repository.getServerUrl();
        if (!mounted) return;
        setServerUrlState(savedServerUrl);
        await refresh();
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Não foi possível inicializar os dados.');
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [refresh]);

  const syncNow = useCallback(async () => {
    if (!serverUrl) throw new Error('Configure o endereço do servidor primeiro.');
    try {
      setSyncing(true);
      setSyncError(null);
      const result = await repository.syncWithServer(serverUrl);
      setLastSync(result);
      await refresh();
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível sincronizar.';
      setSyncError(message);
      throw cause;
    } finally {
      setSyncing(false);
    }
  }, [refresh, serverUrl]);

  const value = useMemo<InventoryContextValue>(() => ({
    ready,
    error,
    categories,
    locations,
    inventory,
    drafts,
    serverUrl,
    syncing,
    lastSync,
    syncError,
    refresh,
    lookupProduct: repository.findProduct,
    saveIntake: async (product, batch) => {
      const saved = await repository.saveIntake(product, batch);
      await refresh();
      return saved;
    },
    updateBatch: async (batch) => { await repository.updateBatch(batch); await refresh(); },
    deleteBatch: async (batchId) => { await repository.deleteBatch(batchId); await refresh(); },
    saveDraft: async (draft) => { await repository.saveDraft(draft); await refresh(); },
    deleteDraft: async (id) => { await repository.deleteDraft(id); await refresh(); },
    clearAll: async () => { await repository.clearDatabase(); await refresh(); },
    setServerUrl: async (value) => {
      const normalized = await repository.setServerUrl(value);
      setServerUrlState(normalized);
      setSyncError(null);
    },
    syncNow,
  }), [ready, error, categories, locations, inventory, drafts, serverUrl, syncing, lastSync, syncError, refresh, syncNow]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('useInventory must be used inside InventoryProvider');
  return value;
}
