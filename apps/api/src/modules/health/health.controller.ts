import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('live') @ApiOperation({ summary: 'Verificar liveness do processo', security: [] }) live() { return { status: 'ok' }; }
  @Get('ready')
  @ApiOperation({ summary: 'Verificar readiness e conexão PostgreSQL', security: [] })
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', database: 'up' }; }
    catch { throw new ServiceUnavailableException('Database unavailable'); }
  }
}
