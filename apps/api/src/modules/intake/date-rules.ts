import { DateTime } from 'luxon';
import { DomainError } from '../../common/domain-error';
import type { TenantContext } from '../../common/types';
import type { IntakeSubmissionRequest } from '@validagiro/contracts';

export function validateDates(body: IntakeSubmissionRequest, tenant: TenantContext): { entryDate: string; expiryDate: string } {
  const now = DateTime.now().setZone(tenant.storeTimezone);
  if (!now.isValid) throw new DomainError(500, 'STORE_TIMEZONE_INVALID', 'Fuso da loja inválido.');
  const capturedAt = DateTime.fromISO(body.device.capturedAt, { setZone: true });
  if (!capturedAt.isValid || capturedAt > DateTime.now().plus({ minutes: 5 }) || capturedAt < DateTime.now().minus({ days: 90 })) {
    throw new DomainError(422, 'INVALID_CAPTURED_AT', 'Data da coleta fora da janela permitida.', [{ path: 'device.capturedAt', code: 'OUT_OF_RANGE' }]);
  }
  const today = now.toISODate()!;
  const entryDate = body.batch.entryDate ?? today;
  const expiry = DateTime.fromISO(body.batch.expiryDate, { zone: tenant.storeTimezone });
  const entry = DateTime.fromISO(entryDate, { zone: tenant.storeTimezone });
  if (!expiry.isValid || !entry.isValid || expiry.toISODate() !== body.batch.expiryDate || entry.toISODate() !== entryDate) {
    throw new DomainError(422, 'INVALID_DATE', 'Data civil inválida.');
  }
  if (entryDate !== today && !tenant.permissions.has('batch:override-entry-date')) {
    throw new DomainError(403, 'ENTRY_DATE_OVERRIDE_FORBIDDEN', 'Sem permissão para alterar a data de entrada.');
  }
  if (body.batch.expiryDate < entryDate) {
    if (!body.batch.expiryBeforeEntryConfirmation?.confirmed || !tenant.permissions.has('batch:override-expiry-before-entry')) {
      throw new DomainError(422, 'EXPIRY_BEFORE_ENTRY', 'Validade anterior à entrada exige confirmação e permissão.');
    }
  }
  return { entryDate, expiryDate: body.batch.expiryDate };
}
