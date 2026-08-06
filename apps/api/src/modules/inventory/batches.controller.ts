import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BatchListQuerySchema } from '@validagiro/contracts';
import { AuthGuard } from '../../common/auth.guard';
import { Tenant } from '../../common/request-context';
import { TenantGuard } from '../../common/tenant.guard';
import type { TenantContext } from '../../common/types';
import { BatchesService } from './batches.service';
import { batchesResponseSchema, errorSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller('batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}
  @Get()
  @ApiOperation({ summary: 'Listar lotes em ordem FEFO' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiQuery({ name: 'productId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'expiryFrom', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'expiryTo', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'locationId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'DEPLETED', 'EXPIRED', 'DISCARDED'] })
  @ApiResponse({ status: 200, description: 'Página FEFO de lotes da loja.', schema: batchesResponseSchema })
  list(@Tenant() tenant: TenantContext, @Query() rawQuery: Record<string, unknown>) {
    return this.batches.list(tenant, BatchListQuerySchema.parse(rawQuery));
  }
}
