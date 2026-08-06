import { Injectable } from '@nestjs/common';
import type { BarcodeFormat } from '@validagiro/contracts';
import { DomainError } from '../../common/domain-error';
import { PrismaService } from '../../common/prisma.service';
import { withTenant } from '../../common/tenant-transaction';
import type { TenantContext } from '../../common/types';
import { normalizeBarcode } from './barcode';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(tenant: TenantContext, barcode: string, format: BarcodeFormat) {
    if (!tenant.permissions.has('catalog:read')) throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para consultar produtos.');
    const normalized = normalizeBarcode(barcode, format);
    const result = await withTenant(this.prisma, tenant, (tx) => tx.productBarcode.findUnique({
      where: { companyId_canonicalValue: { companyId: tenant.companyId, canonicalValue: normalized.canonicalValue } },
      include: { product: true },
    }));
    if (!result?.active || !result.product.active) throw new DomainError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
    const product = result.product;
    return {
      product: {
        id: product.id, name: product.name, brand: product.brand, categoryId: product.categoryId,
        unitOfMeasure: product.unitOfMeasure,
        packageContent: product.packageContentValue && product.packageContentUnit
          ? { value: product.packageContentValue.toFixed(3), unit: product.packageContentUnit } : null,
        salePrice: { amount: product.salePrice.toFixed(2), currency: product.currency },
        automaticPromotionEligible: product.automaticPromotionEligible, version: product.version,
      },
      barcode: { rawValue: result.rawValue, format: result.format, canonicalValue: result.canonicalValue },
    };
  }

  listCategories(tenant: TenantContext, active = true) {
    return withTenant(this.prisma, tenant, async (tx) => ({ items: await tx.category.findMany({
      where: { companyId: tenant.companyId, ...(active ? { active: true } : {}) },
      orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true, active: true },
    }) }));
  }
}
