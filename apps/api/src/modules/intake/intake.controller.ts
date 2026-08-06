import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Throttle } from '@nestjs/throttler';
import { IntakeSubmissionSchema, type IntakeSubmissionRequest } from '@validagiro/contracts';
import { AuthGuard } from '../../common/auth.guard';
import { Tenant } from '../../common/request-context';
import { TenantGuard } from '../../common/tenant.guard';
import type { TenantContext } from '../../common/types';
import { ZodPipe } from '../../common/zod.pipe';
import { IntakeService } from './intake.service';
import { errorSchema, intakeRequestSchema, intakeResponseSchema } from '../../common/openapi';
import { ApiThrottlerGuard } from '../../common/api-throttler.guard';

@ApiTags('intake')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiHeader({ name: 'X-Device-Id', required: false, description: 'UUID do dispositivo usado também no rate limit.' })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@ApiResponse({ status: 429, description: 'Rate limit excedido.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller('intake-submissions')
export class IntakeController {
  constructor(private readonly intake: IntakeService) {}
  @Post()
  @ApiOperation({ summary: 'Registrar coleta idempotente de produto e lote' })
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiBody({ schema: intakeRequestSchema })
  @ApiResponse({ status: 201, description: 'Coleta criada atomicamente.', schema: intakeResponseSchema })
  @ApiResponse({ status: 200, description: 'Replay idempotente.', schema: intakeResponseSchema })
  @ApiResponse({ status: 409, description: 'Conflito de idempotência, catálogo ou questionário.', schema: errorSchema })
  @ApiResponse({ status: 422, description: 'Payload ou regra inválida.', schema: errorSchema })
  async submit(
    @Body(new ZodPipe(IntakeSubmissionSchema)) body: IntakeSubmissionRequest,
    @Tenant() tenant: TenantContext,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.intake.submit(body, tenant, request.correlationId);
    response.status(result.httpStatus);
    response.setHeader('Idempotency-Replayed', String(result.replayed));
    return result.body;
  }
}

@ApiTags('sync')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Store-Id', required: true })
@ApiResponse({ status: 401, description: 'Token ausente ou inválido.', schema: errorSchema })
@ApiResponse({ status: 403, description: 'Sem permissão para a operação.', schema: errorSchema })
@UseGuards(AuthGuard, ApiThrottlerGuard, TenantGuard)
@Controller('sync/submissions')
export class SyncController {
  constructor(private readonly intake: IntakeService) {}
  @Get(':clientRequestId')
  @ApiOperation({ summary: 'Consultar resultado de uma sincronização' })
  @ApiParam({ name: 'clientRequestId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resultado concluído da sincronização.', schema: intakeResponseSchema })
  @ApiResponse({ status: 404, description: 'Submissão não encontrada no escopo.', schema: errorSchema })
  get(@Param('clientRequestId') clientRequestId: string, @Tenant() tenant: TenantContext) {
    return this.intake.getCompleted(z.uuid().parse(clientRequestId), tenant);
  }
}
