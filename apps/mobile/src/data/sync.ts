import { ApiError, getSyncStatus, submitDraft } from './api';
import type { IntakeDraft } from '../types';

export async function reconcileDraft(
  draft: IntakeDraft,
  save: (draft: IntakeDraft) => Promise<void>,
): Promise<'SENT' | 'PENDING' | 'NEEDS_REVIEW' | 'ERROR' | 'SESSION_EXPIRED'> {
  const update = async (values: Partial<IntakeDraft>) => {
    const next = { ...draft, ...values, updatedAt: new Date().toISOString() };
    draft = next;
    await save(next);
  };
  await update({ status: 'SYNCING', errorMessage: undefined });
  try {
    try {
      const status = await getSyncStatus(draft.clientRequestId);
      if (status.status === 'COMPLETED') { await update({ status: 'SENT' }); return 'SENT'; }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
    await submitDraft(draft);
    await update({ status: 'SENT', errorMessage: undefined, serverFieldErrors: undefined });
    return 'SENT';
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await update({ status: 'PENDING', errorMessage: 'Sua sessão expirou. Entre novamente para enviar.' });
      return 'SESSION_EXPIRED';
    }
    if (error instanceof ApiError && (error.status === 422 || error.status === 409 || error.fieldErrors)) {
      const productConflict = error.status === 409
        && ['BARCODE_ALREADY_REGISTERED', 'PRODUCT_CONFLICT', 'PRODUCT_ALREADY_EXISTS'].includes(error.code ?? '');
      await update({
        status: 'NEEDS_REVIEW', errorMessage: error.message, serverFieldErrors: error.fieldErrors,
        reviewReason: productConflict ? 'PRODUCT_CONFLICT' : error.fieldErrors ? 'FIELD_ERRORS' : 'CONFLICT',
      });
      return 'NEEDS_REVIEW';
    }
    if (error instanceof ApiError && error.status < 500) {
      await update({ status: 'ERROR', errorMessage: error.message }); return 'ERROR';
    }
    await update({ status: 'PENDING', errorMessage: undefined });
    return 'PENDING';
  }
}
