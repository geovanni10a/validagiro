import type { BarcodeFormat } from '../types';

export function sanitizeBarcode(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function inferBarcodeFormat(value: string): BarcodeFormat {
  if (value.length === 8) return 'EAN_8';
  if (value.length === 12) return 'UPC_A';
  if (value.length === 13) return 'EAN_13';
  return 'INTERNAL';
}

export function isSupportedBarcode(value: string): boolean {
  return /^\d{8,14}$/.test(value);
}

export function cameraTypeToFormat(type: string, value: string): BarcodeFormat {
  const formats: Record<string, BarcodeFormat> = {
    ean8: 'EAN_8',
    ean13: 'EAN_13',
    upc_a: 'UPC_A',
    upc_e: 'UPC_E',
  };
  return formats[type] ?? inferBarcodeFormat(value);
}
