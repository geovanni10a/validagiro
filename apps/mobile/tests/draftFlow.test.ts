import { describe, expect, it } from 'vitest';
import { clearStageFieldErrors, firstStageFieldError, getResumeTarget, isUnresolvedConflict, prepareConflictRecovery, restoreBatchSnapshot } from '../src/lib/draftFlow';
import type { IntakeDraft } from '../src/types';

const complete: IntakeDraft = {
  id: 'id', clientRequestId: 'request-id', barcode: '7891234567895', barcodeFormat: 'EAN_13', barcodeSource: 'CAMERA', status: 'DRAFT', questionnaireVersion: 1,
  createdAt: '2026-08-06T12:00:00Z', updatedAt: '2026-08-06T12:00:00Z', productMode: 'EXISTING',
  existingProduct: { id: 'product-id', name: 'Leite', categoryId: 'cat', unitOfMeasure: 'UNIT', salePrice: { amount: '5.00', currency: 'BRL' }, automaticPromotionEligible: false, version: 1 },
  batch: { expiryDate: '2026-08-30', batchNumber: '', quantity: '2', locationId: 'loc', locationName: 'Geladeira', entryDate: '2026-08-06', unitCost: '', observation: '' },
};

describe('retomada de rascunhos', () => {
  it('só abre revisão quando o lote persistido está completo e válido', () => {
    expect(getResumeTarget(complete)).toBe('Review');
    expect(getResumeTarget({ ...complete, batch: { ...complete.batch!, quantity: '0' } })).toBe('BatchForm');
  });

  it('direciona conflito persistido sem iniciar retry', () => {
    expect(getResumeTarget({ ...complete, status: 'NEEDS_REVIEW', reviewReason: 'PRODUCT_CONFLICT' })).toBe('ProductConflict');
  });

  it('restaura o snapshot do lote sem apagar o produto', () => {
    const snapshot = { ...complete.batch!, quantity: '1' };
    const restored = { ...complete, ...restoreBatchSnapshot(snapshot) };
    expect(restored.existingProduct?.id).toBe('product-id');
    expect(restored.batch?.quantity).toBe('1');
  });
});

describe('recuperação de erros de campo', () => {
  it('mantém erros da outra etapa e encontra o primeiro erro servidor', () => {
    const errors = { 'product.name': 'Nome inválido', 'batch.quantity': 'Quantidade inválida' };
    expect(clearStageFieldErrors(errors, 'product')).toEqual({ 'batch.quantity': 'Quantidade inválida' });
    expect(firstStageFieldError(errors, 'batch')).toBe('quantity');
  });

  it('mapeia packageContent.unit para o grupo segmentado focável', () => {
    expect(firstStageFieldError({ 'product.packageContent.unit': 'Selecione a unidade' }, 'product')).toBe('packageContentUnit');
  });
});

describe('recuperação de conflito', () => {
  it('mantém o conflito bloqueado até preparar uma chave nova', () => {
    const conflicted = { ...complete, status: 'NEEDS_REVIEW' as const, reviewReason: 'CONFLICT' as const, errorMessage: 'Chave reutilizada' };
    expect(isUnresolvedConflict(conflicted)).toBe(true);
    const recovered = { ...conflicted, ...prepareConflictRecovery('new-client-id') };
    expect(recovered.clientRequestId).toBe('new-client-id');
    expect(recovered.status).toBe('DRAFT');
    expect(recovered.errorMessage).toBeUndefined();
    expect(isUnresolvedConflict(recovered)).toBe(false);
  });
});
