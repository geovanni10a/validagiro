import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import type { TenantContext } from './types';

export type TransactionClient = Prisma.TransactionClient;

export async function setTenantContext(tx: TransactionClient, tenant: TenantContext): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.user_subject', ${tenant.authSubject}, true)`;
  await tx.$executeRaw`SELECT set_config('app.company_id', ${tenant.companyId}, true)`;
  await tx.$executeRaw`SELECT set_config('app.store_id', ${tenant.storeId}, true)`;
}

export function withTenant<T>(
  prisma: PrismaService,
  tenant: TenantContext,
  operation: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantContext(tx, tenant);
    return operation(tx);
  });
}
