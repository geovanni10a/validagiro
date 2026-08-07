import { Controller, Get, Headers, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../../common/auth.guard';
import { DomainError } from '../../common/domain-error';
import { Tenant } from '../../common/request-context';
import { TenantGuard } from '../../common/tenant.guard';
import type { TenantContext } from '../../common/types';
import { QuestionnairesService } from './questionnaires.service';
import { errorSchema, questionnaireResponseSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('questionnaires')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller('questionnaires/product-intake')
export class QuestionnairesController {
  constructor(private readonly questionnaires: QuestionnairesService) {}
  @Get('current')
  @ApiOperation({ summary: 'Obter questionário de entrada vigente' })
  @ApiResponse({ status: 200, description: 'Questionário vigente, checksum e versão.', schema: questionnaireResponseSchema })
  @ApiResponse({ status: 304, description: 'ETag ainda vigente.' })
  async current(@Tenant() tenant: TenantContext, @Headers('if-none-match') ifNoneMatch: string | undefined, @Res({ passthrough: true }) response: Response) {
    const body = await this.questionnaires.current(tenant);
    const etag = `"${body.checksum}"`;
    response.setHeader('ETag', etag);
    response.setHeader('Cache-Control', 'private, max-age=300');
    if (ifNoneMatch === etag) { response.status(304); return; }
    return body;
  }

  @Get('versions/:version')
  @ApiOperation({ summary: 'Obter versão suportada do questionário' })
  @ApiParam({ name: 'version', type: Number, description: 'Inteiro positivo.' })
  @ApiResponse({ status: 200, description: 'Versão publicada e ainda suportada.', schema: questionnaireResponseSchema })
  @ApiResponse({ status: 404, description: 'Versão inexistente ou não suportada.' })
  version(@Tenant() tenant: TenantContext, @Param('version') rawVersion: string) {
    const version = Number(rawVersion);
    if (!Number.isSafeInteger(version) || version < 1) throw new DomainError(422, 'INVALID_QUESTIONNAIRE_VERSION', 'Versão do questionário inválida.');
    return this.questionnaires.version(tenant, version);
  }
}
