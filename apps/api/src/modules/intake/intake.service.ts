import { Injectable } from '@nestjs/common';
import { Prisma, type IntakeSubmission } from '@prisma/client';
import type { IntakeSubmissionRequest, IntakeSubmissionResponse } from '@validagiro/contracts';
import { DomainError } from '../../common/domain-error';
import { PrismaService } from '../../common/prisma.service';
import { setTenantContext, withTenant, type TransactionClient } from '../../common/tenant-transaction';
import type { TenantContext } from '../../common/types';
import { normalizeBarcode } from '../catalog/barcode';
import { validateDates } from './date-rules';
import { requestHash } from './idempotency';

export interface SubmissionResult { body: IntakeSubmissionResponse; replayed: boolean; httpStatus: 200 | 201 }
interface IdempotencyMetadata { actor_user_id: string; store_id: string; request_hash: string; submission_status: 'PROCESSING' | 'COMPLETED' }

@Injectable()
export class IntakeService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompleted(clientRequestId: string, tenant: TenantContext): Promise<IntakeSubmissionResponse> {
    if (!tenant.permissions.has('sync:read')) throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para consultar sincronização.');
    const submission = await this.findSubmission(tenant, clientRequestId);
    if (!submission || submission.storeId !== tenant.storeId) throw new DomainError(404, 'SYNC_SUBMISSION_NOT_FOUND', 'Coleta sincronizada não encontrada.');
    if (submission.actorUserId !== tenant.userId && !tenant.permissions.has('sync:read:any')) {
      throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para consultar a coleta de outro usuário.');
    }
    if (submission.status !== 'COMPLETED' || !submission.responseSnapshot) {
      throw new DomainError(404, 'SYNC_SUBMISSION_NOT_FOUND', 'Coleta sincronizada não encontrada.');
    }
    return submission.responseSnapshot as unknown as IntakeSubmissionResponse;
  }

  async submit(body: IntakeSubmissionRequest, tenant: TenantContext, correlationId: string): Promise<SubmissionResult> {
    if (!tenant.permissions.has('batch:create')) throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para criar lotes.');
    const hash = requestHash(tenant.companyId, tenant.storeId, body as unknown as Record<string, unknown>);
    const prior = await this.findSubmission(tenant, body.clientRequestId);
    if (prior) return this.replay(prior, tenant, hash);
    const companyCollision = await this.findIdempotencyMetadata(tenant, body.clientRequestId);
    if (companyCollision) this.throwIdempotencyCollision(companyCollision, tenant, hash);

    const normalized = normalizeBarcode(body.barcode.value, body.barcode.format);
    const dates = validateDates(body, tenant);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
      const response = await this.prisma.$transaction(async (tx) => {
        await setTenantContext(tx, tenant);
        const questionnaire = await tx.questionnaireVersion.findUnique({
          where: { code_version: { code: 'PRODUCT_INTAKE', version: body.questionnaireVersion } },
        });
        if (!questionnaire || questionnaire.status !== 'PUBLISHED' || (questionnaire.supportedUntil && questionnaire.supportedUntil <= new Date())) {
          throw new DomainError(409, 'QUESTIONNAIRE_VERSION_UNSUPPORTED', 'Versão do questionário não suportada.');
        }
        const location = await tx.location.findFirst({ where: { id: body.batch.locationId, companyId: tenant.companyId, storeId: tenant.storeId, active: true } });
        if (!location) throw new DomainError(404, 'LOCATION_NOT_FOUND', 'Localização não encontrada.', [{ path: 'batch.locationId', code: 'INVALID_REFERENCE' }]);

        const submission = await tx.intakeSubmission.create({ data: {
          companyId: tenant.companyId, storeId: tenant.storeId, actorUserId: tenant.userId,
          questionnaireVersionId: questionnaire.id, clientRequestId: body.clientRequestId,
          requestHash: hash, status: 'PROCESSING', deviceId: body.device.deviceId,
          deviceAppVersion: body.device.appVersion, capturedAt: new Date(body.device.capturedAt),
        } });
        const product = await this.resolveProduct(tx, body, tenant, normalized);
        const quantity = new Prisma.Decimal(body.batch.quantity);
        if (quantity.lte(0) || (product.unitOfMeasure === 'UNIT' && !quantity.isInteger())) {
          throw new DomainError(422, 'INVALID_QUANTITY', 'Quantidade incompatível com a unidade do produto.', [{ path: 'batch.quantity', code: 'INVALID_QUANTITY' }]);
        }
        const batch = await tx.batch.create({ data: {
          companyId: tenant.companyId, storeId: tenant.storeId, productId: product.id, locationId: location.id,
          batchNumber: body.batch.batchNumber ?? null,
          normalizedBatchNumber: body.batch.batchNumber?.normalize('NFKC').trim().toUpperCase() || null,
          expiryDate: new Date(`${dates.expiryDate}T00:00:00.000Z`), entryDate: new Date(`${dates.entryDate}T00:00:00.000Z`),
          receivedQuantity: quantity, currentQuantity: quantity,
          unitCost: body.batch.unitCost ? new Prisma.Decimal(body.batch.unitCost.amount) : null,
          currency: body.batch.unitCost?.currency ?? null, observation: body.batch.observation ?? null,
        } });
        const movement = await tx.stockMovement.create({ data: {
          companyId: tenant.companyId, storeId: tenant.storeId, batchId: batch.id, type: 'INTAKE',
          quantityDelta: quantity, balanceAfter: quantity, submissionId: submission.id, actorUserId: tenant.userId,
        } });
        await tx.intakeAnswer.createMany({ data: this.answers(body, submission.id, tenant.companyId) });
        const completedAt = new Date();
        const result: IntakeSubmissionResponse = {
          submissionId: submission.id, clientRequestId: body.clientRequestId, status: 'COMPLETED',
          product: { id: product.id, created: body.product.mode === 'CREATE', version: product.version },
          batch: { id: batch.id, expiryDate: dates.expiryDate, quantity: quantity.toFixed(3), locationId: location.id },
          initialMovementId: movement.id, completedAt: completedAt.toISOString(),
        };
        await tx.intakeSubmission.update({ where: { id: submission.id }, data: {
          status: 'COMPLETED', completedAt, productId: product.id, batchId: batch.id,
          initialMovementId: movement.id, responseSnapshot: result as unknown as Prisma.InputJsonValue,
        } });
        await tx.auditEvent.createMany({ data: [
          ...(body.product.mode === 'CREATE' ? [this.audit(tenant, correlationId, body.clientRequestId, 'PRODUCT_CREATED', 'Product', product.id, { id: product.id, name: product.name })] : []),
          this.audit(tenant, correlationId, body.clientRequestId, 'BATCH_CREATED', 'Batch', batch.id, { id: batch.id, productId: product.id, quantity: quantity.toFixed(3) }),
          this.audit(tenant, correlationId, body.clientRequestId, 'STOCK_MOVEMENT_CREATED', 'StockMovement', movement.id, { id: movement.id, batchId: batch.id, quantityDelta: quantity.toFixed(3) }),
          this.audit(tenant, correlationId, body.clientRequestId, 'INTAKE_SUBMISSION_COMPLETED', 'IntakeSubmission', submission.id, { id: submission.id, status: 'COMPLETED' }),
        ] });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
      return { body: response, replayed: false, httpStatus: 201 };
      } catch (error) {
        if (error instanceof DomainError) throw error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          throw new DomainError(503, 'SERIALIZATION_RETRY_EXHAUSTED', 'Conflito transacional temporário.', undefined, true);
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const winner = await this.findSubmission(tenant, body.clientRequestId);
          if (winner) return this.replay(winner, tenant, hash);
          const target = JSON.stringify(error.meta?.target ?? '');
          if (target.includes('client_request_id')) {
            const metadata = await this.findIdempotencyMetadata(tenant, body.clientRequestId);
            if (metadata) this.throwIdempotencyCollision(metadata, tenant, hash);
            throw new DomainError(409, 'IDEMPOTENCY_KEY_REUSED', 'Chave idempotente já utilizada em outro contexto.');
          }
          const barcode = await withTenant(this.prisma, tenant, (tx) => tx.productBarcode.findUnique({
            where: { companyId_canonicalValue: { companyId: tenant.companyId, canonicalValue: normalized.canonicalValue } }, select: { productId: true },
          }));
          if (barcode) throw new DomainError(409, 'PRODUCT_ALREADY_EXISTS', 'Já existe produto com este código.');
        }
        throw error;
      }
    }
    throw new DomainError(503, 'SERIALIZATION_RETRY_EXHAUSTED', 'Conflito transacional temporário.', undefined, true);
  }

  private async resolveProduct(tx: TransactionClient, body: IntakeSubmissionRequest, tenant: TenantContext, barcode: ReturnType<typeof normalizeBarcode>) {
    if (body.product.mode === 'EXISTING') {
      const linked = await tx.productBarcode.findFirst({
        where: { companyId: tenant.companyId, productId: body.product.id, canonicalValue: barcode.canonicalValue, active: true, product: { active: true } },
        include: { product: true },
      });
      if (!linked) throw new DomainError(409, 'BARCODE_PRODUCT_MISMATCH', 'O código não pertence ao produto informado.');
      return linked.product;
    }
    if (!tenant.permissions.has('product:create')) throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para criar produto.');
    const category = await tx.category.findFirst({ where: { id: body.product.categoryId, companyId: tenant.companyId, active: true } });
    if (!category) throw new DomainError(404, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.');
    if (body.product.automaticPromotionEligible && !tenant.permissions.has('promotion-eligibility:update')) {
      throw new DomainError(403, 'PROMOTION_ELIGIBILITY_FORBIDDEN', 'Sem permissão para habilitar promoção automática.');
    }
    return tx.product.create({
      data: {
        companyId: tenant.companyId, categoryId: category.id, name: body.product.name, brand: body.product.brand ?? null,
        unitOfMeasure: body.product.unitOfMeasure,
        packageContentValue: body.product.packageContent ? new Prisma.Decimal(body.product.packageContent.value) : null,
        packageContentUnit: body.product.packageContent?.unit ?? null,
        salePrice: new Prisma.Decimal(body.product.salePrice.amount), currency: body.product.salePrice.currency,
        automaticPromotionEligible: body.product.automaticPromotionEligible,
        barcodes: { create: { format: barcode.format, rawValue: barcode.rawValue, canonicalValue: barcode.canonicalValue, company: { connect: { id: tenant.companyId } } } },
      },
    });
  }

  private answers(body: IntakeSubmissionRequest, submissionId: string, companyId: string): Prisma.IntakeAnswerCreateManyInput[] {
    const product = body.product.mode === 'CREATE' ? body.product : { mode: body.product.mode, id: body.product.id, observedVersion: body.product.observedVersion };
    const entries: Array<[string, 'PRODUCT' | 'BATCH' | 'META', unknown]> = [
      ['meta.barcode', 'META', body.barcode], ['meta.device', 'META', body.device],
      ['product.data', 'PRODUCT', product], ['batch.data', 'BATCH', body.batch],
    ];
    return entries.map(([questionKey, section, value]) => ({ companyId, submissionId, questionKey, section, value: value as Prisma.InputJsonValue }));
  }

  private audit(tenant: TenantContext, correlationId: string, clientRequestId: string, action: string, entityType: string, entityId: string, after: object): Prisma.AuditEventCreateManyInput {
    return { companyId: tenant.companyId, storeId: tenant.storeId, actorUserId: tenant.userId, action, entityType, entityId, after, clientRequestId, correlationId };
  }

  private findSubmission(tenant: TenantContext, clientRequestId: string): Promise<IntakeSubmission | null> {
    return withTenant(this.prisma, tenant, (tx) => tx.intakeSubmission.findUnique({
      where: { companyId_clientRequestId: { companyId: tenant.companyId, clientRequestId } },
    }));
  }

  private findIdempotencyMetadata(tenant: TenantContext, clientRequestId: string): Promise<IdempotencyMetadata | null> {
    return withTenant(this.prisma, tenant, async (tx) => {
      const rows = await tx.$queryRaw<IdempotencyMetadata[]>`
        SELECT * FROM resolve_intake_idempotency(${tenant.companyId}::uuid, ${clientRequestId}::uuid)
      `;
      return rows[0] ?? null;
    });
  }

  private throwIdempotencyCollision(metadata: IdempotencyMetadata, tenant: TenantContext, hash: string): never {
    if (metadata.actor_user_id !== tenant.userId) {
      throw new DomainError(403, 'IDEMPOTENCY_KEY_OWNED', 'Chave idempotente pertence a outro usuário.');
    }
    if (metadata.store_id !== tenant.storeId || metadata.request_hash.trim() !== hash) {
      throw new DomainError(409, 'IDEMPOTENCY_KEY_REUSED', 'Chave idempotente reutilizada com dados diferentes.');
    }
    throw new DomainError(409, 'SUBMISSION_IN_PROGRESS', `Coleta em estado ${metadata.submission_status}.`, undefined, true);
  }

  private replay(submission: IntakeSubmission, tenant: TenantContext, hash: string): SubmissionResult {
    if (submission.actorUserId !== tenant.userId) throw new DomainError(403, 'IDEMPOTENCY_KEY_OWNED', 'Chave idempotente pertence a outro usuário.');
    if (submission.storeId !== tenant.storeId || submission.requestHash !== hash) throw new DomainError(409, 'IDEMPOTENCY_KEY_REUSED', 'Chave idempotente reutilizada com dados diferentes.');
    if (submission.status !== 'COMPLETED' || !submission.responseSnapshot) throw new DomainError(409, 'SUBMISSION_IN_PROGRESS', 'Coleta ainda em processamento.', undefined, true);
    return { body: submission.responseSnapshot as unknown as IntakeSubmissionResponse, replayed: true, httpStatus: 200 };
  }
}
