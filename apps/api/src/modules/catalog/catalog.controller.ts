import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BarcodeFormatSchema, type BarcodeFormat } from '@validagiro/contracts';
import { AuthGuard } from '../../common/auth.guard';
import { DomainError } from '../../common/domain-error';
import { Tenant } from '../../common/request-context';
import { TenantGuard } from '../../common/tenant.guard';
import type { TenantContext } from '../../common/types';
import { CatalogService } from './catalog.service';
import { categoriesResponseSchema, errorSchema, productLookupResponseSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('catalog')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products/lookup')
  @ApiOperation({ summary: 'Consultar produto por código de barras' })
  @ApiQuery({ name: 'barcode', type: String })
  @ApiQuery({ name: 'format', enum: ['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'INTERNAL'] })
  @ApiResponse({ status: 200, description: 'Produto e barcode normalizado.', schema: productLookupResponseSchema })
  @ApiResponse({ status: 404, description: 'Produto não encontrado.', schema: errorSchema })
  @ApiResponse({ status: 422, description: 'Barcode inválido.', schema: errorSchema })
  lookup(@Tenant() tenant: TenantContext, @Query('barcode') barcode?: string, @Query('format') rawFormat?: string) {
    const parsed = BarcodeFormatSchema.safeParse(rawFormat);
    if (!barcode || !parsed.success) throw new DomainError(422, 'INVALID_BARCODE', 'Código ou formato inválido.');
    return this.catalog.lookup(tenant, barcode, parsed.data as BarcodeFormat);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias da empresa' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Categorias da empresa ativa.', schema: categoriesResponseSchema })
  categories(@Tenant() tenant: TenantContext, @Query('active') active?: string) {
    return this.catalog.listCategories(tenant, active !== 'false');
  }
}
