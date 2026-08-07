import { batchSchema, productSchema } from './validation';
import type { BatchFormData, IntakeDraft } from '../types';

export type ResumeTarget = 'Lookup' | 'ProductForm' | 'BatchForm' | 'Review' | 'ProductConflict';

export function getResumeTarget(draft: IntakeDraft): ResumeTarget {
  if (draft.status === 'NEEDS_REVIEW' && draft.reviewReason === 'PRODUCT_CONFLICT') return 'ProductConflict';
  if (!draft.productMode) return 'Lookup';
  if (draft.productMode === 'EXISTING' && !draft.existingProduct) return 'Lookup';
  if (draft.productMode === 'CREATE') {
    const productErrors = Boolean(firstStageFieldError(draft.serverFieldErrors, 'product'));
    if (productErrors || !draft.product || !productSchema.safeParse(draft.product).success) return 'ProductForm';
  }
  const batchErrors = Boolean(firstStageFieldError(draft.serverFieldErrors, 'batch'));
  if (batchErrors || !draft.batch || !batchSchema.safeParse(draft.batch).success) return 'BatchForm';
  return 'Review';
}

export function clearStageFieldErrors(
  errors: Record<string, string> | undefined,
  stage: 'product' | 'batch',
): Record<string, string> | undefined {
  if (!errors) return undefined;
  const remaining = Object.fromEntries(Object.entries(errors).filter(([key]) => {
    if (key.startsWith(`${stage}.`)) return false;
    const unscopedProduct = ['name', 'brand', 'categoryId', 'unitOfMeasure', 'salePrice', 'automaticPromotionEligible'];
    const unscopedBatch = ['expiryDate', 'batchNumber', 'quantity', 'locationId', 'entryDate', 'unitCost', 'observation'];
    return !(stage === 'product' ? unscopedProduct : unscopedBatch).includes(key);
  }));
  return Object.keys(remaining).length ? remaining : undefined;
}

export function firstStageFieldError(
  errors: Record<string, string> | undefined,
  stage: 'product' | 'batch',
): string | undefined {
  if (!errors) return undefined;
  const known = stage === 'product'
    ? ['name', 'brand', 'categoryId', 'unitOfMeasure', 'packageContentValue', 'packageContentUnit', 'salePrice', 'automaticPromotionEligible']
    : ['expiryDate', 'batchNumber', 'quantity', 'locationId', 'entryDate', 'unitCost', 'observation'];
  for (const key of Object.keys(errors)) {
    const normalized = key.replace(`${stage}.`, '').replace('.amount', '')
      .replace('packageContent.value', 'packageContentValue')
      .replace('packageContent.unit', 'packageContentUnit');
    if (known.includes(normalized)) return normalized;
  }
  return undefined;
}

export function restoreBatchSnapshot(snapshot: BatchFormData | undefined): Pick<IntakeDraft, 'batch' | 'status'> {
  return { batch: snapshot ? { ...snapshot } : undefined, status: 'DRAFT' };
}

export function isUnresolvedConflict(draft: IntakeDraft): boolean {
  return draft.status === 'NEEDS_REVIEW' && draft.reviewReason === 'CONFLICT';
}

export function prepareConflictRecovery(clientRequestId: string): Partial<IntakeDraft> {
  return {
    clientRequestId, status: 'DRAFT', reviewReason: undefined,
    errorMessage: undefined, serverFieldErrors: undefined,
  };
}
