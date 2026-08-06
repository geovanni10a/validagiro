import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SQLiteDraftRepository, type DraftRepository } from '../data/draftRepository';
import type { BarcodeFormat, BarcodeSource, IntakeDraft } from '../types';

interface IntakeContextValue {
  ready: boolean;
  current?: IntakeDraft;
  drafts: IntakeDraft[];
  begin(barcode: string, format: BarcodeFormat, source: BarcodeSource): Promise<IntakeDraft>;
  ensureDraft(barcode: string, format: BarcodeFormat, source: BarcodeSource): Promise<IntakeDraft>;
  patch(values: Partial<IntakeDraft>): Promise<IntakeDraft>;
  resume(draft: IntakeDraft): void;
  reload(): Promise<void>;
  saveDraft(draft: IntakeDraft): Promise<void>;
  remove(id: string): Promise<void>;
  clearCurrent(): void;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

export function IntakeProvider({
  children,
  repository,
  repositoryFactory = () => new SQLiteDraftRepository(),
}: React.PropsWithChildren<{ repository?: DraftRepository; repositoryFactory?: () => DraftRepository }>) {
  const repositoryRef = useRef<DraftRepository | null>(null);
  if (!repositoryRef.current) repositoryRef.current = repository ?? repositoryFactory();
  const stableRepository = repositoryRef.current;
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<IntakeDraft>();
  const currentRef = useRef<IntakeDraft | undefined>(undefined);
  const [drafts, setDrafts] = useState<IntakeDraft[]>([]);

  const reload = useCallback(async () => setDrafts(await stableRepository.list()), [stableRepository]);

  useEffect(() => {
    stableRepository.initialize().then(reload).finally(() => setReady(true));
  }, [reload, stableRepository]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' || !currentRef.current) return;
      const draft = { ...currentRef.current, updatedAt: new Date().toISOString() };
      currentRef.current = draft;
      void stableRepository.save(draft).then(reload);
    });
    return () => subscription.remove();
  }, [reload, stableRepository]);

  const begin = useCallback(async (
    barcode: string, barcodeFormat: BarcodeFormat, barcodeSource: BarcodeSource,
  ) => {
    const now = new Date().toISOString();
    const id = Crypto.randomUUID();
    const next: IntakeDraft = {
      id, clientRequestId: id, barcode, barcodeFormat, barcodeSource,
      status: 'DRAFT', questionnaireVersion: 1, createdAt: now, updatedAt: now,
    };
    currentRef.current = next;
    setCurrent(next);
    await stableRepository.save(next);
    await reload();
    return next;
  }, [reload, stableRepository]);

  const ensureDraft = useCallback(async (
    barcode: string, format: BarcodeFormat, source: BarcodeSource,
  ) => {
    const active = currentRef.current;
    if (active && active.barcode === barcode && active.barcodeFormat === format && active.status !== 'SENT') return active;
    return begin(barcode, format, source);
  }, [begin]);

  const patch = useCallback(async (values: Partial<IntakeDraft>) => {
    const active = currentRef.current;
    if (!active) throw new Error('Nenhum cadastro em andamento.');
    const next = { ...active, ...values, updatedAt: new Date().toISOString() };
    currentRef.current = next;
    setCurrent(next);
    await stableRepository.save(next);
    await reload();
    return next;
  }, [reload, stableRepository]);

  const saveDraft = useCallback(async (draft: IntakeDraft) => {
    await stableRepository.save(draft);
    if (currentRef.current?.id === draft.id) { currentRef.current = draft; setCurrent(draft); }
    await reload();
  }, [reload, stableRepository]);

  const remove = useCallback(async (id: string) => {
    await stableRepository.remove(id);
    if (currentRef.current?.id === id) { currentRef.current = undefined; setCurrent(undefined); }
    await reload();
  }, [reload, stableRepository]);

  const value = useMemo(() => ({
    ready, current, drafts, begin, ensureDraft, patch,
    resume: (draft: IntakeDraft) => { currentRef.current = draft; setCurrent(draft); },
    reload, saveDraft, remove, clearCurrent: () => { currentRef.current = undefined; setCurrent(undefined); },
  }), [begin, current, drafts, ensureDraft, patch, ready, reload, remove, saveDraft]);

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake() {
  const context = useContext(IntakeContext);
  if (!context) throw new Error('useIntake deve ser usado dentro de IntakeProvider.');
  return context;
}
