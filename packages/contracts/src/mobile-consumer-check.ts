// Compile-time smoke test for the generated surface consumed by a mobile API adapter.
import type { paths } from './generated-api.js';

type IntakeOperation = paths['/v1/intake-submissions']['post'];
export type GeneratedMobileIntakeRequest = IntakeOperation['requestBody']['content']['application/json'];
export type GeneratedMobileIntakeCreated = IntakeOperation['responses'][201]['content']['application/json'];
export type GeneratedMobileBatchPage = paths['/v1/batches']['get']['responses'][200]['content']['application/json'];

export function acceptsGeneratedMobileContract(
  request: GeneratedMobileIntakeRequest,
  response: GeneratedMobileIntakeCreated,
): readonly [GeneratedMobileIntakeRequest, GeneratedMobileIntakeCreated] {
  return [request, response] as const;
}
