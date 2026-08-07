import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/domain-error';
import { PrismaService } from '../../common/prisma.service';
import { withTenant } from '../../common/tenant-transaction';
import type { TenantContext } from '../../common/types';

@Injectable()
export class QuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}
  async current(tenant: TenantContext) {
    const questionnaire = await withTenant(this.prisma, tenant, (tx) => tx.questionnaireVersion.findFirst({
      where: { code: 'PRODUCT_INTAKE', status: 'PUBLISHED', OR: [{ supportedUntil: null }, { supportedUntil: { gt: new Date() } }] },
      orderBy: { version: 'desc' },
    }));
    if (!questionnaire) throw new DomainError(404, 'QUESTIONNAIRE_NOT_FOUND', 'Questionário vigente não encontrado.');
    return { code: questionnaire.code, version: questionnaire.version, schemaVersion: questionnaire.schemaVersion, definition: questionnaire.definition, checksum: questionnaire.checksum, publishedAt: questionnaire.publishedAt?.toISOString() };
  }

  async version(tenant: TenantContext, version: number) {
    const questionnaire = await withTenant(this.prisma, tenant, (tx) => tx.questionnaireVersion.findUnique({
      where: { code_version: { code: 'PRODUCT_INTAKE', version } },
    }));
    if (!questionnaire || questionnaire.status !== 'PUBLISHED' || (questionnaire.supportedUntil && questionnaire.supportedUntil <= new Date())) {
      throw new DomainError(404, 'QUESTIONNAIRE_VERSION_NOT_FOUND', 'Versão do questionário não encontrada.');
    }
    return { code: questionnaire.code, version: questionnaire.version, schemaVersion: questionnaire.schemaVersion, definition: questionnaire.definition, checksum: questionnaire.checksum, publishedAt: questionnaire.publishedAt?.toISOString(), supportedUntil: questionnaire.supportedUntil?.toISOString() ?? null };
  }
}
