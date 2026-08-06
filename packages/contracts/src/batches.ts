import { z } from 'zod';
import { civilDateSchema } from './shared.js';

export const BatchStatusSchema = z.enum(['ACTIVE', 'DEPLETED', 'EXPIRED', 'DISCARDED']);
export const BatchListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  productId: z.uuid().optional(),
  expiryFrom: civilDateSchema.optional(),
  expiryTo: civilDateSchema.optional(),
  locationId: z.uuid().optional(),
  status: BatchStatusSchema.optional(),
}).strict();
export type BatchListQuery = z.infer<typeof BatchListQuerySchema>;

export interface BatchListResponse {
  items: Array<{
    id: string;
    product: { id: string; name: string; barcode: string | null };
    batchNumber: string | null;
    expiryDate: string;
    daysRemaining: number;
    quantity: string;
    location: { id: string; code: string; name: string };
    status: z.infer<typeof BatchStatusSchema>;
    createdAt: string;
  }>;
  nextCursor: string | null;
}
