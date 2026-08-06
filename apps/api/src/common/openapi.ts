import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const errorSchema: SchemaObject = {
  type: 'object', required: ['error'], properties: { error: {
    type: 'object', required: ['code', 'message', 'retryable', 'correlationId'],
    properties: {
      code: { type: 'string', example: 'LOCATION_NOT_FOUND' }, message: { type: 'string' }, retryable: { type: 'boolean' },
      correlationId: { type: 'string', format: 'uuid' }, fields: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, code: { type: 'string' } } } },
    },
  } },
};

export const intakeRequestSchema: SchemaObject = {
  type: 'object', additionalProperties: false,
  required: ['clientRequestId', 'questionnaireVersion', 'device', 'barcode', 'product', 'batch'],
  properties: {
    clientRequestId: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$', description: 'UUID v4 imutável entre retries.' },
    questionnaireVersion: { type: 'integer', minimum: 1 },
    device: { type: 'object', additionalProperties: false, required: ['deviceId', 'appVersion', 'capturedAt'], properties: { deviceId: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' }, appVersion: { type: 'string', minLength: 1, maxLength: 32 }, capturedAt: { type: 'string', format: 'date-time' } } },
    barcode: { type: 'object', additionalProperties: false, required: ['value', 'format', 'source', 'confirmed'], properties: { value: { type: 'string', minLength: 4, maxLength: 64 }, format: { type: 'string', enum: ['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'INTERNAL'] }, source: { type: 'string', enum: ['CAMERA', 'MANUAL', 'HARDWARE_READER'] }, confirmed: { type: 'boolean', enum: [true] } } },
    product: { oneOf: [
      { type: 'object', additionalProperties: false, required: ['mode', 'id', 'observedVersion'], properties: { mode: { type: 'string', enum: ['EXISTING'] }, id: { type: 'string', format: 'uuid' }, observedVersion: { type: 'integer', minimum: 1 } } },
      { type: 'object', additionalProperties: false, required: ['mode', 'name', 'categoryId', 'unitOfMeasure', 'salePrice'], properties: {
        mode: { type: 'string', enum: ['CREATE'] }, name: { type: 'string', minLength: 2, maxLength: 160 }, brand: { type: 'string', minLength: 1, maxLength: 100, nullable: true }, categoryId: { type: 'string', format: 'uuid' }, unitOfMeasure: { type: 'string', enum: ['UNIT', 'KG', 'G', 'L', 'ML'] },
        packageContent: { type: 'object', additionalProperties: false, nullable: true, required: ['value', 'unit'], properties: { value: { type: 'string', pattern: '^\\d{1,15}(?:\\.\\d{1,3})?$' }, unit: { type: 'string', minLength: 1, maxLength: 16 } } },
        salePrice: { type: 'object', additionalProperties: false, required: ['amount', 'currency'], properties: { amount: { type: 'string', pattern: '^\\d{1,10}(?:\\.\\d{1,2})?$' }, currency: { type: 'string', enum: ['BRL'] } } }, automaticPromotionEligible: { type: 'boolean', default: false },
      } },
    ] },
    batch: { type: 'object', additionalProperties: false, required: ['expiryDate', 'quantity', 'locationId'], properties: {
      expiryDate: { type: 'string', format: 'date' }, entryDate: { type: 'string', format: 'date' }, batchNumber: { type: 'string', minLength: 1, maxLength: 80, nullable: true }, quantity: { type: 'string', pattern: '^\\d{1,15}(?:\\.\\d{1,3})?$' }, locationId: { type: 'string', format: 'uuid' },
      unitCost: { type: 'object', additionalProperties: false, nullable: true, required: ['amount', 'currency'], properties: { amount: { type: 'string', pattern: '^\\d{1,10}(?:\\.\\d{1,2})?$' }, currency: { type: 'string', enum: ['BRL'] } } }, observation: { type: 'string', minLength: 1, maxLength: 500, nullable: true },
      expiryBeforeEntryConfirmation: { type: 'object', additionalProperties: false, required: ['confirmed', 'reason'], properties: { confirmed: { type: 'boolean', enum: [true] }, reason: { type: 'string', minLength: 5, maxLength: 300 } } },
    } },
  },
};

export const intakeResponseSchema: SchemaObject = {
  type: 'object', required: ['submissionId', 'clientRequestId', 'status', 'product', 'batch', 'initialMovementId', 'completedAt'],
  properties: {
    submissionId: { type: 'string', format: 'uuid' }, clientRequestId: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['COMPLETED'] },
    product: { type: 'object', required: ['id', 'created', 'version'], properties: { id: { type: 'string', format: 'uuid' }, created: { type: 'boolean' }, version: { type: 'integer' } } },
    batch: { type: 'object', required: ['id', 'expiryDate', 'quantity', 'locationId'], properties: { id: { type: 'string', format: 'uuid' }, expiryDate: { type: 'string', format: 'date' }, quantity: { type: 'string' }, locationId: { type: 'string', format: 'uuid' } } },
    initialMovementId: { type: 'string', format: 'uuid' }, completedAt: { type: 'string', format: 'date-time' },
  },
};

export const productLookupResponseSchema: SchemaObject = {
  type: 'object', required: ['product', 'barcode'], properties: {
    product: { type: 'object', required: ['id', 'name', 'categoryId', 'unitOfMeasure', 'salePrice', 'automaticPromotionEligible', 'version'], properties: {
      id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, brand: { type: 'string', nullable: true }, categoryId: { type: 'string', format: 'uuid' },
      unitOfMeasure: { type: 'string', enum: ['UNIT', 'KG', 'G', 'L', 'ML'] }, packageContent: { type: 'object', nullable: true, required: ['value', 'unit'], properties: { value: { type: 'string' }, unit: { type: 'string' } } }, salePrice: { type: 'object', required: ['amount', 'currency'], properties: { amount: { type: 'string' }, currency: { type: 'string' } } }, automaticPromotionEligible: { type: 'boolean' }, version: { type: 'integer' },
    } },
    barcode: { type: 'object', required: ['rawValue', 'format', 'canonicalValue'], properties: { rawValue: { type: 'string' }, format: { type: 'string' }, canonicalValue: { type: 'string' } } },
  },
};

export const categoriesResponseSchema: SchemaObject = { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['id', 'name', 'active'], properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, active: { type: 'boolean' } } } } } };
export const locationsResponseSchema: SchemaObject = { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', required: ['id', 'code', 'name', 'active'], properties: { id: { type: 'string', format: 'uuid' }, code: { type: 'string' }, name: { type: 'string' }, active: { type: 'boolean' } } } } } };
export const questionnaireResponseSchema: SchemaObject = { type: 'object', required: ['code', 'version', 'schemaVersion', 'definition', 'checksum'], properties: { code: { type: 'string' }, version: { type: 'integer' }, schemaVersion: { type: 'integer' }, definition: {}, checksum: { type: 'string', minLength: 64, maxLength: 64 }, publishedAt: { type: 'string', format: 'date-time' }, supportedUntil: { type: 'string', format: 'date-time', nullable: true } } };
export const contextResponseSchema: SchemaObject = { type: 'object', required: ['user', 'companies'], properties: { user: { type: 'object', required: ['id', 'displayName'], properties: { id: { type: 'string', format: 'uuid' }, displayName: { type: 'string' } } }, companies: { type: 'array', items: { type: 'object', required: ['id', 'name', 'role', 'stores'], properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, role: { type: 'string', enum: ['COMPANY_ADMIN', 'STORE_MANAGER', 'STOCK_OPERATOR', 'VIEWER'] }, stores: { type: 'array', items: { type: 'object', required: ['id', 'name', 'timezone'], properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, timezone: { type: 'string' } } } } } } } } };
export const batchesResponseSchema: SchemaObject = { type: 'object', required: ['items', 'nextCursor'], properties: { items: { type: 'array', items: { type: 'object', required: ['id', 'product', 'batchNumber', 'expiryDate', 'daysRemaining', 'quantity', 'location', 'status', 'createdAt'], properties: { id: { type: 'string', format: 'uuid' }, product: { type: 'object', required: ['id', 'name', 'barcode'], properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, barcode: { type: 'string', nullable: true } } }, batchNumber: { type: 'string', nullable: true }, expiryDate: { type: 'string', format: 'date' }, daysRemaining: { type: 'integer' }, quantity: { type: 'string' }, location: { type: 'object', required: ['id', 'code', 'name'], properties: { id: { type: 'string', format: 'uuid' }, code: { type: 'string' }, name: { type: 'string' } } }, status: { type: 'string', enum: ['ACTIVE', 'DEPLETED', 'EXPIRED', 'DISCARDED'] }, createdAt: { type: 'string', format: 'date-time' } } } }, nextCursor: { type: 'string', nullable: true } } };
