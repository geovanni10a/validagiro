import type { Category, IntakeDraft, Location, ProductRecord } from '../types';
import { normalizeDecimal } from '../lib/format';
import { isUuidV4 } from '../lib/device';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const STORE_ID = process.env.EXPO_PUBLIC_STORE_ID;
let accessToken = process.env.EXPO_PUBLIC_ACCESS_TOKEN;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Record<string, string>,
    public details?: Record<string, unknown>,
  ) { super(message); }
}

export function setAccessToken(token?: string) { accessToken = token; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(STORE_ID ? { 'X-Store-Id': STORE_ID } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as {
      message?: string; code?: string; fieldErrors?: Record<string, string>;
      details?: Record<string, unknown>;
      error?: { message?: string; code?: string; fieldErrors?: Record<string, string>; details?: Record<string, unknown> };
    };
    const error = body.error ?? body;
    throw new ApiError(
      error.message ?? body.message ?? 'Não foi possível concluir a solicitação.',
      response.status, error.code, error.fieldErrors, error.details,
    );
  }
  return response.json() as Promise<T>;
}

export async function lookupProduct(barcode: string, format: string) {
  return request<{ product: ProductRecord }>(
    `/v1/products/lookup?barcode=${encodeURIComponent(barcode)}&format=${format}`,
  );
}

export async function getMeContext() {
  return request<{
    user: { id: string; displayName: string };
    companies: Array<{ id: string; name: string; role: string; stores: Array<{ id: string; name: string; timezone: string }> }>;
  }>('/v1/me/context');
}

export async function getCategories() {
  const response = await request<{ items?: Category[] } | Category[]>('/v1/categories?active=true');
  return Array.isArray(response) ? response : response.items ?? [];
}

export async function getLocations() {
  const response = await request<{ items?: Location[] } | Location[]>('/v1/locations?active=true');
  return Array.isArray(response) ? response : response.items ?? [];
}

export function buildSubmission(draft: IntakeDraft) {
  if (!draft.batch || !draft.productMode) throw new Error('Cadastro incompleto.');
  if (!isUuidV4(draft.deviceId)) throw new Error('Identificador da instalação ausente ou inválido.');
  const product = draft.productMode === 'EXISTING'
    ? {
        mode: 'EXISTING' as const,
        id: draft.existingProduct!.id,
        observedVersion: draft.existingProduct!.version,
      }
    : {
        mode: 'CREATE' as const,
        name: draft.product!.name.trim(),
        brand: draft.product!.brand.trim() || null,
        categoryId: draft.product!.categoryId,
        unitOfMeasure: draft.product!.unitOfMeasure,
        packageContent: draft.product!.packageContentValue
          ? { value: normalizeDecimal(draft.product!.packageContentValue), unit: draft.product!.packageContentUnit }
          : null,
        salePrice: { amount: normalizeDecimal(draft.product!.salePrice), currency: 'BRL' as const },
        automaticPromotionEligible: draft.product!.automaticPromotionEligible === 'true',
      };
  return {
    clientRequestId: draft.clientRequestId,
    questionnaireVersion: draft.questionnaireVersion,
    device: { deviceId: draft.deviceId, appVersion: '0.1.0', capturedAt: draft.createdAt },
    barcode: {
      value: draft.barcode, format: draft.barcodeFormat,
      source: draft.barcodeSource, confirmed: true,
    },
    product,
    batch: {
      expiryDate: draft.batch.expiryDate,
      batchNumber: draft.batch.batchNumber.trim() || null,
      quantity: draft.batch.quantity,
      locationId: draft.batch.locationId,
      entryDate: draft.batch.entryDate,
      unitCost: draft.batch.unitCost
        ? { amount: normalizeDecimal(draft.batch.unitCost), currency: 'BRL' as const }
        : null,
      observation: draft.batch.observation.trim() || null,
    },
  };
}

export async function submitDraft(draft: IntakeDraft) {
  return request<{ status: 'COMPLETED'; clientRequestId: string; submissionId: string }>(
    '/v1/intake-submissions', { method: 'POST', body: JSON.stringify(buildSubmission(draft)) },
  );
}

export async function getSyncStatus(clientRequestId: string) {
  return request<{ status: 'COMPLETED'; clientRequestId: string }>(
    `/v1/sync/submissions/${encodeURIComponent(clientRequestId)}`,
  );
}
