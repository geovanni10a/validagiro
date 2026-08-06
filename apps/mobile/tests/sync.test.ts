import { afterEach, describe, expect, it, vi } from 'vitest';
import { reconcileDraft } from '../src/data/sync';
import type { IntakeDraft } from '../src/types';

const draft: IntakeDraft = {
  id: 'draft-id', clientRequestId: 'client-request-id', barcode: '7891234567895',
  barcodeFormat: 'EAN_13', barcodeSource: 'CAMERA', status: 'PENDING', questionnaireVersion: 1,
  createdAt: '2026-08-06T21:10:00Z', updatedAt: '2026-08-06T21:10:00Z',
  productMode: 'EXISTING', existingProduct: { id: 'product-id', name: 'Leite', categoryId: 'category-id', unitOfMeasure: 'UNIT', salePrice: { amount: '6.49', currency: 'BRL' }, automaticPromotionEligible: false, version: 2 },
  batch: { expiryDate: '2026-08-30', batchNumber: '', quantity: '2', locationId: 'location-id', locationName: 'Geladeira', entryDate: '2026-08-06', unitCost: '', observation: '' },
};

afterEach(() => vi.unstubAllGlobals());

describe('reconciliação da fila', () => {
  it('consulta o estado e repete o envio com o mesmo clientRequestId', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      if (requests.length === 1) return new Response(JSON.stringify({ code: 'SYNC_SUBMISSION_NOT_FOUND' }), { status: 404 });
      return new Response(JSON.stringify({ status: 'COMPLETED', clientRequestId: draft.clientRequestId, submissionId: 'submission-id' }), { status: 201 });
    }));
    const saved: IntakeDraft[] = [];
    const result = await reconcileDraft(structuredClone(draft), async (value) => { saved.push(value); });
    expect(result).toBe('SENT');
    expect(requests[0]?.url).toContain('/v1/sync/submissions/client-request-id');
    expect(JSON.parse(String(requests[1]?.init?.body)).clientRequestId).toBe(draft.clientRequestId);
    expect(saved.at(-1)?.status).toBe('SENT');
  });

  it('preserva como pendente quando a sessão expirou', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Sessão expirada' }), { status: 401 })));
    const saved: IntakeDraft[] = [];
    expect(await reconcileDraft(structuredClone(draft), async (value) => { saved.push(value); })).toBe('SESSION_EXPIRED');
    expect(saved.at(-1)?.status).toBe('PENDING');
  });

  it('classifica 422 como NEEDS_REVIEW e não repete indefinidamente', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'SYNC_SUBMISSION_NOT_FOUND' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Revise os campos', fieldErrors: { 'batch.quantity': 'Quantidade inválida' } }), { status: 422 }));
    vi.stubGlobal('fetch', fetchMock);
    const saved: IntakeDraft[] = [];
    expect(await reconcileDraft(structuredClone(draft), async (value) => { saved.push(value); })).toBe('NEEDS_REVIEW');
    expect(saved.at(-1)?.status).toBe('NEEDS_REVIEW');
    expect(saved.at(-1)?.reviewReason).toBe('FIELD_ERRORS');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifica conflito de produto para continuação assistida', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'SYNC_SUBMISSION_NOT_FOUND' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'PRODUCT_CONFLICT', message: 'Produto já cadastrado' }), { status: 409 })));
    const saved: IntakeDraft[] = [];
    expect(await reconcileDraft(structuredClone(draft), async (value) => { saved.push(value); })).toBe('NEEDS_REVIEW');
    expect(saved.at(-1)?.reviewReason).toBe('PRODUCT_CONFLICT');
  });
});
