import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({ randomUUID: () => 'client-id' }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));
vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => undefined }) },
}));

import { IntakeProvider, useIntake } from '../src/context/IntakeContext';
import type { DraftRepository } from '../src/data/draftRepository';
import type { IntakeDraft } from '../src/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class RecordingRepository implements DraftRepository {
  initializeCalls = 0;
  saveCalls = 0;
  drafts = new Map<string, IntakeDraft>();
  deviceId = '2bee39bc-d06b-4e53-9e1b-1f61eb187251';
  async initialize() { this.initializeCalls += 1; }
  async getOrCreateDeviceId() { return this.deviceId; }
  async save(draft: IntakeDraft) { this.saveCalls += 1; this.drafts.set(draft.id, draft); }
  async get(id: string) { return this.drafts.get(id) ?? null; }
  async list() { return [...this.drafts.values()]; }
  async remove(id: string) { this.drafts.delete(id); }
}

describe('IntakeProvider', () => {
  it('cria e inicializa uma única instância do repositório após rerender', async () => {
    const repository = new RecordingRepository();
    const factory = vi.fn(() => repository);
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<IntakeProvider repositoryFactory={factory}><></></IntakeProvider>);
    });
    await act(async () => {
      renderer.update(<IntakeProvider repositoryFactory={factory}><></></IntakeProvider>);
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(repository.initializeCalls).toBe(1);
    await act(async () => { renderer!.unmount(); });
  });

  it('reutiliza o draft e clientRequestId nas tentativas da mesma busca', async () => {
    const repository = new RecordingRepository();
    let context: ReturnType<typeof useIntake> | undefined;
    function CaptureContext() { context = useIntake(); return null; }
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<IntakeProvider repository={repository}><CaptureContext /></IntakeProvider>);
    });
    let first: IntakeDraft | undefined; let second: IntakeDraft | undefined;
    await act(async () => { first = await context!.ensureDraft('7891234567895', 'EAN_13', 'CAMERA'); });
    await act(async () => { second = await context!.ensureDraft('7891234567895', 'EAN_13', 'CAMERA'); });
    expect(second?.clientRequestId).toBe(first?.clientRequestId);
    expect(repository.saveCalls).toBe(1);
    await act(async () => { renderer!.unmount(); });
  });

  it('migra drafts legados e reutiliza o deviceId da instalação em novas coletas', async () => {
    const repository = new RecordingRepository();
    const legacy: IntakeDraft = {
      id: 'legacy-id', clientRequestId: '0d7026e9-df51-42e5-aa64-bdd5186b45e0',
      barcode: '12345678', barcodeFormat: 'EAN_8', barcodeSource: 'MANUAL',
      status: 'DRAFT', questionnaireVersion: 1,
      createdAt: '2026-08-06T12:00:00Z', updatedAt: '2026-08-06T12:00:00Z',
    };
    repository.drafts.set(legacy.id, legacy);
    let context: ReturnType<typeof useIntake> | undefined;
    function CaptureContext() { context = useIntake(); return null; }
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<IntakeProvider repository={repository}><CaptureContext /></IntakeProvider>);
    });
    expect(repository.drafts.get('legacy-id')?.deviceId).toBe(repository.deviceId);
    let first: IntakeDraft | undefined; let second: IntakeDraft | undefined;
    await act(async () => { first = await context!.begin('7891234567895', 'EAN_13', 'CAMERA'); });
    await act(async () => { second = await context!.begin('7891234567896', 'EAN_13', 'CAMERA'); });
    expect(first?.deviceId).toBe(repository.deviceId);
    expect(second?.deviceId).toBe(repository.deviceId);
    await act(async () => { renderer!.unmount(); });
  });
});
