import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import { PrismaService } from '../../common/prisma.service';
import { Identity } from '../../common/request-context';
import type { IdentityContext } from '../../common/types';
import { Throttle } from '@nestjs/throttler';
import { contextResponseSchema, errorSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('identity')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard)
@Controller('me')
export class IdentityController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('context')
  @ApiOperation({ summary: 'Listar empresas e lojas autorizadas' })
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiResponse({ status: 200, description: 'Empresas, papéis e lojas autorizadas.', schema: contextResponseSchema })
  async context(@Identity() identity: IdentityContext) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.user_subject', ${identity.authSubject}, true)`;
      const memberships = await tx.membership.findMany({
        where: { userId: identity.userId, status: 'ACTIVE', company: { status: 'ACTIVE' } },
        include: { company: true, stores: { include: { store: true } } },
      });
      return {
        user: { id: identity.userId, displayName: identity.displayName },
        companies: await Promise.all(memberships.map(async (membership) => ({
          id: membership.companyId, name: membership.company.displayName, role: membership.role,
          stores: (membership.allStores
            ? await tx.store.findMany({ where: { companyId: membership.companyId, status: 'ACTIVE' } })
            : membership.stores.map(({ store }) => store).filter((store) => store.status === 'ACTIVE'))
            .map((store) => ({ id: store.id, name: store.name, timezone: store.timezone })),
        }))),
      };
    });
  }
}
