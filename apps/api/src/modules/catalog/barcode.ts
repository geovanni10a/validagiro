import type { BarcodeFormat } from '@validagiro/contracts';
import { DomainError } from '../../common/domain-error';

function validCheckDigit(value: string): boolean {
  const digits = [...value].map(Number);
  const supplied = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === supplied;
}

function expandUpce(value: string): string {
  if (!/^\d{8}$/.test(value) || !['0', '1'].includes(value[0])) throw new DomainError(422, 'INVALID_BARCODE', 'Código UPC-E inválido.');
  const ns = value[0];
  const body = value.slice(1, 7);
  const check = value[7];
  const last = body[5];
  let manufacturer: string;
  let product: string;
  if (['0', '1', '2'].includes(last)) { manufacturer = body.slice(0, 2) + last + '00'; product = '00' + body.slice(2, 5); }
  else if (last === '3') { manufacturer = body.slice(0, 3) + '00'; product = '000' + body.slice(3, 5); }
  else if (last === '4') { manufacturer = body.slice(0, 4) + '0'; product = '0000' + body[4]; }
  else { manufacturer = body.slice(0, 5); product = '0000' + last; }
  return `${ns}${manufacturer}${product}${check}`;
}

export interface NormalizedBarcode { rawValue: string; canonicalValue: string; format: BarcodeFormat }

export function normalizeBarcode(raw: string, format: BarcodeFormat): NormalizedBarcode {
  const value = raw.normalize('NFKC').trim();
  if (format === 'INTERNAL') {
    if (value.length < 4 || value.length > 64) throw new DomainError(422, 'INVALID_BARCODE', 'Código interno inválido.');
    return { rawValue: raw, canonicalValue: value, format };
  }
  const expected: Record<Exclude<BarcodeFormat, 'INTERNAL' | 'UPC_E'>, number> = { EAN_8: 8, EAN_13: 13, UPC_A: 12 };
  const expanded = format === 'UPC_E' ? expandUpce(value) : value;
  const length = format === 'UPC_E' ? 12 : expected[format];
  if (!new RegExp(`^\\d{${length}}$`).test(expanded) || !validCheckDigit(expanded)) {
    throw new DomainError(422, 'INVALID_BARCODE', 'Código de barras ou dígito verificador inválido.');
  }
  return { rawValue: raw, canonicalValue: expanded.padStart(14, '0'), format };
}
