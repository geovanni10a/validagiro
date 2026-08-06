import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { withTenant } from '../../common/tenant-transaction';
import type { TenantContext } from '../../common/types';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenant: TenantContext, active = true) {
    return withTenant(this.prisma, tenant, async (tx) => ({ items: await tx.location.findMany({
      where: { companyId: tenant.companyId, storeId: tenant.storeId, ...(active ? { active: true } : {}) },
      orderBy: [{ code: 'asc' }, { id: 'asc' }], select: { id: true, code: true, name: true, active: true },
    }) }));
  }
}
