import { z } from 'zod';

export const BarcodeFormatSchema = z.enum(['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'INTERNAL']);
export type BarcodeFormat = z.infer<typeof BarcodeFormatSchema>;

export const CurrencySchema = z.literal('BRL');
export const UnitOfMeasureSchema = z.enum(['UNIT', 'KG', 'G', 'L', 'ML']);

export const moneySchema = z.object({
  amount: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  currency: CurrencySchema,
}).strict();

export const decimalQuantitySchema = z.string().regex(/^\d{1,15}(?:\.\d{1,3})?$/);
export const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuidV4Schema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'UUID v4 esperado');

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Array<{ path: string; code: string }>;
    retryable: boolean;
    correlationId: string;
  };
}
