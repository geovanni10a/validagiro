import { z } from 'zod';
import { BarcodeFormatSchema, civilDateSchema, decimalQuantitySchema, moneySchema, UnitOfMeasureSchema, uuidV4Schema } from './shared.js';

const existingProductSchema = z.object({
  mode: z.literal('EXISTING'),
  id: z.uuid(),
  observedVersion: z.number().int().positive(),
}).strict();

const createProductSchema = z.object({
  mode: z.literal('CREATE'),
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().min(1).max(100).nullable().optional(),
  categoryId: z.uuid(),
  unitOfMeasure: UnitOfMeasureSchema,
  packageContent: z.object({ value: decimalQuantitySchema, unit: z.string().trim().min(1).max(16) }).strict().nullable().optional(),
  salePrice: moneySchema,
  automaticPromotionEligible: z.boolean().default(false),
}).strict();

export const IntakeSubmissionSchema = z.object({
  clientRequestId: uuidV4Schema,
  questionnaireVersion: z.number().int().positive(),
  device: z.object({
    deviceId: uuidV4Schema,
    appVersion: z.string().trim().min(1).max(32),
    capturedAt: z.iso.datetime({ offset: true }),
  }).strict(),
  barcode: z.object({
    value: z.string().trim().min(4).max(64),
    format: BarcodeFormatSchema,
    source: z.enum(['CAMERA', 'MANUAL', 'HARDWARE_READER']),
    confirmed: z.literal(true),
  }).strict(),
  product: z.discriminatedUnion('mode', [existingProductSchema, createProductSchema]),
  batch: z.object({
    expiryDate: civilDateSchema,
    batchNumber: z.string().trim().min(1).max(80).nullable().optional(),
    quantity: decimalQuantitySchema,
    locationId: z.uuid(),
    entryDate: civilDateSchema.optional(),
    unitCost: moneySchema.nullable().optional(),
    observation: z.string().trim().min(1).max(500).nullable().optional(),
    expiryBeforeEntryConfirmation: z.object({
      confirmed: z.literal(true),
      reason: z.string().trim().min(5).max(300),
    }).strict().optional(),
  }).strict(),
}).strict();

export type IntakeSubmissionRequest = z.infer<typeof IntakeSubmissionSchema>;

export interface IntakeSubmissionResponse {
  submissionId: string;
  clientRequestId: string;
  status: 'COMPLETED';
  product: { id: string; created: boolean; version: number };
  batch: { id: string; expiryDate: string; quantity: string; locationId: string };
  initialMovementId: string;
  completedAt: string;
}
