import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from './domain-error';
import { permissionsFor } from './permissions';
import { PrismaService } from './prisma.service';
import { z } from 'zod';
import type { MembershipRole, RecordStatus } from '@prisma/client';

interface StoreAccessRow {
  store_id: string;
  company_id: string;
  store_name: string;
  store_timezone: string;
  store_status: RecordStatus;
  company_status: RecordStatus;
  membership_id: string;
  membership_role: MembershipRole;
  assigned: boolean;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.identity) throw new DomainError(401, 'UNAUTHORIZED', 'Autenticação necessária.');
    const storeId = request.header('x-store-id');
    if (!storeId) throw new DomainError(400, 'STORE_HEADER_REQUIRED', 'O header X-Store-Id é obrigatório.');
    if (!z.uuid().safeParse(storeId).success) throw new DomainError(400, 'INVALID_STORE_HEADER', 'O header X-Store-Id deve ser um UUID válido.');
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_subject', ${request.identity!.authSubject}, true)`;
      return tx.$queryRaw<StoreAccessRow[]>`SELECT * FROM resolve_store_access(${storeId}::uuid)`;
    });
    const resolved = rows[0];
    if (!resolved || resolved.store_status !== 'ACTIVE' || resolved.company_status !== 'ACTIVE') throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Recurso não encontrado.');
    if (!resolved.assigned) throw new DomainError(403, 'FORBIDDEN', 'Acesso não autorizado para esta loja.');
    request.tenant = {
      ...request.identity, membershipId: resolved.membership_id, companyId: resolved.company_id, storeId,
      storeTimezone: resolved.store_timezone, role: resolved.membership_role, permissions: permissionsFor(resolved.membership_role),
    };
    return true;
  }
}
