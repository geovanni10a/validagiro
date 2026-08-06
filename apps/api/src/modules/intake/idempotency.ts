import { createHash } from 'node:crypto';

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(',')}}`;
}

export function requestHash(companyId: string, storeId: string, body: Record<string, unknown>): string {
  const { clientRequestId: _omitted, ...semanticBody } = body;
  return createHash('sha256').update(canonicalize({ method: 'POST', route: '/v1/intake-submissions', companyId, storeId, body: semanticBody })).digest('hex');
}
