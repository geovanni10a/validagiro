import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import { Tenant } from '../../common/request-context';
import { TenantGuard } from '../../common/tenant.guard';
import type { TenantContext } from '../../common/types';
import { LocationsService } from './locations.service';
import { locationsResponseSchema } from '../../common/openapi';
import { errorSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('locations')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}
  @Get()
  @ApiOperation({ summary: 'Listar localizações da loja' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Localizações da loja ativa.', schema: locationsResponseSchema })
  list(@Tenant() tenant: TenantContext, @Query('active') active?: string) { return this.locations.list(tenant, active !== 'false'); }
}
