import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BatchListQuery, BatchListResponse } from '@validagiro/contracts';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { DomainError } from '../../common/domain-error';
import { PrismaService } from '../../common/prisma.service';
import { withTenant } from '../../common/tenant-transaction';
import type { TenantContext } from '../../common/types';

const cursorSchema = z.object({ expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), id: z.uuid() }).strict();

function decodeCursor(cursor: string) {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
    if (!DateTime.fromISO(parsed.expiryDate).isValid) throw new Error('invalid date');
    return parsed;
  }
  catch { throw new DomainError(422, 'INVALID_CURSOR', 'Cursor inválido.'); }
}

function encodeCursor(expiryDate: string, id: string): string {
  return Buffer.from(JSON.stringify({ expiryDate, id }), 'utf8').toString('base64url');
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext, query: BatchListQuery): Promise<BatchListResponse> {
    if (!tenant.permissions.has('batch:read')) throw new DomainError(403, 'FORBIDDEN', 'Sem permissão para consultar lotes.');
    if (query.expiryFrom && query.expiryTo && query.expiryFrom > query.expiryTo) throw new DomainError(422, 'INVALID_DATE_RANGE', 'Intervalo de validade inválido.');
    for (const date of [query.expiryFrom, query.expiryTo].filter((value): value is string => Boolean(value))) {
      if (!DateTime.fromISO(date).isValid) throw new DomainError(422, 'INVALID_DATE_RANGE', 'Intervalo de validade inválido.');
    }
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;
    const where: Prisma.BatchWhereInput = {
      companyId: tenant.companyId, storeId: tenant.storeId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...((query.expiryFrom || query.expiryTo) ? { expiryDate: {
        ...(query.expiryFrom ? { gte: new Date(`${query.expiryFrom}T00:00:00.000Z`) } : {}),
        ...(query.expiryTo ? { lte: new Date(`${query.expiryTo}T00:00:00.000Z`) } : {}),
      } } : {}),
      ...(cursor ? { OR: [
        { expiryDate: { gt: new Date(`${cursor.expiryDate}T00:00:00.000Z`) } },
        { expiryDate: new Date(`${cursor.expiryDate}T00:00:00.000Z`), id: { gt: cursor.id } },
      ] } : {}),
    };
    const rows = await withTenant(this.prisma, tenant, (tx) => tx.batch.findMany({
      where, take: query.limit + 1, orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      include: {
        product: { select: { id: true, name: true, barcodes: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1, select: { rawValue: true } } } },
        location: { select: { id: true, code: true, name: true } },
      },
    }));
    const hasNext = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const today = DateTime.now().setZone(tenant.storeTimezone).startOf('day');
    const items = page.map((row) => {
      const expiryDate = row.expiryDate.toISOString().slice(0, 10);
      return {
        id: row.id,
        product: { id: row.product.id, name: row.product.name, barcode: row.product.barcodes[0]?.rawValue ?? null },
        batchNumber: row.batchNumber, expiryDate,
        daysRemaining: Math.round(DateTime.fromISO(expiryDate, { zone: tenant.storeTimezone }).startOf('day').diff(today, 'days').days),
        quantity: row.currentQuantity.toFixed(3), location: row.location, status: row.status, createdAt: row.createdAt.toISOString(),
      };
    });
    const last = items.at(-1);
    return { items, nextCursor: hasNext && last ? encodeCursor(last.expiryDate, last.id) : null };
  }
}
