import { randomUUID } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type { IntakeSubmissionRequest } from '@validagiro/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/common/prisma.service';
import { permissionsFor } from '../src/common/permissions';
import { TenantGuard } from '../src/common/tenant.guard';
import type { IdentityContext, TenantContext } from '../src/common/types';
import { IntakeService } from '../src/modules/intake/intake.service';
import { BatchesService } from '../src/modules/inventory/batches.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runtimeDatabaseUrl = process.env.RUNTIME_DATABASE_URL;
if (process.env.CI && (!databaseUrl || !runtimeDatabaseUrl)) throw new Error('Database URLs are mandatory in CI');

describe.skipIf(!databaseUrl || !runtimeDatabaseUrl)('PostgreSQL runtime security and intake', () => {
  let owner: PrismaClient;
  let runtime: PrismaClient;
  let service: IntakeService;
  let batches: BatchesService;
  const suffix = randomUUID().slice(0, 8);
  let tenant: TenantContext;
  let tenantStore2: TenantContext;
  let actor2Tenant: TenantContext;
  let otherTenant: TenantContext;
  let restrictedIdentity: IdentityContext;
  let store2Id: string;
  let otherStoreId: string;
  let categoryId: string;
  let otherCategoryId: string;
  let locationId: string;
  let location2Id: string;
  let otherLocationId: string;
  let questionnaireVersion: number;
  let auditId: string;
  let movementId: string;
  let submissionId: string;
  let otherBatchId: string;
  let otherSubmissionId: string;
  let otherBareSubmissionId: string;

  const payload = (
    code: string, context = tenant, clientRequestId = randomUUID(), quantity = '2', changes: Partial<IntakeSubmissionRequest> = {},
  ): IntakeSubmissionRequest => ({
    clientRequestId, questionnaireVersion,
    device: { deviceId: randomUUID(), appVersion: 'test', capturedAt: new Date().toISOString() },
    barcode: { value: code, format: 'INTERNAL', source: 'MANUAL', confirmed: true },
    product: { mode: 'CREATE', name: `Test product ${code}`, categoryId: context.companyId === tenant.companyId ? categoryId : otherCategoryId, unitOfMeasure: 'UNIT', salePrice: { amount: '10.00', currency: 'BRL' }, automaticPromotionEligible: false },
    batch: { expiryDate: '2099-12-31', quantity, locationId: context.storeId === tenant.storeId ? locationId : context.storeId === store2Id ? location2Id : otherLocationId },
    ...changes,
  });

  beforeAll(async () => {
    owner = new PrismaClient({ datasources: { db: { url: databaseUrl! } } });
    runtime = new PrismaClient({ datasources: { db: { url: runtimeDatabaseUrl! } } });
    service = new IntakeService(runtime as PrismaService);
    batches = new BatchesService(runtime as PrismaService);
    await Promise.all([owner.$connect(), runtime.$connect()]);

    const company = await owner.company.create({ data: { legalName: `Test ${suffix}`, displayName: `Test ${suffix}` } });
    const store1 = await owner.store.create({ data: { companyId: company.id, name: 'Store 1', timezone: 'America/Fortaleza' } });
    const store2 = await owner.store.create({ data: { companyId: company.id, name: 'Store 2', timezone: 'America/Fortaleza' } });
    store2Id = store2.id;
    const user1 = await owner.user.create({ data: { authSubject: `actor1-${suffix}`, displayName: 'Actor 1' } });
    const membership1 = await owner.membership.create({ data: { companyId: company.id, userId: user1.id, role: 'COMPANY_ADMIN', allStores: true } });
    const user2 = await owner.user.create({ data: { authSubject: `actor2-${suffix}`, displayName: 'Actor 2' } });
    const membership2 = await owner.membership.create({ data: { companyId: company.id, userId: user2.id, role: 'STORE_MANAGER', allStores: true } });
    const restricted = await owner.user.create({ data: { authSubject: `restricted-${suffix}`, displayName: 'Restricted' } });
    const restrictedMembership = await owner.membership.create({ data: { companyId: company.id, userId: restricted.id, role: 'STOCK_OPERATOR', allStores: false } });
    await owner.membershipStore.create({ data: { membershipId: restrictedMembership.id, companyId: company.id, storeId: store1.id } });
    const category = await owner.category.create({ data: { companyId: company.id, name: `Category ${suffix}` } });
    const location1 = await owner.location.create({ data: { companyId: company.id, storeId: store1.id, code: `S1-${suffix}`, name: 'Location 1' } });
    const location2 = await owner.location.create({ data: { companyId: company.id, storeId: store2.id, code: `S2-${suffix}`, name: 'Location 2' } });

    const company2 = await owner.company.create({ data: { legalName: `Other ${suffix}`, displayName: `Other ${suffix}` } });
    const store3 = await owner.store.create({ data: { companyId: company2.id, name: 'Other store', timezone: 'America/Fortaleza' } });
    otherStoreId = store3.id;
    const user3 = await owner.user.create({ data: { authSubject: `actor3-${suffix}`, displayName: 'Actor 3' } });
    const membership3 = await owner.membership.create({ data: { companyId: company2.id, userId: user3.id, role: 'COMPANY_ADMIN', allStores: true } });
    const category2 = await owner.category.create({ data: { companyId: company2.id, name: `Other category ${suffix}` } });
    const location3 = await owner.location.create({ data: { companyId: company2.id, storeId: store3.id, code: `S3-${suffix}`, name: 'Other location' } });

    questionnaireVersion = Math.floor(Date.now() / 1000);
    const questionnaire = await owner.questionnaireVersion.create({ data: { code: 'PRODUCT_INTAKE', version: questionnaireVersion, schemaVersion: 1, definition: { test: true }, checksum: 'a'.repeat(64), status: 'PUBLISHED', publishedAt: new Date() } });
    otherBareSubmissionId = (await owner.intakeSubmission.create({ data: { companyId: company2.id, storeId: store3.id, actorUserId: user3.id, questionnaireVersionId: questionnaire.id, clientRequestId: randomUUID(), requestHash: 'b'.repeat(64), deviceId: randomUUID(), deviceAppVersion: 'test', capturedAt: new Date() } })).id;
    categoryId = category.id; otherCategoryId = category2.id;
    locationId = location1.id; location2Id = location2.id; otherLocationId = location3.id;
    tenant = { userId: user1.id, authSubject: user1.authSubject, displayName: user1.displayName, membershipId: membership1.id, companyId: company.id, storeId: store1.id, storeTimezone: store1.timezone, role: membership1.role, permissions: permissionsFor(membership1.role) };
    tenantStore2 = { ...tenant, storeId: store2.id, storeTimezone: store2.timezone };
    actor2Tenant = { userId: user2.id, authSubject: user2.authSubject, displayName: user2.displayName, membershipId: membership2.id, companyId: company.id, storeId: store2.id, storeTimezone: store2.timezone, role: membership2.role, permissions: permissionsFor(membership2.role) };
    otherTenant = { userId: user3.id, authSubject: user3.authSubject, displayName: user3.displayName, membershipId: membership3.id, companyId: company2.id, storeId: store3.id, storeTimezone: store3.timezone, role: membership3.role, permissions: permissionsFor(membership3.role) };
    restrictedIdentity = { userId: restricted.id, authSubject: restricted.authSubject, displayName: restricted.displayName };
  });

  afterAll(() => Promise.all([owner.$disconnect(), runtime.$disconnect()]));

  it('uses a non-owner runtime with forced RLS and repeatable seed', async () => {
    const role = await runtime.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(role[0]).toEqual({ rolsuper: false, rolbypassrls: false });
    const forced = await owner.$queryRaw<Array<{ relforcerowsecurity: boolean }>>`SELECT relforcerowsecurity FROM pg_class WHERE relname = 'intake_submissions'`;
    expect(forced[0]?.relforcerowsecurity).toBe(true);
    expect(await owner.questionnaireVersion.count({ where: { code: 'PRODUCT_INTAKE', status: 'PUBLISHED' } })).toBeGreaterThan(0);
  });

  it('commits with runtime, replays, and rolls back late failures', async () => {
    const request = payload(`BASE-${suffix}`);
    const first = await service.submit(request, tenant, randomUUID());
    expect((await service.submit(request, tenant, randomUUID())).body).toEqual(first.body);
    expect(await owner.intakeAnswer.count({ where: { submissionId: first.body.submissionId } })).toBe(4);
    expect(await owner.auditEvent.count({ where: { clientRequestId: request.clientRequestId } })).toBe(4);
    submissionId = first.body.submissionId; movementId = first.body.initialMovementId;
    auditId = (await owner.auditEvent.findFirstOrThrow({ where: { clientRequestId: request.clientRequestId } })).id;
    const rollbackCode = `ROLLBACK-${suffix}`;
    await expect(service.submit(payload(rollbackCode, tenant, randomUUID(), '1.500'), tenant, randomUUID())).rejects.toMatchObject({ code: 'INVALID_QUANTITY' });
    expect(await owner.productBarcode.count({ where: { companyId: tenant.companyId, canonicalValue: rollbackCode } })).toBe(0);
  });

  it('classifies the complete idempotency ownership/reuse matrix', async () => {
    const key = randomUUID();
    const request = payload(`MATRIX-${suffix}`, tenant, key);
    await service.submit(request, tenant, randomUUID());
    const changed = { ...request, product: { ...request.product, name: 'Changed semantic body' } } as IntakeSubmissionRequest;
    await expect(service.submit(changed, tenant, randomUUID())).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(service.submit(request, tenantStore2, randomUUID())).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED' });
    await expect(service.submit(request, actor2Tenant, randomUUID())).rejects.toMatchObject({ status: 403, code: 'IDEMPOTENCY_KEY_OWNED' });
  });

  it('serializes ten same-key retries and resolves a different-key barcode race', async () => {
    const request = payload(`KEY-RACE-${suffix}`, tenant, randomUUID());
    const results = await Promise.all(Array.from({ length: 10 }, () => service.submit(request, tenant, randomUUID())));
    expect(results.filter((result) => result.httpStatus === 201)).toHaveLength(1);
    expect(new Set(results.map((result) => result.body.batch.id))).toHaveLength(1);

    const barcode = `BARCODE-RACE-${suffix}`;
    const raced = await Promise.allSettled([
      service.submit(payload(barcode, tenant, randomUUID()), tenant, randomUUID()),
      service.submit(payload(barcode, tenant, randomUUID()), tenant, randomUUID()),
    ]);
    expect(raced.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(raced.filter((result) => result.status === 'rejected')[0]).toMatchObject({ reason: { code: 'PRODUCT_ALREADY_EXISTS' } });
    expect(await owner.intakeSubmission.count({ where: { companyId: tenant.companyId, product: { barcodes: { some: { canonicalValue: barcode } } } } })).toBe(1);
  });

  it('allows the same canonical barcode in different companies', async () => {
    const code = `SHARED-${suffix}`;
    const first = await service.submit(payload(code, tenant), tenant, randomUUID());
    const second = await service.submit(payload(code, otherTenant), otherTenant, randomUUID());
    expect(first.body.product.id).not.toBe(second.body.product.id);
    otherBatchId = (await owner.batch.create({ data: {
      companyId: otherTenant.companyId,
      storeId: otherTenant.storeId,
      productId: second.body.product.id,
      locationId: otherLocationId,
      expiryDate: new Date('2099-12-30'),
      entryDate: new Date('2099-01-01'),
      receivedQuantity: 1,
      currentQuantity: 1,
    } })).id;
    otherSubmissionId = second.body.submissionId;
  });

  it('distinguishes unassigned same-company stores from cross-company stores', async () => {
    const guard = new TenantGuard(runtime as PrismaService);
    const check = (storeId: string) => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ identity: restrictedIdentity, header: (name: string) => name === 'x-store-id' ? storeId : undefined }) }) } as unknown as ExecutionContext);
    await expect(check(store2Id)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(check(otherStoreId)).rejects.toMatchObject({ status: 404, code: 'RESOURCE_NOT_FOUND' });
  });

  it('enforces runtime RLS writes, composite FKs, privileges and append-only triggers', async () => {
    await expect(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_subject', ${tenant.authSubject}, true)`;
      await tx.$executeRaw`SELECT set_config('app.company_id', ${tenant.companyId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.store_id', ${tenant.storeId}, true)`;
      return tx.product.create({ data: { companyId: otherTenant.companyId, categoryId: otherCategoryId, name: 'Cross tenant write', unitOfMeasure: 'UNIT', salePrice: 1, currency: 'BRL' } });
    })).rejects.toBeDefined();

    await expect(owner.intakeSubmission.update({ where: { id: submissionId }, data: { batchId: otherBatchId } })).rejects.toMatchObject({ code: 'P2003' });
    await expect(owner.stockMovement.create({ data: { companyId: tenant.companyId, storeId: tenant.storeId, batchId: (await owner.intakeSubmission.findUniqueOrThrow({ where: { id: submissionId } })).batchId!, type: 'INTAKE', quantityDelta: 1, balanceAfter: 1, submissionId: otherBareSubmissionId, actorUserId: tenant.userId } })).rejects.toMatchObject({ code: 'P2003' });

    await expect(runtime.stockMovement.update({ where: { id: movementId }, data: { reason: 'denied by grant' } })).rejects.toBeDefined();
    await expect(runtime.auditEvent.delete({ where: { id: auditId } })).rejects.toBeDefined();
    await expect(owner.stockMovement.update({ where: { id: movementId }, data: { reason: 'denied by trigger' } })).rejects.toBeDefined();
    await expect(owner.auditEvent.delete({ where: { id: auditId } })).rejects.toBeDefined();
  });

  it('paginates FEFO without repetition under runtime RLS', async () => {
    const first = await batches.list(tenant, { limit: 1 });
    const second = await batches.list(tenant, { limit: 1, cursor: first.nextCursor! });
    expect(second.items[0]?.id).not.toBe(first.items[0]!.id);
    expect(second.items[0]!.expiryDate >= first.items[0]!.expiryDate).toBe(true);
  });
});
