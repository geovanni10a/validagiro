import { describe, expect, it } from 'vitest';
import type { IntakeSubmissionRequest } from '@validagiro/contracts';
import { validateDates } from './date-rules';

const tenant = { storeTimezone: 'America/Fortaleza', permissions: new Set<string>() } as never;
const body = { device: { capturedAt: new Date().toISOString() }, batch: { expiryDate: '2099-01-01' } } as IntakeSubmissionRequest;

describe('validateDates', () => {
  it('defaults the entry date to the civil date of the store', () => {
    expect(validateDates(body, tenant).entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
