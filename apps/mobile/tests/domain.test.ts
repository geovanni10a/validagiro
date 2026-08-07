import { describe, expect, it } from 'vitest';
import { buildSubmission } from '../src/data/api';
import { cameraTypeToFormat, inferBarcodeFormat, isSupportedBarcode, sanitizeBarcode } from '../src/lib/barcode';
import { batchSchema, productSchema } from '../src/lib/validation';
import { storeToday } from '../src/lib/format';
import type { IntakeDraft } from '../src/types';

const baseDraft: IntakeDraft = {
  id: '0d7026e9-df51-42e5-aa64-bdd5186b45e0',
  clientRequestId: '0d7026e9-df51-42e5-aa64-bdd5186b45e0',
  deviceId: '2bee39bc-d06b-4e53-9e1b-1f61eb187251',
  barcode: '7891234567895', barcodeFormat: 'EAN_13', barcodeSource: 'CAMERA', status: 'PENDING',
  questionnaireVersion: 1, productMode: 'CREATE', createdAt: '2026-08-06T21:10:00Z', updatedAt: '2026-08-06T21:10:00Z',
  product: { name: 'Leite integral', brand: 'Marca', categoryId: 'category-id', categoryName: 'Leites', unitOfMeasure: 'UNIT', packageContentValue: '1,000', packageContentUnit: 'L', salePrice: '6,49', automaticPromotionEligible: 'false' },
  batch: { expiryDate: '2026-08-30', batchNumber: 'L2408A', quantity: '12', locationId: 'location-id', locationName: 'Geladeira 1', entryDate: '2026-08-06', unitCost: '4,20', observation: '' },
};

describe('código de barras', () => {
  it('remove separadores sem remover zeros iniciais', () => expect(sanitizeBarcode(' 00 1234-5678 ')).toBe('0012345678'));
  it('aceita apenas 8 a 14 dígitos', () => { expect(isSupportedBarcode('12345678')).toBe(true); expect(isSupportedBarcode('1234567')).toBe(false); });
  it('mapeia formatos da câmera e entrada manual', () => { expect(cameraTypeToFormat('upc_a', '123456789012')).toBe('UPC_A'); expect(inferBarcodeFormat('1234567890123')).toBe('EAN_13'); });
});

describe('validação do questionário', () => {
  it('rejeita produto sem categoria e preço', () => {
    const result = productSchema.safeParse({ ...baseDraft.product, categoryId: '', salePrice: '0' });
    expect(result.success).toBe(false);
  });
  it('rejeita validade anterior à entrada e quantidade zero', () => {
    const result = batchSchema.safeParse({ ...baseDraft.batch, expiryDate: '2026-08-01', quantity: '0' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toContain('A validade é anterior à data de entrada.');
  });
});

describe('data civil da loja', () => {
  it('usa o fuso da loja mesmo quando a data UTC já virou', () => {
    expect(storeToday('America/Fortaleza', new Date('2026-08-07T01:30:00Z'))).toBe('2026-08-06');
  });
});

describe('envio idempotente', () => {
  it('preserva clientRequestId e separa produto de lote', () => {
    const payload = buildSubmission(baseDraft);
    expect(payload.clientRequestId).toBe(baseDraft.clientRequestId);
    expect(payload.device.deviceId).toBe(baseDraft.deviceId);
    expect(payload.product.mode).toBe('CREATE');
    expect(payload.batch.locationId).toBe('location-id');
    expect(payload.product.mode).toBe('CREATE');
    if (payload.product.mode === 'CREATE') expect(payload.product.salePrice.amount).toBe('6.49');
  });
  it('usa referência somente leitura para produto existente', () => {
    const draft: IntakeDraft = { ...baseDraft, product: undefined, productMode: 'EXISTING', existingProduct: { id: 'product-id', name: 'Produto', categoryId: 'category-id', unitOfMeasure: 'UNIT', salePrice: { amount: '5.00', currency: 'BRL' }, automaticPromotionEligible: false, version: 3 } };
    expect(buildSubmission(draft).product).toEqual({ mode: 'EXISTING', id: 'product-id', observedVersion: 3 });
  });
  it('recusa envio sem deviceId UUID v4 após a janela de migração', () => {
    expect(() => buildSubmission({ ...baseDraft, deviceId: undefined })).toThrow('Identificador da instalação');
    expect(() => buildSubmission({ ...baseDraft, deviceId: 'expo-device' })).toThrow('Identificador da instalação');
  });
});
