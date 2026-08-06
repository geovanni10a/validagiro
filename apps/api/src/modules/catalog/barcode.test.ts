import { describe, expect, it } from 'vitest';
import { normalizeBarcode } from './barcode';

describe('normalizeBarcode', () => {
  it('canonicalizes EAN-13 as GTIN-14', () => {
    expect(normalizeBarcode('7894900011517', 'EAN_13').canonicalValue).toBe('07894900011517');
  });
  it('preserves case for internal identifiers', () => {
    expect(normalizeBarcode(' AbCd ', 'INTERNAL').canonicalValue).toBe('AbCd');
  });
  it('rejects a bad check digit', () => {
    expect(() => normalizeBarcode('7894900011518', 'EAN_13')).toThrow('dígito');
  });
});
