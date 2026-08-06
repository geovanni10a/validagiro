import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiErrorFilter } from './common/error.filter';
import { AuthGuard } from './common/auth.guard';
import { correlationMiddleware } from './common/correlation.middleware';
import { PrismaService } from './common/prisma.service';
import { TenantGuard } from './common/tenant.guard';
import { CatalogController } from './modules/catalog/catalog.controller';
import { CatalogService } from './modules/catalog/catalog.service';
import { HealthController } from './modules/health/health.controller';
import { IdentityController } from './modules/identity/identity.controller';
import { IntakeController, SyncController } from './modules/intake/intake.controller';
import { IntakeService } from './modules/intake/intake.service';
import { LocationsController } from './modules/locations/locations.controller';
import { LocationsService } from './modules/locations/locations.service';
import { QuestionnairesController } from './modules/questionnaires/questionnaires.controller';
import { QuestionnairesService } from './modules/questionnaires/questionnaires.service';
import { BatchesController } from './modules/inventory/batches.controller';
import { BatchesService } from './modules/inventory/batches.service';
import { ApiThrottlerGuard } from './common/api-throttler.guard';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, IdentityController, CatalogController, LocationsController, QuestionnairesController, IntakeController, SyncController, BatchesController],
  providers: [PrismaService, AuthGuard, TenantGuard, ApiThrottlerGuard, CatalogService, LocationsService, QuestionnairesService, IntakeService, BatchesService, { provide: APP_FILTER, useClass: ApiErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void { consumer.apply(correlationMiddleware).forRoutes('*'); }
}
