import { describe, expect, it } from 'vitest';
import { IntakeSubmissionSchema } from './intake.js';
import { uuidV4Schema } from './shared.js';

describe('IntakeSubmissionSchema', () => {
  it('rejects unknown fields and an unconfirmed barcode', () => {
    const result = IntakeSubmissionSchema.safeParse({ clientRequestId: crypto.randomUUID(), unexpected: true });
    expect(result.success).toBe(false);
  });

  it('requires UUID v4 for offline idempotency and device identity', () => {
    expect(uuidV4Schema.safeParse('0d7026e9-df51-42e5-aa64-bdd5186b45e0').success).toBe(true);
    expect(uuidV4Schema.safeParse('0d7026e9-df51-12e5-aa64-bdd5186b45e0').success).toBe(false);
  });

  it('rejects optional text containing only whitespace', () => {
    const result = IntakeSubmissionSchema.safeParse({
      clientRequestId: '0d7026e9-df51-42e5-aa64-bdd5186b45e0', questionnaireVersion: 1,
      device: { deviceId: '2bee39bc-d06b-4e53-9e1b-1f61eb187251', appVersion: '1.0.0', capturedAt: '2026-08-06T21:10:00Z' },
      barcode: { value: 'TEST-001', format: 'INTERNAL', source: 'MANUAL', confirmed: true },
      product: { mode: 'EXISTING', id: '41d93f28-1873-43c8-ac21-34f270c07994', observedVersion: 1 },
      batch: { expiryDate: '2026-08-30', quantity: '1', locationId: '95e57fca-e018-4b67-b5bb-9d68f3b16663', batchNumber: '   ' },
    });
    expect(result.success).toBe(false);
  });
});
